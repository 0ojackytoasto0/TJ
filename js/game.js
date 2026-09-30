/* auto-generated game engine — do not edit by hand; regenerate via tools/patch-engine.mjs */
'use strict';
(function(){
if(typeof CONFIG==='undefined') throw new Error('CONFIG missing');
if(typeof DATA==='undefined') throw new Error('DATA missing');
if(!CONFIG.RING_C) CONFIG.RING_C = 2*Math.PI*(CONFIG.RING_R||54);
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function R(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function fmtTime(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function isCall(){return !!(window.TJ&&TJ.mode==='facetime');}
function hostLabel(){return (window.TJ&&TJ.hostName)||(CONFIG&&CONFIG.hostName)||'主人';}
function phrase(txt){
  var s=String(txt==null?'':txt);
  if(!isCall())return s;
  return s
    .replace(/直播间/g,'通话')
    .replace(/模拟观众/g,'主人')
    .replace(/观众们/g,'主人')
    .replace(/观众/g,'主人')
    .replace(/弹幕/g,'私信')
    .replace(/开播/g,'接通')
    .replace(/停播/g,'挂断')
    .replace(/上播/g,'接通')
    .replace(/主播/g,'你')
    .replace(/在线围观/g,'盯着你')
    .replace(/人在看/g,'人一通')
    .replace(/人在线/g,'加密通道');
}
function P(txt){
  var host=hostLabel();
  var nick=(S&&S.nick)||'骚狗';
  var names=(DATA&&DATA.callNames&&DATA.callNames.length)?DATA.callNames:['骚狗'];
  return phrase(String(txt)
    .replace(/\{n\}/g,nick)
    .replace(/\{c\}/g,pick(names))
    .replace(/\{host\}/g,host));
}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function setText(id,txt){var el=$(id);if(el)el.textContent=txt;}
function setHtml(id,html){var el=$(id);if(el)el.innerHTML=html;}
function setHidden(id,v){var el=$(id);if(el)el.hidden=!!v;}

/* ================= 状态 / 存档 ================= */
let S=null;
let modeSel='easy';
let skipIntroSel=false;
let busy=false;
let nickConfirmed=false;
let paused=false,jerkRemainMs=null,chatRemainMs=null,chatDeadline=0;
const LABELS={warmup:'开场热身',intro:'开播引导',instruct:'指令性任务',jerk:'倒计时撸管',chat:'休息问答',punish:'惩罚任务',order:'观众点菜',recite:'口令跟读',insert:'后庭插入',climax:'高潮收束',aftercare:'后调安抚'};
const LABELS_CALL={warmup:'开场热身',intro:'接通引导',instruct:'指令性任务',jerk:'倒计时撸管',chat:'休息问答',punish:'惩罚任务',order:'主人加码',recite:'口令跟读',insert:'后庭插入',climax:'高潮收束',aftercare:'后调安抚',rules:'接通规矩',arrive:'场景就位',body:'身体指令',place_task:'场景任务',combo:'组合任务'};
function stageLabelOf(type){return (isCall()?LABELS_CALL:LABELS)[type]||type;}

function newState(nick,mode){
  return {
    v:2,nick:nick,mode:mode,cam:false,
    stats:{obey:20,shame:10,heat:20,stamina:mode==='hard'?90:null},
    stages:[],si:0,
    failTotal:0,failStreak:0,combo:0,
    audience:[],skipCount:0,refusals:0,done:0,
    startedAt:Date.now(),maxShame:10,maxHeat:20,
    used:{instruct:[],punish:[],train:[],jerk:[],chat:[],order:[],recite:[],aftercare:[],insert:[]},
    usedKink:{},
    forced:false,log:[],buff:0,silentT:0,nextPunishX:1,
    finaleType:null,violated:false,stageIntro:false,avoidKink:null,avoidTurns:0,
    curAct:0,chainAudienceAngry:false,chainCombo:false,chainViral:false,_lastStats:null,
    scenario:null,
    memory:null,
    callSpeakGen:0
  };
}
function saveGame(){
  // 一次性直播：不存档。每次开播都是全新的连麦。
}
function unlock(){
  busy=false;
  const a=$('btnA'),b=$('btnB');
  if(a){a.disabled=false;a.classList.remove('dim');}
  if(b){b.disabled=false;b.classList.remove('dim');}
}
function setBtn(id,label){
  const b=$(id);
  if(!b)return;
  const lb=b.querySelector?b.querySelector('.blabel'):null;
  if(lb)lb.textContent=label;
}

/* ================= 抽卡 ================= */

function kinkAllowed(task){
  if(!task||!task.k)return true;
  var en=window.TJ&&TJ.enabledKinks;
  if(!en)return true;
  return en.has(task.k);
}
function kinkOn(id){
  var en=window.TJ&&TJ.enabledKinks;
  if(!en)return true;
  return en.has(id);
}
function preferBoost(pool){
  var pref=window.TJ&&TJ.preferKinks;
  if(!pref||!pref.size)return pool;
  var hot=pool.filter(function(t){return t.k&&pref.has(t.k);});
  if(hot.length>=Math.ceil(pool.length*0.35))return hot.concat(pool);
  return hot.length?hot.concat(pool):pool;
}

function drawPool(key,n,fn,kinkKey){
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
}
function themedDraw(poolKey,n,excludeK,extra){
  const ex=excludeK?function(t){return t.k!==excludeK;}:null;
  const all=function(t){return (!ex||ex(t))&&(!extra||extra(t));};
  return drawPool(poolKey,n,all);
}

/* ================= 环节 ================= */
const KINK_ICON={'脚':'👣','袜子':'🧦','内裤':'🩲','鞋子':'👟','龟头责':'🍆','尿液':'💦','睾丸':'🥚','边缘':'🫠','寸止':'✋','肛门':'🍑','羞耻姿势':'🙇','雄堕':'🐶','惩罚':'🌶️','后调':'🕊️','撸管':'💦','边缘·高潮':'🔥','夹子':'🔗','马桶':'🚽','饮尿':'🥂','身体涂写':'🖊️','橡皮筋':'🪢','胶带':'🩹','直尺':'📏','胶水':'🧴','胶棒':'🖍️','假鸡巴':'🍆'};
const STATIONERY_KINKS=['夹子','身体涂写','橡皮筋','胶带','直尺'];
const GLUE_KINKS=['胶水','胶棒'];
function buildInsertTasks(){
  const pool=(DATA.insert||[]).filter(kinkAllowed);
  if(!pool.length)return themedDraw('instruct',3,S.avoidKink,function(t){return t.k==='假鸡巴'||t.k==='肛门';});
  const byStep={};
  pool.forEach(function(t){
    const s=t.step||1;
    if(!byStep[s])byStep[s]=[];
    byStep[s].push(t);
  });
  const steps=Object.keys(byStep).map(Number).sort(function(a,b){return a-b;});
  const hard=S.mode==='hard';
  // easy: skip every other deep step sometimes; hard: full ladder
  let use=steps;
  if(!hard&&steps.length>4){
    use=steps.filter(function(s,i){return i===0||i===steps.length-1||i%2===1;});
    if(use.length<4)use=steps.slice(0,4);
  }
  return use.map(function(s){return Object.assign({},pick(byStep[s]));});
}
function buildTasks(type,act){
  const hard=S.mode==='hard';
  switch(type){
    case 'intro': return DATA.intro.map(function(x){
      var t=Object.assign({},x);
      if(isCall())delete t.speak; // 一对一：不开口问答，只听指令
      return t;
    });
    case 'warmup': return drawPool('instruct',2,function(t){return t.w;});
    case 'instruct': {
      const n=hard?R(3,4):R(2,3);
      if(act===3){
        const got=themedDraw('instruct',n,S.avoidKink,function(t){return t.hi;});
        if(got.length>=n)return got;
        return got.concat(themedDraw('instruct',n-got.length,S.avoidKink));
      }
      if(act===1)return themedDraw('instruct',n,S.avoidKink,function(t){return !t.hi;});
      return themedDraw('instruct',n,S.avoidKink);
    }
    case 'jerk': {
      const n=(act===3)?(hard?R(2,3):R(1,2)):(hard?R(1,2):1);
      const rounds=[];
      for(let i=0;i<n;i++)rounds.push(pickJerk(false));
      return rounds;
    }
    case 'climax': {
      const rounds=[pickJerk(true)];
      if(hard&&Math.random()<0.5)rounds.push(pickJerk(true));
      rounds.push(pickFinale());
      return rounds;
    }
    case 'chat': return themedDraw('chat',hard?3:2,S.avoidKink);
    case 'punish': {
      const ts=themedDraw('punish',R(1,2),S.avoidKink);
      if(S.nextPunishX>1){ts.forEach(t=>{t.o=(t.o||0)*S.nextPunishX;t.s=(t.s||0)*S.nextPunishX;t.h=(t.h||0)*S.nextPunishX;});}
      S.nextPunishX=1;
      return ts;
    }
    case 'order': return themedDraw('order',R(1,2),S.avoidKink);
    case 'recite': return drawPool('recite',hard?R(2,3):2);
    case 'insert': return buildInsertTasks();
    case 'aftercare': return drawPool('aftercare',3);
  }
}
function pickJerk(climax){
  const cands=DATA.jerk.filter(j=>kinkAllowed(j)&&(climax?(j.dur>=5):true));
  const pool=cands.length?cands:DATA.jerk.filter(j=>climax?(j.dur>=5):true);
  const j=pick(pool.length?pool:DATA.jerk);
  // 一对一：倒计时别拖太长，靠任务数量拉长流程
  const dur=isCall()
    ?(climax?R(48,72):R(26,45))
    :(climax?R(...CONFIG.CLIMAX_DUR):R(...CONFIG.JERK_DUR));
  return {t:j.t,dur:dur,steps:j.steps,climax:!!climax,k:j.k};
}
function taskDiff(t){
  if(!t)return 2;
  if(t.diff!=null)return clamp(+t.diff,1,3);
  if(t.hi)return 3;
  if(t.act!=null)return clamp(+t.act,1,3);
  return 2;
}
function diffLabel(d){
  d=clamp(d||2,1,3);
  return d<=1?'入门':(d>=3?'高强度':'进阶');
}
function taskFam(t){
  if(!t)return '';
  if(t.fam)return t.fam;
  const cond=(t.needCond&&t.needCond.length)?t.needCond.slice().sort().join('+'):'';
  const need=(t.need&&t.need.length)?t.need.slice().sort().join('+'):'';
  return [t.part||'',t.k||'',t.needInsert?1:0,cond,need].join('|');
}
function diffInWindow(d,act){
  const a=clamp(act||2,1,3);
  if(a<=1)return d<=1;
  if(a>=3)return d>=2;
  return d===1||d===2;
}
function filterByDiff(pool,act){
  if(!pool||!pool.length)return [];
  const a=clamp(act||2,1,3);
  const hasScale=pool.some(function(t){return t&&(t.diff!=null||t.act!=null||t.hi);});
  if(!hasScale)return pool.slice();
  const exact=pool.filter(function(t){return taskDiff(t)===a;});
  if(exact.length)return exact;
  const soft=pool.filter(function(t){return diffInWindow(taskDiff(t),act);});
  return soft.length?soft:pool.slice();
}
function pickVariant(list,act,usedKeys){
  if(!list||!list.length)return null;
  const a=clamp(act||2,1,3);
  let bag=list.filter(function(t){return diffInWindow(taskDiff(t),act);});
  if(!bag.length)bag=list.slice();
  const fresh=bag.filter(function(t){
    const key=(t.t||'')+(t.part||'');
    return !(usedKeys&&usedKeys[key]);
  });
  if(fresh.length)bag=fresh;
  let bestDist=99,cands=[];
  bag.forEach(function(t){
    const dist=Math.abs(taskDiff(t)-a);
    if(dist<bestDist){bestDist=dist;cands=[t];}
    else if(dist===bestDist)cands.push(t);
  });
  return cands.length?pick(cands):null;
}
function chooseFromPool(pool,act,usedKeys){
  if(!pool||!pool.length)return null;
  const grouped={};
  pool.forEach(function(t){
    const f=taskFam(t);
    if(!grouped[f])grouped[f]=[];
    grouped[f].push(t);
  });
  const a=clamp(act||2,1,3);
  const famKeys=Object.keys(grouped);
  const exact=famKeys.filter(function(f){
    return grouped[f].some(function(t){return taskDiff(t)===a;});
  });
  const inWin=famKeys.filter(function(f){
    return grouped[f].some(function(t){return diffInWindow(taskDiff(t),act);});
  });
  const order=shuffle(exact.length?exact:(inWin.length?inWin:famKeys));
  for(let i=0;i<order.length;i++){
    const best=pickVariant(grouped[order[i]],act,usedKeys||{});
    if(best)return best;
  }
  return null;
}
function insertStepDiff(step){
  const s=step||1;
  if(s<=2)return 1;
  if(s<=4)return 2;
  return 3;
}
function rhythmDiffByOrder(i,n){
  if(n<=1)return 2;
  if(i<=0)return 1;
  if(i>=n-1)return 3;
  return 2;
}
const RHYTHM_EASY_STEPS=[
  {p:8,txt:'涂好润滑，把头部推进去，然后慢慢抽插。只进一半，跟着节拍一进一出，寻找后面的感觉。'},
  {p:30,txt:'慢一点，轻轻抽，每一下退到只剩头部再推进。不许碰前面。'},
  {p:48,txt:'停！含住不动，深呼吸三次。'},
  {p:64,txt:'继续，保持慢节奏抽插，夹一下再放松。'},
  {p:84,txt:'匀速，别加快，喘给主人听。'},
  {p:95,txt:'停住含着，双手离开前面，等这一段结束。'}
];
const RHYTHM_MID_STEPS=[
  {p:6,txt:'开始抽插，跟着节拍进出，停在你能承受的深度。'},
  {p:22,txt:'快一点，抽插加快，每四下在心里数一下。前面不许用手。'},
  {p:40,txt:'停！含到最深，不许拔出来，数五秒。'},
  {p:55,txt:'继续抽插，匀速，夹紧再松开。'},
  {p:74,txt:'加速，往深处顶，但不要硬来。'},
  {p:90,txt:'保持节奏，不许射，也不许摸前面。'},
  {p:96,txt:'停住含着，扒开给镜头看，喘着等结束。'}
];
const RHYTHM_HARD_STEPS=[
  {p:5,txt:'开始抽插，跟上节拍，不许停。'},
  {p:18,txt:'快一点，用力抽插，让主人听见喘息。'},
  {p:34,txt:'冲刺，更快更用力，屁股自己送上去。'},
  {p:48,txt:'停！含住最深，深呼吸三次再继续。'},
  {p:60,txt:'继续抽插，这次要更接近边缘，前面仍然不许碰。'},
  {p:76,txt:'全力抽插，冲上边缘，夹着别射。'},
  {p:90,txt:'边缘！含着停住，抖着等，不许射。'},
  {p:96,txt:'再慢抽几下就停，含住等到倒计时结束。'}
];
const RHYTHM_CLIMAX_STEPS=[
  {p:6,txt:'最后一段。跟着节拍抽插，前面先别碰。'},
  {p:22,txt:'快一点，抽插加快，每一下都进到你能承受的深度。'},
  {p:40,txt:'停！含住最深，深呼吸三次。'},
  {p:54,txt:'继续抽插，夹紧，把快感留在后面。'},
  {p:72,txt:'加速抽插，往边缘冲。前面只许虚握，不许自己撸。'},
  {p:86,txt:'冲刺，全力抽插。'},
  {p:95,txt:'可以射了。射的时候含着，不许自己拔出来。'}
];
const STROKE_EASY_STEPS=[
  {p:8,txt:'开始慢慢撸，只套半根，跟着节拍寻找感觉。'},
  {p:30,txt:'慢一点，轻轻撸，在龟头多停一下。'},
  {p:48,txt:'停！松开手，深呼吸三次。'},
  {p:64,txt:'继续，保持慢节奏，另一只手可以摸乳头。'},
  {p:84,txt:'匀速，别加快，喘给主人听。'},
  {p:95,txt:'停住，把手拿开，等这一段结束。'}
];
const STROKE_MID_STEPS=[
  {p:6,txt:'开始撸，跟着节拍整根套弄。'},
  {p:22,txt:'快一点，加速，每四下在心里数一下。'},
  {p:40,txt:'停！捏住根部，数五秒。'},
  {p:55,txt:'继续，匀速撸，把蛋托起来给镜头看。'},
  {p:74,txt:'加速，往边缘冲，但不要越过。'},
  {p:90,txt:'边缘了就停！双手离开。'},
  {p:96,txt:'再慢撸十几下，停住等结束。'}
];
const STROKE_HARD_STEPS=[
  {p:5,txt:'开始撸，跟上节拍，不许停。'},
  {p:18,txt:'快一点，用力撸，喘给主人听。'},
  {p:34,txt:'冲刺，更快更用力。'},
  {p:48,txt:'停！捏住根部，深呼吸三次。'},
  {p:60,txt:'继续撸，这次要更接近边缘。'},
  {p:76,txt:'全力撸，冲上边缘，夹着别射。'},
  {p:90,txt:'边缘！双手举过头顶，抖着等，不许射。'},
  {p:96,txt:'再慢撸几下就停，等到倒计时结束。'}
];
const STROKE_CLIMAX_STEPS=[
  {p:6,txt:'最后一段。跟着节拍撸，先别冲太快。'},
  {p:22,txt:'快一点，加速，整根套弄。'},
  {p:40,txt:'停！捏住根部，深呼吸三次。'},
  {p:55,txt:'继续撸，往边缘冲。'},
  {p:74,txt:'冲刺，更快更用力。'},
  {p:88,txt:'全力撸，看着镜头。'},
  {p:95,txt:'可以射了。射的时候不许躲开。'}
];
function rhythmDur(diff,climax){
  const hard=S&&S.mode==='hard';
  let dur=climax?R(52,68):(diff<=1?R(28,36):(diff===2?R(38,48):R(48,60)));
  if(hard&&(climax||diff>=2))dur+=R(4,10);
  return dur;
}
function buildRhythmStroke(act,climax){
  const diff=climax?3:clamp(act||2,1,3);
  const steps=climax?STROKE_CLIMAX_STEPS:(diff<=1?STROKE_EASY_STEPS:(diff===2?STROKE_MID_STEPS:STROKE_HARD_STEPS));
  const titles={1:'跟着慢节拍撸',2:'跟着节拍撸',3:'跟上快节拍撸'};
  return {
    t:climax?'跟着节拍撸，到点再射':titles[diff],
    dur:rhythmDur(diff,climax),
    steps:steps,
    climax:!!climax,
    strokeRhythm:true,
    strokeClimax:!!climax,
    diff:diff,
    k:climax?'边缘·高潮':'撸管',
    o:3,s:3+diff,h:2+diff
  };
}
function buildStrokeClimax(){
  const rounds=[buildRhythmStroke(3,true),Object.assign({},pickFinale(),{diff:3})];
  return rounds;
}
function buildRhythmInsert(act,climax){
  const diff=climax?3:clamp(act||2,1,3);
  const steps=climax?RHYTHM_CLIMAX_STEPS:(diff<=1?RHYTHM_EASY_STEPS:(diff===2?RHYTHM_MID_STEPS:RHYTHM_HARD_STEPS));
  const titles={1:'含着，跟着慢节拍抽插',2:'含着，跟着节拍抽插',3:'含着，跟上快节拍抽插'};
  return {
    t:climax?'跟着节拍抽插，到点再射':titles[diff],
    dur:rhythmDur(diff,climax),
    steps:steps,
    climax:!!climax,
    insertRhythm:true,
    insertClimax:!!climax,
    diff:diff,
    k:'假鸡巴',
    needInsert:true,
    o:3,s:3+diff,h:2+diff
  };
}
function buildScenarioInsertOnly(sc,act){
  const target=clamp(act||1,1,3);
  const pool=(DATA.insert||[]).filter(kinkAllowed);
  let band=pool.filter(function(t){return insertStepDiff(t.step)===target;});
  if(!band.length)band=pool.filter(function(t){return Math.abs(insertStepDiff(t.step)-target)<=1;});
  const n=(target>=3&&S.mode==='hard')?2:1;
  const bag=band.slice();
  const picked=[];
  while(picked.length<n&&bag.length){
    const i=Math.floor(Math.random()*bag.length);
    const src=bag.splice(i,1)[0];
    picked.push(Object.assign({},src,{diff:insertStepDiff(src.step)}));
  }
  if(picked.length)return picked.map(function(t){return bindToyText(t,sc);});
  const fb=reuseScenarioPool('instruct',sc,target,1,function(t){return t.k==='假鸡巴'||t.k==='肛门';});
  return fb.length?fb.map(function(t){return bindToyText(t,sc);}):[];
}
function buildScenarioInsertJerk(sc,act){
  return [buildRhythmInsert(act,false)];
}
function buildInsertClimax(sc){
  const prep=bindToyText({
    papa:'最后冲刺。',
    t:'把 {toy} 插稳含住。这一段跟着节拍抽插，前面先别撸。倒计时最后才许射，射的时候后面不许自己拔出来。',
    k:'假鸡巴',
    needInsert:true,
    diff:3,
    o:3,s:6,h:5
  },sc);
  return [prep,buildRhythmInsert(3,true)];
}
function pickFinale(){
  return {...pick(DATA.finale)};
}
function makeStage(type,act){
  const st={type:type,label:stageLabelOf(type),act:(act===undefined?2:act),tasks:[],idx:0};
  st.tasks=buildTasks(type,st.act);
  return st;
}
/** 一对一：地点 + 条件 → 有始有终的场景剧本 */
function scenarioData(){
  return (DATA&&DATA.scenarios)||null;
}
function scenarioCondOn(sc,id){
  if(!sc||!sc.conditions)return false;
  return !!sc.conditions[id];
}
function scenarioToyCatalog(){
  return ((scenarioData()&&DATA.scenarios.toys)||[]);
}
function scenarioHasBellPlug(sc){
  if(!sc||!sc.toys||!sc.toys.length)return false;
  return sc.toys.some(function(t){
    return t.id==='plug_bell'||(t.label&&t.label.indexOf('铃铛')>=0);
  });
}
function scenarioHasToyTag(sc,tag){
  if(!sc||!sc.toys||!sc.toys.length)return false;
  return sc.toys.some(function(t){return (t.tags||[]).indexOf(tag)>=0;});
}
function withStayPlugNote(task){
  if(!S||!S.stayPluggedForeplay||!task)return task;
  const t=Object.assign({},task);
  if(t.stayPlugNote)return t;
  t.stayPlugNote=pick([
    '铃铛肛塞继续含着，别自己拔。',
    '后面铃铛还在，扭两下让主人听见。',
    '塞着铃铛做完这条，走动要有响声。'
  ]);
  return t;
}
function bellPlugInTask(sc){
  return bindToyText({
    papa:'铃铛今晚有活干。',
    t:'把 {plug} 涂润滑，慢慢塞进去直到底座贴紧。走两步，让主人听见铃铛响。塞好后，前戏阶段不许自己拔——响了才算听话。',
    k:'肛门',
    needToyTags:['plug'],
    o:3,s:5,h:4,
    stayPlugStart:true
  },sc);
}
function bellPlugOutTask(sc){
  return bindToyText({
    papa:'前戏收尾。',
    t:'慢慢把铃铛肛塞拔出来，给镜头看看底座和湿痕，说「换更大的」。拔之前再晃两下铃铛。',
    k:'肛门',
    needToyTags:['plug'],
    o:2,s:4,h:3,
    stayPlugEnd:true
  },sc);
}
function scenarioPickToy(sc,tag){
  if(!sc||!sc.toys||!sc.toys.length)return null;
  const pool=tag?sc.toys.filter(function(t){return (t.tags||[]).indexOf(tag)>=0;}):sc.toys;
  return pool.length?pick(pool):null;
}
function scenarioInsertAllowed(sc){
  // 勾了「允许插入」且开了癖好，或手头有可插入玩具
  const byCond=scenarioCondOn(sc,'insert')&&kinkOn('假鸡巴');
  const byToy=scenarioHasToyTag(sc,'insert');
  return !!(byCond||byToy);
}
function fillToyPlaceholders(txt,sc){
  if(!txt||!sc)return txt;
  var out=String(txt);
  function repl(token,tag){
    if(out.indexOf(token)<0)return;
    var toy=scenarioPickToy(sc,tag)||scenarioPickToy(sc,null);
    var label=toy?toy.label:(tag==='plug'?'肛塞':(tag==='dildo'?'假鸡巴':(tag==='vibe'?'跳蛋':'玩具')));
    out=out.split(token).join(label);
  }
  repl('{plug}','plug');
  repl('{dildo}','dildo');
  repl('{vibe}','vibe');
  repl('{candle}','candle');
  repl('{stroker}','stroker');
  repl('{toy}',null);
  return out;
}
function bindToyText(task,sc){
  if(!task)return task;
  var t=Object.assign({},task);
  if(t.t)t.t=fillToyPlaceholders(t.t,sc);
  if(t.papa)t.papa=fillToyPlaceholders(t.papa,sc);
  return t;
}
function taskNeedOk(task,sc){
  if(!task||!sc)return true;
  const props=sc.props||[];
  if(task.need&&task.need.length){
    for(let i=0;i<task.need.length;i++){
      if(props.indexOf(task.need[i])<0)return false;
    }
  }
  if(task.needInsert&&!scenarioInsertAllowed(sc))return false;
  if(task.needToyTags&&task.needToyTags.length){
    var okTag=false;
    for(let i=0;i<task.needToyTags.length;i++){
      if(scenarioHasToyTag(sc,task.needToyTags[i])){okTag=true;break;}
    }
    if(!okTag)return false;
  }
  if(task.needToys&&task.needToys.length){
    const ids=(sc.toys||[]).map(function(t){return t.id;});
    for(let i=0;i<task.needToys.length;i++){
      if(ids.indexOf(task.needToys[i])<0)return false;
    }
  }
  if(task.needCond&&task.needCond.length){
    for(let i=0;i<task.needCond.length;i++){
      if(!scenarioCondOn(sc,task.needCond[i]))return false;
    }
  }
  if(task.needKinks&&task.needKinks.length){
    for(let i=0;i<task.needKinks.length;i++){
      if(!kinkOn(task.needKinks[i]))return false;
    }
  }
  if(task.k){
    const inc=sc.incompatible||[];
    if(inc.indexOf(task.k)>=0)return false;
    if(task.k==='马桶'&&!scenarioCondOn(sc,'toilet'))return false;
    if((task.k==='尿液'||task.k==='饮尿')&&!scenarioCondOn(sc,'wet'))return false;
    if(STATIONERY_KINKS.indexOf(task.k)>=0&&!stationeryOn(sc))return false;
    if(GLUE_KINKS.indexOf(task.k)>=0&&!glueOn(sc))return false;
    if(task.k==='假鸡巴')return scenarioInsertAllowed(sc);
  }
  return kinkAllowed(task);
}
function resolveScenario(){
  const raw=scenarioData();
  const prefs=(window.TJ&&TJ.scenarioPrefs)||{};
  const locations=(raw&&raw.locations)||[];
  if(!locations.length){
    return {id:'fallback',label:'私人空间',props:['floor','bed','mirror'],tags:[],compat:[],incompatible:[],conditions:{},toys:[]};
  }
  let loc=null;
  if(prefs.location&&prefs.location!=='random'){
    loc=locations.find(function(l){return l.id===prefs.location;})||null;
  }
  if(!loc)loc=pick(locations);
  const condDefs=(raw&&raw.conditions)||[];
  const conditions={};
  const randomAll=!!prefs.randomConditions;
  condDefs.forEach(function(c){
    let on;
    if(randomAll){
      on=Math.random()<0.45;
      if(c.default&&Math.random()<0.7)on=true;
    }else if(prefs.conditions&&prefs.conditions[c.id]!==undefined){
      on=!!prefs.conditions[c.id];
    }else if(c.id==='stationery'&&prefs.conditions&&(prefs.conditions.clips!==undefined||prefs.conditions.writing!==undefined)){
      on=!!prefs.conditions.clips||!!prefs.conditions.writing;
    }else{
      on=!!c.default;
    }
    const needs=c.needsKink;
    if(needs){
      const list=Array.isArray(needs)?needs:[needs];
      if(!list.some(function(k){return kinkOn(k);}))on=false;
    }
    if(c.id==='toilet'&&(loc.incompatible||[]).indexOf('马桶')>=0)on=false;
    // 各地点默认都有马桶道具；仅地点明确禁用时关掉
    conditions[c.id]=on;
  });
  // 玩具库存：prefs.toys 为 {id:bool}；全空则不带玩具
  const catalog=scenarioToyCatalog();
  const toyMap=prefs.toys||{};
  const toys=catalog.filter(function(t){return !!toyMap[t.id];}).map(function(t){
    return {id:t.id,label:t.label,tags:(t.tags||[]).slice()};
  });
  // 有可插入玩具时，自动打开插入条件（便于与旧逻辑一致）
  if(toys.some(function(t){return (t.tags||[]).indexOf('insert')>=0;})){
    if(kinkOn('假鸡巴'))conditions.insert=true;
    else conditions.insert=conditions.insert||false;
  }
  return {
    id:loc.id,
    label:loc.label,
    props:(loc.props||[]).slice(),
    tags:(loc.tags||[]).slice(),
    compat:(loc.compat||[]).slice(),
    incompatible:(loc.incompatible||[]).slice(),
    conditions:conditions,
    toys:toys
  };
}
function isInsertishTask(task){
  if(!task)return false;
  if(task.needInsert)return true;
  if(task.k==='假鸡巴'||task.k==='肛门')return true;
  if(task.part==='ass')return true;
  return false;
}
function stationeryOn(sc){
  return scenarioCondOn(sc,'stationery')||scenarioCondOn(sc,'clips')||scenarioCondOn(sc,'writing');
}
function glueOn(sc){
  return scenarioCondOn(sc,'glue');
}
/** 勾选后必须上场的条件（插入另有 insert? 专场） */
const FORCE_CONDS=['stationery','glue','toilet','wet'];
function taskMatchesForceCond(t,condId){
  if(!t||t.cross)return false;
  if(t.needCond&&t.needCond.indexOf(condId)>=0)return true;
  if(condId==='stationery'){
    if(STATIONERY_KINKS.indexOf(t.k)>=0)return true;
    return !!(t.needCond&&(t.needCond.indexOf('clips')>=0||t.needCond.indexOf('writing')>=0));
  }
  if(condId==='glue')return GLUE_KINKS.indexOf(t.k)>=0;
  if(condId==='toilet')return t.k==='马桶';
  if(condId==='wet')return t.k==='尿液'||t.k==='饮尿';
  if(condId==='clips')return t.k==='夹子';
  if(condId==='writing')return t.k==='身体涂写';
  return false;
}
function pickForcedCondTask(sc,act,lastPart,usedKeys,condId){
  const raw=scenarioData();
  const kinds=['place_task','body','combo'];
  for(let ki=0;ki<kinds.length;ki++){
    const kind=kinds[ki];
    const pool=((raw&&raw.beats&&raw.beats[kind])||[]).filter(function(t){
      if(t.loc&&t.loc.length&&t.loc.indexOf(sc.id)<0)return false;
      if(t.hi&&act<2)return false;
      if(lastPart&&t.part&&t.part===lastPart)return false;
      if(!taskNeedOk(t,sc))return false;
      return taskMatchesForceCond(t,condId);
    });
    if(!pool.length)continue;
    const choice=chooseFromPool(pool,act,usedKeys);
    if(!choice)continue;
    const key=(choice.t||'')+(choice.part||'');
    if(usedKeys)usedKeys[key]=1;
    return bindToyText(Object.assign({},choice),sc);
  }
  const pools=['instruct','punish','order'];
  for(let pi=0;pi<pools.length;pi++){
    const ts=reuseScenarioPool(pools[pi],sc,act,1,function(t){return taskMatchesForceCond(t,condId);});
    if(ts.length)return bindToyText(ts[0],sc);
  }
  return null;
}
const CROSS_RULES=[
  {id:'sock_toilet',ok:function(sc){return kinkOn('袜子')&&scenarioCondOn(sc,'toilet');}},
  {id:'sock_drink',ok:function(sc){return kinkOn('袜子')&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}},
  {id:'sock_insert',ok:function(sc){return kinkOn('袜子')&&scenarioInsertAllowed(sc);}},
  {id:'sock_clip',ok:function(sc){return kinkOn('袜子')&&kinkOn('夹子')&&stationeryOn(sc);}},
  {id:'sock_write',ok:function(sc){return kinkOn('袜子')&&kinkOn('身体涂写')&&stationeryOn(sc);}},
  {id:'write_toilet',ok:function(sc){return kinkOn('身体涂写')&&stationeryOn(sc)&&scenarioCondOn(sc,'toilet');}},
  {id:'write_drink',ok:function(sc){return kinkOn('身体涂写')&&stationeryOn(sc)&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}},
  {id:'clip_drink',ok:function(sc){return kinkOn('夹子')&&stationeryOn(sc)&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}},
  {id:'clip_insert',ok:function(sc){return kinkOn('夹子')&&stationeryOn(sc)&&scenarioInsertAllowed(sc);}},
  {id:'insert_toilet',ok:function(sc){return scenarioInsertAllowed(sc)&&scenarioCondOn(sc,'toilet');}},
  {id:'insert_drink',ok:function(sc){return scenarioInsertAllowed(sc)&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}},
  {id:'tape_toilet',ok:function(sc){return kinkOn('胶带')&&stationeryOn(sc)&&scenarioCondOn(sc,'toilet');}},
  {id:'foot_drink',ok:function(sc){return kinkOn('脚')&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}}
];
const TRIPLE_RULES=[
  {id:'sock_clip_insert',ok:function(sc){return kinkOn('袜子')&&kinkOn('夹子')&&stationeryOn(sc)&&scenarioInsertAllowed(sc);}},
  {id:'write_toilet_drink',ok:function(sc){return kinkOn('身体涂写')&&stationeryOn(sc)&&scenarioCondOn(sc,'toilet')&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}},
  {id:'insert_toilet_drink',ok:function(sc){return scenarioInsertAllowed(sc)&&scenarioCondOn(sc,'toilet')&&kinkOn('饮尿')&&scenarioCondOn(sc,'wet');}}
];
function isTripleCross(id){
  for(let i=0;i<TRIPLE_RULES.length;i++){if(TRIPLE_RULES[i].id===id)return true;}
  return false;
}
function injectCrossBeats(beats,sc){
  const out=beats.slice();
  const hits=shuffle(CROSS_RULES.filter(function(rule){return rule.ok(sc);})).filter(function(){return Math.random()<0.55;}).slice(0,3);
  hits.forEach(function(rule,i){
    const ci=out.indexOf('climax');
    let at=Math.floor(out.length*(0.42+i*0.12));
    if(ci>=0)at=Math.min(Math.max(2,at),ci);
    out.splice(at,0,'cross:'+rule.id);
  });
  const triple=shuffle(TRIPLE_RULES.filter(function(rule){return rule.ok(sc);})).filter(function(){return Math.random()<0.55;})[0];
  if(triple){
    const ci=out.indexOf('climax');
    out.splice(ci>=0?ci:out.length,0,'cross:'+triple.id);
  }
  return out;
}
function pickCrossTask(sc,act,id,usedKeys){
  const raw=scenarioData();
  const kinds=['combo','place_task','body'];
  const pool=[];
  kinds.forEach(function(kind){
    ((raw&&raw.beats&&raw.beats[kind])||[]).forEach(function(t){
      if(t.cross!==id)return;
      if(!taskNeedOk(t,sc))return;
      pool.push(t);
    });
  });
  const choice=chooseFromPool(pool,act,usedKeys);
  if(!choice)return null;
  const key=(choice.t||'')+(choice.part||'');
  if(usedKeys)usedKeys[key]=1;
  return bindToyText(Object.assign({},choice),sc);
}
function injectForcedConditionBeats(beats,sc){
  const out=beats.slice();
  const forces=FORCE_CONDS.filter(function(id){return scenarioCondOn(sc,id);});
  if(!forces.length)return out;
  let base=out.indexOf('place_task');
  if(base<0)base=out.indexOf('body');
  if(base<0){
    const ci=out.indexOf('climax');
    base=ci>=0?Math.max(0,ci):out.length;
  }
  forces.forEach(function(id,i){
    const ci=out.indexOf('climax');
    const at=ci>=0?Math.min(base+1+i,ci):Math.min(base+1+i,out.length);
    out.splice(at,0,'force:'+id);
  });
  return out;
}
function pickScenarioBeat(kind,sc,act,lastPart,usedKeys,preferInsert,preferCond){
  const raw=scenarioData();
  let pool=((raw&&raw.beats&&raw.beats[kind])||[]).filter(function(t){
    if(t.loc&&t.loc.length&&t.loc.indexOf(sc.id)<0)return false;
    if(lastPart&&t.part&&t.part===lastPart)return false;
    return taskNeedOk(t,sc);
  });
  if(kind==='arrive'){
    const local=pool.filter(function(t){return t.loc&&t.loc.indexOf(sc.id)>=0;});
    if(local.length)pool=local;
  }
  if(!pool.length)return null;
  let use=pool;
  if(preferCond){
    const hot=pool.filter(function(t){return taskMatchesForceCond(t,preferCond);});
    if(hot.length)use=hot;
  }
  if(preferInsert===true){
    const hot=use.filter(isInsertishTask);
    if(hot.length)use=hot;
  }else if(preferInsert===false){
    const cold=use.filter(function(t){return !isInsertishTask(t);});
    if(cold.length)use=cold;
  }
  const choice=chooseFromPool(use,act,usedKeys);
  if(!choice)return null;
  const key=(choice.t||'')+(choice.part||'');
  if(usedKeys)usedKeys[key]=1;
  return bindToyText(Object.assign({},choice),sc);
}
function reuseScenarioPool(poolKey,sc,act,n,extra){
  const fn=function(t){
    if(!taskNeedOk(t,sc))return false;
    if(extra&&!extra(t))return false;
    return true;
  };
  const raw=(DATA[poolKey]||[]).filter(fn);
  const scaled=filterByDiff(raw,act);
  const allow={};
  (scaled.length?scaled:raw).forEach(function(t){allow[t.t]=1;});
  return drawPool(poolKey,n||1,function(t){return fn(t)&&allow[t.t];});
}
function makeScenarioStage(type,act,tasks){
  return {type:type,label:stageLabelOf(type),act:(act===undefined?2:act),tasks:tasks||[],idx:0};
}

/* ================= 一对一：真人感（记忆 / 通话口吻 / 现场加码） ================= */
function ensureMemory(){
  if(!S)return null;
  if(!S.memory){
    S.memory={
      lastPart:null,lastKink:null,lastOutcome:null,
      pose:null,inserted:false,plugIn:false,activeToy:null,
      failStreakMem:0,doneStreak:0,lastSnippet:''
    };
  }
  return S.memory;
}
/** 只有真的放进去才记。外口按压、以及「塞进一根手指」这种松紧描述不算。 */
function memoryPenetration(task){
  const txt=String((task&&task.t)||'');
  const externalOnly=/只按不进|先不进|不许进|不插入|别进/.test(txt)&&!/抽插|推进去|塞进去|插住|吞进去|插稳/.test(txt);
  let plug=null;
  if(task&&task.stayPlugEnd)plug=false;
  else if(task&&task.stayPlugStart)plug=true;
  else if(!externalOnly&&(/肛塞|塞子/.test(txt)||(task&&task.needToyTags&&task.needToyTags.indexOf('plug')>=0))&&/塞进|塞住|含着|底座贴/.test(txt))plug=true;
  let inserted=false;
  if(!externalOnly){
    if(task&&(task.insertRhythm||task.insertClimax||task.insertWhile))inserted=true;
    else if(task&&task.needInsert&&/抽插|推进|插入|塞进|插住|吞进|指节|插稳/.test(txt))inserted=true;
    else if(plug===true)inserted=true;
  }
  return {inserted:inserted,plug:plug};
}
function updateMemoryFromTask(task,outcome){
  if(!isCall()||!S||!S.scenario||!task)return;
  const m=ensureMemory();
  m.lastOutcome=outcome;
  m.lastKink=task.k||m.lastKink;
  if(task.part)m.lastPart=task.part;
  if(task.spot)m.spot=task.spot;
  m.lastSnippet=String(task.t||'').slice(0,28);
  const txt=task.t||'';
  if(outcome==='done'){
    m.doneStreak++;
    m.failStreakMem=0;
    const pen=memoryPenetration(task);
    if(pen.inserted)m.inserted=true;
    if(pen.plug===true)m.plugIn=true;
    if(pen.plug===false)m.plugIn=false;
    if(/跪|趴|躺|抱头/.test(txt))m.pose=/趴/.test(txt)?'prone':(/躺/.test(txt)?'lie':'kneel');
    const toys=S.scenario.toys||[];
    for(let i=0;i<toys.length;i++){
      if(txt.indexOf(toys[i].label)>=0){m.activeToy=toys[i].label;break;}
    }
  }else{
    m.failStreakMem++;
    m.doneStreak=0;
  }
}
function memoryReactLine(outcome){
  if(!isCall()||!S||!S.scenario)return null;
  const m=ensureMemory();
  const toy=m.activeToy||'玩具';
  if(outcome==='done'){
    const pool=[];
    if(scenarioInsertAllowed(S.scenario)&&m.plugIn)pool.push('塞子还在里面吧？别自己拔。','里面含着，继续听。');
    if(scenarioInsertAllowed(S.scenario)&&m.inserted)pool.push('后面刚开过，别夹太紧。','扩张过了，待会还用得着。');
    if(m.pose==='kneel')pool.push('跪姿保持，别偷懒坐下去。');
    if(m.pose==='prone')pool.push('趴好的样子不错，记着。');
    if(m.activeToy)pool.push(toy+'先放旁边，等下还要点名。',toy+'用得还可以。');
    if(m.doneStreak>=2)pool.push('连续听话，主人满意。','嗯，这才像条听话的狗。');
    if(m.lastPart==='cock')pool.push('前面先缓一缓，别自己偷偷撸。');
    if(!pool.length)pool.push('做得还行。','乖。继续。','记下了。');
    return pick(pool);
  }
  const bad=[];
  if(m.failStreakMem>=2)bad.push('又不行？那换轻一点的。','两次做不到，换一条你听得懂的。');
  if(scenarioInsertAllowed(S.scenario)&&m.plugIn)bad.push('做不到也别把塞子拔了。');
  if(m.activeToy)bad.push(toy+'先放下，深呼吸。');
  bad.push('做不到？先跪好缓十秒。','行，换简单的——但别以为结束了。','哼。那这条放宽一点。');
  return pick(bad);
}
function sceneImprovLine(task){
  if(!isCall()||!S||!S.scenario)return null;
  const sc=S.scenario;
  const m=ensureMemory();
  const st=S.stages[S.si];
  const act=st?st.act||1:1;
  const pool=[];
  // 人在哪，就说哪。还没进动线时才用整间屋子的提醒
  if(m.spot){
    pool.push('人在'+propLabel(m.spot)+'，我看着你。','别离开'+propLabel(m.spot)+'。');
  }else{
    if(sc.id==='rental')pool.push('小声。合租房，别让门外听见喘。','门锁着吧？压低声音。');
    if(sc.id==='uni_restroom')pool.push('隔间外有脚步就停手捂嘴。','公厕里？胆子不小，动作快点。');
    if(sc.id==='uni_dorm')pool.push('窗帘拉好了吗。门反锁。','宿舍里就你？别太大动静。');
    if(sc.id==='hotel')pool.push('酒店隔音一般，别叫太浪。','门链扣上了吗。');
    if(sc.id==='home_bath')pool.push('地砖滑，跪稳。','浴室里回声大，注意音量。');
    if(sc.id==='home')pool.push('家里就你？那今晚别装乖。');
  }
  // 玩具
  const toys=sc.toys||[];
  const has=function(tag){return toys.some(function(t){return (t.tags||[]).indexOf(tag)>=0;});};
  if(scenarioInsertAllowed(sc)&&has('plug')&&Math.random()<0.55)pool.push('铃铛或塞子在的话，待会要听响。','塞子今晚有出场。');
  if(S.stayPluggedForeplay){
    pool.push('铃铛还在响吗。','塞着走，我要听见铃。','别偷偷拔塞子。');
  }
  if(has('vibe')&&Math.random()<0.5)pool.push('跳蛋充好电了吗。','跳蛋待会用得上。');
  if(scenarioInsertAllowed(sc)&&has('dildo')&&Math.random()<0.55)pool.push('假鸡巴润滑准备好。','尺寸你自己清楚，别逞强。');
  if(has('candle')&&Math.random()<0.4)pool.push('蜡烛小心烫，受不了就停。');
  if(has('oral')&&Math.random()<0.4)pool.push('口罩那根，嘴也别闲着。');
  // 记忆残留
  if(scenarioInsertAllowed(sc)&&m.plugIn)pool.push('塞着的话，走一步晃一下给我看。');
  if(scenarioInsertAllowed(sc)&&m.inserted&&act>=2)pool.push('后面已经湿过了，别装第一次。');
  // 幕次
  if(act>=3)pool.push('到后半场了，别散。','越来越深了，撑住。');
  if(task&&task.hi)pool.push('这条偏狠，量力。痛了就安全挂断。');
  if(!pool.length)return null;
  // 约 65% 触发，避免每句都加码
  if(Math.random()>0.65)return null;
  return pick(pool);
}
function callCheckInLine(){
  return pick(['听见了吗。','听清楚了吗。','看着镜头。','准备好了？','嗯，听着。']);
}
function callSpeakTask(task,extra){
  if(!task||!S)return;
  if(!S.callSpeakGen)S.callSpeakGen=0;
  const gen=++S.callSpeakGen;
  stopSpeak();
  const papa=task.papa?P(task.papa):'';
  const body=P(task.t||'');
  const react=(extra&&extra.react)||null;
  const improv=(extra&&extra.improv)||null;
  const bits=[];
  if(react)bits.push(react);
  if(improv)bits.push(improv);
  if(task.stayPlugNote)bits.push(task.stayPlugNote);
  if(Math.random()<0.6)bits.push(callCheckInLine());
  if(Math.random()<0.16)bits.push('不对——');
  if(papa)bits.push(papa);
  bits.push(body);
  (async function(){
    for(let i=0;i<bits.length;i++){
      if(!S||S.callSpeakGen!==gen)return;
      const line=bits[i];
      const rate=line==='不对——'?1.08:(i===bits.length-1?undefined:1.02);
      await speakAsync(line,{rate:rate});
      if(!S||S.callSpeakGen!==gen)return;
      // 念完再停一小拍，避免回顾/确认和下一条叠在一起
      if(i<bits.length-1){
        await sleep(line==='不对——'?R(280,420):R(480,820));
      }
    }
  })();
}
function softRecoveryTask(sc){
  const m=ensureMemory();
  const where=m.spot?('人留在'+propLabel(m.spot)+'。'):'';
  const plugged=m.plugIn&&S&&S.scenario&&scenarioInsertAllowed(S.scenario);
  const t=plugged
    ?{t:where+'先别拔塞子。跪好，双手抱头，深呼吸十下。缓过来再说「主人，还能继续」。',k:'羞耻姿势',o:1,s:2,h:1,spot:m.spot||null}
    :{t:where+'先停手。跪好，双手放膝盖上，深呼吸十次。缓过来抬头说「主人，狗还听令」。',k:'羞耻姿势',o:1,s:2,h:1,spot:m.spot||null};
  return bindToyText(t,sc);
}

/** 一对一：房间动线。流程按地点里真实有的位置往下走，而不是所有房间共用一条弧线。 */
const PROP_LABEL={
  door:'门口',desk:'桌边',bed:'床上',mirror:'镜前',
  toilet:'马桶边',shower:'淋浴区',floor:'地上',
  sofa:'沙发',stall:'隔间',sink:'洗手台'
};
function propLabel(id){return PROP_LABEL[id]||id;}
function moveLine(id){
  const lines={
    door:'到门口，确认锁好。',
    desk:'走到桌边，手撑住桌沿。',
    bed:'到床上去。',
    mirror:'转到镜子前。',
    toilet:'走到马桶边。',
    shower:'进淋浴区。',
    floor:'下来，到地上。',
    sofa:'到沙发上。',
    stall:'退回隔间，门扣好。',
    sink:'到洗手台前。'
  };
  return lines[id]||('换到'+propLabel(id)+'。');
}
function anchorToSpot(task,prop,enter,first){
  const t=Object.assign({},task);
  t.spot=prop;
  if(enter){
    const lead=first?('先从'+propLabel(prop)+'开始。'):moveLine(prop);
    const mark={door:'门',desk:'桌',bed:'床',mirror:'镜',toilet:'马桶',shower:'淋浴',floor:'地',sofa:'沙发',stall:'隔',sink:'洗手'}[prop];
    const opensHere=!!(mark&&(t.t||'').slice(0,10).indexOf(mark)>=0);
    const key=lead.replace(/[。，]/g,'').slice(0,4);
    if(!opensHere&&(t.t||'').indexOf(key)<0)t.t=lead+t.t;
  }else if(t.spotFallback&&(t.t||'').indexOf(propLabel(prop))<0){
    t.t='人还在'+propLabel(prop)+'，别换地方。'+t.t;
  }
  return t;
}
function condsAtProp(sc,prop){
  const ids=[];
  if(prop==='desk'){
    if(scenarioCondOn(sc,'stationery'))ids.push('stationery');
    if(scenarioCondOn(sc,'glue'))ids.push('glue');
  }
  if(prop==='toilet'){
    if(scenarioCondOn(sc,'toilet'))ids.push('toilet');
    if(scenarioCondOn(sc,'wet')&&(sc.props||[]).indexOf('shower')<0)ids.push('wet');
  }
  if(prop==='shower'&&scenarioCondOn(sc,'wet'))ids.push('wet');
  return ids;
}
function condAtStation(sc,prop,forcedDone){
  const ids=condsAtProp(sc,prop);
  for(let i=0;i<ids.length;i++){
    if(!forcedDone[ids[i]])return ids[i];
  }
  return null;
}
function stationForCond(id,route){
  route=route||[];
  if((id==='stationery'||id==='glue')&&route.indexOf('desk')>=0)return 'desk';
  if(id==='toilet'&&route.indexOf('toilet')>=0)return 'toilet';
  if(id==='wet'){
    if(route.indexOf('shower')>=0)return 'shower';
    if(route.indexOf('toilet')>=0)return 'toilet';
  }
  return null;
}
function mainSurface(route){
  const hold=['bed','stall','sofa','floor','shower'];
  for(let i=route.length-1;i>=0;i--){
    if(hold.indexOf(route[i])>=0)return route[i];
  }
  return route.length?route[route.length-1]:'floor';
}
function roomRoute(sc){
  if(!sc)return [];
  const raw=scenarioData();
  const loc=((raw&&raw.locations)||[]).find(function(l){return l.id===sc.id;});
  const props=sc.props||[];
  let route=(loc&&loc.route&&loc.route.length)?loc.route.slice():[];
  route=route.filter(function(p){return props.indexOf(p)>=0;});
  function ensure(prop){
    if(!prop||props.indexOf(prop)<0||route.indexOf(prop)>=0)return;
    const at=route.length?Math.max(1,route.length-1):0;
    route.splice(at,0,prop);
  }
  if(scenarioCondOn(sc,'toilet'))ensure('toilet');
  if(scenarioCondOn(sc,'wet'))ensure(props.indexOf('shower')>=0?'shower':'toilet');
  if(scenarioCondOn(sc,'stationery')||scenarioCondOn(sc,'glue'))ensure('desk');
  return route;
}
function buildRoomBeats(sc,route){
  const hard=S.mode==='hard';
  const main=mainSurface(route);
  const beats=[];
  if(!skipIntroSel)beats.push('rules');
  beats.push('arrive');
  function pushStop(prop,stays){
    beats.push('spot:'+prop);
    for(let s=0;s<stays;s++)beats.push('stay:'+prop);
  }
  const firstMain=route.indexOf(main);
  route.forEach(function(prop,i){
    const lastMain=prop===main&&i===route.lastIndexOf(prop);
    let extra=0;
    if(hard)extra=lastMain?3:2;
    else if(lastMain)extra=1;
    const stays=Math.max(0,condsAtProp(sc,prop).length-1)+extra;
    pushStop(prop,stays);
    // 第一次在落点做完，就插一段节奏，不堆到最后
    if(i===firstMain)beats.push('jerk');
  });
  // 困难再走一圈；两种模式都按路线补场，简单约 20 场，困难约 45 场
  const insertOn=scenarioInsertAllowed(sc);
  function projected(list){
    if(!insertOn)return list.length;
    let n=0;
    list.forEach(function(b){n+=b==='jerk'?2:1;});
    return n;
  }
  const tail=[];
  if(hard){
    const mid=Math.max(0,Math.floor((route.length-1)/2));
    route.forEach(function(prop,i){
      pushStop(prop,1);
      if(i===mid)beats.push('jerk');
    });
    const risk=route.indexOf('stall')>=0?'stall':(route.indexOf('door')>=0?'door':main);
    tail.push('pen:'+risk);
    if(risk!==main)tail.push('spot:'+main);
    tail.push('jerk');
  }
  tail.push('climax','aftercare');
  const target=hard?45:20;
  let cursor=0;
  while(projected(beats.concat(tail))<target&&cursor<60){
    beats.push('spot:'+route[cursor%route.length]);
    cursor++;
  }
  tail.forEach(function(b){beats.push(b);});
  FORCE_CONDS.forEach(function(id){
    if(!scenarioCondOn(sc,id)||stationForCond(id,route))return;
    const jerkAt=beats.indexOf('jerk');
    const at=jerkAt>=0?jerkAt:beats.indexOf('climax');
    beats.splice(at>=0?at:beats.length,0,'force:'+id);
  });
  return beats;
}
function pickSpotTask(sc,prop,act,lastPart,usedKeys,preferInsert,preferCond){
  function gather(condOnly){
    const raw=scenarioData();
    const pool=[];
    ['place_task','combo'].forEach(function(kind){
      ((raw&&raw.beats&&raw.beats[kind])||[]).forEach(function(t){
        if(!(t.need&&t.need.indexOf(prop)>=0))return;
        if(t.loc&&t.loc.length&&t.loc.indexOf(sc.id)<0)return;
        if(lastPart&&t.part&&t.part===lastPart)return;
        if(!taskNeedOk(t,sc))return;
        if(condOnly&&preferCond&&!taskMatchesForceCond(t,preferCond))return;
        pool.push(t);
      });
    });
    return pool;
  }
  function notUsed(t){
    const key=(t.t||'')+(t.part||'');
    return !(usedKeys&&usedKeys[key]);
  }
  let pool=preferCond?gather(true).filter(notUsed):[];
  if(!pool.length)pool=gather(false).filter(notUsed);
  if(preferInsert===true){
    const hot=pool.filter(isInsertishTask);
    if(hot.length){
      const shallow=Math.min.apply(null,hot.map(function(t){return taskDiff(t);}));
      pool=hot.filter(function(t){return taskDiff(t)===shallow;});
    }
  }else if(preferInsert===false){
    const cold=pool.filter(function(t){return !isInsertishTask(t);});
    if(cold.length)pool=cold;
  }
  const choice=chooseFromPool(pool,act,usedKeys);
  if(choice){
    const key=(choice.t||'')+(choice.part||'');
    if(usedKeys)usedKeys[key]=1;
    return bindToyText(Object.assign({},choice),sc);
  }
  const body=pickScenarioBeat('body',sc,act,lastPart,usedKeys,preferInsert===true?true:(preferInsert===false?false:null),preferCond);
  if(!body)return null;
  body.spotFallback=true;
  return body;
}

function buildScenarioSession(sc){
  const raw=scenarioData();
  const hard=S.mode==='hard';
  const room=roomRoute(sc);
  const useRoom=room.length>0;
  let beats;
  if(useRoom){
    sc.route=room.slice();
    sc.mainSpot=mainSurface(room);
    beats=buildRoomBeats(sc,room);
  }else{
    const arcKey=hard?'hard':'easy';
    beats=(raw&&raw.arcs&&raw.arcs[arcKey])?raw.arcs[arcKey].slice():null;
    if(!beats||!beats.length){
      return buildCallScheduleLegacy().map(function(s){return makeStage(s.type,s.act);});
    }
    if(skipIntroSel)beats=beats.filter(function(b){return b!=='rules';});
  }
  const wantInsert=scenarioInsertAllowed(sc);
  S.stayPluggedForeplay=false;
  // 开了插入：跟节拍的环节改成抽插，并按出现顺序从浅到深
  // 节奏穿在动线里，插在哪段，抽插准备就跟在哪段前面
  if(wantInsert){
    beats=beats.filter(function(b){
      return b!=='insert?'&&b!=='insert_only'&&b!=='insert_jerk'&&b!=='bell_plug_in';
    });
    beats=beats.map(function(b){return b==='jerk'?'insert_rhythm':b;});
    const withPrep=[];
    beats.forEach(function(b){
      if(b==='insert_rhythm')withPrep.push('insert_only');
      withPrep.push(b);
    });
    beats=withPrep;
    if(!useRoom){
      const firstR=beats.indexOf('insert_rhythm');
      if(firstR<0||firstR>=Math.floor(beats.length*0.32)){
        const ci=beats.indexOf('climax');
        let at=Math.max(beats[0]==='rules'?3:2,Math.floor(beats.length*0.18));
        if(ci>=0)at=Math.min(at,ci);
        beats.splice(at,0,'insert_only','insert_rhythm');
      }
      let bodySeen=0;
      beats=beats.map(function(b){
        if(b!=='body')return b;
        bodySeen++;
        if(bodySeen%2===0)return 'insert_body';
        return b;
      });
    }
    if(scenarioHasBellPlug(sc)&&Math.random()<0.62){
      S.stayPluggedForeplay=true;
      let at;
      if(useRoom&&sc.mainSpot){
        const spotAt=beats.indexOf('spot:'+sc.mainSpot);
        at=spotAt>=0?spotAt+1:(beats.indexOf('arrive')+1);
      }else{
        const ai=beats.indexOf('arrive');
        at=ai>=0?ai+1:(beats[0]==='rules'?2:1);
      }
      beats.splice(Math.min(Math.max(at,0),beats.length),0,'bell_plug_in');
    }
  }else if(!useRoom){
    // 不插入：跟节拍撸管同样从入门排到高强度
    const firstJ=beats.indexOf('jerk');
    if(firstJ<0||firstJ>=Math.floor(beats.length*0.32)){
      const ci=beats.indexOf('climax');
      let at=Math.max(beats[0]==='rules'?3:2,Math.floor(beats.length*0.18));
      if(ci>=0)at=Math.min(at,ci);
      beats.splice(at,0,'jerk');
    }
  }
  if(!useRoom){
    // 勾选的马桶/文具/胶水/尿液：各插入至少一场，保证用上
    beats=injectForcedConditionBeats(beats,sc);
    // 两个条件都开时，约一半场次再插一条复合
    beats=injectCrossBeats(beats,sc);
  }
  const stages=[];
  const usedKeys={};
  let lastPart=null;
  let beatAct=1;
  let frontN=0,insertN=0;
  let rhythmSeen=0;
  let roomSpot=null;
  let spotCursor=0;
  const spotTotal=beats.filter(function(b){return b.indexOf('spot:')===0;}).length;
  const rhythmTotal=beats.filter(function(b){
    return wantInsert?(b==='insert_rhythm'||b==='insert_jerk'):b==='jerk';
  }).length;
  const forcedDone={};
  function bumpAct(i,total){
    if(total<=4)return i<=1?1:2;
    if(i/total<0.35)return 1;
    if(i/total<0.7)return 2;
    return 3;
  }
  function markForced(task){
    FORCE_CONDS.forEach(function(id){
      if(taskMatchesForceCond(task,id))forcedDone[id]=1;
    });
  }
  for(let i=0;i<beats.length;i++){
    let kind=beats[i];
    let preferInsert=null;
    if(kind==='insert_body'){
      kind='body';
      // 铃铛前戏含着时，先别抽假鸡巴插入条
      preferInsert=S.stayPluggedForeplay?false:true;
    }
    beatAct=bumpAct(i,beats.length);
    if(String(kind).indexOf('cross:')===0){
      const crossId=kind.slice(6);
      const task=pickCrossTask(sc,isTripleCross(crossId)?3:beatAct,crossId,usedKeys);
      if(task){
        if(task.part)lastPart=task.part;
        stages.push(makeScenarioStage('combo',beatAct,[task]));
      }
      continue;
    }
    if(String(kind).indexOf('force:')===0){
      const condId=kind.slice(6);
      if(forcedDone[condId])continue;
      let task=pickForcedCondTask(sc,beatAct,lastPart,usedKeys,condId);
      if(task){
        if(useRoom){
          const prop=stationForCond(condId,sc.route||[])||sc.mainSpot||roomSpot;
          if(prop){
            task=anchorToSpot(task,prop,roomSpot!==prop,!roomSpot);
            roomSpot=prop;
          }
        }
        if(task.part)lastPart=task.part;
        markForced(task);
        if(isInsertishTask(task))insertN++;else frontN++;
        const stType=(condId==='toilet'||condId==='wet')?'place_task':'combo';
        const stg=makeScenarioStage(stType,beatAct,[withStayPlugNote(task)]);
        if(task.spot){
          stg.spot=task.spot;
          stg.spotStep=spotCursor;
          stg.spotTotal=spotTotal;
          stg.label=propLabel(task.spot);
        }
        stages.push(stg);
      }
      continue;
    }
    if(kind.indexOf('spot:')===0||kind.indexOf('stay:')===0||kind.indexOf('pen:')===0){
      const isPen=kind.indexOf('pen:')===0;
      const isSpot=kind.indexOf('spot:')===0;
      const prop=kind.slice(kind.indexOf(':')+1);
      if(isSpot)spotCursor++;
      const first=isSpot&&!roomSpot;
      const enter=(isSpot||isPen)&&roomSpot!==prop;
      const preferCond=condAtStation(sc,prop,forcedDone);
      const insertHere=wantInsert&&beatAct>=2&&!S.stayPluggedForeplay&&prop===sc.mainSpot;
      let task=null;
      if(isPen){
        const ts=reuseScenarioPool('punish',sc,beatAct,1);
        task=ts.length?bindToyText(ts[0],sc):null;
      }else{
        task=pickSpotTask(sc,prop,beatAct,lastPart,usedKeys,insertHere?true:false,preferCond);
        if(preferCond&&(!task||!taskMatchesForceCond(task,preferCond))){
          const forced=pickForcedCondTask(sc,beatAct,lastPart,usedKeys,preferCond);
          const needs=forced&&forced.need||[];
          if(forced&&(!needs.length||needs.indexOf(prop)>=0))task=forced;
        }
      }
      if(!task)continue;
      task=anchorToSpot(task,prop,enter,first);
      roomSpot=prop;
      if(task.part)lastPart=task.part;
      markForced(task);
      if(isInsertishTask(task))insertN++;else frontN++;
      const stg=makeScenarioStage(isPen?'punish':'place_task',beatAct,[withStayPlugNote(task)]);
      stg.spot=prop;
      stg.spotStep=spotCursor;
      stg.spotTotal=spotTotal;
      stg.label=isPen?('在'+propLabel(prop)+'受罚'):((enter?'前往':'留在')+propLabel(prop));
      stages.push(stg);
      continue;
    }
    if(kind==='bell_plug_in'){
      if(!S.stayPluggedForeplay)continue;
      let task=bellPlugInTask(sc);
      if(useRoom&&sc.mainSpot){
        task.spot=sc.mainSpot;
        task.t='人在'+propLabel(sc.mainSpot)+'。'+task.t;
        roomSpot=sc.mainSpot;
      }
      const stg=makeScenarioStage('combo',beatAct,[task]);
      if(task.spot){
        stg.spot=task.spot;
        stg.spotStep=spotCursor;
        stg.spotTotal=spotTotal;
        stg.label=propLabel(task.spot)+' · 含上铃铛';
      }
      stages.push(stg);
      insertN++;
      continue;
    }
    if(kind==='insert?'||kind==='insert_only'){
      if(!wantInsert)continue;
      let prepDiff=clamp(beatAct,1,3);
      for(let j=i+1;j<beats.length;j++){
        if(beats[j]==='insert_rhythm'||beats[j]==='insert_jerk'){
          prepDiff=rhythmDiffByOrder(rhythmSeen,rhythmTotal);
          break;
        }
        if(beats[j]==='insert_only')break;
      }
      const ts=buildScenarioInsertOnly(sc,prepDiff);
      if(S.stayPluggedForeplay){
        ts.unshift(bellPlugOutTask(sc));
        S.stayPluggedForeplay=false;
      }
      if(ts.length){
        const prepStage=makeScenarioStage('insert',prepDiff,ts);
        prepStage.label='后庭插入 · '+diffLabel(prepDiff);
        stages.push(prepStage);
        insertN+=ts.length;
      }
      continue;
    }
    if(kind==='insert_jerk'||kind==='insert_rhythm'){
      if(!wantInsert)continue;
      const d=rhythmDiffByOrder(rhythmSeen,rhythmTotal);
      rhythmSeen++;
      const rounds=[buildRhythmInsert(d,false)];
      if(S.stayPluggedForeplay){
        stages.push(makeScenarioStage('insert',d,[bellPlugOutTask(sc)]));
        S.stayPluggedForeplay=false;
      }
      const stg=makeScenarioStage('jerk',d,rounds);
      stg.label='跟节奏插入 · '+diffLabel(d);
      stages.push(stg);
      insertN+=rounds.length;
      continue;
    }
    if(kind==='jerk'){
      const d=rhythmDiffByOrder(rhythmSeen,rhythmTotal);
      rhythmSeen++;
      const rounds=[buildRhythmStroke(d,false)];
      const stg=makeScenarioStage('jerk',d,rounds);
      stg.label='跟节奏撸 · '+diffLabel(d);
      stages.push(stg);
      continue;
    }
    if(kind==='climax'){
      if(wantInsert){
        const ts=buildInsertClimax(sc);
        if(ts.length>=2){
          stages.push(makeScenarioStage('insert',4,[ts[0]]));
          const end=makeScenarioStage('climax',3,[ts[1]]);
          end.label='高潮收束 · 跟节奏插入';
          stages.push(end);
        }else{
          stages.push(makeScenarioStage('climax',3,ts.length?ts:buildStrokeClimax()));
        }
      }else{
        const end=makeScenarioStage('climax',3,buildStrokeClimax());
        end.label='高潮收束 · 跟节奏撸';
        stages.push(end);
      }
      continue;
    }
    if(kind==='aftercare'){
      stages.push(makeScenarioStage('aftercare',4,drawPool('aftercare',3)));
      continue;
    }
    if(kind==='punish'){
      const preferPunishInsert=wantInsert&&insertN<=frontN;
      let preferPunishCond=null;
      for(let fi=0;fi<FORCE_CONDS.length;fi++){
        const id=FORCE_CONDS[fi];
        if(scenarioCondOn(sc,id)&&!forcedDone[id]){preferPunishCond=id;break;}
      }
      let ts=reuseScenarioPool('punish',sc,beatAct,R(1,2),function(t){
        if(preferPunishCond&&taskMatchesForceCond(t,preferPunishCond))return true;
        if(preferPunishInsert)return isInsertishTask(t)||t.k==='假鸡巴'||t.k==='肛门';
        return !preferPunishCond;
      });
      if(!ts.length)ts=reuseScenarioPool('punish',sc,beatAct,R(1,2),preferPunishInsert?function(t){return isInsertishTask(t)||t.k==='假鸡巴'||t.k==='肛门';}:null);
      if(!ts.length)ts=reuseScenarioPool('punish',sc,beatAct,R(1,2));
      if(ts.length){
        stages.push(makeScenarioStage('punish',beatAct,ts));
        ts.forEach(function(t){markForced(t);if(isInsertishTask(t))insertN++;else frontN++;});
      }else{
        const fb=pickScenarioBeat('combo',sc,beatAct,lastPart,usedKeys,preferPunishInsert,preferPunishCond)||pickScenarioBeat('body',sc,beatAct,lastPart,usedKeys,preferPunishInsert,preferPunishCond);
        if(fb){if(fb.part)lastPart=fb.part;markForced(fb);if(isInsertishTask(fb))insertN++;else frontN++;stages.push(makeScenarioStage('combo',beatAct,[fb]));}
      }
      continue;
    }
    // body / place_task / combo：开插入时尽量维持约 50/50；未兑现的勾选条件优先抽中
    if(wantInsert&&preferInsert===null&&(kind==='body'||kind==='combo'||kind==='place_task')){
      preferInsert=insertN<=frontN;
    }
    let preferCond=null;
    if(kind==='body'||kind==='combo'||kind==='place_task'){
      for(let fi=0;fi<FORCE_CONDS.length;fi++){
        const id=FORCE_CONDS[fi];
        if(scenarioCondOn(sc,id)&&!forcedDone[id]){preferCond=id;break;}
      }
    }
    let task=pickScenarioBeat(kind,sc,beatAct,lastPart,usedKeys,preferInsert,preferCond);
    if(!task&&preferCond){
      task=pickScenarioBeat(kind,sc,beatAct,lastPart,usedKeys,preferInsert,null);
    }
    if(!task&&preferInsert===true){
      task=pickScenarioBeat(kind,sc,beatAct,lastPart,usedKeys,null,preferCond);
    }
    if(!task){
      const pool=kind==='punish'?'punish':'instruct';
      const reused=reuseScenarioPool(pool,sc,beatAct,1,function(t){
        if(preferCond&&taskMatchesForceCond(t,preferCond))return true;
        if(wantInsert&&preferInsert)return isInsertishTask(t);
        return !preferCond;
      });
      if(reused.length)task=bindToyText(reused[0],sc);
      else{
        const any=reuseScenarioPool(pool,sc,beatAct,1);
        if(any.length)task=bindToyText(any[0],sc);
      }
    }
    if(!task&&kind==='arrive'){
      task={papa:'场景：'+sc.label+'。',t:'面对镜头报出你现在的位置「'+sc.label+'」，摆好跪姿，说「主人，狗就位」。',o:2,s:2,h:1};
    }
    if(!task)continue;
    task=bindToyText(task,sc);
    if(task.part)lastPart=task.part;
    markForced(task);
    if(kind!=='arrive'&&kind!=='rules'&&kind!=='intro'){
      if(isInsertishTask(task))insertN++;else frontN++;
    }
    // 一场一条指令：靠弧线多场拉长，不把节拍/单场塞太满
    const stageType=kind==='rules'?'intro':kind;
    const stayKinds=kind==='body'||kind==='combo'||kind==='place_task'||kind==='punish';
    const finalTask=stayKinds?withStayPlugNote(task):task;
    stages.push(makeScenarioStage(stageType,kind==='rules'?0:beatAct,[finalTask]));
  }
  if(!stages.some(function(s){return s.type==='climax';})){
    if(wantInsert){
      const ts=buildInsertClimax(sc);
      if(ts.length>=2){
        stages.push(makeScenarioStage('insert',4,[ts[0]]));
        stages.push(makeScenarioStage('climax',4,[ts[1]]));
      }else stages.push(makeScenarioStage('climax',3,buildStrokeClimax()));
    }else{
      const end=makeScenarioStage('climax',3,buildStrokeClimax());
      end.label='高潮收束 · 跟节奏撸';
      stages.push(end);
    }
  }
  if(!stages.some(function(s){return s.type==='aftercare';})){
    stages.push(makeScenarioStage('aftercare',4,drawPool('aftercare',3)));
  }
  if(useRoom&&sc.mainSpot){
    const lab=propLabel(sc.mainSpot);
    stages.forEach(function(s){
      if(s.spot)return;
      if(s.type!=='jerk'&&s.type!=='climax'&&s.type!=='insert'&&s.type!=='aftercare')return;
      s.spot=sc.mainSpot;
      if(s.type!=='aftercare'){
        s.spotStep=spotCursor||spotTotal;
        s.spotTotal=spotTotal;
      }
      if(!s.label||s.label.indexOf(lab)!==0)s.label=lab+' · '+(s.label||stageLabelOf(s.type));
    });
  }
  return stages;
}
/** 旧一对一阶梯（无 scenarios 数据时回退） */
function buildCallScheduleLegacy(){
  const hard=S.mode==='hard';
  const stages=[];
  if(!skipIntroSel)stages.push({type:'intro',act:0});
  stages.push({type:'warmup',act:1});
  stages.push({type:'instruct',act:1});
  stages.push({type:'recite',act:1});
  if(hard)stages.push({type:'instruct',act:1});
  stages.push({type:'instruct',act:1});
  stages.push({type:'instruct',act:2});
  stages.push({type:'instruct',act:2});
  stages.push({type:'instruct',act:2});
  if(hard)stages.push({type:'recite',act:2});
  stages.push({type:'punish',act:2});
  if(hard||Math.random()<0.6)stages.push({type:'jerk',act:2});
  stages.push({type:'instruct',act:3});
  stages.push({type:'order',act:3});
  stages.push({type:'punish',act:3});
  if(hard)stages.push({type:'instruct',act:3});
  stages.push({type:'jerk',act:3});
  if(kinkOn('假鸡巴')){
    stages.push({type:'insert',act:3});
  }
  stages.push({type:'climax',act:4});
  stages.push({type:'aftercare',act:4});
  return stages;
}
function buildSchedule(){
  if(isCall())return buildCallScheduleLegacy();
  const hard=S.mode==='hard';
  const stages=[];
  if(!skipIntroSel)stages.push({type:'intro',act:0});
  function fill(n,act,pool){
    let chatSince=0,prev='';
    for(let i=0;i<n;i++){
      let opts=pool.slice();
      if(chatSince>=3)opts=['chat'];
      let t=pick(opts);
      if(t===prev){
        const alt=opts.filter(x=>x!==t);
        if(alt.length)t=pick(alt);
      }
      stages.push({type:t,act:act});
      chatSince=t==='chat'?0:chatSince+1;
      prev=t;
    }
  }
  const p1=['instruct','instruct','recite','chat','instruct'];
  if(Math.random()<0.35)p1.push('order');
  fill(R(...CONFIG.ACT1[hard?'hard':'easy']),1,p1);
  const p2=['instruct','instruct','punish','chat','order','instruct','instruct'];
  if(Math.random()<0.5)p2.push('jerk');
  fill(R(...CONFIG.ACT2[hard?'hard':'easy']),2,p2);
  const p3=['instruct','instruct','punish','punish','order','order','jerk','jerk','chat'];
  fill(R(...CONFIG.ACT3[hard?'hard':'easy']),3,p3);
  if(!stages.some(s=>s.type==='jerk'))stages.splice(Math.floor(stages.length/2),0,{type:'jerk',act:2});
  if(kinkOn('假鸡巴')){
    stages.push({type:'insert',act:3});
    if(hard){
      const mid=Math.max(2,Math.floor(stages.length/2));
      stages.splice(mid,0,{type:'instruct',act:2});
    }
  }
  stages.push({type:'climax',act:4});
  stages.push({type:'aftercare',act:4});
  return stages;
}
function reshuffleTail(){
  if(!S||S.si>=S.stages.length-1)return;
  if(isCall()&&S.scenario){
    // 场景剧本不重排中段，只刷新尚未开始的 jerk/punish 类任务文本
    for(let i=S.si+1;i<S.stages.length;i++){
      const st=S.stages[i];
      if(!st||st.type==='climax'||st.type==='aftercare'||st.type==='arrive')continue;
      if(st.type==='jerk'){
        const n=Math.max(1,(st.tasks&&st.tasks.length)||1);
        const rounds=[];
        for(let j=0;j<n;j++)rounds.push(pickJerk(false));
        st.tasks=rounds;st.idx=0;
      }else if(st.type==='punish'){
        const ts=reuseScenarioPool('punish',S.scenario,st.act||2,Math.max(1,(st.tasks&&st.tasks.length)||1));
        if(ts.length){st.tasks=ts;st.idx=0;}
      }
    }
    return;
  }
  const fixed=S.stages.slice(0,S.si+1);
  const tail=S.stages.slice(S.si+1);
  const last=tail[tail.length-1],prev2=tail[tail.length-2];
  if(!last||last.type!=='aftercare'||!prev2||prev2.type!=='climax'){
    for(let i=S.si+1;i<S.stages.length;i++)S.stages[i]=makeStage(S.stages[i].type,S.stages[i].act||2);
    return;
  }
  const mid=tail.slice(0,tail.length-2);
  const acts=mid.map(s=>s.act||2);
  const midTypes=mid.map(s=>s.type);
  let best=midTypes;
  for(let t=0;t<30;t++){
    const cand=shuffle(midTypes);
    let ok=true;
    for(let i=1;i<cand.length;i++){if(cand[i]===cand[i-1]){ok=false;break;}}
    if(ok&&fixed.length&&cand[0]===fixed[fixed.length-1].type)ok=false;
    if(ok){best=cand;break;}
  }
  const rebuilt=best.map(function(tp,i){return makeStage(tp,acts[i]);});
  rebuilt.push(makeStage('climax',4));
  rebuilt.push(makeStage('aftercare',4));
  S.stages=fixed.concat(rebuilt);
}
function insertTask(poolKey,n){
  const st=S.stages[S.si];
  let ts;
  if(isCall()&&S.scenario&&(poolKey==='instruct'||poolKey==='punish'||poolKey==='order')){
    ts=reuseScenarioPool(poolKey,S.scenario,st.act||2,n||1);
  }else{
    ts=drawPool(poolKey,n||1);
  }
  if(ts&&ts.length)st.tasks.splice(st.idx+1,0,...ts);
}

/* ================= 语音 ================= */
let ttsVoice=null,ttsMuted=false,ttsPending=[],ttsRate=null,ttsPitch=null,sfxMuted=false;
let ttsVoiceMale=false;
const MALE_VOICE=/male|男|kangkang|yunjian|yunxi|yunyang|yunye|yunhao|yunfeng|yunxia|sinji|sin-ji|sin ji|daniel|eddy|arthur|george|liam|ryan|aaron|samuel|oliver|guy|male-enhanced|zh-cn-x-ccc|zh[-_]?cn[-_]?x[-_]?ccc|baidu[-_]?male|google[-_]?中文[-_]?男/i;
const FEMALE_VOICE=/female|女|huihui|yaoyao|xiaoxiao|xiaoyi|siqi|xiaohan|xiaomeng|tingting|ting-ting|ting ting|ting-ting|meijia|mei-jia|xiaochen|xiaomo|xiaoshuang|xiaozhen|xiaorui|xiaoxuan|lili|huiting|xiaoyu|anli|xiaobei|female-enhanced|siri.*female/i;
function pickDomVoice(list){
  if(!list||!list.length)return null;
  // 先按名字里的男声关键词
  const male=list.filter(v=>MALE_VOICE.test(v.name)||MALE_VOICE.test(v.lang||''));
  if(male.length)return male[0];
  // 再排除明确女声
  const notFemale=list.filter(v=>!FEMALE_VOICE.test(v.name));
  if(notFemale.length)return notFemale[0];
  // iPhone 往往只剩婷婷：仍返回，但后续用低音调压一压
  return list[0];
}
function localVoiceParams(opts){
  opts=opts||{};
  const hasMale=ttsVoice&&MALE_VOICE.test(ttsVoice.name);
  // 无系统男声时（常见于 iPhone），压低 pitch / 略降语速，减少「女主人」感
  const rate=opts.rate!=null?opts.rate:(ttsRate!=null?ttsRate:(hasMale?0.92:0.86));
  const pitch=opts.pitch!=null?opts.pitch:(ttsPitch!=null?ttsPitch:(hasMale?0.62:0.48));
  return {rate:rate,pitch:pitch,forcedLow:!hasMale};
}
function buildVoiceList(vs){
  const box=$('voiceList');
  if(!box)return;
  const hasReal=box.querySelectorAll?box.querySelectorAll('.vopt:not([data-name="auto"])').length:0;
  if(box.dataset.built&&(!vs.length||hasReal))return;
  box.dataset.built='1';
  box.innerHTML='';
  const mk=function(name,label){
    const b=document.createElement('button');
    b.type='button';
    b.className='vopt';
    b.dataset.name=name;
    b.innerHTML='<span class="vname">'+esc(label)+'</span>';
    b.onclick=function(){
      document.querySelectorAll('.vopt').forEach(function(x){x.classList.remove('sel');});
      b.classList.add('sel');
      if(name==='auto'){ttsVoice=pickDomVoice(vs)||(vs[0]||null);}
      else{ttsVoice=vs.find(function(v){return v.name===name;})||null;}
      ttsVoiceMale=ttsVoice?MALE_VOICE.test(ttsVoice.name):false;
      speak('骚狗，跪好了。听主人说话，别让我失望。');
    };
    box.appendChild(b);
    return b;
  };
  mk('auto','自动 · 男声优先');
  vs.forEach(function(v){
    mk(v.name,v.name+' · '+v.lang);
  });
  const first=box.querySelector('.vopt');
  if(first)first.classList.add('sel');
}
function updateVoiceHint(vs){
  const h=$('voiceHint');
  if(!h)return;
  const male=vs.filter(function(v){return MALE_VOICE.test(v.name);}).length;
  if(!vs.length){
    h.className='voice-hint warn';
    h.textContent='未检测到中文语音。建议用 Chrome / Edge 浏览器打开，或在系统设置里安装中文语音包。';
  }else if(!male){
    h.className='voice-hint warn';
    h.textContent='系统里没有中文男声（iPhone 常见，只有婷婷）。场景长句会走本地朗读，已自动压低音调。想听真男声：通话设置里保持「云扬」包，并运行 python 生成语音.py 生成模块 MP3；或换装了中文男声的 Android / 桌面 Chrome。';
  }else{
    h.className='voice-hint ok';
    h.textContent='共 '+vs.length+' 个中文语音，其中男声 '+male+' 个。点一个试听，选中的就是主人口吻。';
  }
}
function initTTS(){
  if(!('speechSynthesis' in window))return;
  ensureTtsIndex();
  let vs=[];
  try{vs=speechSynthesis.getVoices();}catch(e){}
  vs=vs.filter(v=>/^zh|zh[-_]CN|Chinese/i.test(v.lang+v.name));
  if(vs.length&&!window.__ttsLogged){
    window.__ttsLogged=true;
    try{console.log('[{host}] 可用中文语音：',vs.map(v=>v.name+' ('+v.lang+')'));}catch(e){}
  }
  buildVoiceList(vs);
  const box=$('voiceList');
  let selName='auto';
  if(box&&box.querySelector){
    const cur=box.querySelector('.vopt.sel');
    if(cur&&cur.dataset.name)selName=cur.dataset.name;
  }
  if(selName!=='auto'&&vs.some(v=>v.name===selName)){
    ttsVoice=vs.find(v=>v.name===selName);
  }else{
    ttsVoice=pickDomVoice(vs)||(vs[0]||null);
  }
  ttsVoiceMale=ttsVoice?MALE_VOICE.test(ttsVoice.name):false;
  updateVoiceHint(vs);
}
if('speechSynthesis' in window){
  speechSynthesis.onvoiceschanged=function(){
    initTTS();
    if(ttsPending.length&&!ttsMuted){
      const q=ttsPending;
      ttsPending=[];
      q.forEach(function(p){sayLocal(p.txt,p.opts);});
    }
  };
}
/* ===== MP3 语音包（预生成男声）===== */
let ttsPack='yunyang';
const TTS_PACKS={yunyang:'云扬 · 男声包（默认）',yunxi:'云希 · 男声包',local:'本地语音'};
/** facetime 在 boot 里设 window.TTS_CDN='../'；直播间为空 */
function ttsCdn(){return (window.TTS_CDN!=null&&window.TTS_CDN!=='')?String(window.TTS_CDN):'';}
let ttsAudio=null,ttsPre=null,ttsGen=0,ttsStartTimer=null,ttsBurstEnd=0,ttsQueue=[];
let ttsAwaitDone=null;
/** 模块化：manifest/index 里有的哈希才播 MP3，否则立刻本地朗读 */
let ttsHashSet=null,ttsIndexLoading=null;
function ttsHash(txt){
  let h=5381;
  for(let i=0;i<txt.length;i++){h=((h<<5)+h+txt.charCodeAt(i))>>>0;}
  return h.toString(16);
}
/** 具体道具名 → 录音用的通称，整句 MP3 仍命中；画面可继续显示细项 */
function toyCanonWord(toy){
  const tags=(toy&&toy.tags)||[];
  if(tags.indexOf('plug')>=0)return '肛塞';
  if(tags.indexOf('dildo')>=0)return '假鸡巴';
  if(tags.indexOf('vibe')>=0)return '跳蛋';
  if(tags.indexOf('candle')>=0)return '蜡烛';
  if(tags.indexOf('stroker')>=0)return '自慰棒';
  return '玩具';
}
function canonToyLabels(s){
  let out=String(s||'');
  const pairs=[];
  scenarioToyCatalog().forEach(function(t){
    if(t&&t.label)pairs.push({from:t.label,to:toyCanonWord(t)});
  });
  // 模块包/旧文案里可能出现的别名
  [
    ['硅胶肛塞','肛塞'],['铃铛肛塞','肛塞'],['普通肛塞','肛塞'],
    ['假鸡巴小','假鸡巴'],['假鸡巴中','假鸡巴'],['假鸡巴大','假鸡巴'],
    ['假鸡巴（小）','假鸡巴'],['假鸡巴（中）','假鸡巴'],['假鸡巴（大）','假鸡巴'],
    ['假鸡巴（可插入）','假鸡巴'],['口罩假鸡巴','假鸡巴'],
    ['跳蛋（1）','跳蛋'],['跳蛋（n）','跳蛋'],['跳蛋1','跳蛋'],['跳蛋n','跳蛋']
  ].forEach(function(p){pairs.push({from:p[0],to:p[1]});});
  pairs.sort(function(a,b){return b.from.length-a.from.length;});
  const seen={};
  pairs.forEach(function(p){
    if(!p.from||seen[p.from])return;
    seen[p.from]=1;
    if(out.indexOf(p.from)>=0)out=out.split(p.from).join(p.to);
  });
  return out;
}
function normTTS(txt){
  var host=(window.TJ&&TJ.hostName)||(CONFIG&&CONFIG.hostName)||'主人';
  var s=String(txt);
  // 画面可用自定义昵称；查 MP3 时一律归一成录音用的「骚狗」
  var nick=(S&&S.nick)||'';
  if(nick&&nick!=='骚狗')s=s.split(nick).join('骚狗');
  if(DATA&&DATA.callNames&&DATA.callNames.length){
    DATA.callNames.forEach(function(n){
      if(n&&n!=='骚狗'&&s.indexOf(n)>=0)s=s.split(n).join('骚狗');
    });
  }
  return fixTTS(canonToyLabels(s
    .replace(/\{n\}/g,'骚狗')
    .replace(/\{c\}/g,'骚狗')
    .replace(/\{host\}/g,host)
    .replace(/\{toy\}/g,'玩具')
    .replace(/\{plug\}/g,'肛塞')
    .replace(/\{dildo\}/g,'假鸡巴')
    .replace(/\{vibe\}/g,'跳蛋')
    .replace(/\{candle\}/g,'蜡烛')
    .replace(/\{stroker\}/g,'自慰棒')
    .replace(/\s+/g,' ')));
}
function ttsUrl(txt){
  return ttsCdn()+'tts/'+ttsPack+'/'+ttsHash(normTTS(txt))+'.mp3';
}
function ensureTtsIndex(){
  if(ttsHashSet)return Promise.resolve(ttsHashSet);
  if(ttsIndexLoading)return ttsIndexLoading;
  ttsIndexLoading=fetch(ttsCdn()+'tts/index.json',{cache:'no-cache'})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(idx){
      ttsHashSet=new Set();
      if(idx&&idx.hashes&&idx.hashes.length){
        idx.hashes.forEach(function(h){ttsHashSet.add(h);});
      }else{
        // 兼容旧仓库：尝试 manifest
        return fetch(ttsCdn()+'tts/manifest.json',{cache:'no-cache'})
          .then(function(r){return r.ok?r.json():{};})
          .then(function(man){
            Object.keys(man||{}).forEach(function(k){ttsHashSet.add(man[k]);});
            return ttsHashSet;
          });
      }
      return ttsHashSet;
    })
    .catch(function(){
      ttsHashSet=new Set(); // 空集 → 全部走本地，避免狂打 404
      return ttsHashSet;
    });
  return ttsIndexLoading;
}
function hasTtsClip(normed){
  if(ttsPack==='local')return false;
  if(!ttsHashSet)return false; // 索引未就绪：先本地，避免等 404
  return ttsHashSet.has(ttsHash(normed));
}
function stopAudio(){
  ttsGen++;
  if(ttsStartTimer){clearTimeout(ttsStartTimer);ttsStartTimer=null;}
  if(ttsAudio){
    try{ttsAudio.onplaying=ttsAudio.onended=ttsAudio.onerror=null;ttsAudio.pause();}catch(e){}
    ttsAudio=null;
  }
}
function preloadTts(txt){
  if(ttsPack==='local'||!('Audio' in window)||!txt)return;
  const finalText=normTTS(txt);
  ensureTtsIndex().then(function(){
    if(!hasTtsClip(finalText))return;
    try{
      if(!ttsPre)ttsPre=new Audio();
      ttsPre.preload='auto';
      ttsPre.src=ttsCdn()+'tts/'+ttsPack+'/'+ttsHash(finalText)+'.mp3';
    }catch(e){}
  });
}
function micOnStart(){
  if(S&&S.stages&&S.stages[S.si]){
    const st=S.stages[S.si];
    const tk=st.tasks[st.idx];
    if((st.type==='chat'||(st.type==='intro'&&tk&&tk.speak))&&S.chatState==='ask'){
      setMicState('speaking',isCall()?'🔊 主人朗读中 · 通话麦开着':'🔊 主人朗读中 · 直播间开着麦','问题读完后，会提示你开口回答');
    }
  }
}
function micOnEnd(){
  if(S&&S.stages&&S.stages[S.si]){
    const st=S.stages[S.si];
    const tk=st.tasks[st.idx];
    if((st.type==='chat'||(st.type==='intro'&&tk&&tk.speak))&&S.chatState==='ask'){
      setMicState('ready',isCall()?'🎙️ 主人听得见你 · 请回答':'🎙️ 直播间能听到你 · 请回答','答完点「回答完毕」继续，或点「跳过问题」');
    }
  }
}
function finishUtterance(opts){
  if(opts&&typeof opts.onDone==='function'){
    const fn=opts.onDone;
    opts.onDone=null;
    try{fn();}catch(e){}
  }else{
    drainQueued();
  }
}
function playMp3(txt,opts){
  stopAudio();
  const gen=++ttsGen;
  try{if('speechSynthesis' in window)speechSynthesis.cancel();}catch(e){}
  let a=null;
  try{a=new Audio();}catch(e){speakLocal(txt,opts);return;}
  a.preload='auto';
  try{a.playbackRate=(ttsRate!=null?clamp(ttsRate,0.5,1.5):1);}catch(e){}
  a.onplaying=function(){
    if(gen!==ttsGen)return;
    if(ttsStartTimer){clearTimeout(ttsStartTimer);ttsStartTimer=null;}
    micOnStart();
  };
  a.onended=function(){
    if(gen!==ttsGen)return;
    if(ttsStartTimer){clearTimeout(ttsStartTimer);ttsStartTimer=null;}
    if(ttsAudio===a)ttsAudio=null;
    micOnEnd();
    finishUtterance(opts);
  };
  a.onerror=function(){
    if(gen!==ttsGen)return;
    if(ttsStartTimer){clearTimeout(ttsStartTimer);ttsStartTimer=null;}
    if(ttsAudio===a)ttsAudio=null;
    try{a.pause();}catch(e){}
    speakLocal(txt,opts);
  };
  ttsAudio=a;
  a.src=ttsUrl(txt);
  let p=null;
  try{p=a.play();}catch(e){if(ttsAudio===a)ttsAudio=null;speakLocal(txt,opts);return;}
  if(p&&p.then){
    p.then(function(){},function(){
      if(gen!==ttsGen)return;
      if(ttsStartTimer){clearTimeout(ttsStartTimer);ttsStartTimer=null;}
      if(ttsAudio===a)ttsAudio=null;
      speakLocal(txt,opts);
    });
  }
  ttsStartTimer=setTimeout(function(){
    if(gen!==ttsGen)return;
    ttsStartTimer=null;
    if(!a.paused&&!a.ended&&a.readyState>=2)return;
    if(ttsAudio===a)ttsAudio=null;
    try{a.pause();}catch(e){}
    speakLocal(txt,opts);
  },3500);
}
function speakLocal(txt,opts){
  opts=opts||{};
  if(!('speechSynthesis' in window)){
    finishUtterance(opts);
    return;
  }
  if(!ttsVoice){
    initTTS();
    if(!ttsVoice&&(!speechSynthesis.getVoices||!speechSynthesis.getVoices().length)){
      ttsPending.push({txt:txt,opts:opts});
      return;
    }
  }
  sayLocal(txt,opts);
}
function sayLocal(txt,opts){
  stopAudio();
  try{speechSynthesis.cancel();}catch(e){}
  const u=new SpeechSynthesisUtterance(String(txt).replace(/\s+/g,' '));
  u.lang='zh-CN';
  if(ttsVoice)u.voice=ttsVoice;
  const vp=localVoiceParams(opts);
  u.rate=vp.rate;
  u.pitch=vp.pitch;
  u.volume=1;
  u.onstart=micOnStart;
  u.onend=function(){micOnEnd();finishUtterance(opts);};
  u.onerror=function(){micOnEnd();finishUtterance(opts);};
  speechSynthesis.speak(u);
}
function playNow(finalText,opts){
  ensureTtsIndex().then(function(){
    if(ttsPack!=='local'&&'Audio' in window&&hasTtsClip(finalText)){
      playMp3(finalText,opts);
    }else{
      speakLocal(finalText,opts);
    }
  });
}
function drainQueued(){
  ttsBurstEnd=0;
  if(ttsQueue.length){
    const q=ttsQueue.shift();
    ttsBurstEnd=Date.now()+400;
    playNow(q.txt,q.opts);
  }
}
function speak(txt,opts){
  if(ttsMuted)return;
  const finalText=normTTS(txt);
  if(ttsBurstEnd>Date.now()){
    ttsQueue.push({txt:finalText,opts:opts||{}});
    return;
  }
  ttsBurstEnd=Date.now()+400;
  playNow(finalText,opts);
}
/** 等整句真正念完再继续（一对一回顾/确认用） */
function speakAsync(txt,opts){
  if(ttsMuted)return Promise.resolve();
  const finalText=normTTS(txt);
  return ensureTtsIndex().then(function(){
    return new Promise(function(resolve){
      const done=function(){
        if(ttsAwaitDone===done)ttsAwaitDone=null;
        resolve();
      };
      ttsAwaitDone=done;
      const o=Object.assign({},opts||{},{onDone:done});
      if(ttsPack!=='local'&&'Audio' in window&&hasTtsClip(finalText)){
        playMp3(finalText,o);
      }else{
        speakLocal(finalText,o);
      }
    });
  });
}
function fixTTS(txt){
  var s=String(txt);
  if(isCall()){
    return s
      .replace(/调教室/g,'私人通话')
      .replace(/调教房/g,'私人通话')
      .replace(/调教直播间/g,'私人通话');
  }
  return s
    .replace(/调教室/g,'调教直播间')
    .replace(/调教房/g,'调教直播间');
}
function stopSpeak(){
  ttsQueue=[];
  ttsBurstEnd=0;
  const pending=ttsAwaitDone;
  ttsAwaitDone=null;
  stopAudio();
  if('speechSynthesis' in window){try{speechSynthesis.cancel();}catch(e){}}
  if(pending)try{pending();}catch(e){}
}
if(/iPad|iPhone|iPod/.test(navigator.userAgent)){
  setInterval(function(){
    try{
      if('speechSynthesis' in window&&speechSynthesis.speaking&&!speechSynthesis.paused){
        speechSynthesis.pause();speechSynthesis.resume();
      }
    }catch(e){}
  },3000);
}

/* ================= 音效 ================= */
let AC=null;
function ctx(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C();}return AC;}
function tone(f,dur,type,vol,delay){
  if(sfxMuted)return;
  const c=ctx();if(!c)return;
  try{
    if(c.state==='suspended')c.resume();
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';o.frequency.value=f;
    const t0=c.currentTime+(delay||0);
    const v=(vol||0.12)*CONFIG.SFX_VOL;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(v,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+dur+0.05);
  }catch(e){}
}
function sfx(name){
  switch(name){
    case 'task': tone(520,.12,'sine',.1);break;
    case 'done': tone(660,.12,'sine',.12);tone(880,.18,'sine',.12,.1);break;
    case 'fail': tone(180,.3,'sawtooth',.1);tone(140,.4,'sawtooth',.08,.15);break;
    case 'pop': tone(1400+R(0,500),.06,'sine',.05);break;
    case 'tick': tone(1000,.05,'square',.04);break;
    case 'boo': tone(220,.2,'sawtooth',.07);tone(200,.3,'sawtooth',.07,.12);break;
    case 'start': tone(440,.15,'sine',.1);tone(554,.15,'sine',.1,.12);tone(660,.25,'sine',.1,.24);break;
    case 'close': tone(110,.8,'sawtooth',.15);tone(70,1.2,'sawtooth',.12,.1);break;
    case 'cheer': tone(880,.1,'sine',.08);tone(1108,.12,'sine',.08,.08);tone(1320,.2,'sine',.08,.16);break;
    case 'qReady': tone(740,.11,'sine',.09);tone(988,.18,'sine',.09,.1);break;
    case 'recStart': tone(880,.09,'sine',.11);tone(1318,.14,'sine',.11,.1);break;
    case 'recStop': tone(988,.1,'sine',.09);tone(659,.16,'sine',.09,.1);break;
    case 'click': tone(600,.05,'square',.05);tone(300,.05,'square',.05,.06);break;
  }
}

/* ================= 观众 ================= */
let cint=null,elapsedInt=null,toastTimer=null,papaTimer=null,viewInt=null,actBannerTimer=null,msgTimer=null;
function startCommentLoop(){
  stopCommentLoop();
  if(isCall())return; // 一对一无私信墙
  cint=setInterval(function(){
    if(S.silentT>0){S.silentT-=250;return;}
    pushComment(nextComment());
  },commentInterval());
}
function stopCommentLoop(){if(cint){clearInterval(cint);cint=null;}}
function commentInterval(){
  const h=S.stats.heat;
  return h>70?CONFIG.COMMENT_INTERVAL.hot:(h<30?CONFIG.COMMENT_INTERVAL.cool:CONFIG.COMMENT_INTERVAL.mid);
}
function commentPool(){
  const st=S.stages[S.si];
  const t=st.tasks[st.idx];
  if(st.type==='climax')return (t&&t.finale)?(DATA.comments.finale||DATA.comments.jerk):DATA.comments.jerk;
  return DATA.comments[st.type]||DATA.comments.instruct;
}
function currentKink(){
  const st=S.stages[S.si];
  const t=st?st.tasks[st.idx]:null;
  return t&&t.k?t.k:'';
}
function filterPool(){
  const pool=commentPool();
  const k=currentKink();
  const matched=pool.filter(c=>!c.end&&c.k===k);
  const generic=pool.filter(c=>!c.end&&!c.k);
  return matched.length?matched.concat(generic):generic.concat(pool.filter(c=>!c.end));
}
function nextComment(){
  const host=hostLabel();
  if(isCall()&&DATA.comments.host&&DATA.comments.host.length&&Math.random()<0.45){
    return {name:host,text:P(pick(DATA.comments.host).t)};
  }
  if(!isCall()&&DATA.comments.host&&DATA.comments.host.length&&Math.random()<CONFIG.HOST_COMMENT_CHANCE){
    return {name:pick(S.audience),text:P(pick(DATA.comments.host).t)};
  }
  const pool=filterPool();
  const w={normal:10,cheer:0,boo:0,dirty:3,wtf:3};
  if(S.failStreak>0||S.stats.obey<35)w.boo+=12;
  if(S.stats.obey>60)w.cheer+=9;
  if(S.stats.shame>55)w.dirty+=9;
  if(S.stats.shame>75)w.dirty+=8;
  if(S.stats.heat>65)w.cheer+=4;
  let total=0;Object.keys(w).forEach(k=>total+=w[k]);
  let r=Math.random()*total,g='normal';
  for(const k of Object.keys(w)){r-=w[k];if(r<=0){g=k;break;}}
  const cands=pool.filter(c=>c.g===g);
  const item=cands.length?pick(cands):pick(pool);
  return {name:isCall()?host:pick(S.audience),text:P(item.t)};
}
function pushComment(c){
  const box=$('audMsgs');
  if(!box)return;
  const el=document.createElement('div');
  el.className='msg';
  const name=isCall()?hostLabel():c.name;
  let ci=0;
  for(let i=0;i<name.length;i++)ci=(ci+name.charCodeAt(i)*7)%8;
  const cols=['#7fd0ff','#ffb36b','#9dff8a','#ff8ad8','#8ad8ff','#ffe27a','#c0a5ff','#7affd4'];
  const nameCls=isCall()?'cn host':'cn';
  const nameColor=isCall()?'#7dff9a':cols[ci];
  el.innerHTML='<span class="'+nameCls+'" style="color:'+nameColor+'">'+esc(name)+'</span><span class="ct">'+esc(c.text)+'</span>';
  box.appendChild(el);
  let trim=box.children.length-CONFIG.COMMENT_MAX+1;
  while(trim>0&&box.children.length>=CONFIG.COMMENT_MAX){
    const old=box.firstChild;
    old.classList.add('bye');
    (function(o){setTimeout(function(){try{o.remove();}catch(e){}},220);})(old);
    trim--;
  }
  sfx('pop');
}
function updateViewers(){
  if(isCall()){
    const el=$('viewers');
    if(el)el.textContent='一对一 · 加密通话';
    const cd=$('callDuration');
    if(cd&&S)cd.textContent=fmtTime(Date.now()-S.startedAt);
    return;
  }
  const base=CONFIG.VIEWER_BASE+S.stats.heat*3;
  const n=Math.max(24,base+R(-8,12));
  const vw=$('viewers');
  if(vw)vw.textContent=n+' 模拟观众在线';
  const vb=$('viewBadge');
  if(!vb)return;
  vb.textContent=n+' 模拟观众';
  let cls='v-low';
  if(n>=380)cls='v-max';
  else if(n>=260)cls='v-high';
  else if(n>=160)cls='v-mid';
  vb.classList.remove('v-low','v-mid','v-high','v-max');
  void vb.offsetWidth;
  vb.classList.add(cls);
  const prev=vb.dataset.n?parseInt(vb.dataset.n,10):n;
  if(n-prev>=30){vb.classList.remove('shake');void vb.offsetWidth;vb.classList.add('shake');}
  vb.dataset.n=n;
}
function gcomment(g){
  const pool=filterPool();
  const cands=pool.filter(c=>c.g===g);
  const item=cands.length?pick(cands):pick(pool);
  return {name:isCall()?hostLabel():pick(S.audience),text:P(item.t)};
}
function cheerComments(){if(isCall())return;for(let i=0;i<R(1,2);i++)pushComment(gcomment('cheer'));}
function booComments(){if(isCall())return;for(let i=0;i<R(1,3);i++)pushComment(gcomment('boo'));}
function dirtyBurst(){if(isCall())return;for(let i=0;i<R(2,3);i++)pushComment(gcomment('dirty'));}
function endComments(){
  if(isCall())return;
  const ends=commentPool().filter(c=>c.end);
  if(!ends.length)return;
  for(let i=0;i<R(1,2);i++)pushComment({name:pick(S.audience),text:P(pick(ends).t)});
}

/* ================= 提示 ================= */
function setMsgLine(html,gold,hold){
  const ml=$('msgline');
  if(!ml)return;
  ml.className='msgline'+(gold?' gold':'');
  ml.innerHTML=html;
  ml.hidden=false;
  clearTimeout(msgTimer);
  msgTimer=setTimeout(function(){ml.hidden=true;},(hold||7)*1000);
}
function papaToast(txt,hold){
  setMsgLine('<b>'+esc(hostLabel())+'：</b>'+esc(P(txt)),false,hold||7);
  speak(txt);
}
function showToast(title,txt){
  setMsgLine('<b>'+esc(title)+'</b>　'+esc(phrase(txt||'')),true,7);
}

/* ================= 数值 ================= */
function addShame(v){
  let gain=v;
  const cur=S.stats.shame;
  if(cur>=85)gain=Math.round(v*0.15);
  else if(cur>=65)gain=Math.round(v*0.4);
  S.stats.shame=clamp(S.stats.shame+gain,0,100);
  S.maxShame=Math.max(S.maxShame,S.stats.shame);
  return S.stats.shame;
}
function applyTask(task){
  const st=S.stats;
  let o=task.o||2,s=task.s||3,h=task.h||2;
  if(S.buff>0){s+=2;h+=2;S.buff--;}
  st.obey=clamp(st.obey+o,0,100);
  addShame(s);
  st.heat=clamp(st.heat+h,0,100);
  if(S.mode==='hard'&&task.st)st.stamina=clamp(st.stamina+task.st,0,100);
  S.maxHeat=Math.max(S.maxHeat,st.heat);
}
function renderStats(){
  const s=S.stats;
  if(!S._lastStats)S._lastStats={obey:s.obey,shame:s.shame,heat:s.heat,stamina:s.stamina};
  else{
    const ls=S._lastStats;
    ['obey','shame','heat','stamina'].forEach(function(k){
      if(s[k]==null)return;
      const d=s[k]-ls[k];
      if(d)floatStat(k,d);
    });
  }
  S._lastStats={obey:s.obey,shame:s.shame,heat:s.heat,stamina:s.stamina};
  if(!S._tFlags)S._tFlags={};
  if(s.heat>=80&&!S._tFlags.heat80){
    S._tFlags.heat80=true;
    if(isCall())showToast('🔥 主人越来越兴奋','这通电话里只剩你和他，他越看越满意。');
    else showToast('🔥 直播间爆火','观众暴涨，弹幕刷屏，所有人都在看你发骚。');
  }
  if(s.obey>=70&&!S._tFlags.obey70){S._tFlags.obey70=true;papaToast('服从度上来了，{c}。主人开始信任你了。',3);}
  if(s.shame>=70&&!S._tFlags.shame70){
    S._tFlags.shame70=true;
    if(isCall())showToast('💦 羞耻爆表','你的脸已经红透了，主人盯着你看。');
    else showToast('💦 羞耻爆表','你的脸已经红透了，观众看得更起劲。');
  }
  if(s.shame>=90&&!S._tFlags.shame90){S._tFlags.shame90=true;papaToast('羞耻值要爆了，{c}。再继续下去，今晚只能崩溃收场。',3.5);}
  const ps=$('pill-shame');
  if(ps)ps.classList.toggle('crash-warn',s.shame>=80);
  if(S.mode==='hard'&&s.stamina!=null&&s.stamina<30&&!S._tFlags.stam30){S._tFlags.stam30=true;papaToast('体力快见底了，{c}。还能撑住吗？',3);}
  setBar('obey',s.obey);setBar('shame',s.shame);setBar('heat',s.heat);
  if(S.mode==='hard'){setHidden('pill-sta',false);setBar('stamina',s.stamina);}
  else{setHidden('pill-sta',true);}
}
function floatStat(k,d){
  const pill=$('pill-'+k)||$('stats');
  const el=document.createElement('div');
  el.className='floatv '+(d>0?'up':'down');
  el.textContent=(d>0?'+':'')+d;
  pill.appendChild(el);
  setTimeout(function(){try{el.remove();}catch(e){}},950);
}
function setBar(key,val){
  const b=$('b-'+key),n=$('n-'+key);
  if(b)b.style.width=val+'%';
  if(n)n.textContent=val;
}

/* ================= 渲染 ================= */
function renderStage(){
  unlock();
  const st=S.stages[S.si];
  if(isCall()&&S.scenario){
    setText('stageLabel',S.scenario.label+(st.spot?(' · '+propLabel(st.spot)):' · '+hostLabel()));
  }else{
    setText('stageLabel',isCall()?(hostLabel()+'的通话'):('{host}的调教室'.replace('{host}',hostLabel())));
  }
  const act=st.act||0;
  if(act!==S.curAct){
    S.curAct=act;
    if(act>0){
      showActBanner(act);
      if(DATA.actOpen[act])papaToast(pick(DATA.actOpen[act]),3.5);
    }
  }
  const sceneBit=(isCall()&&S.scenario)?(S.scenario.label+' · '):'';
  if(isCall()&&st.spot){
    const step=st.spotStep?('第 '+st.spotStep+'/'+st.spotTotal+' 站 · '):'';
    setText('subLabel',step+st.label+' · 环节 '+(S.si+1)+'/'+S.stages.length);
  }else{
    setText('subLabel',sceneBit+(act>0?'第 '+act+' 幕 · ':'')+'环节 '+(S.si+1)+'/'+S.stages.length+' · '+st.label);
  }
  const sp=$('sessProg');
  if(sp)sp.style.width=((S.si)/(S.stages.length-1)*100)+'%';
  renderStats();
  if(S.stageIntro){
    S.stageIntro=false;
    const intro=DATA.stageOpen[st.type];
    if(intro)papaToast(pick(intro),3);
  }
  const task=st.tasks[st.idx];
  if((st.type==='jerk'||st.type==='climax')&&task.steps){startJerk(task);}
  else renderTask(task);
}
function renderTask(task){
  const st=S.stages[S.si];
  if($('btnA')){$('btnA').disabled=false;$('btnA').classList.remove('dim');}
  if($('btnB')){$('btnB').disabled=false;$('btnB').classList.remove('dim');}
  const sceneTag=(isCall()&&S.scenario&&(st.type==='arrive'||st.type==='body'||st.type==='place_task'||st.type==='combo'))
    ?('📍 '+S.scenario.label+(task.k?(' · '+task.k):''))
    :null;
  let tagText=task.finale?'🏁 终局指令':(st.type==='intro'?'🎬 引导':(sceneTag||((KINK_ICON[task.k]?KINK_ICON[task.k]+' ':'')+(task.k||st.label||''))));
  if(isCall()&&st.act){
    const shown=(task.diff!=null||task.act!=null||task.hi)?taskDiff(task):clamp(st.act,1,3);
    tagText+=' · '+diffLabel(shown);
  }
  setText('kinktag',tagText);
  setText('nicktag',(isCall()?'通话对象：':'上播选手：')+S.nick);
  setText('prog','任务 '+(st.idx+1)+'/'+st.tasks.length);
  const prog=$('progress');
  if(prog)prog.style.width=((st.idx+1)/st.tasks.length*100)+'%';
  setText('tccap',st.type==='punish'?(hostLabel()+' 正在罚你 · 因为你不乖'):((st.type==='chat'||st.type==='aftercare')?(hostLabel()+' 开口说话'):(st.type==='intro'||st.type==='arrive'?(hostLabel()+' 引导中'):(hostLabel()+' 下达指令'))));
  if(S.combo>=2){setHidden('combo',false);setText('combo','连击×'+S.combo);}
  else{setHidden('combo',true);}
  setHtml('tasktext',esc(P(task.t))+(task.follow?'<div class="follow">追问：'+esc(P(task.follow))+'</div>':''));
  const nt=st.tasks[st.idx+1];
  if(nt)preloadTts((nt.papa?nt.papa+' ':'')+nt.t);
  const a=$('btnA'),b=$('btnB');
  if(b)b.hidden=false;
  switch(st.type){
    case 'intro':setBtn('btnA','已乖乖照做');setBtn('btnB','跳过引导');break;
    case 'arrive':setBtn('btnA','已就位');setBtn('btnB','跳过引导');break;
    case 'chat':setBtn('btnA','开始回答');setBtn('btnB','跳过问题');break;
    case 'order':setBtn('btnA',isCall()?'照做':'满足观众');setBtn('btnB','拒绝');break;
    case 'recite':setBtn('btnA','已大声复述');setBtn('btnB','念不出口');break;
    case 'aftercare':setBtn('btnA','已完成');if(b)b.hidden=true;break;
    default:setBtn('btnA','已乖乖照做');setBtn('btnB','做不到…');
  }
  if(st.type==='chat'&&!isCall()){
    S.chatState='ask';
    setMicState('idle','语音问答开启中 · 直播间能听到你','主人正在朗读问题，听完请开口回答');
  }else if(st.type==='intro'&&task.speak&&!isCall()){
    S.chatState='ask';
    setMicState('idle','语音确认中 · 直播间能听到你','主人读完后，请开口回答，答完点「回答完毕」');
    setBtn('btnA','开始回答');setBtn('btnB','跳过引导');
  }else{
    setHidden('micpanel',true);
    clearChatTimer();
  }
  if(task.final){
    setBtn('btnA','准备好了');
    if($('btnB'))$('btnB').hidden=true;
  }
  if(task.finale){
    if(task.type==='deny'){setBtn('btnA','忍住了，没射');setBtn('btnB','没忍住，射了');}
    else{setBtn('btnA','完成了');setBtn('btnB','做不到');}
  }
  setHidden('countdown',true);
  if(task.papa)setMsgLine('<b>'+esc(hostLabel())+'：</b>'+esc(P(task.papa)),false,6);
  if(isCall()&&S.scenario){
    const reactHint=S.memory&&S.memory.lastOutcome?memoryReactLine(S.memory.lastOutcome):null;
    const improv=sceneImprovLine(task);
    if(S.memory)S.memory.lastOutcome=null;
    if(reactHint||improv){
      const tips=[];
      if(reactHint)tips.push(esc(reactHint));
      if(improv)tips.push(esc(improv));
      setHtml('tasktext','<div class="follow call-live-tip">'+tips.join(' · ')+'</div>'+esc(P(task.t))+(task.follow?'<div class="follow">追问：'+esc(P(task.follow))+'</div>':''));
    }
    callSpeakTask(task,{react:reactHint,improv:improv});
  }else{
    speak((task.papa?task.papa+' ':'')+task.t);
  }
  sfx('task');
}

/* ================= 倒计时 ================= */
let jerkTimer=null,jerkEnd=0,jerkDur=0,jerkStep=0,jerkWarn=false,currentJerk=null,preCountInt=null;
function startJerk(task){
  currentJerk=task;
  $('countdown').hidden=false;
  $('micpanel').hidden=true;
  clearChatTimer();
  const rhythm=!!(task.insertRhythm||task.insertClimax);
  const stroke=!!(task.strokeRhythm||task.strokeClimax);
  const dLab=diffLabel(task.diff||((task.insertClimax||task.strokeClimax)?3:2));
  const strokeOpen=task.strokeClimax
    ?'跟着节拍撸，到点再射。'
    :(task.diff<=1?'跟着慢节拍撸，先找感觉，不许冲。':(task.diff>=3?'跟上快节拍撸，到边缘就停。':'跟着节拍撸，听口令变速。'));
  const insertOpen=task.insertClimax
    ?'跟着节拍抽插，到点再射。射的时候含着，不许自己拔出来。'
    :(task.diff<=1?'含着，跟着慢节拍抽插。前面不许碰。':(task.diff>=3?'含着，跟上快节拍抽插。前面不许碰。':'含着，跟着节拍抽插。前面不许碰。'));
  $('jerkTitle').textContent=task.insertClimax
    ?('高潮收束 · 跟节奏插入 · '+dLab)
    :(task.strokeClimax
      ?('高潮收束 · 跟节奏撸 · '+dLab)
      :(rhythm?('跟节奏插入 · '+dLab):(stroke?('跟节奏撸 · '+dLab):(task.climax?'高潮收束 · 倒计时':'倒计时撸管'))));
  const openLine=rhythm?insertOpen:(stroke?strokeOpen:'跟着节拍撸动，坚持到倒计时结束。');
  $('tasktext').textContent=openLine;
  $('kinktag').textContent=task.insertClimax
    ?('🔥 跟节奏插入 · '+dLab)
    :(task.strokeClimax
      ?('🔥 跟节奏撸 · '+dLab)
      :(rhythm?('🍆 跟节奏插入 · '+dLab):(stroke?('💦 跟节奏撸 · '+dLab):(task.climax?'🔥 边缘·高潮':'💦 撸管'))));
  const st=S.stages[S.si];
  $('prog').textContent='第 '+(st.idx+1)+'/'+st.tasks.length+' 段 · '+task.dur+' 秒';
  setBtn('btnA','坚持到结束');
  setBtn('btnB','撑不住了');
  $('btnB').hidden=false;
  $('btnA').disabled=true;$('btnA').classList.add('dim');
  $('stepText').textContent='准备开始…';
  jerkDur=task.dur;
  jerkStep=0;jerkWarn=false;
  $('ring').style.strokeDashoffset=CONFIG.RING_C;
  $('timer').textContent=fmtTime(jerkDur*1000);
  $('beatbar').style.width='0%';
  $('beatCount').textContent='0';
  $('restTag').hidden=true;
  $('pulseRing').classList.remove('rest');
  $('preCount').hidden=false;
  $('preCount').textContent='3';
  if(task.steps&&task.steps[0])preloadTts(task.steps[0].txt);
  beginPreCount(function(){
    jerkEnd=Date.now()+jerkDur*1000;
    renderTimer();
    jerkTimer=setInterval(renderTimer,250);
    metroStart();
    speak(openLine);
  });
}
function stopTimer(){if(jerkTimer){clearInterval(jerkTimer);jerkTimer=null;}}
function beginPreCount(cb){
  let n=3;
  $('pauseBtn').disabled=true;
  sfx('click');
  preCountInt=setInterval(function(){
    n--;
    if(n>0){$('preCount').textContent=String(n);sfx('click');}
    else{
      clearInterval(preCountInt);preCountInt=null;
      $('preCount').hidden=true;
      $('pauseBtn').disabled=false;
      cb();
    }
  },700);
}
/* ================= 节拍器（BPM 跟随口令，不抢写指示） ================= */
let metroTimer=null,metroBpm=0,metroBeat=0,metroRestUntil=0,metroNextVar=0;
let metroPauseBpm=null,metroPauseBeat=0,metroPauseRestRemain=0;
let metroIntent='base'; // base | slow | mid | fast | sprint | rest
function metroBpmRange(){
  const v=CONFIG.BPM_VAR||[60,150];
  return {lo:v[0],hi:v[1]};
}
function setMetroBpm(bpm,intent){
  const r=metroBpmRange();
  const next=clamp(Math.round(bpm),r.lo,r.hi);
  if(intent)metroIntent=intent;
  if(next===metroBpm){
    const bn=$('bpmNum');
    if(bn)bn.textContent=String(metroBpm);
    return;
  }
  metroBpm=next;
  const bn=$('bpmNum');
  if(bn){
    bn.textContent=String(metroBpm);
    bn.classList.remove('pop');
    void bn.offsetWidth;
    bn.classList.add('pop');
  }
}
/** 根据口令文本驱动节拍：加速/减速/寸止休息 */
function applyStepToMetro(txt){
  const t=String(txt||'');
  // 休息 / 寸止：停拍，时长尽量贴合文案里的「N秒」
  if(/寸止|撒手|停[！!。]|休息|不许碰|双手举过|捏住根部停|边缘[！!]/.test(t)){
    let sec=R(...(CONFIG.METRO_REST||[8,15]));
    const m=t.match(/(\d+)\s*秒/);
    if(m)sec=clamp(parseInt(m[1],10),5,45);
    else if(/三次|深呼吸/.test(t))sec=clamp(sec,8,12);
    else if(/边缘/.test(t)&&!/冲|逼近|接近/.test(t))sec=clamp(sec,6,12);
    metroRest(sec);
    metroIntent='rest';
    return;
  }
  if(/冲刺|最快|全力|更快更用力|翻白眼/.test(t)){
    setMetroBpm(R(128,148),'sprint');
    return;
  }
  if(/快一点|加速|往边缘冲|逼近边缘|冲上边缘|快节奏|使劲|用力撸|用力抽|抽插加快|加快抽|往深处/.test(t)){
    setMetroBpm(R(112,128),'fast');
    return;
  }
  if(/慢|匀速|慢慢|热身|寻找感觉|轻轻|轻柔/.test(t)){
    setMetroBpm(R(72,90),'slow');
    return;
  }
  if(/继续|开始撸|开始抽|保持|进入节奏|抽插|进出/.test(t)){
    const base=CONFIG.BPM_BASE||[78,112];
    setMetroBpm(R(base[0],base[1]),'mid');
  }
}
function metroStart(bpm){
  metroStop();
  const base=CONFIG.BPM_BASE||[78,112];
  metroBpm=bpm||R(base[0],base[1]);
  metroIntent='base';
  metroBeat=0;
  metroRestUntil=0;
  metroNextVar=Date.now()+R(...(CONFIG.VAR_INTERVAL||[12000,20000]));
  setText('bpmNum',String(metroBpm));
  setText('beatCount','0');
  setHidden('restTag',true);
  const pr=$('pulseRing');
  if(pr)pr.classList.remove('rest');
  metroSchedule();
}
function metroResume(){
  metroStop();
  if(!metroPauseBpm){metroStart();return;}
  metroBpm=metroPauseBpm;
  setText('bpmNum',String(metroBpm));
  setText('beatCount',String(metroPauseBeat||0));
  if(metroPauseRestRemain>0){
    metroRestUntil=Date.now()+metroPauseRestRemain;
    setHidden('restTag',false);
    const pr=$('pulseRing');
    if(pr)pr.classList.add('rest');
  }else{
    metroRestUntil=0;
    setHidden('restTag',true);
    const pr=$('pulseRing');
    if(pr)pr.classList.remove('rest');
  }
  metroNextVar=Date.now()+R(...(CONFIG.VAR_INTERVAL||[12000,20000]));
  metroSchedule();
}
function metroStop(){
  if(metroTimer){clearTimeout(metroTimer);metroTimer=null;}
}
function metroInterval(){return 60000/Math.max(metroBpm,10);}
function metroSchedule(){
  metroTimer=setTimeout(function(){
    if(!currentJerk||!jerkTimer){metroStop();return;}
    if(Date.now()<metroRestUntil){
      metroSchedule();
      return;
    }
    const rt=$('restTag');
    if(rt&&!rt.hidden){
      rt.hidden=true;
      const pr=$('pulseRing');
      if(pr)pr.classList.remove('rest');
      // 休息结束：回到中速，避免立刻冲刺
      if(metroIntent==='rest'){
        const base=CONFIG.BPM_BASE||[78,112];
        setMetroBpm(R(base[0],Math.min(base[1],100)),'mid');
      }
    }
    metroBeat++;
    const accent=metroBeat%4===0;
    tone(860+(metroBpm/250)*180,0.12,'sine',accent?0.12:0.06);
    if(accent)tone(1290,0.09,'sine',0.07,0.02);
    pulseBeat();
    setText('beatCount',String(metroBeat));
    const bb=$('beatbar');
    if(bb)bb.style.width=(metroBeat%32)/32*100+'%';
    // 轻漂移：只改数字，绝不覆盖口令 stepText
    if(Date.now()>=metroNextVar&&metroIntent!=='rest'&&metroIntent!=='sprint'){
      const drift=metroIntent==='slow'?R(-4,3):(metroIntent==='fast'?R(-3,5):R(-6,6));
      setMetroBpm(metroBpm+drift,metroIntent);
      sfx('tick');
      metroNextVar=Date.now()+R(...(CONFIG.VAR_INTERVAL||[12000,20000]));
    }
    metroSchedule();
  },metroInterval());
}
function metroRest(sec){
  metroRestUntil=Date.now()+sec*1000;
  metroIntent='rest';
  setHidden('restTag',false);
  const pr=$('pulseRing');
  if(pr)pr.classList.add('rest');
}
function pulseBeat(){
  const pr=$('pulseRing');
  if(!pr)return;
  pr.classList.remove('beat');
  void pr.offsetWidth;
  pr.style.setProperty('--beatms',Math.round(metroInterval())+'ms');
  pr.classList.add('beat');
}
function renderTimer(){
  if(!currentJerk)return;
  const remain=Math.max(0,Math.round((jerkEnd-Date.now())/1000));
  const m=Math.floor(remain/60),s=remain%60;
  setText('timer',(m<10?'0':'')+m+':'+(s<10?'0':'')+s);
  const frac=jerkDur>0?remain/jerkDur:0;
  const ring=$('ring');
  if(ring)ring.style.strokeDashoffset=CONFIG.RING_C*frac;
  const pct=100*(1-frac);
  const steps=currentJerk.steps||[];
  while(jerkStep<steps.length&&steps[jerkStep].p<=pct){
    const stp=steps[jerkStep];
    const line=P(stp.txt);
    setText('stepText',line);
    speak(stp.txt,{rate:1.05});
    for(let i=0;i<(stp.n||1);i++)tone(950,.06,'square',.05,i*.12);
    applyStepToMetro(stp.txt);
    if(steps[jerkStep+1])preloadTts(steps[jerkStep+1].txt);
    jerkStep++;
  }
  if(remain<=30&&remain>0&&!jerkWarn){
    jerkWarn=true;
    tone(1000,.25,'square',.1);
    // 不覆盖当前口令（尤其寸止/边缘）；只在无休息且口令不是停手类时轻提示
    const resting=Date.now()<metroRestUntil;
    const cur=steps[Math.max(0,jerkStep-1)];
    const stopish=cur&&/寸止|撒手|停[！!]|休息|边缘[！!]|不许射/.test(cur.txt);
    if(!resting&&!stopish){
      const tip=$('stepText');
      if(tip&&!/变奏/.test(tip.textContent||'')){
        // 附加提示到现有口令后，避免整段被盖掉
        tip.textContent=(tip.textContent||'')+'（最后 30 秒，跟上节拍）';
      }
    }
  }
  if(remain<=0)endJerk();
}
function endJerk(){
  stopTimer();
  metroStop();
  if(preCountInt){clearInterval(preCountInt);preCountInt=null;}
  $('preCount').hidden=true;
  $('restTag').hidden=true;
  $('pulseRing').classList.remove('rest');
  $('countdown').hidden=true;
  $('btnA').disabled=false;$('btnA').classList.remove('dim');
  applyTask({o:3,s:7,h:6,st:-10});
  S.failStreak=0;S.combo++;S.done++;
  if(isCall()&&S.scenario){
    if(currentJerk&&(currentJerk.insertRhythm||currentJerk.insertClimax||currentJerk.insertWhile)){
      updateMemoryFromTask({t:'抽插',k:'假鸡巴',part:'ass',needInsert:true},'done');
    }else{
      updateMemoryFromTask({t:'撸管',k:'边缘',part:'cock'},'done');
    }
  }
  sfx('cheer');dirtyBurst();endComments();
  afterAction();
}

/* ================= 选择 ================= */
function chooseA(){
  const st=S.stages[S.si];
  const task=st.tasks[st.idx];
  if((st.type==='jerk'||st.type==='climax')&&task.steps){endJerk();return;}
  if(st.type==='chat'||(st.type==='intro'&&task.speak)){
    if(S.chatState!=='answering'){
      S.chatState='answering';
      setMicState('listening',isCall()?'🎙️ 正在聆听 · 主人听得见你':'🎙️ 正在聆听 · 直播间都听得到你','请开口回答，答完点「回答完毕」');
      setBtn('btnA','回答完毕');
      unlock();
      clearChatTimer();
      chatDeadline=Date.now()+CONFIG.CHAT_ANSWER_MS;
      chatTimer=setTimeout(answerDone,CONFIG.CHAT_ANSWER_MS);
      return;
    }
    answerDone();
    return;
  }
  if(st.type==='aftercare'){
    if(st.idx>=st.tasks.length){finishGame();return;}
    applyTask(st.tasks[st.idx]);
    st.idx++;
    if(st.idx>=st.tasks.length){finishGame();}
    else renderStage();
    return;
  }
  if(task.finale){
    applyTask(task);
    S.finaleType=task.type;
    S.failStreak=0;S.combo++;S.done++;
    updateMemoryFromTask(task,'done');
    sfx('done');cheerComments();endComments();
    afterAction();
    return;
  }
  applyTask(task);
  S.failStreak=0;S.combo++;S.done++;
  updateMemoryFromTask(task,'done');
  sfx('done');cheerComments();
  afterAction();
}
function chooseB(){
  const st=S.stages[S.si];
  const task=st.tasks[st.idx];
  if(st.type==='intro'||st.type==='arrive'){skipIntroStage();return;}
  if(st.type==='chat'){skipChat();return;}
  if(st.type==='order'){refuseOrder();return;}
  if(task.finale){
    if(task.type==='deny'){denyViolated();}
    else failHard();
    return;
  }
  failHard();
}
function skipIntroStage(){
  // Neutral skip: no score / combo / skipCount impact
  clearChatTimer();
  stopSpeak();
  setHidden('micpanel',true);
  S.chatState=null;
  papaToast(isCall()?'引导跳过了。直接开始。':'引导跳过了。直接开播。',2.2);
  S.si++;
  if(S.si>=S.stages.length){finishGame();return;}
  S.stageIntro=true;
  const ns=S.stages[S.si];
  if(ns&&ns.tasks&&ns.tasks[0])preloadTts((ns.tasks[0].papa?ns.tasks[0].papa+' ':'')+ns.tasks[0].t);
  renderStage();
}
function skipChat(){
  S.stats.obey=clamp(S.stats.obey-2,0,100);
  addShame(1);
  S.skipCount++;S.combo=0;
  sfx('boo');booComments();
  papaToast(isCall()?'跳过问题？主人还在等你开口。':'跳过问题？观众可都在等着呢。',2.2);
  afterAction();
}
let chatTimer=null;
function clearChatTimer(){if(chatTimer){clearTimeout(chatTimer);chatTimer=null;}}
function setMicState(state,title,hint){
  const mp=$('micpanel');
  if(!mp)return;
  mp.hidden=false;
  const wr=mp.querySelector?mp.querySelector('.micwrap'):null;
  if(wr)wr.className='micwrap '+state;
  $('micState').textContent=title;
  $('micHint').textContent=hint;
  if(state==='ready')sfx('qReady');
  else if(state==='listening'){stopSpeak();sfx('recStart');}
  void mp.offsetWidth;
  mp.classList.remove('flash');
  mp.classList.add('flash');
}
function answerDone(){
  clearChatTimer();
  chatDeadline=0;
  sfx('recStop');
  const st=S.stages[S.si];
  const task=st?st.tasks[st.idx]:null;
  if(!task)return;
  applyTask(task);
  S.failStreak=0;S.combo++;S.done++;
  updateMemoryFromTask(task,'done');
  sfx('done');cheerComments();
  afterAction();
}
function refuseOrder(){
  const st=S.stages[S.si];
  S.stats.heat=clamp(S.stats.heat-5,0,100);
  S.stats.obey=clamp(S.stats.obey-1,0,100);
  S.refusals++;S.combo=0;
  sfx('boo');booComments();
  const extra=drawPool('instruct',1)[0];
  st.tasks.push(extra);
  papaToast(isCall()?'在主人面前拒绝？加练一条。':'观众可都看着呢。拒绝一次，就加练一条。',2.8);
  afterAction();
}
function denyViolated(){
  S.violated=true;
  S.failStreak=0;S.combo=0;
  S.stats.obey=clamp(S.stats.obey-5,0,100);
  addShame(8);
  S.stats.heat=clamp(S.stats.heat-4,0,100);
  sfx('fail');booComments();dirtyBurst();
  papaToast('谁让你射的？！违规的骚狗，滚去后调。',3.5);
  S.stages=S.stages.slice(0,S.si+1);
  S.stages.push(makeStage('aftercare',4));
  S.si++;
  S.stageIntro=true;
  saveGame();renderStats();renderStage();
}
function failHard(){
  const st=S.stages[S.si];
  S.failTotal++;S.failStreak++;S.combo=0;
  const tk=st.tasks[st.idx];
  if(tk&&tk.k){S.avoidKink=tk.k;S.avoidTurns=2;}
  S.stats.obey=clamp(S.stats.obey-3,0,100);
  addShame(2);
  S.stats.heat=clamp(S.stats.heat-2,0,100);
  if(st.type==='jerk'||st.type==='climax'){
    addShame(5);
    stopTimer();metroStop();
    if(preCountInt){clearInterval(preCountInt);preCountInt=null;}
    $('preCount').hidden=true;
    $('restTag').hidden=true;
    $('pulseRing').classList.remove('rest');
    $('countdown').hidden=true;
  }
  sfx('fail');booComments();dirtyBurst();
  if(S.failTotal>=CONFIG.FAIL_SHUTDOWN){startShutdown();return;}

  // 一对一场景：记忆跟进 + 软恢复，不拆剧本
  if(isCall()&&S.scenario){
    updateMemoryFromTask(tk,'fail');
    const react=memoryReactLine('fail');
    papaToast(react||'做不到？换轻一点的。',3.2);
    const soft=softRecoveryTask(S.scenario);
    // 把当前任务换成恢复指令，再插一条稍轻的后续
    st.tasks[st.idx]=soft;
    const light=pickScenarioBeat('body',S.scenario,Math.max(1,(st.act||2)-1),null,{},false)
      ||pickScenarioBeat('place_task',S.scenario,1,null,{},false);
    if(light)st.tasks.splice(st.idx+1,0,bindToyText(light,S.scenario));
    saveGame();renderStats();renderStage();
    return;
  }

  if(S.failStreak>=2){
    const prev=S.si>0?S.si-1:0;
    S.si=prev;
    S.stages[prev]=makeStage(S.stages[prev].type,S.stages[prev].act||2);
    papaToast(pick(DATA.fail2),3.5);
  }else{
    if(st.type!=='punish')S.stages.splice(S.si+1,0,makeStage('punish',st.act||2));
    st.tasks=buildTasks(st.type);
    st.idx=0;
    papaToast(pick(DATA.fail1),3.2);
  }
  reshuffleTail();
  saveGame();renderStats();renderStage();
}
function afterAction(){
  clearChatTimer();
  if(S.failStreak===0&&S.avoidKink){
    S.avoidTurns--;
    if(S.avoidTurns<=0)S.avoidKink=null;
  }
  saveGame();renderStats();
  if(S.mode==='hard'&&S.stats.stamina<=0){startCollapse();return;}
  if(S.stats.shame>=CONFIG.SHAME_CRASH&&!S.forced){forceAftercare();return;}
  const st=S.stages[S.si];
  st.idx++;
  if(st.idx>=st.tasks.length){stageComplete();}
  else renderStage();
}
function stageComplete(){
  sfx('cheer');cheerComments();
  S.si++;
  if(S.si>=S.stages.length){finishGame();return;}
  S.stageIntro=true;
  const ns=S.stages[S.si];
  if(ns&&ns.tasks&&ns.tasks[0])preloadTts((ns.tasks[0].papa?ns.tasks[0].papa+' ':'')+ns.tasks[0].t);
  maybeEvent();
  renderStage();
}
function maybeEvent(){
  const st=S.stages[S.si];
  if(['jerk','climax','aftercare','warmup','intro','insert','arrive','rules'].includes(st.type))return;
  if(isCall()&&(st.act||0)<2)return; // 一对一前半段不插随机事件，保证递进
  if(S.refusals>=2&&!S.chainAudienceAngry){
    S.chainAudienceAngry=true;
    fireEvent(findEvent('观众报复'));
    return;
  }
  if(S.combo>=5&&!S.chainCombo&&S.mode==='hard'){
    S.chainCombo=true;
    fireEvent(findEvent('连击加码'));
    return;
  }
  if(S.stats.heat>=80&&!S.chainViral){
    S.chainViral=true;
    fireEvent(findEvent('直播间爆火'));
    return;
  }
  if(Math.random()>CONFIG.EVENT_RATE[S.mode])return;
  const ev=pick(DATA.events);
  fireEvent(ev);
}
function findEvent(name){
  return DATA.events.find(function(e){return e.t===name;})||null;
}
const EVENT_FX={
  '观众刷屏加码':function(){S.buff=Math.min(3,S.buff+1);},
  '突袭寸止测试':function(){addShame(4);},
  '全场静默':function(){S.silentT=15000;addShame(3);},
  '观众点名':function(){insertTask('recite',1);},
  '连击加码':function(){S.buff=Math.min(3,S.buff+1);},
  '加练一组':function(){insertTask('instruct',1);},
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
  '直播间爆火':function(){S.stats.heat=clamp(S.stats.heat+8,0,100);insertTask('order',1);},
  '观众要后庭':function(){
    if(isCall()&&S.scenario&&!scenarioInsertAllowed(S.scenario)){
      insertTask('instruct',1);
      return;
    }
    if(kinkOn('假鸡巴')){
      const st=S.stages[S.si];
      const extra=drawPool('insert',1)[0]||drawPool('instruct',1,function(t){return t.k==='假鸡巴';})[0];
      if(extra)st.tasks.push(extra);
    }else{
      insertTask('order',1);
    }
  },
  '尾巴检查':function(){addShame(3);S.stats.heat=clamp(S.stats.heat+2,0,100);}
};
function fireEvent(ev){
  if(!ev)return;
  var title=ev.t;
  if(isCall()){
    var map={
      '观众报复':'主人不耐烦了',
      '直播间爆火':'主人越来越兴奋',
      '观众刷屏加码':'主人越说越多',
      '观众点名':'主人点名',
      '弹幕稽查':'镜头检查',
      '弹幕点名':'主人点你复述',
      '福利时间':'主人特别奖励',
      '气氛组上线':'气氛升温',
      '观众要后庭':'主人要后庭',
      '全场静默':'通话静音',
      '全员起立':'服从起立'
    };
    if(map[title])title=map[title];
  }
  showToast(title,phrase(ev.txt||''));
  var fx=ev.fx||EVENT_FX[ev.t];
  if(typeof fx==='function')fx();
  sfx('task');
}
function showActBanner(act){
  const b=$('actBanner');
  b.textContent=act===4?'⚔️ 终局 Boss 战':'第 '+act+' 幕 · '+CONFIG.ACTS[act];
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(actBannerTimer);
  actBannerTimer=setTimeout(function(){b.classList.remove('show');},2800);
}
function forceAftercare(){
  S.forced=true;
  S.stages=S.stages.slice(0,S.si+1);
  S.stages.push(makeStage('aftercare',4));
  S.si++;
  S.stageIntro=true;
  papaToast(isCall()?'看来你已经到极限了……这通电话提前进入后调。':'看来你已经到极限了……今天的直播提前进入后调。',3.5);
  dirtyBurst();
  saveGame();renderStats();renderStage();
}
function startCollapse(){showEnding('D');}
function startShutdown(){showEnding('B');}
function finishGame(){
  const st=S.stats;
  let type='A';
  if(S.failTotal>=CONFIG.FAIL_SHUTDOWN)type='B';
  else if(S.mode==='hard'&&st.stamina<=0)type='D';
  else if(S.forced||st.shame>=CONFIG.SHAME_CRASH)type='C';
  else if(S.violated)type='G';
  else if(S.finaleType==='deny')type='F';
  else if(S.finaleType==='destroy')type='E';
  else if(st.obey>=75&&st.heat>=70&&(S.mode==='easy'||st.stamina>=25))type='S';
  showEnding(type);
}

/* ================= 结局 ================= */
const ENDING={
  S:{title:'S · 完美调教',color:'#ffd700',lines:['做得很好，{c}。今晚，你让主人很满意。','观众都被你伺候得心满意足。','记住这种感觉——你天生就是当骚狗的料。','下次开播，记得还来。']},
  A:{title:'A · 常规调教',color:'#7fd0ff',lines:['今天到这里，{c}。','不算完美，但主人看见了你的努力。','回去好好休息。','把今天没做到位的，练到做到为止。下次别让我失望。']},
  B:{title:'B · 不配留下',color:'#ff4d4d',lines:[]},
  C:{title:'C · 崩溃安抚',color:'#c792ff',lines:['你已经到极限了，{c}。','靠近镜头，深呼吸，看着我。','今天到此为止，主人不怪你。','你已经很乖了。下次，我会更温柔地操你。']},
  D:{title:'D · 体力耗尽',color:'#9aa4b2',lines:['体力彻底耗尽了，{c}。','瘫在那里，观众都在看着你的狼狈样。','今天的直播，到此为止。','回去养好体力。下次，别再让我看到你这么快趴下。']},
  E:{title:'E · 毁灭射精',color:'#ff8a5c',lines:['射得倒是痛快，{c}。','看看你自己——精液糊了一身，跟条被打怕的野狗一样。','观众都在笑话你，听见了吗？','今天的直播，到此为止。回去好好记住你有多下贱。']},
  F:{title:'F · 禁射憋回',color:'#8be0ff',lines:['停住了，{c}。','今晚你不配射。憋回去的感觉，记住了吗？','观众有人骂你废物，也有人夸你听话。','下次表现好，主人再考虑赏你。']},
  G:{title:'G · 违规射精',color:'#ff4d4d',lines:['谁允许你射的？','我让你憋回去，你倒好，射得比谁都快。','违规的下场，就是射了也不许擦，观众看着你发臭。','滚去后调。今晚的赏，没有了。']}
};
const ENDING_CALL={
  S:{title:'S · 完美通调',color:'#ffd700',lines:['做得很好，{c}。这通电话，你让主人很满意。','只有我在看着你，你伺候得很乖。','记住这种感觉——你天生就是当骚狗的料。','下次再拨过来。']},
  A:{title:'A · 常规通调',color:'#7fd0ff',lines:['今天到这里，{c}。','不算完美，但主人看见了你的努力。','回去好好休息。','把今天没做到位的，练到做到为止。下次别让我失望。']},
  B:{title:'B · 不配挂断',color:'#ff4d4d',lines:[]},
  C:{title:'C · 崩溃安抚',color:'#c792ff',lines:['你已经到极限了，{c}。','靠近镜头，深呼吸，看着我。','今天挂断，主人不怪你。','你已经很乖了。下次，我会更温柔地操你。']},
  D:{title:'D · 体力耗尽',color:'#9aa4b2',lines:['体力彻底耗尽了，{c}。','瘫在那里，主人看着你的狼狈样。','这通电话，到此为止。','回去养好体力。下次，别再让我看到你这么快趴下。']},
  E:{title:'E · 毁灭射精',color:'#ff8a5c',lines:['射得倒是痛快，{c}。','看看你自己——精液糊了一身，跟条被打怕的野狗一样。','只有我在看着你笑话你，听见了吗？','这通电话，到此为止。回去好好记住你有多下贱。']},
  F:{title:'F · 禁射憋回',color:'#8be0ff',lines:['停住了，{c}。','今晚你不配射。憋回去的感觉，记住了吗？','主人心里在骂你废物，也在夸你听话。','下次表现好，主人再考虑赏你。']},
  G:{title:'G · 违规射精',color:'#ff4d4d',lines:['谁允许你射的？','我让你憋回去，你倒好，射得比谁都快。','违规的下场，就是射了也不许擦，主人看着你发臭。','滚去后调。今晚的赏，没有了。']}
};
function statCell(k,v){return '<div class="sc"><span>'+k+'</span><b>'+v+'</b></div>';}
let endSeq=0;
async function showEnding(type){
  stopAll();
  if(camOK)stopCam();
  const seq=++endSeq;
  unlock();
  const map=isCall()?ENDING_CALL:ENDING;
  const cfg=map[type]||ENDING[type];
  setText('endTitle',cfg.title);
  if($('endTitle'))$('endTitle').style.color=cfg.color;
  const box=$('endLines');
  if(!box)return;
  box.innerHTML='';
  let lines=cfg.lines.slice();
  if(type==='B'){
    if(isCall()){
      lines=shuffle(DATA.shutdown)[0].concat(['（主人沉默了几秒）','废物。','下次别拨了。','就这？','【通话已结束】']);
    }else{
      lines=shuffle(DATA.shutdown)[0].concat(['（观众疯狂刷屏嘲讽）','把废物踢出去！','下次别来了！','就这？','【直播间已关闭】']);
    }
    sfx('fail');
  }else{
    sfx('close');
  }
  setHidden('ending',false);
  for(let i=0;i<lines.length;i++){
    if(seq!==endSeq)return;
    const d=document.createElement('div');
    d.className='eline';
    d.textContent=P(lines[i]);
    box.appendChild(d);
    if(i%2===1&&i<lines.length-1)sfx('pop');
    await sleep(i===lines.length-1?1100:820);
  }
  if(seq!==endSeq)return;
  const st=S.stats;
  let grid=statCell(isCall()?'通话时长':'直播时长',fmtTime(Date.now()-S.startedAt))
    +statCell('完成任务',S.done)
    +statCell('失败次数',S.failTotal)
    +statCell('跳过问题',S.skipCount)
    +statCell(isCall()?'拒绝加码': '拒绝观众',S.refusals)
    +statCell('服从度',st.obey)
    +statCell('羞耻峰值',S.maxShame)
    +statCell(isCall()?'满意峰值':'热度峰值',S.maxHeat);
  if(S.mode==='hard')grid+=statCell('剩余体力',st.stamina);
  if(isCall()&&S.scenario){
    const cond=S.scenario.conditions||{};
    const bits=[];
    if(cond.insert)bits.push('插入');
    if(cond.stationery||cond.clips||cond.writing)bits.push('文具');
    if(cond.glue)bits.push('胶水');
    if(cond.wet)bits.push('尿液');
    if(cond.toilet)bits.push('马桶');
    const toyN=(S.scenario.toys&&S.scenario.toys.length)||0;
    if(toyN)bits.push(toyN+'件玩具');
    grid+=statCell('本场场景',S.scenario.label+(bits.length?(' · '+bits.join('/')):''));
  }
  const hot=shuffle(DATA.comments.instruct).slice(0,3).map(function(c){
    return '<div class="hotc">「'+esc(P(c.t))+'」</div>';
  }).join('');
  setHtml('endStats','<h3>本局总结</h3><div class="stat-grid">'+grid+'</div><div class="hot">'+(isCall()?'主人评语：':'观众热评：')+hot+'</div>');
}
function stopAll(){
  stopCommentLoop();stopTimer();metroStop();stopSpeak();
  clearChatTimer();
  if(preCountInt){clearInterval(preCountInt);preCountInt=null;}
  if(viewInt){clearInterval(viewInt);viewInt=null;}
  if(elapsedInt){clearInterval(elapsedInt);elapsedInt=null;}
  clearTimeout(toastTimer);clearTimeout(papaTimer);
  clearTimeout(actBannerTimer);
  const ab=$('actBanner');
  if(ab)ab.classList.remove('show');
}
function pauseGame(){
  if(paused||!S||busy)return;
  paused=true;
  jerkRemainMs=null;chatRemainMs=null;
  metroPauseBpm=null;metroPauseBeat=0;metroPauseRestRemain=0;
  if(jerkTimer&&currentJerk){
    jerkRemainMs=Math.max(0,jerkEnd-Date.now());
    metroPauseBpm=metroBpm||null;
    metroPauseBeat=metroBeat;
    metroPauseRestRemain=metroRestUntil?Math.max(0,metroRestUntil-Date.now()):0;
    stopTimer();metroStop();
  }
  if(chatTimer){
    chatRemainMs=Math.max(0,chatDeadline-Date.now());
    clearChatTimer();
  }
  stopCommentLoop();
  if(viewInt){clearInterval(viewInt);viewInt=null;}
  if(elapsedInt){clearInterval(elapsedInt);elapsedInt=null;}
  stopSpeak();
  clearTimeout(toastTimer);clearTimeout(papaTimer);
  $('pauseOverlay').hidden=false;
}
function resumeGame(){
  if(!paused)return;
  paused=false;
  $('pauseOverlay').hidden=true;
  if(jerkRemainMs!=null&&currentJerk){
    jerkEnd=Date.now()+jerkRemainMs;
    renderTimer();
    jerkTimer=setInterval(renderTimer,250);
    metroResume();
    metroPauseBpm=null;
  }
  if(chatRemainMs!=null&&S&&S.stages[S.si]&&S.chatState==='answering'){
    chatTimer=setTimeout(answerDone,Math.max(500,chatRemainMs));
  }
  jerkRemainMs=null;chatRemainMs=null;
  if(!isCall())startCommentLoop();
  updateViewers();
  viewInt=setInterval(updateViewers,4000);
  elapsedInt=setInterval(function(){
    setText('elapsed',fmtTime(Date.now()-S.startedAt));
    if(isCall())setText('callDuration',fmtTime(Date.now()-S.startedAt));
  },1000);
}
function exitToSetup(){
  paused=false;
  nickConfirmed=false;
  const wrap=$('nickwrap');
  if(wrap)wrap.classList.remove('confirmed');
  const st=$('nickState');
  if(st)st.textContent='点右侧 ✓ 确认你的昵称';
  $('pauseOverlay').hidden=true;
  stopAll();
  if(camOK)stopCam();
  ['console','audience','buttons','countdown','hostPip'].forEach(function(id){setHidden(id,true);});
  const cons=$('console');
  if(cons)cons.classList.remove('is-live');
  $('pauseBtn').disabled=false;
  $('setup').hidden=false;
  S=null;
}

function safeStopFlow(){
  if(!S)return;
  $('safeConfirm').hidden=true;
  $('pauseOverlay').hidden=true;
  S.failStreak=0;
  stopAll();
  if(camOK)stopCam();
  try{if('speechSynthesis' in window)speechSynthesis.cancel();}catch(e){}
  speak('停下来了，好孩子。你做得对。现在跟着我深呼吸——吸气，呼气。你的安全，比什么都重要。');
  showSafeEnding();
}
function showSafeEnding(){
  const box=$('safeLines');
  if(!box)return;
  box.innerHTML='';
  const lines=[
    '按下停止不是软弱，是勇敢。',
    '跟着主人深呼吸——吸气……呼气……',
    '把今天的情绪都放下，你已经安全了。',
    '没有人会怪你。你愿意停下来，就是最乖的骚狗。',
    '去喝口水，披好衣服，好好照顾自己。',
    '这不算失败。下次想玩的时候，主人随时等你回来。'
  ];
  lines.forEach(function(t,i){
    const d=document.createElement('div');
    d.className='safe-line';
    d.textContent=t;
    d.style.opacity=0;
    box.appendChild(d);
    setTimeout(function(){d.style.transition='opacity .5s ease';d.style.opacity=1;},100+i*600);
  });
  $('safeEnd').hidden=false;
}

/* ================= 摄像头 ================= */
let camStream=null;
let camOK=false;
function updateCamUI(){
  const dot=$('camDot'),lab=$('camLabel'),btn=$('camBtn'),note=$('camNote');
  if(dot)dot.classList.toggle('on',camOK);
  if(lab)lab.textContent=camOK?'CAM ON':'CAM OFF';
  if(btn)btn.textContent=camOK?'📷 关闭摄像头':'📷 开启摄像头';
  if(note){
    note.className='cam-note'+(camOK?' ok':'');
    if(isCall()){
      note.textContent=camOK?'已开启 ✓ 画面仅在本机模拟显示，不会上传，也不会真的连线。':'画面只在你的设备上模拟显示，不会上传，也不会真的连线。';
    }else{
      note.textContent=camOK?'已开启 ✓ 画面仅在本机模拟显示，不会上传，也不会真的开播。':'画面只在你的设备上模拟显示，不会上传，也不会真的开播。';
    }
  }
}
function startCam(){
  if(camStream){try{camStream.getTracks().forEach(function(t){t.stop();});}catch(e){}camStream=null;}
  updateCamUI();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    $('fallback').classList.add('on');
    return Promise.resolve(false);
  }
  return navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false})
    .then(function(st){
      camStream=st;
      const v=$('cam');
      v.srcObject=st;
      v.play().catch(function(){});
      camOK=true;
      updateCamUI();
      return true;
    })
    .catch(function(){
      camOK=false;
      updateCamUI();
      $('fallback').classList.add('on');
      return false;
    });
}
function stopCam(){
  if(camStream){try{camStream.getTracks().forEach(function(t){t.stop();});}catch(e){}camStream=null;}
  camOK=false;
  const v=$('cam');
  if(v)v.srcObject=null;
  $('fallback').classList.add('on');
  updateCamUI();
}

/* ================= 游戏流程 ================= */
function confirmNick(){
  const inp=$('nick');
  const v=inp.value.trim();
  const wrap=$('nickwrap');
  const st=$('nickState');
  if(!v){
    nickConfirmed=false;
    wrap.classList.remove('confirmed');
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
    st.textContent='昵称不能为空，骚狗也得有个名字';
    inp.focus();
    sfx('fail');
    return false;
  }
  nickConfirmed=true;
  wrap.classList.add('confirmed');
  wrap.classList.remove('shake');
  st.textContent='昵称已确认：'+v+'，欢迎回来，骚狗';
  sfx('done');
  return true;
}
function startGame(){
  paused=false;
  const skipEl=$('skipIntro');
  if(skipEl)skipIntroSel=!!skipEl.checked;
  S=newState(($('nick').value.trim())||'骚狗',modeSel);
  S.audience=isCall()?[hostLabel()]:shuffle(DATA.nicknames).slice(0,R(8,12));
  if(isCall()&&scenarioData()){
    S.scenario=resolveScenario();
    S.memory=null;
    ensureMemory();
    S.stages=buildScenarioSession(S.scenario);
  }else{
    S.stages=buildSchedule().map(function(s){return makeStage(s.type,s.act);});
  }
  S.si=0;
  setHidden('setup',true);
  setHidden('agegate',true);
  if(!camOK){const fb=$('fallback');if(fb)fb.classList.add('on');}
  setHidden('console',false);
  const cons=$('console');
  if(cons)cons.classList.add('is-live');
  setHidden('topbar',false);
  setHidden('taskcard',false);
  setHidden('stats',false);
  setHidden('audience',isCall()); // 一对一：不显示私信墙
  setHidden('buttons',false);
  setHidden('safeStop',false);
  if(isCall()){
    setHidden('hostPip',false);
    const face=$('hostPipFace');
    if(face)face.textContent=(hostLabel()&&hostLabel()[0])||'主';
    if(S.scenario){
      const toyN=(S.scenario.toys&&S.scenario.toys.length)||0;
      let tip='本场场景：'+S.scenario.label+(toyN?(' · '+toyN+'件玩具'):'');
      if(S.scenario.route&&S.scenario.route.length){
        tip+=' · '+S.scenario.route.map(function(p){return propLabel(p);}).join(' → ');
      }
      if(S.stayPluggedForeplay)tip+=' · 前戏含铃铛';
      papaToast(tip,3.2);
    }
  }
  fitTopbar();
  setTimeout(fitTopbar,250);
  sfx('start');
  if(!(S.stages[0]&&(S.stages[0].type==='intro'||S.stages[0].type==='arrive'))){
    if(!(S.scenario))papaToast(pick(DATA.papaOpen),4);
  }
  if(!isCall())startCommentLoop();
  updateViewers();
  viewInt=setInterval(updateViewers,4000);
  elapsedInt=setInterval(function(){
    setText('elapsed',fmtTime(Date.now()-S.startedAt));
    if(isCall())setText('callDuration',fmtTime(Date.now()-S.startedAt));
  },1000);
  renderStage();
}

function fitTopbar(){
  const c=$('console');
  const h=(c&&!c.hidden)?Math.ceil(c.getBoundingClientRect().height):190;
  document.documentElement.style.setProperty('--console-h',h+'px');
}

/* ================= 初始化 ================= */
function init(){
  window.addEventListener('resize',fitTopbar);
  window.addEventListener('load',fitTopbar);
  try{
    ['xraypapa_save_v1','xraypapa_adult','xraypapa_voicepref','xraypapa_sfx'].forEach(function(k){localStorage.removeItem(k);});
  }catch(e){}
  document.addEventListener('visibilitychange',function(){
    if(document.hidden&&camOK)stopCam();
  });
  window.addEventListener('beforeunload',function(){
    if(camStream){try{camStream.getTracks().forEach(function(t){t.stop();});}catch(e){}}
  });
  $('ageOK').onclick=function(){
    initTTS();
    $('agegate').hidden=true;
    $('setup').hidden=false;
    sfx('start');
    const sw=$('setwrap');
    if(sw){
      sw.classList.add('attract');
      setTimeout(function(){sw.classList.remove('attract');},4200);
    }
  };
  $('ageNo').onclick=function(){try{window.close();}catch(e){}};
  const ageCheck=$('ageCheck');
  if(ageCheck){
    ageCheck.onchange=function(){
      const ok=$('ageOK');
      ok.disabled=!ageCheck.checked;
      ok.classList.toggle('dim',!ageCheck.checked);
    };
  }
  document.querySelectorAll('.mode').forEach(function(b){
    b.onclick=function(){
      document.querySelectorAll('.mode').forEach(function(x){x.classList.remove('sel');});
      b.classList.add('sel');
      modeSel=b.dataset.m;
    };
  });
  const skipIntroEl=$('skipIntro');
  if(skipIntroEl){
    skipIntroSel=!!skipIntroEl.checked;
    skipIntroEl.onchange=function(){skipIntroSel=!!skipIntroEl.checked;};
  }
  $('camBtn').onclick=function(){if(camOK){stopCam();}else{startCam();}};
  $('settingsBtn').onclick=function(){initTTS();$('settingsModal').hidden=false;};
  $('settingsClose').onclick=function(){$('settingsModal').hidden=true;};
  $('settingsModal').addEventListener('click',function(e){
    if(e.target===$('settingsModal'))$('settingsModal').hidden=true;
  });
  $('voicePickBtn').onclick=function(){initTTS();$('voicePick').hidden=false;};
  $('voicePickClose').onclick=function(){$('voicePick').hidden=true;};
  $('voicePick').addEventListener('click',function(e){
    if(e.target===$('voicePick'))$('voicePick').hidden=true;
  });
  document.querySelectorAll('.packbtn').forEach(function(b){
    b.onclick=function(){
      document.querySelectorAll('.packbtn').forEach(function(x){x.classList.remove('sel');});
      b.classList.add('sel');
      ttsPack=b.dataset.pack;
      stopAudio();
      const mp3=ttsPack!=='local';
      const ps=$('pitchSlider'),pn=$('pitchNote');
      if(ps)ps.disabled=mp3;
      if(pn)pn.hidden=!mp3;
      if(ttsPack==='local'){initTTS();speakLocal('骚狗，跪好了。听主人说话，别让我失望。',{});}
      else{speak('骚狗，跪好了。听主人说话，别让我失望。');}
    };
  });
  $('startBtn').onclick=function(){
    if(!nickConfirmed&&!confirmNick())return;
    startGame();
  };
  $('nickConfirm').onclick=confirmNick;
  $('nick').addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();confirmNick();}
  });
  $('replayBtn').onclick=function(){location.reload();};
  $('btnA').onclick=function(){if(busy)return;busy=true;try{chooseA();}catch(e){unlock();throw e;}};
  $('btnB').onclick=function(){if(busy)return;busy=true;try{chooseB();}catch(e){unlock();throw e;}};
  $('pauseBtn').onclick=pauseGame;
  $('pauseResume').onclick=resumeGame;
  $('pauseExit').onclick=exitToSetup;
  $('pauseRestart').onclick=function(){if(confirm(isCall()?'确定重新拨入吗？当前通话会直接结束。':'确定重新开始吗？当前直播会直接结束。'))location.reload();};
  $('safeStop').onclick=function(){if(!S)return;$('safeConfirm').hidden=false;};
  $('safeYes').onclick=function(){safeStopFlow();};
  $('safeNo').onclick=function(){$('safeConfirm').hidden=true;};
  $('safeReplay').onclick=function(){location.reload();};
  $('ttsPlay').onclick=function(){
    if(ttsAudio&&ttsAudio.paused){ttsAudio.play().catch(function(){});}
    else if('speechSynthesis' in window&&speechSynthesis.speaking&&speechSynthesis.paused){speechSynthesis.resume();}
    else if(S&&S.stages[S.si]&&S.stages[S.si].tasks[S.stages[S.si].idx]){speak(S.stages[S.si].tasks[S.stages[S.si].idx].t);}
  };
  $('ttsPause').onclick=function(){
    if(ttsAudio){try{ttsAudio.pause();}catch(e){}}
    if('speechSynthesis' in window)speechSynthesis.pause();
  };
  $('ttsStop').onclick=stopSpeak;
  $('ttsTest').onclick=function(){initTTS();speak('骚狗，跪好了。听主人说话，别让我失望。');};
  $('ttsMute').onclick=function(){
    ttsMuted=!ttsMuted;
    $('ttsMute').textContent=ttsMuted?'🔇 静音':'🔊 语音';
    const vt=$('voiceTTS');if(vt)vt.checked=!ttsMuted;
    if(ttsMuted)stopSpeak();
  };
  $('sfxMute').onclick=function(){
    sfxMuted=!sfxMuted;
    $('sfxMute').textContent=sfxMuted?'🔇 音效':'🔊 音效';
    const vs=$('voiceSFX');if(vs)vs.checked=!sfxMuted;
  };
  const voiceTTS=$('voiceTTS'),voiceSFX=$('voiceSFX');
  if(voiceTTS){
    voiceTTS.checked=!ttsMuted;
    voiceTTS.onchange=function(){
      ttsMuted=!voiceTTS.checked;
      $('ttsMute').textContent=ttsMuted?'🔇 静音':'🔊 语音';
      if(ttsMuted)stopSpeak();
    };
  }
  if(voiceSFX){
    voiceSFX.checked=!sfxMuted;
    voiceSFX.onchange=function(){
      sfxMuted=!voiceSFX.checked;
      $('sfxMute').textContent=sfxMuted?'🔇 音效':'🔊 音效';
    };
  }
  $('rateSlider').oninput=function(){
    ttsRate=parseFloat(this.value);
    $('rateVal').textContent=ttsRate.toFixed(2);
    if(ttsAudio)try{ttsAudio.playbackRate=clamp(ttsRate,0.5,1.5);}catch(e){}
  };
  $('rateSlider').onchange=function(){speak('主人现在的语速，听着还习惯吗？');};
  $('pitchSlider').oninput=function(){ttsPitch=parseFloat(this.value);$('pitchVal').textContent=ttsPitch.toFixed(2);};
  $('pitchSlider').onchange=function(){speak('这个音调，是不是更有主人的感觉？');};
  const psInit=$('pitchSlider'),pnInit=$('pitchNote');
  if(psInit)psInit.disabled=(ttsPack!=='local');
  if(pnInit)pnInit.hidden=(ttsPack==='local');
}



/* ---- TJ bridge ---- */
window.TJGame = {
  init: init,
  applyBrand: function(site){
    var brand = isCall()
      ? (site.callBrandName || site.brandName || '私人通话')
      : (site.brandName || '调教室');
    var host = site.hostName || '主人';
    var caption = isCall()
      ? (site.callFrameCaption || site.frameCaption || '私人视频通话')
      : (site.frameCaption || brand);
    document.querySelectorAll('[data-brand]').forEach(function(el){el.textContent=brand;});
    document.querySelectorAll('[data-host]').forEach(function(el){el.textContent=host;});
    document.title = brand;
    var frame = document.getElementById('frame');
    if(frame){
      document.documentElement.style.setProperty('--frame-caption', '"' + caption + '"');
    }
    CONFIG.hostName = host;
    if(window.TJ) TJ.hostName = host;
    var face = document.getElementById('hostPipFace');
    if(face) face.textContent = (host && host[0]) || '主';
  },
  setCallNames: function(arr){ if(arr&&arr.length) DATA.callNames = arr.slice(); },
  getMode: function(){ return modeSel; },
  setMode: function(m){ modeSel = m; },
  isCall: isCall
};

})();
