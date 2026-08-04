/**
 * Patch upstream engine into js/game.js for configurable TJ.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let eng = fs.readFileSync(path.join(ROOT, 'tools', 'engine-slice.js'), 'utf8');

// Replace XrayPapa leftovers in engine strings
eng = eng.replace(/XrayPapa/g, '{host}');

// P() — add {host}
eng = eng.replace(
  /function P\(txt\)\{return txt\.replace\(\\\{\\n\\\}\\g,S\.nick\)\.replace\(\\\{\\c\\\}\\g,pick\(DATA\.callNames\)\);\}/,
  `function P(txt){var host=(window.TJ&&TJ.hostName)||(CONFIG&&CONFIG.hostName)||'主人';return String(txt).replace(/\\{n\\}/g,S.nick).replace(/\\{c\\}/g,pick(DATA.callNames)).replace(/\\{host\\}/g,host);}`
);

// Fallback if regex failed (escaping issues)
if (!eng.includes("replace(/\\{host\\}/g")) {
  eng = eng.replace(
    "function P(txt){return txt.replace(/{n}/g,S.nick).replace(/{c}/g,pick(DATA.callNames));}",
    "function P(txt){var host=(window.TJ&&TJ.hostName)||(CONFIG&&CONFIG.hostName)||'主人';return String(txt).replace(/{n}/g,S.nick).replace(/{c}/g,pick(DATA.callNames)).replace(/{host}/g,host);}"
  );
}

// KINK_ICON expand
eng = eng.replace(
  "const KINK_ICON={'脚':'👣','袜子':'🧦','内裤':'🩲','鞋子':'👟','龟头责':'🍆','尿液':'💦','睾丸':'🥚','边缘':'🫠','寸止':'✋','肛门':'🍑','羞耻姿势':'🙇','雄堕':'🐶','体训':'💪','惩罚':'🌶️','后调':'🕊️','撸管':'💦','边缘·高潮':'🔥'};",
  "const KINK_ICON={'脚':'👣','袜子':'🧦','内裤':'🩲','鞋子':'👟','龟头责':'🍆','尿液':'💦','睾丸':'🥚','边缘':'🫠','寸止':'✋','肛门':'🍑','羞耻姿势':'🙇','雄堕':'🐶','体训':'💪','惩罚':'🌶️','后调':'🕊️','撸管':'💦','边缘·高潮':'🔥','夹子':'🔗','马桶':'🚽','饮尿':'🥂','身体涂写':'🖊️'};"
);

// kinkAllowed helper + patch drawPool filter
const kinkHelper = `
function kinkAllowed(task){
  if(!task||!task.k)return true;
  var en=window.TJ&&TJ.enabledKinks;
  if(!en||!en.size)return true;
  return en.has(task.k);
}
function preferBoost(pool){
  var pref=window.TJ&&TJ.preferKinks;
  if(!pref||!pref.size)return pool;
  var hot=pool.filter(function(t){return t.k&&pref.has(t.k);});
  if(hot.length>=Math.ceil(pool.length*0.35))return hot.concat(pool);
  return hot.length?hot.concat(pool):pool;
}
`;

eng = eng.replace('/* ================= 抽卡 ================= */', '/* ================= 抽卡 ================= */\n' + kinkHelper);

// Inside drawPool, after getting pool, filter
eng = eng.replace(
  'function drawPool(key,n,fn,kinkKey){\n const pool=DATA[key];',
  `function drawPool(key,n,fn,kinkKey){
 const raw=DATA[key]||[];
 const pool=preferBoost(raw.filter(function(t,i){t._srcI=i;return kinkAllowed(t);}));`
);

// Fix index tracking - original uses pool indices into DATA[key]. Our filter breaks indices.
// Better approach: rewrite drawPool entirely.

const newDrawPool = `function drawPool(key,n,fn,kinkKey){
 const raw=DATA[key]||[];
 const used=(kinkKey&&S.usedKink[kinkKey])||S.used[key];
 if(!S.used[key])S.used[key]=[];
 let cand=[];
 for(let i=0;i<raw.length;i++){
  const t=raw[i];
  if(!kinkAllowed(t))continue;
  if(fn&&!fn(t))continue;
  cand.push(i);
 }
 // prefer kinks: shuffle prefer first
 const pref=window.TJ&&TJ.preferKinks;
 if(pref&&pref.size){
  cand.sort(function(a,b){
   const ap=raw[a].k&&pref.has(raw[a].k)?0:1;
   const bp=raw[b].k&&pref.has(raw[b].k)?0:1;
   return ap-bp;
  });
 }
 let idxs=cand.filter(function(i){return !used.includes(i);});
 if(idxs.length<n){
  used.length=0;
  idxs=cand.slice();
  if(!idxs.length){
   for(let i=0;i<raw.length;i++)if(kinkAllowed(raw[i]))idxs.push(i);
  }
 }
 idxs=shuffle(idxs).slice(0,n);
 idxs.forEach(function(i){used.push(i);});
 const out=idxs.map(function(i){return Object.assign({},raw[i],{_i:i});});
 if(out.length<n&&raw.length){
  const need=n-out.length;
  const usedSet={};out.forEach(function(o){usedSet[o._i]=1;});
  const extra=shuffle(cand.filter(function(i){return !usedSet[i];})).slice(0,need).map(function(i){return Object.assign({},raw[i],{_i:i});});
  extra.forEach(function(o){used.push(o._i);});
  return out.concat(extra);
 }
 return out;
}`;

// Replace old drawPool function body - find from function drawPool to function themedDraw
eng = eng.replace(/function drawPool\(key,n,fn,kinkKey\)\{[\s\S]*?\n\}\nfunction themedDraw/, newDrawPool + '\nfunction themedDraw');

// Default TTS pack to local (no CDN assets)
eng = eng.replace("let ttsPack='yunyang';", "let ttsPack='local';");

// Event fx map — replace fireEvent
const eventFx = `
const EVENT_FX={
 '观众刷屏加码':function(){S.buff=Math.min(3,S.buff+1);},
 '突袭寸止测试':function(){addShame(4);},
 '全场静默':function(){S.silentT=15000;addShame(3);},
 '观众点名':function(){insertTask('recite',1);},
 '连击加码':function(){S.buff=Math.min(3,S.buff+1);},
 '加练一组':function(){insertTask('train',1);},
 '拍照时间':function(){addShame(3);S.stats.heat=clamp(S.stats.heat+2,0,100);},
 '不许出声':function(){addShame(2);},
 '弹幕稽查':function(){addShame(2);},
 '惩罚预告':function(){S.nextPunishX=2;},
 '高潮预告':function(){S.stats.heat=clamp(S.stats.heat+4,0,100);},
 '全员起立':function(){S.stats.heat=clamp(S.stats.heat+5,0,100);},
 '临时加码':function(){insertTask('instruct',1);},
 '突然加罚':function(){insertTask('punish',1);},
 '弹幕点名':function(){insertTask('recite',1);},
 '福利时间':function(){insertTask('order',1);},
 '气氛组上线':function(){S.stats.heat=clamp(S.stats.heat+5,0,100);},
 '网络卡顿':function(){S.stats.shame=clamp(S.stats.shame+1,0,100);S.stats.heat=clamp(S.stats.heat+1,0,100);},
 '观众报复':function(){S.stats.heat=clamp(S.stats.heat-6,0,100);booComments();},
 '直播间爆火':function(){S.stats.heat=clamp(S.stats.heat+8,0,100);insertTask('order',1);}
};
`;

eng = eng.replace('function fireEvent(ev){\n if(!ev)return;\n showToast(ev.t,ev.txt);\n ev.fx();\n sfx(\'task\');\n}',
  eventFx + `function fireEvent(ev){
 if(!ev)return;
 showToast(ev.t,ev.txt);
 var fx=ev.fx||EVENT_FX[ev.t];
 if(typeof fx==='function')fx();
 sfx('task');
}`);

// Patch init to not wipe our storage; expose as startGameApp
eng = eng.replace(
  'function init(){\n window.addEventListener(\'resize\',fitTopbar);\n window.addEventListener(\'load\',fitTopbar);\n try{\n [\'xraypapa_save_v1\',\'xraypapa_adult\',\'xraypapa_voicepref\',\'xraypapa_sfx\'].forEach(function(k){localStorage.removeItem(k);});\n }catch(e){}',
  `function init(){
 window.addEventListener('resize',fitTopbar);
 window.addEventListener('load',fitTopbar);
 try{}catch(e){}`
);

// Hide agegate initially if password not yet - boot handles overlays
// At end of init, select local pack UI
eng = eng.replace(
  /document\.addEventListener\('DOMContentLoaded',init\);|init\(\);\s*$/,
  ''
);

// Append exports
eng += `

/* ---- TJ bridge ---- */
window.TJGame = {
  init: init,
  applyBrand: function(site){
    var brand = site.brandName || '调教室';
    var host = site.hostName || '主人';
    document.querySelectorAll('[data-brand]').forEach(function(el){el.textContent=brand;});
    document.querySelectorAll('[data-host]').forEach(function(el){el.textContent=host;});
    document.title = brand;
    var frame = document.getElementById('frame');
    if(frame){
      // caption via CSS ::after — set CSS variable
      document.documentElement.style.setProperty('--frame-caption', '"' + (site.frameCaption||brand) + '"');
    }
    CONFIG.hostName = host;
    if(window.TJ) TJ.hostName = host;
  },
  setCallNames: function(arr){ if(arr&&arr.length) DATA.callNames = arr.slice(); },
  getMode: function(){ return modeSel; },
  setMode: function(m){ modeSel = m; }
};
`;

// Fix RING_C if missing from CONFIG (site.json may omit)
const preamble = `/* auto-generated game engine — do not edit by hand; regenerate via tools/patch-engine.mjs */
'use strict';
(function(){
if(typeof CONFIG==='undefined') throw new Error('CONFIG missing');
if(typeof DATA==='undefined') throw new Error('DATA missing');
if(!CONFIG.RING_C) CONFIG.RING_C = 2*Math.PI*(CONFIG.RING_R||54);
`;

const out = preamble + eng + '\n})();\n';
fs.writeFileSync(path.join(ROOT, 'js', 'game.js'), out);
console.log('Wrote js/game.js', out.length);

// Verify key patches
const checks = ['kinkAllowed', 'EVENT_FX', "ttsPack='local'", 'TJGame', '{host}'];
for (const c of checks) console.log(c, out.includes(c));
