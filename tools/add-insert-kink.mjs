/**
 * Append 假鸡巴 / 肛塞 tasks into existing pools.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(ROOT, 'data', 'tasks');

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(T, name), 'utf8'));
}
function write(name, data) {
  fs.writeFileSync(path.join(T, name), JSON.stringify(data, null, 2) + '\n');
}
function mergeByText(arr, extra) {
  const seen = new Set(arr.map((x) => x.t));
  for (const e of extra) {
    if (!seen.has(e.t)) {
      arr.push(e);
      seen.add(e.t);
    }
  }
  return arr;
}

const instructExtra = [
  { t: '把肛塞拿到镜头前亲一下，再涂润滑，跪着自己塞进去。塞稳后夹紧十秒，说：「骚狗的尾巴装好了。」', k: '假鸡巴', w: 1, o: 2, s: 5, h: 3 },
  { t: '塞着肛塞做十个深蹲，每蹲一次底座要明显顶一下。蹲完撅给镜头看，确认没掉。', k: '假鸡巴', o: 3, s: 6, h: 4 },
  { t: '肛塞留在里面，只用后面的胀感硬起来——双手背在身后，用会阴收缩让鸡巴抬头。收缩三十下，流水了就展示。', k: '假鸡巴', o: 3, s: 6, h: 4 },
  { t: '把小一号假鸡巴当「开口器」：只含龟头在穴口抽插三十下，专门磨敏感的入口，不许吞深。', k: '假鸡巴', o: 3, s: 6, h: 4 },
  { t: '假鸡巴推进一半，停住，用空出来的手弹自己龟头十下。弹的时候后面不许把假鸡巴挤出去。', k: '假鸡巴', o: 3, s: 7, h: 4 },
  { t: '侧躺抬腿，把假鸡巴整根缓慢推入，然后保持不动数六十秒。中途发抖也要撑住，数出声。', k: '假鸡巴', hi: 1, o: 3, s: 7, h: 4 },
  { t: '骑乘位吞到底后，画圈扭胯二十圈，像在用后面磨主人。扭完拔出到只剩头部，再一坐到底——重复三次。', k: '假鸡巴', hi: 1, o: 4, s: 8, h: 5 },
  { t: '假鸡巴插着，双手撑地做狗爬一圈，每爬三步叫一声「汪」。爬回镜头前，让观众看清还塞着。', k: '假鸡巴', hi: 1, o: 3, s: 7, h: 4 },
  { t: '用嘴给假鸡巴做口交十下当作「润滑预演」，再立刻转到后面插入。插进去后说：「上下两张嘴，都是骚狗的。」', k: '假鸡巴', o: 3, s: 7, h: 4 },
  { t: '肛塞塞好后，在底座上挂一条细绳或纸巾当「尾巴」，摇屁股让它晃。摇满二十下，说：「骚狗有尾巴了。」', k: '假鸡巴', o: 2, s: 5, h: 3 }
];

const punishExtra = [
  { t: '罚你立刻塞入肛塞，夹紧原地踏步一分钟，掉了重来。', k: '假鸡巴', o: 0, s: 6, h: 3 },
  { t: '罚你假鸡巴只进一个头，停在穴口边缘折磨六十秒，不许吞深也不许拔出。', k: '假鸡巴', o: -1, s: 7, h: 4 },
  { t: '罚你含着假鸡巴对镜头道歉十遍「骚狗后面不听话」，每说一遍抽插一下。', k: '假鸡巴', o: -1, s: 7, h: 4 },
  { t: '罚你拔出假鸡巴后，把还湿着的顶端举到镜头前展示，再说「都是骚狗洞里的水」。', k: '假鸡巴', o: -1, s: 7, h: 4 }
];

const orderExtra = [
  { t: '观众点菜：当众塞入肛塞，塞完转一圈给所有角度看。', k: '假鸡巴', o: 2, s: 6, h: 3 },
  { t: '观众点菜：假鸡巴抽插五十下，报数，不许漏数。', k: '假鸡巴', o: 2, s: 7, h: 4 },
  { t: '观众点菜：骑乘吞到底，双手抱头坚持三十秒给镜头看表情。', k: '假鸡巴', o: 2, s: 7, h: 4 },
  { t: '观众点菜：肛塞+乳夹同时上（若没有乳夹就只做肛塞），展示「前后都挂好了」。', k: '假鸡巴', o: 2, s: 7, h: 4 }
];

const trainExtra = [
  { t: '塞肛塞平板支撑四十秒，撑住期间每十秒收缩后穴一次。', k: '假鸡巴', o: 2, s: 5, h: 3, st: -8 },
  { t: '含着假鸡巴（深度自控）做十五个臀桥，每一下顶起都要把假鸡巴「咬住」。', k: '假鸡巴', o: 2, s: 6, h: 4, st: -10 },
  { t: '肛塞深蹲二十个，起来时报数并加一句「尾巴还在」。', k: '假鸡巴', o: 2, s: 5, h: 3, st: -9 }
];

const chatExtra = [
  { t: '老实说：你更怕肛塞整晚含着，还是假鸡巴被主人按着深插？为什么？', k: '假鸡巴', o: 1, s: 3, h: 2 },
  { t: '描述你第一次把东西塞进后面的感觉。如果还没有，就描述你现在看着玩具的心跳。', k: '假鸡巴', o: 1, s: 3, h: 2 },
  { t: '如果今晚必须二选一：被禁止撸、只能用后面高潮，你选接受还是求饶？说出理由。', k: '假鸡巴', o: 1, s: 4, h: 2 }
];

const commentExtra = {
  insert: [
    { t: '后面环节来了，这狗今晚有福了', g: 'cheer' },
    { t: '润滑涂够了没，别伤到，好好玩', g: 'normal' },
    { t: '肛塞一塞上尾巴感就有了，好看', k: '假鸡巴', g: 'dirty' },
    { t: '假鸡巴进去那一下我鸡鸡硬了', k: '假鸡巴', g: 'dirty' },
    { t: '骑乘起伏太骚了，再深一点', k: '假鸡巴', g: 'dirty' },
    { t: '底座都贴紧了还装纯？滚', k: '假鸡巴', g: 'boo' },
    { t: '抽插水声开麦了吗，爷要听', k: '假鸡巴', g: 'dirty' },
    { t: '这洞是真能吃，服了', k: '假鸡巴', g: 'cheer' },
    { t: '慢慢来别硬来，安全第一（真的）', g: 'normal' },
    { t: '尾巴摇起来，狗塑成功', k: '假鸡巴', g: 'wtf' }
  ],
  instruct: [
    { t: '肛塞深蹲我直接看硬了', k: '假鸡巴', g: 'dirty' },
    { t: '假鸡巴磨穴口那段太坏了，好活', k: '假鸡巴', g: 'dirty' }
  ],
  punish: [
    { t: '罚他只含一个头，绝了', k: '假鸡巴', g: 'dirty' }
  ],
  order: [
    { t: '点菜点后庭，这观众懂玩', k: '假鸡巴', g: 'cheer' }
  ],
  train: [
    { t: '塞着尾巴做体训，变态但香', k: '假鸡巴', g: 'dirty' }
  ]
};

write('instruct.json', mergeByText(read('instruct.json'), instructExtra));
write('punish.json', mergeByText(read('punish.json'), punishExtra));
write('order.json', mergeByText(read('order.json'), orderExtra));
write('train.json', mergeByText(read('train.json'), trainExtra));
write('chat.json', mergeByText(read('chat.json'), chatExtra));

const comments = read('comments.json');
for (const [pool, list] of Object.entries(commentExtra)) {
  if (!comments[pool]) comments[pool] = [];
  comments[pool] = mergeByText(comments[pool], list);
}
write('comments.json', comments);

const lines = read('lines.json');
if (!lines.stageOpen) lines.stageOpen = {};
lines.stageOpen.insert = [
  '后庭插入环节。润滑、扩张、玩具——一步步来，{c}。',
  '今晚后面也要上场。听口令，慢慢吃进去，{c}。',
  '观众想看你被填满的样子。准备好假鸡巴和肛塞了吗？'
];
if (!Array.isArray(lines.events)) lines.events = [];
const evExtras = [
  { t: '观众要后庭', txt: '弹幕刷屏：把后面也打开！加一段插入展示。' },
  { t: '尾巴检查', txt: 'XrayPapa：转过身，让我检查你的肛塞还在不在。'.replace('XrayPapa', '{host}') }
];
const evSeen = new Set(lines.events.map((e) => e.t));
for (const e of evExtras) {
  if (!evSeen.has(e.t)) lines.events.push(e);
}
write('lines.json', lines);

console.log('假鸡巴 tasks merged');
