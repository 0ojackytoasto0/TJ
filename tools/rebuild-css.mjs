import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'tools', 'upstream.html'), 'utf8');
const styles = [...src.matchAll(/<style>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
let css = styles.join('\n\n/* ---- next style block ---- */\n\n');
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
#hostNameIn,#callNamesIn{width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font-size:14px;outline:none}
#callNamesIn{min-height:64px;resize:vertical;font-family:inherit}
#frame::after{content:var(--frame-caption,"调教直播间");}
`;
fs.writeFileSync(path.join(ROOT, 'css', 'app.css'), css);
console.log('css bytes', css.length, 'blocks', styles.length);
