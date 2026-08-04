/**
 * Append custom kink packs into task JSON files.
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

const instructExtra = [
  // 夹子
  { t: '拿出乳夹，先在镜头前晃一晃。捏住左边奶头，慢慢夹上去，夹紧后数「一、二、三」——夹好了，再说「主人，骚狗的奶头已经挂好了」。', k: '夹子', w: 1, o: 2, s: 5, h: 3 },
  { t: '两边奶头都夹上夹子，双手垂在身侧，挺胸对着镜头，保持三十秒。夹子一晃就叫一声，不许用手碰。', k: '夹子', o: 3, s: 6, h: 4 },
  { t: '乳夹挂着，开始慢慢撸。每撸十下轻轻扯一下左边夹子，再十下扯右边——扯的时候要喊「好痛好爽」。撸满五十下停手。', k: '夹子', o: 3, s: 6, h: 4 },
  { t: '把夹子夹在包皮或蛋皮上（能承受的力度），对着镜头展示十秒，然后说「骚狗的玩具位，也给夹子留位置了」。受不了就点做不到。', k: '夹子', hi: 1, o: 3, s: 7, h: 4 },
  { t: '乳夹连着细链或绳子，用嘴叼住链子往前爬三步，像被牵着走的狗。爬完跪下，抬头让镜头看清夹子。', k: '夹子', hi: 1, o: 3, s: 7, h: 4 },
  { t: '取下一边夹子，立刻用舌头舔被夹红的奶头，舔满十下，再说「谢主人赏痛」。另一边也照做。', k: '夹子', o: 3, s: 5, h: 3 },
  // 马桶
  { t: '去卫生间，把马桶盖掀开，跪在马桶前，双手撑地，把脸凑到座圈边缘，深深闻三口——闻完对镜头说「骚狗闻得到厕所的味道」。', k: '马桶', w: 1, o: 3, s: 6, h: 4 },
  { t: '跪好，伸出舌头，从马桶座圈外侧慢慢舔到内侧，舔满一圈。舔完把舌头伸给镜头看，说「骚狗的舌头刚扫过马桶」。', k: '马桶', o: 3, s: 7, h: 4 },
  { t: '把头低进马桶上方（不要真的把头伸进污水），保持狗趴姿势三十秒，边喘边说「这才是骚狗该待的位置」。', k: '马桶', o: 3, s: 6, h: 4 },
  { t: '用舌头仔细舔马桶座圈前缘十下，每舔一下喊一声「汪」。舔完不许立刻漱口，先对着镜头张嘴展示。', k: '马桶', hi: 1, o: 3, s: 8, h: 4 },
  { t: '坐在马桶上全裸，双腿分开对着镜头，一边撸一边回想自己刚舔过马桶——撸到边缘立刻停，说「越脏越硬」。', k: '马桶', hi: 1, o: 3, s: 7, h: 4 },
  // 饮尿
  { t: '准备干净杯子，尿进半杯。举到镜头前展示颜色，说「这是骚狗自己的尿」。先闻三口，再小抿一口——可以咽也可以吐，但必须抿。', k: '饮尿', w: 1, o: 3, s: 7, h: 4 },
  { t: '把杯子里的尿含在嘴里十秒，腮帮子鼓着给镜头看，再咽下去或吐掉。做完说「主人，骚狗喝过了」。', k: '饮尿', o: 3, s: 8, h: 4 },
  { t: '尿进杯子后，用手指蘸尿涂在嘴唇上，再涂在奶头上，涂完把手指舔干净。说「骚狗连自己的骚味都舍不得浪费」。', k: '饮尿', o: 3, s: 7, h: 4 },
  { t: '跪着，把盛尿的杯子放在地上，学狗趴下，不用手，只用嘴去够杯子边喝一口。够不到就点做不到。', k: '饮尿', hi: 1, o: 3, s: 8, h: 4 },
  { t: '喝一口尿之后立刻开始撸，边撸边说「喝尿的骚狗配射吗」——撸到边缘停手，双手抱头跪好。', k: '饮尿', hi: 1, o: 3, s: 8, h: 4 },
  // 身体涂写
  { t: '用口红、马克笔或水笔，在胸口写下「骚狗」两个字，写完挺胸给镜头看，读一遍「我是骚狗」。', k: '身体涂写', w: 1, o: 2, s: 5, h: 3 },
  { t: '在小腹靠近鸡巴的位置写上「公用」或「玩具」，写完用手指点着字说「这里写的是什么，大声念」。', k: '身体涂写', o: 3, s: 6, h: 4 },
  { t: '在两根大腿内侧各写一个字，拼成「欠操」。写完 M 字开腿展示，保持十五秒。', k: '身体涂写', o: 3, s: 6, h: 4 },
  { t: '对着镜子或镜头，在脸上用口红画狗爪印或写「狗」，画完不许擦，保持到下一条任务结束。', k: '身体涂写', o: 3, s: 6, h: 3 },
  { t: '在屁股上写「请检阅」，写完转过身撅起屁股给镜头看，用手扒开一点，说「字写在骚狗该被看的地方」。', k: '身体涂写', hi: 1, o: 3, s: 7, h: 4 },
  { t: '用精液或口水当「墨水」（若还没射就用口水），在胸口再描一遍「骚狗」，边描边说「骚狗用自己的骚把自己标注」。', k: '身体涂写', hi: 1, o: 3, s: 7, h: 4 }
];

const punishExtra = [
  { t: '罚你两边奶头夹上夹子，原地转三圈，夹子晃得响才算数。', k: '夹子', o: 0, s: 6, h: 3 },
  { t: '罚你扯乳夹十下，每扯一下报数，扯完说「谢主人」。', k: '夹子', o: -1, s: 6, h: 4 },
  { t: '罚你去马桶前跪好，舔座圈五下，舔完不许漱口三十秒。', k: '马桶', o: -1, s: 7, h: 4 },
  { t: '罚你闻马桶十口气，每口说「骚狗配待厕所」。', k: '马桶', o: -1, s: 6, h: 4 },
  { t: '罚你喝一口自己的尿，喝完张嘴给镜头看。', k: '饮尿', o: -1, s: 8, h: 4 },
  { t: '罚你把尿涂在脸上，保持一分钟再擦。', k: '饮尿', o: -1, s: 7, h: 4 },
  { t: '罚你在额头写「废狗」，写完对着镜头念十遍。', k: '身体涂写', o: 0, s: 6, h: 3 },
  { t: '罚你在鸡巴根部写「禁止射精」，写完双手抱头跪好一分钟。', k: '身体涂写', o: -1, s: 7, h: 4 }
];

const orderExtra = [
  { t: '观众点菜：把乳夹夹上，对着镜头扭腰二十下，夹子要晃起来。', k: '夹子', o: 2, s: 5, h: 3 },
  { t: '观众点菜：去舔马桶座圈一圈，边舔边开着摄像头。', k: '马桶', o: 2, s: 7, h: 4 },
  { t: '观众点菜：当众喝一口尿，喝完说「谢谢观众爸爸」。', k: '饮尿', o: 2, s: 8, h: 4 },
  { t: '观众点菜：在胸前写今晚观众最多的那个脏字（自己选），写完展示。', k: '身体涂写', o: 2, s: 6, h: 3 }
];

const commentExtra = {
  dirty: [
    { t: '乳夹一晃我鸡鸡都跟着晃，操', k: '夹子', g: 'dirty' },
    { t: '夹子夹奶头那段绝了，疼出眼泪最好看', k: '夹子', g: 'dirty' },
    { t: '舔马桶？这狗是真的下贱，我硬了', k: '马桶', g: 'dirty' },
    { t: '厕所狗本狗，座圈都给他舔亮了', k: '马桶', g: 'dirty' },
    { t: '喝尿那口我隔着屏幕都咽了口唾沫', k: '饮尿', g: 'dirty' },
    { t: '尿壶本壶，再喝一口给爷看', k: '饮尿', g: 'dirty' },
    { t: '字写胸口上了，这才叫标注好的玩具', k: '身体涂写', g: 'dirty' },
    { t: '欠操两个字写大腿上，艺术啊兄弟们', k: '身体涂写', g: 'dirty' }
  ],
  instruct: [
    { t: '夹子玩得比我女朋友还会，服了', k: '夹子', g: 'dirty' },
    { t: '厕所说走就走，这狗胆真大', k: '马桶', g: 'dirty' },
    { t: '饮尿挑战通过，弹幕扣1', k: '饮尿', g: 'cheer' },
    { t: '身体当小黑板用，主人会玩', k: '身体涂写', g: 'cheer' }
  ]
};

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

const instruct = mergeByText(read('instruct.json'), instructExtra);
const punish = mergeByText(read('punish.json'), punishExtra);
const order = mergeByText(read('order.json'), orderExtra);
write('instruct.json', instruct);
write('punish.json', punish);
write('order.json', order);

const comments = read('comments.json');
for (const [pool, list] of Object.entries(commentExtra)) {
  if (!comments[pool]) comments[pool] = [];
  comments[pool] = mergeByText(comments[pool], list);
}
write('comments.json', comments);

console.log('instruct', instruct.length, 'punish', punish.length, 'order', order.length);
console.log('added custom kink packs');
