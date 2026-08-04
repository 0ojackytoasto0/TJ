/**
 * Build modular TJ app from upstream.html + extracted JSON data.
 * Adds password gate, kink filtering, {host} templating, Web Speech default.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UP = path.join(ROOT, 'tools', 'upstream.html');

const src = fs.readFileSync(UP, 'utf8');

// --- CSS ---
const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/i);
if (!styleMatch) throw new Error('no style');
let css = styleMatch[1];
css += `
/* ---- Password gate & kink config ---- */
#pwgate{z-index:40}
#pwgate .card{text-align:center}
#pwErr{color:#ff6b9d;font-size:13px;margin-top:8px;min-height:1.2em}
.kink-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;max-height:28vh;overflow:auto;text-align:left}
.kink-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:13px}
.kink-item.on{border-color:rgba(255,45,120,.55);background:rgba(255,45,120,.14)}
.kink-item input{accent-color:#ff2d78}
.cfg-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.cfg-actions .act{flex:1;min-height:40px;font-size:13px;padding:8px}
#hostNameIn,#callNamesIn{width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font-size:14px}
#callNamesIn{min-height:64px;resize:vertical;font-family:inherit}
`;
fs.writeFileSync(path.join(ROOT, 'css', 'app.css'), css);

// --- HTML body inner ---
const bodyMatch = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!bodyMatch) throw new Error('no body');
let body = bodyMatch[1];
// Remove inline scripts from body
body = body.replace(/<script[\s\S]*?<\/script>/gi, '');

// Brand placeholders in static HTML
body = body
  .replace(/XrayPapa的调教室/g, '<span data-brand>调教室</span>')
  .replace(/XrayPapa 的调教室/g, '<span data-brand>调教室</span>')
  .replace(/接受 XrayPapa 的规则/g, '接受 <span data-host>主人</span> 的规则')
  .replace(/XRAY PAPA · 调教室/g, '')
  .replace(/XrayPapa 下达指令/g, '<span data-host>主人</span> 下达指令');

// Inject password gate before agegate
const pwGate = `
<div id="pwgate" class="overlay">
  <div class="card glass">
    <h1>🔒 进入调教室</h1>
    <p class="warn">本站为私人页面。请输入访问密码。</p>
    <label>访问密码</label>
    <input id="pwInput" type="password" autocomplete="current-password" placeholder="输入密码" />
    <div id="pwErr"></div>
    <button class="act a big" id="pwUnlock" style="margin-top:14px">解锁进入</button>
    <p class="hint">密码仅在浏览器本地校验（GitHub Pages 无服务端加密）。公开仓库仍可下载源码。</p>
  </div>
</div>
`;

if (body.includes('id="agegate"') || body.includes("id='agegate'")) {
  body = body.replace(/(<div[^>]*id=["']agegate["'][^>]*>)/i, pwGate + '$1');
} else {
  // try without quotes style
  body = pwGate + body;
}

// Inject kink + host config into setup card - find 开播设置 section
const kinkBlock = `
<label>主人称呼</label>
<input id="hostNameIn" type="text" maxlength="24" placeholder="主人" />
<label>称呼池（逗号分隔）</label>
<textarea id="callNamesIn" placeholder="骚狗,废狗,..."></textarea>
<label>启用癖好（关闭后不会抽到）</label>
<div id="kinkGrid" class="kink-grid"></div>
<div class="cfg-actions">
  <button type="button" class="act mid" id="cfgExport">导出配置</button>
  <button type="button" class="act mid" id="cfgImport">导入配置</button>
  <input type="file" id="cfgFile" accept="application/json,.json" hidden />
</div>
`;

if (body.includes('进入直播间')) {
  body = body.replace(
    /(<button[^>]*id=["']startBtn["'][^>]*>[\s\S]*?<\/button>)/i,
    kinkBlock + '\n$1'
  );
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>调教直播间</title>
<link rel="stylesheet" href="css/app.css" />
</head>
<body>
${body}
<script type="module" src="js/boot.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('Wrote index.html + css/app.css');
