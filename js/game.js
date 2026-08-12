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
const LABELS={warmup:'开场热身',intro:'开播引导',instruct:'指令性任务',train:'体训任务',jerk:'倒计时撸管',chat:'休息问答',punish:'惩罚任务',order:'观众点菜',recite:'口令跟读',insert:'后庭插入',climax:'高潮收束',aftercare:'后调安抚'};
const LABELS_CALL={warmup:'开场热身',intro:'接通引导',instruct:'指令性任务',train:'体训任务',jerk:'倒计时撸管',chat:'休息问答',punish:'惩罚任务',order:'主人加码',recite:'口令跟读',insert:'后庭插入',climax:'高潮收束',aftercare:'后调安抚'};
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
    curAct:0,chainAudienceAngry:false,chainCombo:false,chainViral:false,_lastStats:null
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
const KINK_ICON={'脚':'👣','袜子':'🧦','内裤':'🩲','鞋子':'👟','龟头责':'🍆','尿液':'💦','睾丸':'🥚','边缘':'🫠','寸止':'✋','肛门':'🍑','羞耻姿势':'🙇','雄堕':'🐶','体训':'💪','惩罚':'🌶️','后调':'🕊️','撸管':'💦','边缘·高潮':'🔥','夹子':'🔗','马桶':'🚽','饮尿':'🥂','身体涂写':'🖊️','假鸡巴':'🍆'};
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
    case 'intro': return DATA.intro.map(function(x){return {...x};});
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
    case 'train': return drawPool('train',(hard?2:1)+(act===3?1:0));
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
  return {t:j.t,dur:(climax?R(...CONFIG.CLIMAX_DUR):R(...CONFIG.JERK_DUR)),steps:j.steps,climax:climax,k:j.k};
}
function pickFinale(){
  return {...pick(DATA.finale)};
}
function makeStage(type,act){
  const st={type:type,label:stageLabelOf(type),act:(act===undefined?2:act),tasks:[],idx:0};
  st.tasks=buildTasks(type,st.act);
  return st;
}
function buildSchedule(){
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
  const p1=['instruct','instruct','recite','chat','train'];
  if(Math.random()<0.35)p1.push('order');
  fill(R(...CONFIG.ACT1[hard?'hard':'easy']),1,p1);
  const p2=['instruct','instruct','train','train','punish','chat','order'];
  if(Math.random()<0.5)p2.push('jerk');
  fill(R(...CONFIG.ACT2[hard?'hard':'easy']),2,p2);
  const p3=['instruct','instruct','punish','punish','order','order','jerk','jerk','chat'];
  fill(R(...CONFIG.ACT3[hard?'hard':'easy']),3,p3);
  if(!stages.some(s=>s.type==='jerk'))stages.splice(Math.floor(stages.length/2),0,{type:'jerk',act:2});
  if(window.TJ&&TJ.enabledKinks&&TJ.enabledKinks.has('假鸡巴')){
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
  const ts=drawPool(poolKey,n||1);
  st.tasks.splice(st.idx+1,0,...ts);
}

/* ================= 语音 ================= */
let ttsVoice=null,ttsMuted=false,ttsPending=[],ttsRate=null,ttsPitch=null,sfxMuted=false;
let ttsVoiceMale=false;
const MALE_VOICE=/male|男|kangkang|yunjian|yunxi|yunyang|yunye|yunhao|sinji|sin-ji|daniel|eddy|arthur|george|liam|ryan|aaron|samuel|oliver|guy|male-enhanced/i;
const FEMALE_VOICE=/female|女|huihui|yaoyao|xiaoxiao|xiaoyi|siqi|xiaohan|xiaomeng|tingting|ting-ting|ting ting|meijia|mei-jia|xiaochen|xiaomo|xiaoshuang|xiaozhen|xiaorui|xiaoxuan|lili|huiting|xiaoyu|anli|xiaobei|female-enhanced/i;
function pickDomVoice(list){
  if(!list||!list.length)return null;
  const male=list.filter(v=>MALE_VOICE.test(v.name));
  if(male.length)return male[0];
  const notFemale=list.filter(v=>!FEMALE_VOICE.test(v.name));
  if(notFemale.length)return notFemale[0];
  return list[0];
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
    h.textContent='当前设备共 '+vs.length+' 个中文语音，没有男声。建议：① 用 Chrome / Edge 打开（Edge 自带云希等男声）；② 在手机系统设置中安装中文男声语音包；③ 网络环境下可托管到 GitHub Pages 后搭配远程音色。';
  }else{
    h.className='voice-hint ok';
    h.textContent='共 '+vs.length+' 个中文语音，其中男声 '+male+' 个。点一个试听，选中的就是主人口吻。';
  }
}
function initTTS(){
  if(!('speechSynthesis' in window))return;
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
const TTS_CDN='';
let ttsAudio=null,ttsPre=null,ttsGen=0,ttsStartTimer=null,ttsBurstEnd=0,ttsQueue=[];
function ttsHash(txt){
  let h=5381;
  for(let i=0;i<txt.length;i++){h=((h<<5)+h+txt.charCodeAt(i))>>>0;}
  return h.toString(16);
}
function normTTS(txt){
  var host=(window.TJ&&TJ.hostName)||(CONFIG&&CONFIG.hostName)||'主人';
  return fixTTS(String(txt).replace(/\{n\}/g,'骚狗').replace(/\{c\}/g,'骚狗').replace(/\{host\}/g,host).replace(/\s+/g,' '));
}
function ttsUrl(txt){
  return (TTS_CDN||'')+'tts/'+ttsPack+'/'+ttsHash(normTTS(txt))+'.mp3';
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
  try{
    if(!ttsPre)ttsPre=new Audio();
    ttsPre.preload='auto';
    ttsPre.src=ttsUrl(txt);
  }catch(e){}
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
    drainQueued();
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
  if(!('speechSynthesis' in window))return;
  opts=opts||{};
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
  u.rate=opts.rate||ttsRate||(ttsVoiceMale?0.92:0.88);
  u.pitch=opts.pitch||ttsPitch||(ttsVoiceMale?0.62:0.5);
  u.volume=1;
  u.onstart=micOnStart;
  u.onend=function(){micOnEnd();drainQueued();};
  speechSynthesis.speak(u);
}
function playNow(finalText,opts){
  if(ttsPack!=='local'&&'Audio' in window){
    playMp3(finalText,opts);
  }else{
    speakLocal(finalText,opts);
  }
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
  stopAudio();
  if('speechSynthesis' in window){try{speechSynthesis.cancel();}catch(e){}}
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
function cheerComments(){for(let i=0;i<R(1,2);i++)pushComment(gcomment('cheer'));}
function booComments(){for(let i=0;i<R(1,3);i++)pushComment(gcomment('boo'));}
function dirtyBurst(){for(let i=0;i<R(2,3);i++)pushComment(gcomment('dirty'));}
function endComments(){
  const ends=commentPool().filter(c=>c.end);
  if(!ends.length)return;
  for(let i=0;i<R(1,2);i++)pushComment({name:isCall()?hostLabel():pick(S.audience),text:P(pick(ends).t)});
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
  setText('stageLabel',isCall()?(hostLabel()+'的通话'):('{host}的调教室'.replace('{host}',hostLabel())));
  const act=st.act||0;
  if(act!==S.curAct){
    S.curAct=act;
    if(act>0){
      showActBanner(act);
      if(DATA.actOpen[act])papaToast(pick(DATA.actOpen[act]),3.5);
    }
  }
  setText('subLabel',(act>0?'第 '+act+' 幕 · ':'')+'环节 '+(S.si+1)+'/'+S.stages.length+' · '+st.label);
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
  setText('kinktag',task.finale?'🏁 终局指令':(st.type==='intro'?'🎬 引导':((KINK_ICON[task.k]?KINK_ICON[task.k]+' ':'')+(task.k||''))));
  setText('nicktag',(isCall()?'通话对象：':'上播选手：')+S.nick);
  setText('prog','任务 '+(st.idx+1)+'/'+st.tasks.length);
  const prog=$('progress');
  if(prog)prog.style.width=((st.idx+1)/st.tasks.length*100)+'%';
  setText('tccap',st.type==='punish'?(hostLabel()+' 正在罚你 · 因为你不乖'):((st.type==='chat'||st.type==='aftercare')?(hostLabel()+' 开口说话'):(st.type==='intro'?(hostLabel()+' 引导中'):(hostLabel()+' 下达指令'))));
  if(S.combo>=2){setHidden('combo',false);setText('combo','连击×'+S.combo);}
  else{setHidden('combo',true);}
  setHtml('tasktext',esc(P(task.t))+(task.follow?'<div class="follow">追问：'+esc(P(task.follow))+'</div>':''));
  const nt=st.tasks[st.idx+1];
  if(nt)preloadTts((nt.papa?nt.papa+' ':'')+nt.t);
  const a=$('btnA'),b=$('btnB');
  if(b)b.hidden=false;
  switch(st.type){
    case 'intro':setBtn('btnA','已乖乖照做');setBtn('btnB','跳过引导');break;
    case 'chat':setBtn('btnA','开始回答');setBtn('btnB','跳过问题');break;
    case 'order':setBtn('btnA',isCall()?'照做':'满足观众');setBtn('btnB','拒绝');break;
    case 'recite':setBtn('btnA','已大声复述');setBtn('btnB','念不出口');break;
    case 'aftercare':setBtn('btnA','已完成');if(b)b.hidden=true;break;
    default:setBtn('btnA','已乖乖照做');setBtn('btnB','做不到…');
  }
  if(st.type==='chat'){
    S.chatState='ask';
    setMicState('idle',isCall()?'语音问答开启中 · 主人听得见你':'语音问答开启中 · 直播间能听到你','主人正在朗读问题，听完请开口回答');
  }else if(st.type==='intro'&&task.speak){
    S.chatState='ask';
    setMicState('idle',isCall()?'语音确认中 · 主人听得见你':'语音确认中 · 直播间能听到你','主人读完后，请开口回答，答完点「回答完毕」');
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
  speak((task.papa?task.papa+' ':'')+task.t);
  sfx('task');
}

/* ================= 倒计时 ================= */
let jerkTimer=null,jerkEnd=0,jerkDur=0,jerkStep=0,jerkWarn=false,currentJerk=null,preCountInt=null;
function startJerk(task){
  currentJerk=task;
  $('countdown').hidden=false;
  $('micpanel').hidden=true;
  clearChatTimer();
  $('jerkTitle').textContent=task.climax?'高潮收束 · 倒计时':'倒计时撸管';
  $('tasktext').textContent='跟着节拍撸动，坚持到倒计时结束。';
  $('kinktag').textContent=task.climax?'🔥 边缘·高潮':'💦 撸管';
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
    speak('跟着节拍撸动，坚持到倒计时结束。');
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
/* ================= 节拍器（参考节奏边缘的律动设计） ================= */
let metroTimer=null,metroBpm=0,metroBeat=0,metroRestUntil=0,metroNextVar=0;
let metroPauseBpm=null,metroPauseBeat=0,metroPauseRestRemain=0;
function metroStart(bpm){
  metroStop();
  metroBpm=bpm||R(...CONFIG.BPM_BASE);
  metroBeat=0;
  metroRestUntil=0;
  metroNextVar=Date.now()+R(...CONFIG.VAR_INTERVAL);
  $('bpmNum').textContent=String(metroBpm);
  $('beatCount').textContent='0';
  $('restTag').hidden=true;
  $('pulseRing').classList.remove('rest');
  metroSchedule();
}
function metroResume(){
  metroStop();
  if(!metroPauseBpm){metroStart(R(...CONFIG.BPM_BASE));return;}
  metroBpm=metroPauseBpm;
  $('bpmNum').textContent=String(metroBpm);
  $('beatCount').textContent=String(metroPauseBeat||0);
  if(metroPauseRestRemain>0){
    metroRestUntil=Date.now()+metroPauseRestRemain;
    $('restTag').hidden=false;
    $('pulseRing').classList.add('rest');
  }else{
    metroRestUntil=0;
    $('restTag').hidden=true;
    $('pulseRing').classList.remove('rest');
  }
  metroNextVar=Date.now()+R(...CONFIG.VAR_INTERVAL);
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
    if(!$('restTag').hidden){$('restTag').hidden=true;$('pulseRing').classList.remove('rest');}
    metroBeat++;
    const accent=metroBeat%4===0;
    tone(860+(metroBpm/250)*180,0.12,'sine',accent?0.12:0.06);
    if(accent)tone(1290,0.09,'sine',0.07,0.02);
    pulseBeat();
    $('beatCount').textContent=String(metroBeat);
    $('beatbar').style.width=(metroBeat%32)/32*100+'%';
    if(Date.now()>=metroNextVar){
      const old=metroBpm;
      metroBpm=R(...CONFIG.BPM_VAR);
      const bn=$('bpmNum');
      bn.textContent=String(metroBpm);
      bn.classList.remove('pop');
      void bn.offsetWidth;
      bn.classList.add('pop');
      $('stepText').textContent=(metroBpm>old?'变奏 · 加速 ':'变奏 · 减速 ')+metroBpm+' BPM，跟上节拍！';
      sfx('tick');
      metroNextVar=Date.now()+R(...CONFIG.VAR_INTERVAL);
    }
    metroSchedule();
  },metroInterval());
}
function metroRest(sec){
  metroRestUntil=Date.now()+sec*1000;
  $('restTag').hidden=false;
  $('pulseRing').classList.add('rest');
}
function pulseBeat(){
  const pr=$('pulseRing');
  pr.classList.remove('beat');
  void pr.offsetWidth;
  pr.style.setProperty('--beatms',Math.round(metroInterval())+'ms');
  pr.classList.add('beat');
}
function renderTimer(){
  if(!currentJerk)return;
  const remain=Math.max(0,Math.round((jerkEnd-Date.now())/1000));
  const m=Math.floor(remain/60),s=remain%60;
  $('timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  const frac=jerkDur>0?remain/jerkDur:0;
  $('ring').style.strokeDashoffset=CONFIG.RING_C*frac;
  const pct=100*(1-frac);
  const steps=currentJerk.steps||[];
  while(jerkStep<steps.length&&steps[jerkStep].p<=pct){
    const stp=steps[jerkStep];
    $('stepText').textContent=stp.txt;
    speak(stp.txt,{rate:1.05});
    for(let i=0;i<(stp.n||1);i++)tone(950,.06,'square',.05,i*.12);
    if(stp.txt.indexOf('寸止')>=0)metroRest(R(...CONFIG.METRO_REST));
    jerkStep++;
  }
  if(remain<=30&&remain>0&&!jerkWarn){
    jerkWarn=true;
    $('stepText').textContent='最后 30 秒，不许停！';
    tone(1000,.25,'square',.1);
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
    sfx('done');cheerComments();endComments();
    afterAction();
    return;
  }
  applyTask(task);
  S.failStreak=0;S.combo++;S.done++;
  sfx('done');cheerComments();
  afterAction();
}
function chooseB(){
  const st=S.stages[S.si];
  const task=st.tasks[st.idx];
  if(st.type==='intro'){skipIntroStage();return;}
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
  if(['jerk','climax','aftercare','warmup','intro','insert'].includes(st.type))return;
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
  '直播间爆火':function(){S.stats.heat=clamp(S.stats.heat+8,0,100);insertTask('order',1);},
  '观众要后庭':function(){
    if(window.TJ&&TJ.enabledKinks&&TJ.enabledKinks.has('假鸡巴')){
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
  startCommentLoop();
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
  S.stages=buildSchedule().map(function(s){return makeStage(s.type,s.act);});
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
  setHidden('audience',false);
  setHidden('buttons',false);
  setHidden('safeStop',false);
  if(isCall()){
    setHidden('hostPip',false);
    const face=$('hostPipFace');
    if(face)face.textContent=(hostLabel()&&hostLabel()[0])||'主';
  }
  fitTopbar();
  setTimeout(fitTopbar,250);
  sfx('start');
  if(!(S.stages[0]&&S.stages[0].type==='intro'))papaToast(pick(DATA.papaOpen),4);
  startCommentLoop();
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
