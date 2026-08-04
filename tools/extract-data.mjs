import fs from "fs";
import path from "path";

const SOURCE =
  process.argv[2] ??
  "C:/Users/Jacky/.cursor/projects/d-MadeByMe-Stuff/agent-tools/a2e21403-196d-4690-b900-d9c46233b4ff.txt";
const DATA_DIR = path.resolve("d:/MadeByMe/Stuff/data");
const TASKS_DIR = path.join(DATA_DIR, "tasks");

const TASK_POOLS = [
  "instruct",
  "punish",
  "train",
  "jerk",
  "chat",
  "order",
  "recite",
  "intro",
  "aftercare",
  "finale",
];

const LINES_KEYS = [
  "papaOpen",
  "papaTrans",
  "papaPraise",
  "papaClose",
  "stageOpen",
  "fail1",
  "fail2",
  "shutdown",
  "actOpen",
];

function parseJsObjectLiteral(source, markerStart, endBefore) {
  const start = source.indexOf(markerStart);
  if (start < 0) throw new Error(`Marker not found: ${markerStart}`);
  const sliceEnd =
    endBefore != null ? source.indexOf(endBefore, start) : source.length;
  if (sliceEnd < 0) throw new Error(`End marker not found: ${endBefore}`);
  const chunk = source.slice(start, sliceEnd);
  const openBrace = chunk.indexOf("{");
  if (openBrace < 0) throw new Error(`No opening brace for ${markerStart}`);
  let depth = 0;
  let inString = null;
  let escape = false;
  let closeIdx = -1;
  for (let i = openBrace; i < chunk.length; i++) {
    const c = chunk[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inString) inString = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      inString = c;
      continue;
    }
    if (c === "/") {
      const next = chunk[i + 1];
      if (next === "/") {
        while (i < chunk.length && chunk[i] !== "\n") i++;
        continue;
      }
      if (next === "*") {
        i += 2;
        while (i < chunk.length - 1 && !(chunk[i] === "*" && chunk[i + 1] === "/")) i++;
        i++;
        continue;
      }
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx < 0) throw new Error(`Unbalanced braces for ${markerStart}`);
  const expr = chunk.slice(openBrace, closeIdx + 1);
  return new Function(`return ${expr}`)();
}

function replaceHostDeep(value) {
  if (typeof value === "string") {
    return value.includes("XrayPapa")
      ? value.replaceAll("XrayPapa", "{host}")
      : value;
  }
  if (Array.isArray(value)) return value.map(replaceHostDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceHostDeep(v);
    return out;
  }
  return value;
}

function stripEventFx(events) {
  return events.map(({ t, txt }) => ({ t, txt }));
}

function collectKinks(tasksByPool) {
  const set = new Set();
  for (const pool of TASK_POOLS) {
    const items = tasksByPool[pool];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && item.k != null && item.k !== "") set.add(String(item.k));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-Hans"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const errors = [];
const filesWritten = [];
const poolCounts = {};

try {
  const source = fs.readFileSync(SOURCE, "utf8");

  const CONFIG = parseJsObjectLiteral(source, "const CONFIG=", "const DATA");
  const DATA = parseJsObjectLiteral(source, "const DATA = ", "/*__DATA_END__*/");

  const configOut = replaceHostDeep({
    ...CONFIG,
    nicknames: DATA.nicknames,
    callNames: DATA.callNames,
  });
  const siteConfigPath = path.join(DATA_DIR, "site-config-defaults.json");
  writeJson(siteConfigPath, configOut);
  filesWritten.push(siteConfigPath);

  for (const pool of TASK_POOLS) {
    const data = replaceHostDeep(DATA[pool] ?? []);
    const filePath = path.join(TASKS_DIR, `${pool}.json`);
    writeJson(filePath, data);
    filesWritten.push(filePath);
    poolCounts[pool] = Array.isArray(data) ? data.length : 0;
  }

  const commentsPath = path.join(TASKS_DIR, "comments.json");
  writeJson(commentsPath, replaceHostDeep(DATA.comments ?? {}));
  filesWritten.push(commentsPath);
  poolCounts.comments = DATA.comments
    ? Object.values(DATA.comments).reduce(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0,
      )
    : 0;

  const lines = {};
  for (const key of LINES_KEYS) {
    lines[key] = replaceHostDeep(DATA[key] ?? (key === "actOpen" ? {} : []));
  }
  if (Array.isArray(DATA.events)) {
    lines.events = stripEventFx(replaceHostDeep(DATA.events));
  }
  const linesPath = path.join(TASKS_DIR, "lines.json");
  writeJson(linesPath, lines);
  filesWritten.push(linesPath);
  poolCounts.lines_events = lines.events?.length ?? 0;

  const uniqueKinks = collectKinks(DATA);

  const report = {
    source: SOURCE,
    filesWritten,
    poolCounts,
    uniqueKinks,
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  errors.push(String(err?.stack || err));
  console.log(
    JSON.stringify({ filesWritten, poolCounts, uniqueKinks: [], errors }, null, 2),
  );
  process.exitCode = 1;
}
