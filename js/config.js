/** Load site + kink + task JSON; merge localStorage overrides. */

const TASK_FILES = [
  'instruct', 'punish', 'train', 'jerk', 'chat', 'order',
  'recite', 'intro', 'aftercare', 'finale', 'insert', 'comments', 'lines'
];

export async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

export function loadLocalOverrides(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalOverrides(storageKey, overrides) {
  localStorage.setItem(storageKey, JSON.stringify(overrides));
}

export function clearLocalOverrides(storageKey) {
  localStorage.removeItem(storageKey);
}

export function buildOverridesFromUI(kinksCatalog) {
  const hostName = (document.getElementById('hostNameIn')?.value || '').trim();
  const callRaw = document.getElementById('callNamesIn')?.value || '';
  const callNames = callRaw.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean);
  const enabled = {};
  document.querySelectorAll('#kinkGrid input[type=checkbox], #featuredKinks input[type=checkbox]').forEach((cb) => {
    enabled[cb.dataset.kink] = cb.checked;
  });
  return {
    hostName: hostName || undefined,
    callNames: callNames.length ? callNames : undefined,
    enabledKinks: enabled
  };
}

export function applyOverridesToUI(site, kinks, overrides) {
  const hostEl = document.getElementById('hostNameIn');
  if (hostEl) hostEl.value = (overrides && overrides.hostName) || site.hostName || '主人';
  const callEl = document.getElementById('callNamesIn');
  if (callEl) {
    const names = (overrides && overrides.callNames) || site.callNames || [];
    callEl.value = names.join('，');
  }
  const enabledMap = (overrides && overrides.enabledKinks) || {};
  const featuredRoot = document.getElementById('featuredKinks');
  if (featuredRoot) {
    featuredRoot.innerHTML = '';
    for (const k of kinks.filter((x) => x.featured)) {
      const on = enabledMap[k.id] !== undefined ? !!enabledMap[k.id] : k.enabled !== false;
      const lab = document.createElement('label');
      lab.className = 'kink-feature' + (on ? ' on' : '');
      lab.innerHTML = `<div class="kink-feature-top"><input type="checkbox" data-kink="${k.id}" ${on ? 'checked' : ''}/><span class="kink-feature-title">${k.icon || ''} ${k.label || k.id}<small>专场环节 · 开启后加入流程</small></span><span class="kink-feature-badge">可选加强</span></div><div class="kink-feature-blurb">${k.blurb || ''}</div>`;
      const cb = lab.querySelector('input');
      cb.addEventListener('change', () => lab.classList.toggle('on', cb.checked));
      featuredRoot.appendChild(lab);
    }
  }
  const grid = document.getElementById('kinkGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const k of kinks.filter((x) => !x.featured)) {
    const on = enabledMap[k.id] !== undefined ? !!enabledMap[k.id] : k.enabled !== false;
    const lab = document.createElement('label');
    lab.className = 'kink-item' + (on ? ' on' : '');
    lab.innerHTML = `<input type="checkbox" data-kink="${k.id}" ${on ? 'checked' : ''}/><span>${k.icon || ''} ${k.label || k.id}</span>`;
    const cb = lab.querySelector('input');
    cb.addEventListener('change', () => {
      lab.classList.toggle('on', cb.checked);
    });
    grid.appendChild(lab);
  }
}

export function enabledKinkSet(kinks, overrides) {
  const map = (overrides && overrides.enabledKinks) || {};
  const set = new Set();
  for (const k of kinks) {
    const on = map[k.id] !== undefined ? !!map[k.id] : k.enabled !== false;
    if (on) set.add(k.id);
  }
  return set;
}

export async function loadAllData(base = 'data') {
  const [site, kinksFile, defaults] = await Promise.all([
    fetchJson(`${base}/site.json`),
    fetchJson(`${base}/kinks.json`),
    fetchJson(`${base}/site-config-defaults.json`).catch(() => ({}))
  ]);

  const tasks = {};
  await Promise.all(TASK_FILES.map(async (name) => {
    tasks[name] = await fetchJson(`${base}/tasks/${name}.json`);
  }));

  const lines = tasks.lines || {};
  const CONFIG = {
    ...defaults,
    ...site,
    RING_R: site.RING_R || defaults.RING_R || 54,
    RING_C: 2 * Math.PI * (site.RING_R || defaults.RING_R || 54)
  };
  // strip non-config keys that leaked from defaults nicknames
  const nicknames = defaults.nicknames || [];
  const callNames = defaults.callNames || [];

  const DATA = {
    nicknames,
    callNames,
    instruct: tasks.instruct || [],
    punish: tasks.punish || [],
    train: tasks.train || [],
    jerk: tasks.jerk || [],
    chat: tasks.chat || [],
    order: tasks.order || [],
    recite: tasks.recite || [],
    intro: tasks.intro || [],
    aftercare: tasks.aftercare || [],
    finale: tasks.finale || [],
    insert: tasks.insert || [],
    comments: tasks.comments || {},
    papaOpen: lines.papaOpen || [],
    papaTrans: lines.papaTrans || [],
    papaPraise: lines.papaPraise || [],
    papaClose: lines.papaClose || [],
    stageOpen: lines.stageOpen || {},
    fail1: lines.fail1 || [],
    fail2: lines.fail2 || [],
    shutdown: lines.shutdown || [],
    events: lines.events || [],
    actOpen: lines.actOpen || {}
  };

  return {
    site: CONFIG,
    kinks: kinksFile.kinks || [],
    CONFIG,
    DATA,
    storageKey: site.storageKey || 'tj_cfg_v1',
    sessionUnlockKey: site.sessionUnlockKey || 'tjUnlocked'
  };
}

export function exportConfigBlob(overrides) {
  return new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
}
