import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const s = fs.readFileSync(path.join(ROOT, 'tools', 'upstream.html'), 'utf8');
const m = s.match(/<script>([\s\S]*?)<\/script>/i);
if (!m) throw new Error('no script');
const js = m[1];
const start = js.indexOf('function $(id)');
if (start < 0) throw new Error('no engine');
const eng = js.slice(start);
fs.writeFileSync(path.join(ROOT, 'tools', 'engine-slice.js'), eng);
console.log('engine-slice', eng.length, 'chars', eng.split(/\n/).length, 'lines');

// Also check index.html for agegate / startBtn
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
console.log('has pwgate', html.includes('id="pwgate"'));
console.log('has agegate', /id=["']agegate["']/.test(html));
console.log('has startBtn', /id=["']startBtn["']/.test(html));
console.log('has kinkGrid', html.includes('kinkGrid'));
console.log('html length', html.length);
