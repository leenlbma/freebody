/*!
 * FreeBody — app.js
 * 单页离线健身记录：饮食 / 训练 / 补剂 / 睡眠 / 身体指标 / 激素与恢复 / 伤病与限制
 * 数据仅存于浏览器 localStorage（键：freeBody_v1，自动从旧键 fitTracker_v1 迁移），可导出/导入 JSON。
 * 结构：常量与默认数据 → 存储 → 工具函数 → 主题/导航/日期 → 图表 → 计算与预警 → 各板块渲染与事件 → 设置/备份 → 全局点击委托
 * 本项目不提供医疗建议。MIT License.
 */
(function(){
'use strict';
/** localStorage 键名；LEGACY_KEYS 用于从旧版本自动迁移 */
var KEY='freeBody_v1',LEGACY_KEYS=['fitTracker_v1']; // 首次启动时自动从旧键名复制数据（旧键保留，不删除）
/** 构建时注入的数据（见 scripts/build.js）；直接运行源码时为空 */
var FOOD_DB=(window.FIT_DATA&&window.FIT_DATA.foods)||{foods:[]};
var EXAMPLE_PROFILES=(window.FIT_DATA&&window.FIT_DATA.examples)||[];
/** 底部导航 4 个分组；HUB 分组的首页不显示子标签，详情页显示返回按钮 */
var ICONS={today:'home',train:'train',data:'chart',me:'user'};
var GROUPS=[['today','今天',['overview','diet']],['train','训练',['train','cardio','perf']],['data','数据',['data','body','nutri','tstats','sleep','hormone','injury','supp']],['me','我的',['settings']]];
var HUB={today:'overview',data:'data'};
var SEC_LABEL={overview:'今天',diet:'饮食',train:'力量',cardio:'有氧',perf:'表现',data:'数据',body:'身体',nutri:'营养',tstats:'训练统计',muscle:'肌群恢复',sleep:'睡眠',supp:'补剂',hormone:'恢复/化验',injury:'伤病',settings:'我的'};
var lastSub={};
/** 内联 SVG 图标（见 src/icons.js） */
function IC(n){return window.FitIcons?FitIcons.svg(n):'';}
var CH=window.FitCharts;
var LAB_PRESETS=[['皮质醇','µg/dL'],['总睾酮','ng/dL'],['游离睾酮','pg/mL'],['TSH','mIU/L'],['FT3','pmol/L'],['FT4','pmol/L'],['T3','nmol/L'],['T4','nmol/L'],['空腹胰岛素','µIU/mL'],['空腹血糖','mmol/L'],['IGF-1','ng/mL'],['25(OH)维生素D','ng/mL'],['SHBG','nmol/L'],['肌酸激酶CK','U/L']];
var EX_PRESETS=['杠铃卧推','哑铃卧推','杠铃深蹲','罗马尼亚硬拉','硬拉','高位下拉','坐姿划船','引体向上','站姿推举','腿举','腿弯举','侧平举','二头弯举','绳索下压','平板支撑'];
function defaults(){return{v:1,
 profile:{name:'',height:null,injuryFlagLabel:'伤处不适',swimNote:'',run800HistLabel:''},goals:{kcal:2200,p:140,c:260,f:65,sleepH:7,trainDays:4,stairMin:120,weight:null,mealSplit:{'早餐':25,'午餐':35,'晚餐':30,'加餐':10}},
 meals:[],favFoods:[],workouts:[],cardio:[],recoveryStart:'',
 supps:[{id:uid(),name:'肌酸',dose:'5g',time:'每天固定时间'},{id:uid(),name:'乳清蛋白',dose:'',time:'练后/补足蛋白'},{id:uid(),name:'维生素D',dose:'',time:'随餐'},{id:uid(),name:'鱼油 Omega-3',dose:'',time:'随餐'},{id:uid(),name:'镁',dose:'',time:'睡前'}],
 swims:[],pb100br:[],run800:[],run800Hist:null,
 perfEvents:[{id:'vj',name:'纵跳',unit:'cm',better:'higher',hist:null}],perfLog:[],
 // 伤病：默认空，可在设置中加载示例配置
 plans:[],sessions:[],active:null,exRules:{},
 injuries:[],wristLog:[],rehabLog:{},rehab:[],restricted:[],customFoods:[],suppLog:{},sleep:[],body:[],recov:[],labs:[],theme:'auto'};}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
var S;
function load(){var d=defaults();try{var raw=localStorage.getItem(KEY);if(raw==null){for(var li=0;li<LEGACY_KEYS.length;li++){raw=localStorage.getItem(LEGACY_KEYS[li]);if(raw!=null){localStorage.setItem(KEY,raw);break;}}}var r=JSON.parse(raw||'null');if(r&&typeof r==='object'){for(var k in d){if(r[k]===undefined)r[k]=d[k];}for(var g in d.goals){if(r.goals[g]===undefined)r.goals[g]=d.goals[g];}for(var pk in d.profile){if(r.profile[pk]===undefined)r.profile[pk]=d.profile[pk];}return r;}}catch(e){}return d;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast('保存失败：'+e.message);}}
S=load();
(S.customFoods||[]).forEach(function(f){f.custom=true;}); // 自定义食物均优先匹配
var $=function(s){return document.querySelector(s);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){var n=parseFloat(v);return isNaN(n)?null:n;}
function r1(n){return Math.round(n*10)/10;}
function pad(n){return(n<10?'0':'')+n;}
function fmt(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parse(s){var a=s.split('-');return new Date(+a[0],a[1]-1,+a[2]);}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return fmt(d);}
function today(){return fmt(new Date());}
function weekStart(s){var d=parse(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return fmt(d);}
function diffDays(a,b){return Math.round((parse(b)-parse(a))/864e5);}
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('on');},2200);}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';}
/** 根据设置中的身高计算 BMI 文本；未设置身高则不显示 */
function bmiTxt(w){var hh=S.profile&&S.profile.height;return hh?' · BMI '+r1(w/(hh/100)/(hh/100)):'';}
function flagLabel(){return(S.profile&&S.profile.injuryFlagLabel)||'伤处不适';}
function allFoods(){return(FOOD_DB.foods||[]).concat(S.customFoods||[]);}
function md(s){return(+s.slice(5,7))+'/'+(+s.slice(8,10));}
function avg(a){a=a.filter(function(x){return x!=null&&!isNaN(x);});return a.length?a.reduce(function(s,x){return s+x;},0)/a.length:null;}
var sel=today();var cur='overview';

/* ---------- 主题 ---------- */
function applyTheme(){document.documentElement.setAttribute('data-theme',S.theme||'auto');}
$('#themeBtn').onclick=function(){var o=['auto','light','dark'];S.theme=o[(o.indexOf(S.theme)+1)%3];save();applyTheme();toast('主题：'+{auto:'跟随系统',light:'浅色',dark:'深色'}[S.theme]);drawCharts();};

/* ---------- 导航 ---------- */
$('#nav').innerHTML=GROUPS.map(function(g){return'<button data-go="'+g[0]+'">'+IC(ICONS[g[0]])+g[1]+'</button>';}).join('');
function groupOf(sec){for(var i=0;i<GROUPS.length;i++)if(GROUPS[i][2].indexOf(sec)>=0)return GROUPS[i];return GROUPS[0];}
document.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(b)show(b.getAttribute('data-go'));var sb=e.target.closest('[data-sub]');if(sb)show(sb.getAttribute('data-sub'),true);});
function show(id,direct){var toMus=id==='muscle';if(toMus){id='train';direct=true;} // 肌群热图位于 训练 › 力量 顶部
var grp=!direct&&GROUPS.find(function(g){return g[0]===id;});if(grp)id=HUB[grp[0]]||lastSub[grp[0]]||grp[2][0];if(!document.getElementById(id))id='overview';grp=groupOf(id);lastSub[grp[0]]=id;
 var hub=HUB[grp[0]];
 $('#subnav').innerHTML=hub?(id===hub?'':'<button data-sub="'+hub+'" class="back">'+IC('left')+grp[1]+'</button><span class="sn-t">'+SEC_LABEL[id]+'</span>'):grp[2].length>1?grp[2].map(function(s){return'<button data-sub="'+s+'" class="'+(s===id?'on':'')+'">'+SEC_LABEL[s]+'</button>';}).join(''):'';
 cur=id;document.querySelectorAll('section').forEach(function(s){s.classList.toggle('on',s.id===id);});document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-go')===grp[0]);});window.scrollTo(0,0);render();if(toMus&&$('#musWrap'))$('#musWrap').scrollIntoView({block:'start'});}

/* ---------- 日期 ---------- */
$('#dSel').value=sel;
$('#dSel').onchange=function(){if(this.value){sel=this.value;render();}};
$('#dPrev').onclick=function(){sel=addDays(sel,-1);$('#dSel').value=sel;render();};
$('#dNext').onclick=function(){sel=addDays(sel,1);$('#dSel').value=sel;render();};
$('#dToday').onclick=function(){sel=today();$('#dSel').value=sel;render();};

/* ---------- 图表 ---------- */
function ring(val,goal,color,label,unit){var pc=goal?Math.min(val/goal,1):0,r=34,C=2*Math.PI*r,over=goal&&val>goal*1.05;
 return'<div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="'+r+'" fill="none" style="stroke:var(--in)" stroke-width="8"/><circle cx="42" cy="42" r="'+r+'" fill="none" style="stroke:'+(over?'var(--bad)':color)+';transition:stroke-dasharray .6s" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+(C*pc)+' '+C+'" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-size="15" font-weight="700" style="fill:var(--fg)">'+Math.round(pc*100)+'%</text></svg><b>'+label+'</b>'+Math.round(val)+'/'+goal+unit+'</div>';}

/* ---------- 计算 ---------- */
function dayMeals(d){return S.meals.filter(function(m){return m.date===d;});}
function dayTot(d){var t={k:0,p:0,c:0,f:0};dayMeals(d).forEach(function(m){t.k+=m.kcal||0;t.p+=m.p||0;t.c+=m.c||0;t.f+=m.f||0;});return t;}
function vol(w){return(w.sets||0)*(w.reps||0)*(w.weight||0);}
function dayVol(d){return S.workouts.filter(function(w){return w.date===d;}).reduce(function(s,w){return s+vol(w);},0);}
function weekInfo(d){var ws=weekStart(d),we=addDays(ws,6),inW=function(x){return x.date>=ws&&x.date<=we;};var days={};S.workouts.filter(inW).forEach(function(w){days[w.date]=1;});
 return{ws:ws,we:we,days:Object.keys(days).length,vol:S.workouts.filter(inW).reduce(function(s,w){return s+vol(w);},0),stair:S.cardio.filter(inW).reduce(function(s,c){return s+(c.min||0);},0),swimM:S.swims.filter(inW).reduce(function(s,c){return s+(c.dist||0);},0),swimN:S.swims.filter(inW).length,stairDays:Object.keys(S.cardio.filter(inW).reduce(function(o,c){o[c.date]=1;return o;},{})).length};}
function recWeek(d){if(!S.recoveryStart)return null;var n=diffDays(S.recoveryStart,d);if(n<0)return 0;return Math.floor(n/7)+1;}
function recAdvice(wk){if(wk==null)return null;if(wk===0)return['info','恢复期尚未开始（起始日：'+S.recoveryStart+'）。'];
 if(wk<=2)return['warn','恢复期第'+wk+'周：轻重量为主，每组留 3-4 次余力（RPE ≤ 7），重点找回动作模式；出现关节不适立即降重。'];
 if(wk<=4)return['info','恢复期第'+wk+'周：可逐步加重（每周约 2.5-5%），RPE 7-8，留 2-3 次余力。'];
 if(wk<=6)return['info','恢复期第'+wk+'周：接近常规强度，RPE ≈ 8，主项可偶尔 8.5-9；与私教确认后进入常规计划。'];
 return['ok','已度过 6 周恢复期，可按常规计划推进（注意周期性减载）。'];}
function parseT(s){s=String(s||'').trim().replace('：',':');if(!s)return null;var a=s.split(':').map(Number);if(a.some(isNaN))return null;var t=0;a.forEach(function(x){t=t*60+x;});return t>0?t:null;}
function fmtT(t){if(t==null)return'-';var m=Math.floor(t/60),s=t-m*60;var ss=(Math.round(s*100)/100).toFixed(s%1?2:0);if(s<10)ss='0'+ss;return m+':'+ss;}
function pbEntries(){var a=S.pb100br.map(function(x){return{id:x.id,date:x.date,sec:x.sec,type:x.type,note:x.note,src:'pb'};});
 S.swims.forEach(function(w){if(w.stroke==='蛙泳'&&w.dist===100&&w.sec)a.push({id:w.id,date:w.date,sec:w.sec,type:'游泳记录',note:w.note,src:'swim'});});return a.sort(function(x,y){return x.date<y.date?-1:1;});}
function sleepDur(b,w){if(!b||!w)return null;var a=b.split(':'),c=w.split(':');var m=(+c[0]*60+ +c[1])-(+a[0]*60+ +a[1]);if(m<=0)m+=1440;return m/60;}
function sleepOf(d){return S.sleep.find(function(s){return s.date===d;});}
function recovOf(d){return S.recov.find(function(s){return s.date===d;});}
function suppDone(d){return(S.suppLog[d]||{});}

/* 过度训练/恢复不足预警：近3天 vs 前4-17天基线 */
function otSignals(d){var sig=[],recent=[],base=[];
 for(var i=0;i<3;i++)recent.push(addDays(d,-i));for(var j=3;j<17;j++)base.push(addDays(d,-j));
 var get=function(days,fn){return avg(days.map(fn));};
 var rhrOf=function(x){var r=recovOf(x);if(r&&r.rhr!=null)return r.rhr;var b=S.body.find(function(y){return y.date===x;});return b?b.rhr:null;};
 var rR=get(recent,rhrOf),rB=get(base,rhrOf);if(rR!=null&&rB!=null&&rR-rB>=5)sig.push('晨起静息心率较基线升高 '+r1(rR-rB)+' bpm');
 var hv=function(x){var r=recovOf(x);return r?r.hrv:null;};var hR=get(recent,hv),hB=get(base,hv);if(hR!=null&&hB!=null&&hB>0&&(hB-hR)/hB>=0.1)sig.push('HRV 较基线下降 '+Math.round((hB-hR)/hB*100)+'%');
 var sd=function(x){var s=sleepOf(x);return s?s.dur:null;};var sR=get(recent,sd);if(sR!=null&&sR<6.5)sig.push('近3天平均睡眠 '+r1(sR)+' h（偏少）');
 var sq=function(x){var s=sleepOf(x);return s?s.q:null;};var qR=get(recent,sq);if(qR!=null&&qR<=2.5)sig.push('睡眠质量偏差（均 '+r1(qR)+'/5）');
 var f=function(k){return function(x){var r=recovOf(x);return r?r[k]:null;};};
 var st=get(recent,f('stress'));if(st!=null&&st>=4)sig.push('压力偏高（均 '+r1(st)+'/5）');
 var en=get(recent,f('energy'));if(en!=null&&en<=2)sig.push('精力偏低（均 '+r1(en)+'/5）');
 var so=get(recent,f('soreness'));if(so!=null&&so>=4)sig.push('肌肉酸痛持续偏高（均 '+r1(so)+'/5）');
 var mo=get(recent,f('mood'));if(mo!=null&&mo<=2)sig.push('情绪偏低（均 '+r1(mo)+'/5）');
 var ap=get(recent,f('appetite'));if(ap!=null&&ap<=2)sig.push('食欲下降（均 '+r1(ap)+'/5）');
 return sig;}
function otHtml(d){var s=otSignals(d);if(!s.length)return'';var lvl=s.length>=3?'bad':s.length===2?'warn':'info';
 var head=s.length>=2?IC('alert')+' 恢复不足/过度训练预警（'+s.length+' 项信号）':IC('info')+' 恢复提示';
 return'<div class="alert '+lvl+'"><b>'+head+'</b><ul style="margin:4px 0 4px 18px;padding:0">'+s.map(function(x){return'<li>'+esc(x)+'</li>';}).join('')+'</ul>'+(s.length>=2?'建议：今天降低训练量/强度或安排休息，优先睡眠与饮食；持续数天或伴随不适请咨询医生，并与私教沟通。':'持续关注即可。')+'<div class="mut">基于近3天与前2周基线对比的简单规则，仅供参考，不构成医疗建议。</div></div>';}

/* ---------- 渲染 ---------- */
function render(){
 document.querySelectorAll('[data-rng]').forEach(function(el){var k=el.getAttribute('data-rng'),v=rng(k);el.innerHTML=[[7,'7天'],[30,'30天'],[90,'90天'],[0,'全部']].map(function(o){return'<button data-rngk="'+k+'" data-rngv="'+o[0]+'" class="'+(o[0]===v?'on':'')+'">'+o[1]+'</button>';}).join('');});
 if(cur==='overview')rOverview();else if(cur==='diet')rDiet();else if(cur==='nutri')chNutrition();else if(cur==='data')rData();else if(cur==='train'||cur==='cardio'||cur==='perf'||cur==='tstats')rTrain();else if(cur==='muscle')rMuscle();else if(cur==='supp')rSupp();else if(cur==='sleep')rSleep();else if(cur==='body')rBody();else if(cur==='hormone')rHormone();else if(cur==='settings')rSettings();else if(cur==='injury')rInjury();
}
function drawCharts(){render();}

/* ---------- 今天（一屏：准备度 / 推荐训练 / 营养剩余 / 打卡） ---------- */
function activeInjury(){return S.injuries.some(function(x){return x.status!=='已恢复';});}
function rOverview(){var g=S.goals,t=dayTot(sel),rd=readiness(sel),ot=otSignals(sel),wk=recWeek(sel);
 $('#ovAlerts').innerHTML=(!S.meals.length&&!S.workouts.length&&!S.body.length&&!S.sleep.length)?'<div class="alert info">'+IC('hello')+' 欢迎使用 FreeBody。数据只存在本机。</div>':'';
 var lv=rd?(rd.score>=70?'ok':rd.score>=50?'warn':'bad'):'',
  sent=rd?(rd.score>=70?'状态不错，按计划练':rd.score>=50?'状态一般，控制强度':'恢复偏弱，以休息为主'):'记录睡眠后显示准备度';
 if(ot.length>=2){lv='bad';sent='恢复不足信号 '+ot.length+' 项，建议减量';}
 var sub=[];if(wk&&wk<=6)sub.push('恢复期第'+wk+'周');if(ot.length)sub.push(ot[0]);else if(rd)sub.push('准备度');
 $('#ovReady').innerHTML='<div class="ready"><div class="score '+lv+'">'+(rd?rd.score:'—')+'</div><div><b>'+esc(sent)+'</b><div class="mut">'+esc(sub.join(' · '))+'</div></div>'+IC('right')+'</div>';
 var a=S.active,ws=S.workouts.filter(function(w){return w.date===sel;}),rc=recommend(),th;
 if(a){var tot=0,dn=0;a.items.forEach(function(x){tot+=x.sets.length;dn+=x.sets.filter(function(s){return s.done;}).length;});
  th='<div class="mut">训练进行中</div><h2 class="rec-t">'+esc(a.name)+'</h2><div class="mut">已完成 '+dn+' / '+tot+' 组</div><button class="btn-big" data-ss="rec">'+IC('play')+'继续训练</button>';}
 else if(ws.length){var n=ws.reduce(function(s,w){return s+(w.sets||1);},0);
  th='<div class="mut">今日训练</div><h2 class="rec-t">已完成 '+n+' 组</h2><div class="mut">训练量 '+Math.round(dayVol(sel))+' kg</div><button class="ghost btn-big" data-sub="train">查看</button>';}
 else th='<div class="mut">今日推荐</div><h2 class="rec-t">'+esc(rc.title)+'</h2><div class="mut">'+esc(rc.why)+'</div><button class="btn-big'+(rc.rest?' ghost':'')+'" data-ss="rec">'+IC('play')+(rc.rest?'仍要训练':'开始训练')+'</button>';
 $('#ovTrain').innerHTML=th;
 var left=Math.round(g.kcal-t.k),pl=Math.max(0,Math.round(g.p-t.p)),nm=dayMeals(sel).length;
 $('#ovNut').innerHTML='<div class="hrow"><span class="mut">营养剩余</span><span class="mut">'+(nm?nm+' 条记录':'未记录')+IC('right')+'</span></div><div class="nut1"><div><b class="xl">'+left+'</b> <span class="mut">kcal</span></div><div><b class="xl">'+pl+'</b> <span class="mut">g 蛋白</span></div></div><div class="bar"><i style="width:'+Math.min(100,g.kcal?t.k/g.kcal*100:0)+'%;background:'+(left<0?'var(--bad)':'var(--k)')+'"></i></div>';
 var tile=function(done,ic,label,go,val,act){return'<div class="ck-t'+(done?' done':'')+'"><div class="ck-h" data-go="'+go+'">'+IC(ic)+'<span>'+label+'</span></div><div class="ck-v">'+val+'</div>'+(act||'')+'</div>';};
 var dsp=suppDone(sel),ns=S.supps.filter(function(x){return dsp[x.id];}).length,c='';
 if(S.supps.length)c+=tile(ns===S.supps.length,'check','补剂','supp',ns+' / '+S.supps.length,ns<S.supps.length?'<button class="sm" id="ovSuppAll">全部打卡</button>':'<span class="ck-ok">'+IC('ok')+'</span>');
 var s=sleepOf(sel),ls=lastSleepBefore(sel);
 c+=tile(!!s,'moon','睡眠','sleep',s?r1(s.dur)+' h':'未记录',s?'<span class="ck-ok">'+IC('ok')+'</span>':ls?'<button class="sm" id="ovSlReuse">确认 '+r1(ls.dur)+' h</button>':'<button class="ghost sm" data-go="sleep">记录</button>');
 var b=S.body.find(function(x){return x.date===sel&&x.weight!=null;});
 c+=tile(!!b,'chart','体重','body',b?b.weight+' kg':'','<input id="ovWt" type="number" inputmode="decimal" step="0.1" placeholder="'+(b?'修改':'kg')+'" enterkeyhint="done">');
 if(activeInjury()){var wp=wpOf(sel);c+='<div class="ck-t wide'+(wp?' done':'')+'"><div class="ck-h" data-go="injury">'+IC('bandage')+'<span>伤处疼痛</span><b id="ovPainV" class="ck-pv">'+(wp?wp.pain:'—')+'</b><span class="mut">/10</span></div><input type="range" id="ovPain" min="0" max="10" step="1" value="'+(wp?wp.pain:0)+'"></div>';}
 $('#ovChecks').innerHTML=c;
}
document.addEventListener('input',function(e){if(e.target.id==='ovPain')$('#ovPainV').textContent=e.target.value;});
document.addEventListener('change',function(e){var t=e.target;
 if(t.id==='ovPain'){var v=+t.value,o=wpOf(sel)||{date:sel,trig:[],note:''};S.wristLog=S.wristLog.filter(function(x){return x.date!==sel;});o.pain=v;S.wristLog.push(o);save();toast('疼痛 '+v+'/10 已记录');render();}
 else if(t.id==='ovWt'){var w=num(t.value);if(w==null||w<=0)return;var o2=S.body.find(function(x){return x.date===sel;});if(o2)o2.weight=w;else S.body.push({id:uid(),date:sel,weight:w});save();toast('体重已记录');render();}});

/* ---------- 数据（核心卡片，点开看细分） ---------- */
function rData(){var g=S.goals,h='',d7=[],d14=[],i;for(i=6;i>=0;i--)d7.push(addDays(sel,-i));for(i=13;i>=0;i--)d14.push(addDays(sel,-i));
 var card=function(go,t,main,extra){return'<div class="card tap" data-go="'+go+'"><div class="hrow"><h2>'+t+'</h2>'+IC('right')+'</div><div class="dmain">'+main+'</div>'+(extra||'')+'</div>';};
 var wp=S.body.filter(function(b){return b.weight!=null&&b.date<=sel;}).sort(function(a,b){return a.date<b.date?-1:1;}),lw=wp[wp.length-1],w30=wp.filter(function(x){return x.date>=addDays(sel,-29);}),dl=w30.length>1?r1(lw.weight-w30[0].weight):null;
 h+=card('body','身体',lw?'<b class="xl">'+lw.weight+'</b> kg'+bmiTxt(lw.weight)+(dl!=null?' <span class="mut">· 30天 '+(dl>=0?'+':'')+dl+'</span>':''):'<span class="mut">暂无体重</span>','<div class="chart" id="chOvWt"></div>');
 var lg=d7.filter(function(d){return dayMeals(d).length;}),ak=avg(lg.map(function(d){return dayTot(d).k;})),pOk=lg.filter(function(d){return dayTot(d).p>=g.p*0.9;}).length;
 h+=card('nutri','营养',lg.length?'日均 <b class="xl">'+Math.round(ak)+'</b> / '+g.kcal+' kcal <span class="mut">· 蛋白达标 '+pOk+'/'+lg.length+' 天</span>':'<span class="mut">近 7 天无记录</span>','<div class="chart" id="chDNut"></div>');
 var wi=weekInfo(sel),st=muscleState(),cn={};Object.keys(st).forEach(function(k){cn[st[k].status]=(cn[st[k].status]||0)+1;});
 h+=card('tstats','训练','本周 <b class="xl">'+wi.days+'</b> / '+g.trainDays+' 天 <span class="mut">· '+Math.round(wi.vol)+' kg</span>','<div class="mini" data-go="muscle">'+IC('body')+'<span>肌群 已恢复 '+((cn.recovered||0)+(cn.stale||0))+' · 恢复中 '+((cn.recovering||0)+(cn.fatigued||0))+'</span>'+IC('right')+'</div>');
 var rd=readiness(sel),sl=avg(d7.map(function(d){var s=sleepOf(d);return s?s.dur:null;}));
 h+=card('hormone','恢复','准备度 <b class="xl">'+(rd?rd.score:'—')+'</b>'+(sl!=null?' <span class="mut">· 睡眠均 '+r1(sl)+' h</span>':''),'<div class="chart" id="chDRd"></div>');
 $('#dataBox').innerHTML=h;
 chTodayWeight();
 CH.bars($('#chDNut'),{h:80,cats:d7.map(function(d){return{l:md(d),d:d,v:Math.round(dayTot(d).k),color:'var(--k)'};}),goal:g.kcal,unit:' kcal',emptyMsg:'暂无饮食记录'});
 CH.line($('#chDRd'),{h:80,series:[{name:'准备度',color:'var(--ok)',pts:d14.map(function(d){var x=readiness(d);return{d:d,y:x?x.score:null};}),area:true}],yl:{min:0,max:100},emptyMsg:'暂无准备度',emptyHint:'记录睡眠与晨起指标后计算'});
 $('#dataMore').innerHTML=[['sleep','睡眠'],['hormone','恢复/化验'],['muscle','肌群'],['injury','伤病'],['supp','补剂'],['perf','运动表现'],['tstats','训练统计'],['nutri','营养分析']].map(function(x){return'<button class="chip" data-go="'+x[0]+'">'+x[1]+'</button>';}).join('');
}

/* ---------- 饮食（v2.1）：餐次分配 / 记录快照 / 最近常吃 / 月历 / 目标推导 / 自定义与组合 ---------- */
var MEALS=['早餐','午餐','晚餐','加餐'],SPLIT0=[25,35,30,10];
var SRC_LBL={lib:'内置库',quick:'快速输入',photo:'教练照片估算',custom:'自定义'};
/** 旧版"练前/练后"等餐次计入加餐 */
function mealGroup(m){return MEALS.indexOf(m)>=0?m:'加餐';}
function mealSplit(){var s=S.goals.mealSplit||{},o={},sum=0;MEALS.forEach(function(m,i){o[m]=s[m]!=null?s[m]:SPLIT0[i];sum+=o[m];});o._sum=sum||100;return o;}
function mealTarget(m){var s=mealSplit();return Math.round(S.goals.kcal*s[m]/s._sum);}
var curMeal=null;function dMeal(){return curMeal||mealByHour();}
/** 份量换算：优先 servings，兼容旧 units */
function unitsOf(f){var u={};if(!f)return u;if(f.servings&&f.servings.length)f.servings.forEach(function(s){if(s&&s.unit&&s.g>0)u[s.unit]=s.g;});else if(f.units)for(var k in f.units)u[k]=f.units[k];return u;}
function per100(f){var o={kcal:f.kcal,p:f.p,c:f.c,f:f.f};if(f.na!=null)o.na=f.na;if(f.fib!=null)o.fib=f.fib;return o;}
/** 由食物（每100g）与克数生成记录字段（含营养快照） */
function fromFood(f,g,amount,unit){var r=g/100,o={foodId:f.id,name:f.name.replace(/[（(].*?[）)]/g,''),amount:amount!=null?amount:Math.round(g),unit:unit||'g',g:Math.round(g),nutrimentsPer100g:per100(f),src:f.custom?'custom':'lib',
 kcal:Math.round(f.kcal*r),p:r1(f.p*r),c:r1(f.c*r),f:r1(f.f*r)};if(f.na!=null)o.na=Math.round(f.na*r);if(f.fib!=null)o.fib=r1(f.fib*r);return o;}
function mkMeal(o){var m={id:uid(),date:sel,meal:o.meal||dMeal(),food:o.name||o.food,name:o.name||o.food,kcal:Math.round(o.kcal||0),p:r1(o.p||0),c:r1(o.c||0),f:r1(o.f||0),src:o.src||'custom'};
 ['foodId','amount','unit','g','nutrimentsPer100g','lo','hi','na','fib','kcalOnly'].forEach(function(k){if(o[k]!=null&&o[k]!=='')m[k]=o[k];});return m;}
function cloneMeal(m){var o=JSON.parse(JSON.stringify(m));o.id=uid();o.date=sel;o.meal=dMeal();return o;}
function mealLabel(m){return m.name||m.food||'';}
function mealTags(m){var t='';if(m.src==='photo')t+='<span class="tag est">估算'+(m.lo&&m.hi?' '+Math.round(m.lo)+'–'+Math.round(m.hi):'')+'</span> ';else if(m.kcalOnly)t+='<span class="tag">仅热量</span> ';
 if(m.meal&&MEALS.indexOf(m.meal)<0)t+='<span class="tag">'+esc(m.meal)+'</span> ';return t;}
/** 最近 / 最常吃：近 60 天按次数、再按最近日期排序，取 8 项 */
function recentFoods(){var from=addDays(today(),-60),map={},list=[];S.meals.forEach(function(m){if(m.date<from)return;var k=normName(mealLabel(m))+'|'+Math.round(m.kcal||0);var e=map[k];if(!e){e=map[k]={m:m,n:0,last:''};list.push(e);}e.n++;if(m.date>=e.last){e.last=m.date;e.m=m;}});
 return list.sort(function(a,b){return b.n-a.n||(a.last<b.last?1:-1);}).slice(0,8).map(function(e){return e.m;});}
function dayMicro(d){var na=null,fib=null;dayMeals(d).forEach(function(m){if(m.na!=null)na=(na||0)+m.na;if(m.fib!=null)fib=(fib||0)+m.fib;});return{na:na,fib:fib};}
function rDiet(){var g=S.goals,t=dayTot(sel);
 var fl=allFoods();$('#foodTpl').innerHTML=(fl.length?'':'<span class="mut">食物库为空（源码模式未注入 data/foods.json）</span>')+fl.map(function(f,i){return'<button class="chip" data-food="'+i+'">'+esc(f.name)+'</button>';}).join('')+S.favFoods.map(function(f,i){return'<button class="chip" data-fav="'+i+'" style="border-color:var(--acc)">'+IC('star')+esc(f.food)+'</button>';}).join('');
 var line=function(n,v,gl,u,col,sm){var pc=gl?Math.min(v/gl*100,100):0;return'<div style="margin-bottom:6px"><div class="hrow"><span>'+n+'</span><span>'+(sm?Math.round(v):r1(v))+' / '+gl+u+(sm?'':' <span class="mut">剩 '+r1(gl-v)+'</span>')+'</span></div><div class="bar"><i style="width:'+pc+'%;background:'+col+'"></i></div></div>';};
 var mi=dayMicro(sel);
 $('#dietSum').innerHTML=line('热量',t.k,g.kcal,' kcal','var(--k)')+line('蛋白质',t.p,g.p,' g','var(--p)')+'<div class="grid2 cf2">'+line('碳水',t.c,g.c,' g','var(--c)',1)+line('脂肪',t.f,g.f,' g','var(--f)',1)+'</div>'+
  (mi.na!=null||mi.fib!=null?'<div class="mut" style="font-size:12px">'+(mi.na!=null?'钠 '+Math.round(mi.na)+' mg':'')+(mi.na!=null&&mi.fib!=null?' · ':'')+(mi.fib!=null?'膳食纤维 '+r1(mi.fib)+' g':'')+'（仅统计有填写的条目）</div>':'')+
  (t.p&&t.p<g.p*0.9&&sel<today()?'<div class="mut" style="color:var(--warn)">蛋白质明显低于目标</div>':'');
 var ms=dayMeals(sel),cm=dMeal();
 $('#mealTabs').innerHTML=MEALS.map(function(m){var k=ms.filter(function(x){return mealGroup(x.meal)===m;}).reduce(function(s,x){return s+(x.kcal||0);},0),tg=mealTarget(m);
  return'<button class="mt'+(m===cm?' on':'')+(k>tg*1.1?' over':'')+'" data-meal="'+m+'"><b>'+m+'</b><span>'+Math.round(k)+' / '+tg+'</span><i style="width:'+Math.min(100,tg?k/tg*100:0)+'%"></i></button>';}).join('');
 $('#qText2').placeholder='记入'+cm+'：如 鸡胸肉200g 米饭1碗，或 外卖 650';
 var rc=recentFoods();$('#dRecent').innerHTML=rc.length?'<span class="mut" style="font-size:12px">再记一次：</span>'+rc.map(function(m){return'<button class="chip" data-again="'+m.id+'">'+esc(mealLabel(m))+' <span class="mut">'+Math.round(m.kcal||0)+'</span></button>';}).join(''):'';
 var h='';MEALS.forEach(function(meal){var arr=ms.filter(function(m){return mealGroup(m.meal)===meal;});if(!arr.length)return;var k=arr.reduce(function(s,m){return s+(m.kcal||0);},0);
  h+='<h3>'+meal+' · '+Math.round(k)+' / '+mealTarget(meal)+' kcal</h3><ul class="list">'+arr.map(function(m){return'<li data-editmeal="'+m.id+'" class="'+(m.id===editMeal?'on':'')+'"><div>'+mealTags(m)+esc(mealLabel(m))+'<div class="mut">'+Math.round(m.kcal)+' kcal · P'+r1(m.p)+' C'+r1(m.c)+' F'+r1(m.f)+(m.src&&SRC_LBL[m.src]?' · '+SRC_LBL[m.src]:'')+'</div></div><button class="del" data-delmeal="'+m.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>';});
 $('#dietList').innerHTML=h||'<div class="mut">暂无记录</div>';
 $('#ovKcalTxt').textContent='剩余 '+Math.round(g.kcal-t.k)+' kcal';
 $('#gK').value=g.kcal;$('#gP').value=g.p;$('#gC').value=g.c;$('#gF').value=g.f;var sp=mealSplit();MEALS.forEach(function(m,i){$('#gS'+i).value=sp[m];});gHint();
 photoUI();rCal();rTarget();rCustom();
}
/* 食物库：选中食物后按克数（默认100g）换算营养素 */
var pickFood=null;
function applyFood(){if(!pickFood)return;var g=num($('#mG').value)||0,o=fromFood(pickFood,g);$('#mFood').value=o.name+' '+o.g+'g';$('#mP').value=o.p;$('#mC').value=o.c;$('#mF').value=o.f;$('#mK').value=o.kcal;$('#mNa').value=o.na!=null?o.na:'';$('#mFib').value=o.fib!=null?o.fib:'';}
$('#mG').addEventListener('input',applyFood);
$('#mFood').addEventListener('input',function(){pickFood=null;});
function photoUI(){var on=$('#mSrc').value==='photo';Array.prototype.forEach.call(document.querySelectorAll('.photoOnly'),function(e){e.hidden=!on;});}
$('#mSrc').addEventListener('change',photoUI);
/** 照片估算：填区间后热量默认取中值 */
['#mLo','#mHi'].forEach(function(s){$(s).addEventListener('input',function(){var lo=num($('#mLo').value),hi=num($('#mHi').value);if(lo&&hi&&hi>=lo)$('#mK').value=Math.round((lo+hi)/2);});});
function gHint(){var k=(num($('#gP').value)||0)*4+(num($('#gC').value)||0)*4+(num($('#gF').value)||0)*9,s=0;for(var i=0;i<4;i++)s+=num($('#gS'+i).value)||0;$('#gHint').textContent='宏量折算 ≈ '+Math.round(k)+' kcal'+(s!==100?' · 分配合计 '+s+'%（将按比例换算）':'');}
['#gP','#gC','#gF','#gS0','#gS1','#gS2','#gS3'].forEach(function(s){$(s).addEventListener('input',gHint);});
$('#gSave').onclick=function(){['kcal','p','c','f'].forEach(function(k,i){var v=num($(['#gK','#gP','#gC','#gF'][i]).value);if(v!=null&&v>0)S.goals[k]=v;});
 var sp={},ok=true;MEALS.forEach(function(m,i){var v=num($('#gS'+i).value);if(v==null||v<0)ok=false;sp[m]=v;});if(ok&&MEALS.some(function(m){return sp[m]>0;}))S.goals.mealSplit=sp;save();toast('目标已保存');render();};
var editMeal=null;
function mReset(){editMeal=null;pickFood=null;['#mFood','#mG','#mP','#mC','#mF','#mK','#mLo','#mHi','#mNa','#mFib'].forEach(function(s){$(s).value='';});$('#mSrc').value='custom';$('#mMeal').value=dMeal();$('#mAdd').textContent='添加';$('#mCancel').hidden=true;photoUI();}
$('#mAdd').onclick=function(){var food=$('#mFood').value.trim(),p=num($('#mP').value)||0,c=num($('#mC').value)||0,f=num($('#mF').value)||0,k=num($('#mK').value),src=$('#mSrc').value,lo=num($('#mLo').value),hi=num($('#mHi').value);
 if(!food){toast('请填写食物');return;}if(k==null)k=p*4+c*4+f*9;if(src==='photo'&&lo!=null&&hi!=null&&hi<lo){toast('估算上限应不小于下限');return;}
 var o={meal:$('#mMeal').value,name:food,kcal:k,p:p,c:c,f:f,src:src,na:num($('#mNa').value),fib:num($('#mFib').value)};
 if(src==='photo'){o.lo=lo;o.hi=hi;}
 var g=num($('#mG').value);if(pickFood&&g){var ff=fromFood(pickFood,g);['foodId','amount','unit','g','nutrimentsPer100g'].forEach(function(x){o[x]=ff[x];});if(src!=='photo')o.src=ff.src;}
 var em=editMeal&&S.meals.find(function(x){return x.id===editMeal;});
 if(em){var nm=mkMeal(o);nm.id=em.id;nm.date=em.date;if(!pickFood){['foodId','amount','unit','g','nutrimentsPer100g'].forEach(function(x){if(em[x]!=null&&nm[x]==null&&food===mealLabel(em))nm[x]=em[x];});if(em.src&&src==='custom'&&em.src!=='photo')nm.src=em.src;}
  S.meals[S.meals.indexOf(em)]=nm;}else S.meals.push(mkMeal(o));
 pickFood=null;save();mReset();$('#mForm').open=false;toast(em?'已修改':'已添加');render();};
$('#mCancel').onclick=function(){mReset();render();};
document.addEventListener('click',function(e){var li=e.target.closest&&e.target.closest('li[data-editmeal]');if(!li||e.target.closest('button'))return;var m=S.meals.find(function(x){return x.id===li.getAttribute('data-editmeal');});if(!m)return;
 editMeal=m.id;var mm=$('#mMeal');if(!Array.prototype.some.call(mm.options,function(o){return o.value===m.meal;})){var op=document.createElement('option');op.textContent=m.meal;mm.appendChild(op);}mm.value=m.meal;
 $('#mFood').value=mealLabel(m);$('#mP').value=r1(m.p||0);$('#mC').value=r1(m.c||0);$('#mF').value=r1(m.f||0);$('#mK').value=Math.round(m.kcal||0);
 $('#mSrc').value=m.src==='photo'?'photo':'custom';$('#mLo').value=m.lo!=null?m.lo:'';$('#mHi').value=m.hi!=null?m.hi:'';$('#mNa').value=m.na!=null?m.na:'';$('#mFib').value=m.fib!=null?m.fib:'';
 pickFood=null;$('#mG').value='';if(m.nutrimentsPer100g&&m.g){var s=m.nutrimentsPer100g;pickFood={id:m.foodId,name:mealLabel(m).replace(/\s*\d+g$/,''),kcal:s.kcal,p:s.p,c:s.c,f:s.f,na:s.na,fib:s.fib,custom:m.src==='custom'};$('#mG').value=m.g;$('#mLib').open=true;}
 $('#mAdd').textContent='保存修改';$('#mCancel').hidden=false;$('#mForm').open=true;rDiet();$('#mForm').scrollIntoView({block:'center'});});
$('#mSaveFav').onclick=function(){var food=$('#mFood').value.trim();if(!food){toast('请先填写食物与数值');return;}var p=num($('#mP').value)||0,c=num($('#mC').value)||0,f=num($('#mF').value)||0,k=num($('#mK').value);if(k==null)k=p*4+c*4+f*9;
 S.favFoods=S.favFoods.filter(function(x){return x.food!==food;});S.favFoods.push({food:food,kcal:k,p:p,c:c,f:f});save();toast('已存为常用（长按可删除）');render();};

/* 饮食月历：按热量与目标的偏差着色；连续记录天数；体重趋势外推 */
var calMonth=null;
function streakDays(){var d=today(),n=0;if(!dayMeals(d).length)d=addDays(d,-1);while(dayMeals(d).length&&n<3650){n++;d=addDays(d,-1);}return n;}
function calLevel(d){var ms=dayMeals(d);if(!ms.length)return'';var k=ms.reduce(function(s,m){return s+(m.kcal||0);},0),g=S.goals.kcal;if(!g)return'ok';var r=k/g;return r<0.9?'lo':r>1.1?'hi':'ok';}
/** 近 42 天体重线性回归，按斜率外推到目标体重（仅为趋势估计） */
function weightETA(){var gw=S.goals.weight;if(gw==null)return{msg:'在「我的 › 其他目标」设置目标体重后，可按体重趋势估算达成日期。'};
 var t0=today(),from=addDays(t0,-42),pts=S.body.filter(function(b){return b.weight!=null&&b.date>=from&&b.date<=t0;}).map(function(b){return{x:diffDays(from,b.date),y:b.weight};});
 var xs=pts.map(function(p){return p.x;});if(pts.length<3||Math.max.apply(null,xs)-Math.min.apply(null,xs)<14)return{msg:'需要近 6 周内至少 3 次、跨度 ≥14 天的体重记录才能估算达成日期。'};
 var n=pts.length,mx=avg(xs),my=avg(pts.map(function(p){return p.y;})),sxy=0,sxx=0;pts.forEach(function(p){sxy+=(p.x-mx)*(p.y-my);sxx+=(p.x-mx)*(p.x-mx);});
 var b=sxx?sxy/sxx:0,xNow=diffDays(from,t0),wNow=my+b*(xNow-mx),diff=gw-wNow,wk=r1(b*7);
 if(Math.abs(diff)<0.3)return{msg:'当前趋势体重约 '+r1(wNow)+' kg，已接近目标 '+gw+' kg。'};
 if(Math.abs(b)<0.005||(diff>0)!==(b>0))return{msg:'近 6 周趋势（每周 '+(wk>0?'+':'')+wk+' kg）未朝目标 '+gw+' kg 方向变化，暂无法估算。'};
 var days=Math.round(diff/b);if(days>1095)return{msg:'按当前趋势（每周 '+(wk>0?'+':'')+wk+' kg）需超过 3 年，建议复核目标。'};
 return{date:addDays(t0,days),msg:'按近 6 周趋势（每周 '+(wk>0?'+':'')+wk+' kg，趋势体重 '+r1(wNow)+' kg），预计 <b>'+addDays(t0,days)+'</b> 前后达到 '+gw+' kg（约 '+days+' 天）。仅为趋势外推，不构成医疗建议。'};}
function rCal(){var st=streakDays();$('#calSum').textContent=st?'连续记录 '+st+' 天':'';
 var cm=calMonth||sel.slice(0,7),y=+cm.slice(0,4),mo=+cm.slice(5,7),first=cm+'-01',dim=new Date(y,mo,0).getDate(),lead=(parse(first).getDay()+6)%7,h='';
 for(var i=0;i<lead;i++)h+='<span></span>';
 for(var d=1;d<=dim;d++){var ds=cm+'-'+pad(d),lv=calLevel(ds);h+='<button class="cd'+(lv?' '+lv:'')+(ds===sel?' sel':'')+(ds===today()?' td':'')+'" data-calday="'+ds+'">'+d+'</button>';}
 var pm=fmt(new Date(y,mo-2,1)).slice(0,7),nm=fmt(new Date(y,mo,1)).slice(0,7),e=weightETA();
 $('#calBox').innerHTML='<div class="hrow" style="margin:6px 0"><button class="ghost sm" data-calm="'+pm+'" aria-label="上个月">'+IC('left')+'</button><b>'+y+' 年 '+mo+' 月</b><button class="ghost sm" data-calm="'+nm+'" aria-label="下个月">'+IC('right')+'</button></div>'+
  '<div class="cal"><i>一</i><i>二</i><i>三</i><i>四</i><i>五</i><i>六</i><i>日</i>'+h+'</div>'+
  '<div class="mlg" style="margin-top:6px"><span><i class="cd ok"></i>达标 ±10%</span><span><i class="cd lo"></i>偏低</span><span><i class="cd hi"></i>偏高</span><span><i class="cd"></i>未记录</span></div>'+
  '<div class="mut" style="margin-top:8px;font-size:13px">连续记录 <b>'+st+'</b> 天 · '+e.msg+'</div>';}

/* 目标怎么来的：BMR（Mifflin-St Jeor / Katch-McArdle）× PAL → 缺口 → 手动偏移；蛋白按 g/kg */
var PAL=[[1.4,'久坐（PAL 1.4）'],[1.55,'轻度活动（1.55）'],[1.75,'中度活动（1.75）'],[2.0,'高活动（2.0）']];
var GMODE={cut:['减脂',-0.15],keep:['维持',0],bulk:['增肌',0.1]};
function tgtCfg(){var c=S.goals.calc||{};return{sex:c.sex||'',age:c.age!=null?c.age:null,pal:c.pal||1.55,mode:c.mode||'keep',adj:c.adj||0,pkg:c.pkg||1.6,fatPct:c.fatPct||25,km:!!c.km};}
function latestBody(k){var b=S.body.filter(function(x){return x[k]!=null;}).sort(function(a,b){return a.date<b.date?1:-1;})[0];return b?b[k]:null;}
function calcTarget(c){var w=latestBody('weight'),bf=latestBody('bf'),h=S.profile.height,miss=[],bmr=null,how='';
 if(c.km&&w!=null&&bf!=null){var lbm=w*(1-bf/100);bmr=370+21.6*lbm;how='Katch-McArdle：370 + 21.6 × 瘦体重 '+r1(lbm)+' kg';}
 else{if(w==null)miss.push('体重（数据 › 身体）');if(!h)miss.push('身高（我的 › 个人配置）');if(c.age==null)miss.push('年龄');if(!c.sex)miss.push('性别');
  if(!miss.length){bmr=10*w+6.25*h-5*c.age+(c.sex==='m'?5:-161);how='Mifflin-St Jeor：10 × '+w+' + 6.25 × '+h+' − 5 × '+c.age+(c.sex==='m'?' + 5':' − 161');}}
 if(bmr==null)return{miss:miss};
 var tdee=bmr*c.pal,gm=GMODE[c.mode]||GMODE.keep,goal=tdee*(1+gm[1]),kcal=Math.round((goal+c.adj)/10)*10,p=w!=null?Math.round(c.pkg*w):null,fat=Math.round(kcal*c.fatPct/100/9),carb=p!=null?Math.max(0,Math.round((kcal-p*4-fat*9)/4)):null;
 return{bmr:bmr,how:how,tdee:tdee,gm:gm,goal:goal,kcal:kcal,p:p,f:fat,c:carb,w:w,bf:bf};}
function rTarget(){var c=tgtCfg(),r=calcTarget(c),opt=function(v,l,s){return'<option value="'+v+'"'+(String(v)===String(s)?' selected':'')+'>'+l+'</option>';},hasBf=latestBody('bf')!=null&&latestBody('weight')!=null;
 var h='<div class="grid2" style="margin-top:8px">'+
  '<div><label>性别</label><select id="tcSex">'+opt('','请选择',c.sex)+opt('m','男',c.sex)+opt('f','女',c.sex)+'</select></div>'+
  '<div><label>年龄</label><input id="tcAge" type="number" value="'+(c.age!=null?c.age:'')+'"></div>'+
  '<div><label>日常活动</label><select id="tcPal">'+PAL.map(function(p){return opt(p[0],p[1],c.pal);}).join('')+'</select></div>'+
  '<div><label>目标</label><select id="tcMode">'+Object.keys(GMODE).map(function(k){var g=GMODE[k];return opt(k,g[0]+(g[1]?'（'+(g[1]>0?'+':'')+Math.round(g[1]*100)+'%）':''),c.mode);}).join('')+'</select></div>'+
  '<div><label>手动偏移 kcal</label><input id="tcAdj" type="number" step="50" value="'+c.adj+'"></div>'+
  '<div><label>蛋白 g/kg 体重</label><input id="tcPkg" type="number" step="0.1" value="'+c.pkg+'"></div>'+
  '</div>'+(hasBf?'<label class="ck-l" style="margin-top:6px"><input type="checkbox" id="tcKm"'+(c.km?' checked':'')+'> 有体脂数据：用 Katch-McArdle（按瘦体重）</label>':'');
 if(r.miss)h+='<div class="alert info" style="margin-top:8px">还缺：'+esc(r.miss.join('、'))+'。补齐后显示推导过程（不会自动填写）。</div>';
 else h+='<ol class="steps">'+
  '<li><span>基础代谢 BMR</span><b>'+Math.round(r.bmr)+' kcal</b><em>'+esc(r.how)+'</em></li>'+
  '<li><span>× 活动系数 '+c.pal+'</span><b>'+Math.round(r.tdee)+' kcal</b><em>每日总消耗估计（TDEE）</em></li>'+
  '<li><span>'+r.gm[0]+(r.gm[1]?' '+(r.gm[1]>0?'+':'')+Math.round(r.gm[1]*100)+'%':'')+'</span><b>'+Math.round(r.goal)+' kcal</b><em>'+(r.gm[1]<0?'热量缺口':r.gm[1]>0?'热量盈余':'不设缺口')+' '+Math.round(r.goal-r.tdee)+' kcal</em></li>'+
  '<li><span>手动偏移 '+(c.adj>=0?'+':'')+c.adj+'</span><b>'+r.kcal+' kcal</b><em>建议热量目标（取整到 10）</em></li>'+
  '<li><span>蛋白 '+c.pkg+' g/kg × '+r.w+' kg</span><b>'+r.p+' g</b><em>脂肪按热量 '+c.fatPct+'% ≈ '+r.f+' g，碳水为余量 ≈ '+r.c+' g</em></li></ol>'+
  '<div class="row"><button class="sm" id="tcApply">应用到饮食目标</button><span class="mut" style="font-size:12px">当前目标 '+S.goals.kcal+' kcal / 蛋白 '+S.goals.p+' g</span></div>';
 h+='<details class="more"><summary>公式与文献</summary><div class="mut" style="font-size:12px;line-height:1.6">'+
  'Mifflin-St Jeor：男 10W + 6.25H − 5A + 5，女 10W + 6.25H − 5A − 161（W kg，H cm，A 岁）。Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241–247.<br>'+
  'Katch-McArdle：370 + 21.6 × 瘦体重（kg）。McArdle WD, Katch FI, Katch VL. Exercise Physiology: Nutrition, Energy, and Human Performance.<br>'+
  '活动系数（PAL）：FAO/WHO/UNU. Human energy requirements. FAO Food and Nutrition Technical Report Series 1, 2004（久坐/轻度 1.40–1.69，活跃 1.70–1.99，高 2.00–2.40）。<br>'+
  '蛋白质：Jäger R, et al. J Int Soc Sports Nutr. 2017;14:20（训练人群 1.4–2.0 g/kg/d）；Morton RW, et al. Br J Sports Med. 2018;52:376–384。<br>'+
  '均为人群平均估计，个体差异可达 ±10% 以上；请按 2–3 周体重趋势微调。不构成医疗或营养建议。</div></details>';
 var box=$('#tgtBox'),ae=document.activeElement&&document.activeElement.id;box.innerHTML=h;if(ae&&/^tc/.test(ae)&&$('#'+ae))$('#'+ae).focus();}
function tcRead(){var c=tgtCfg();c.sex=$('#tcSex').value;c.age=num($('#tcAge').value);c.pal=num($('#tcPal').value)||1.55;c.mode=$('#tcMode').value;c.adj=num($('#tcAdj').value)||0;c.pkg=num($('#tcPkg').value)||1.6;c.km=!!($('#tcKm')&&$('#tcKm').checked);S.goals.calc=c;save();}
$('#tgtBox').addEventListener('change',function(e){if(/^tc/.test(e.target.id)){tcRead();rTarget();}});
$('#tgtBox').addEventListener('click',function(e){if(e.target.id!=='tcApply')return;var r=calcTarget(tgtCfg());if(r.miss)return;if(!confirm('将饮食目标设为 '+r.kcal+' kcal、蛋白 '+r.p+' g、碳水 '+r.c+' g、脂肪 '+r.f+' g？'))return;
 S.goals.kcal=r.kcal;S.goals.p=r.p;S.goals.c=r.c;S.goals.f=r.f;save();toast('已应用到饮食目标');render();});

/* 自定义食物与组合（存于 customFoods，custom:true；组合带 combo 组成文本） */
var cfMode='food';
function rCustom(){var cs=(S.customFoods||[]).filter(function(f){return f.custom;});$('#cfCnt').textContent=cs.length?cs.length+' 项':'';
 $('#cfmFood').classList.toggle('on',cfMode==='food');$('#cfmCombo').classList.toggle('on',cfMode==='combo');$('#cfFood').hidden=cfMode!=='food';$('#cfCombo').hidden=cfMode!=='combo';
 $('#cuList').innerHTML=cs.map(function(f){var u=unitsOf(f),g=u['份']||100,r=g/100;return'<li><div><b>'+esc(f.name)+'</b> '+(f.combo?'<span class="tag">组合</span>':'')+'<div class="mut">每份 '+Math.round(f.kcal*r)+' kcal · P'+r1(f.p*r)+' C'+r1(f.c*r)+' F'+r1(f.f*r)+(f.combo?' · '+esc(f.combo):' · '+g+' g')+'</div></div><button class="del" data-delcu="'+esc(f.id)+'" aria-label="删除">'+IC('x')+'</button></li>';}).join('');}
function coPreview(){var r=parseQuick($('#coText').value,true),k=0;r.items.forEach(function(i){k+=i.kcal;});$('#coPrev').innerHTML=$('#coText').value.trim()?'合计 '+Math.round(k)+' kcal'+(r.miss.length?' <span style="color:var(--warn)">未识别：'+esc(r.miss.join('、'))+'</span>':''):'';}
$('#coText').addEventListener('input',coPreview);
function saveCustom(f){S.customFoods=(S.customFoods||[]).filter(function(y){return normName(y.name)!==normName(f.name);});S.customFoods.push(f);save();}
$('#cuAdd').onclick=function(){var f;
 if(cfMode==='food'){var name=$('#cuName').value.trim(),g=num($('#cuG').value)||100,k=num($('#cuK').value),p=num($('#cuP').value)||0,c=num($('#cuC').value)||0,ft=num($('#cuF').value)||0,na=num($('#cuNa').value);
  if(!name){toast('请填写名称');return;}if(k==null)k=p*4+c*4+ft*9;if(!k){toast('请填写热量或宏量');return;}var r=100/g;
  f={id:'cu-'+uid(),name:name,category:'自定义',kcal:r1(k*r),p:r1(p*r),c:r1(c*r),f:r1(ft*r),servings:[{unit:'份',g:g}],source:'自定义',custom:true};if(na!=null)f.na=r1(na*r);
  ['#cuName','#cuG','#cuK','#cuP','#cuC','#cuF','#cuNa'].forEach(function(s){$(s).value='';});}
 else{var nm=$('#coName').value.trim(),tx=$('#coText').value.trim(),q=parseQuick(tx,true);if(!nm||!q.items.length){toast('请填写组合名称与组成');return;}if(q.miss.length){toast('有未识别的项：'+q.miss.join('、'));return;}
  var T={kcal:0,p:0,c:0,f:0,g:0,na:null,fib:null};q.items.forEach(function(i){T.kcal+=i.kcal;T.p+=i.p;T.c+=i.c;T.f+=i.f;T.g+=i.g||0;if(i.na!=null)T.na=(T.na||0)+i.na;if(i.fib!=null)T.fib=(T.fib||0)+i.fib;});
  var gg=T.g||100,rr=100/gg;f={id:'co-'+uid(),name:nm,category:'组合',kcal:r1(T.kcal*rr),p:r1(T.p*rr),c:r1(T.c*rr),f:r1(T.f*rr),servings:[{unit:'份',g:Math.round(gg)}],source:'自定义',custom:true,combo:tx};
  if(T.na!=null)f.na=r1(T.na*rr);if(T.fib!=null)f.fib=r1(T.fib*rr);$('#coName').value='';$('#coText').value='';$('#coPrev').textContent='';}
 saveCustom(f);toast('已保存「'+f.name+'」，快速输入名称即可记录');render();};
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-cfmode],[data-meal],[data-again],[data-calday],[data-calm],[data-delcu]');if(!b)return;var a;
 if((a=b.getAttribute('data-cfmode'))){cfMode=a;rCustom();return;}
 if((a=b.getAttribute('data-meal'))){curMeal=a;$('#mMeal').value=a;rDiet();return;}
 if((a=b.getAttribute('data-again'))){var m=S.meals.find(function(x){return x.id===a;});if(!m)return;var o=cloneMeal(m);S.meals.push(o);save();toast('已记入'+o.meal+'：'+mealLabel(o));render();return;}
 if((a=b.getAttribute('data-calday'))){sel=a;$('#dSel').value=sel;render();return;}
 if((a=b.getAttribute('data-calm'))){calMonth=a;rCal();return;}
 if((a=b.getAttribute('data-delcu'))){if(!confirm('删除该自定义项？已记录的条目不受影响。'))return;S.customFoods=S.customFoods.filter(function(x){return x.id!==a;});save();render();}});

function rTrain(){rSession();if(cur==='train'&&!(S.active||showSummary||editPlan))rMuscle();var g=S.goals,ra=recAdvice(recWeek(sel));
 $('#recBanner').innerHTML=ra?'<div class="alert '+ra[0]+'">'+IC('cycle')+' '+esc(ra[1])+'</div>':'';
 $('#rStart').value=S.recoveryStart||'';
 var wi=weekInfo(sel);
 $('#weekSum').innerHTML='<div class="mut">'+wi.ws+' ~ '+wi.we+'</div><div class="grid2" style="margin-top:6px"><div>力量训练 <b>'+wi.days+'/'+g.trainDays+'</b> 天<div class="bar"><i style="width:'+Math.min(wi.days/g.trainDays*100,100)+'%"></i></div></div><div>爬楼 <b>'+wi.stair+'/'+g.stairMin+'</b> 分（'+wi.stairDays+'天）<div class="bar"><i style="width:'+Math.min(wi.stair/g.stairMin*100,100)+'%;background:var(--ok)"></i></div></div></div><div style="margin-top:6px">本周总训练量 <b>'+Math.round(wi.vol)+'</b> kg · 游泳 <b>'+wi.swimN+'</b> 次 / <b>'+wi.swimM+'</b> m</div>';
 var sw=S.swims.filter(function(c){return c.date===sel;});
 $('#swList').innerHTML=sw.length?'<ul class="list">'+sw.map(function(c){return'<li><div>'+esc(c.stroke)+' '+c.dist+'m · '+fmtT(c.sec)+'<div class="mut">配速 '+(c.sec&&c.dist?fmtT(c.sec/c.dist*100)+'/100m':'-')+(c.swolf?' · SWOLF '+c.swolf:'')+(c.note?' · '+esc(c.note):'')+'</div></div><button class="del" data-delsw="'+c.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'';
 if(!$('#pbD').value)$('#pbD').value=sel;if(!$('#rnD').value)$('#rnD').value=sel;
 $('#rnHist').value=S.run800Hist?fmtT(S.run800Hist):'';
 var rn=S.run800.slice().sort(function(a,b){return a.date<b.date?-1:1;}),hb=S.run800Hist,rb=rn.reduce(function(b,x){return!b||x.sec<b.sec?x:b;},null),gap=function(t){if(!hb)return'';var d=r1(t-hb);return d<=0?'<span style="color:var(--ok)">已追平/超越历史最佳 '+d+'s</span>':'距历史最佳 +'+d+'s（'+r1(d/hb*100)+'%）';};
 $('#rnBox').innerHTML=(hb?'<div class="mut">历史最佳 <b>'+fmtT(hb)+'</b>'+(S.profile.run800HistLabel?'（'+esc(S.profile.run800HistLabel)+'）':'')+'</div>':'<div class="mut">未设置历史最佳（可选）</div>')+(rb?'<div class="big">当前最佳 '+fmtT(rb.sec)+'</div><div class="mut">'+esc(rb.date)+' · '+gap(rb.sec)+(rn.length>1?' · 最近一次 '+fmtT(rn[rn.length-1].sec)+'，'+gap(rn[rn.length-1].sec):'')+'</div>':'<div class="mut">暂无当前成绩。</div>');
 $('#rnList').innerHTML=rn.length?'<ul class="list">'+rn.slice().reverse().map(function(x){return'<li><div>'+esc(x.date)+' · <b>'+fmtT(x.sec)+'</b>'+(rb&&x.id===rb.id?' '+IC('medal'):'')+' <span class="tag">'+esc(x.type)+'</span><div class="mut">'+gap(x.sec)+(x.note?' · '+esc(x.note):'')+'</div></div><button class="del" data-delrn="'+x.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'';
 var pe=pbEntries(),best=pe.reduce(function(b,x){return!b||x.sec<b.sec?x:b;},null);
 $('#pbBox').innerHTML=best?'<div class="big" style="color:var(--ok)">PB '+fmtT(best.sec)+'</div><div class="mut">'+esc(best.date)+' · '+esc(best.type)+(pe.length>1?' · 最近一次 '+fmtT(pe[pe.length-1].sec)+'（距PB +'+r1(pe[pe.length-1].sec-best.sec)+'s）':'')+'</div>':'<div class="mut">暂无成绩，录入第一次计时作为基线。</div>';
 $('#pbList').innerHTML=pe.length?'<ul class="list">'+pe.slice().reverse().map(function(x){return'<li><div>'+esc(x.date)+' · <b>'+fmtT(x.sec)+'</b>'+(best&&x.id===best.id?' '+IC('medal'):'')+' <span class="tag">'+esc(x.type)+'</span>'+(x.note?'<div class="mut">'+esc(x.note)+'</div>':'')+'</div>'+(x.src==='pb'?'<button class="del" data-delpb="'+x.id+'">'+IC('x')+'</button>':'')+'</li>';}).join('')+'</ul>':'';
 var names={};S.workouts.forEach(function(w){names[w.exercise]=1;});EX_PRESETS.forEach(function(e){names[e]=1;});
 $('#exList').innerHTML=Object.keys(names).map(function(n){return'<option value="'+esc(n)+'">';}).join('');
 $('#exTpl').innerHTML='<span class="mut">示例动作：</span>'+EX_PRESETS.slice(0,8).map(function(e){return'<button class="chip" data-ex="'+esc(e)+'">'+esc(e)+'</button>';}).join('');
 var ws=S.workouts.filter(function(w){return w.date===sel;});
 $('#wVolTxt').textContent=Math.round(dayVol(sel))+' kg';$('#wTodayCard').style.display=ws.length?'':'none';
 $('#wList').innerHTML=ws.length?'<ul class="list">'+ws.map(function(w){return'<li><div><b>'+esc(w.exercise)+'</b> '+w.sets+'×'+w.reps+' @ '+w.weight+'kg'+(w.rpe?' <span class="tag">RPE '+w.rpe+(rirOf(w)!=null?' · RIR '+rirOf(w):'')+'</span>':'')+(w.wrist?' <span class="tag" style="color:var(--bad)">'+IC('bandage')+esc(flagLabel())+'</span>':'')+'<div class="mut">训练量 '+Math.round(vol(w))+' kg'+(w.note?' · '+esc(w.note):'')+'</div></div><button class="del" data-delw="'+w.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'<div class="mut">暂无记录</div>';
 var cs=S.cardio.filter(function(c){return c.date===sel;});
 $('#cList').innerHTML=cs.length?'<ul class="list">'+cs.map(function(c){return'<li><div>爬楼 '+c.min+' 分'+(c.floors?' · '+c.floors+' 层':'')+(c.hr?' · 心率 '+c.hr:'')+'</div><button class="del" data-delc="'+c.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'';
 if(cur==='tstats')chTrain();chPerf();rPerfTests();
 $('#swimNote').textContent=S.profile.swimNote||'';document.querySelectorAll('.flagLbl').forEach(function(e){e.textContent=flagLabel();});
 lastHint();restrHint();
}
function lastHint(){var ex=$('#wEx').value.trim();if(!ex){$('#wLast').textContent='';return;}var p=S.workouts.filter(function(w){return w.exercise===ex&&w.date<=sel;}).sort(function(a,b){return a.date<b.date?1:-1;})[0];$('#wLast').textContent=p?'上次 '+p.date.slice(5)+'：'+p.sets+'×'+p.reps+'@'+p.weight+'kg'+(p.rpe?' RPE'+p.rpe:''):'';}
$('#wEx').addEventListener('input',function(){lastHint();restrHint();if(lastSet($('#wEx').value.trim()))autoFill();else $('#wSug').innerHTML='';});
(function(){var h='<option value="">—</option>';for(var r=5;r<=10;r+=0.5)h+='<option>'+r+'</option>';$('#wRpe').innerHTML=h;})();
$('#rSave').onclick=function(){S.recoveryStart=$('#rStart').value;save();toast('已保存');render();};
$('#wRpe').addEventListener('change',function(){var v=num(this.value);$('#wRir').value=v==null?'':String(Math.max(0,Math.min(5,Math.round(10-v))));});
$('#wRir').addEventListener('change',function(){var v=num(this.value);$('#wRpe').value=v==null?'':String(10-v);});
$('#wAdd').onclick=function(){var ex=$('#wEx').value.trim(),s=num($('#wS').value),r=num($('#wR').value),w=num($('#wW').value),rpe=num($('#wRpe').value),rir=num($('#wRir').value);if(rpe==null&&rir!=null)rpe=10-rir;if(rir==null&&rpe!=null)rir=Math.max(0,10-rpe);
 if(!ex||!s||!r){toast('请填写动作、组数、次数');return;}
 S.workouts.push({id:uid(),date:sel,exercise:ex,sets:s,reps:r,weight:w||0,rpe:rpe,rir:rir,note:$('#wNote').value.trim(),wrist:$('#wWrist').checked});save();$('#wRir').value='';$('#wWrist').checked=false;
 var wk=recWeek(sel);if(wk&&wk<=2&&rpe&&rpe>7)toast('恢复期前2周建议 RPE≤7（留3-4次余力）');else toast('已添加');
 $('#wNote').value='';$('#wSug').innerHTML='';render();};
function swPace(){var d=num($('#swD').value),t=parseT($('#swT').value);$('#swPace').textContent=d&&t?'配速 '+fmtT(t/d*100)+'/100m':'';}
$('#swD').addEventListener('input',swPace);$('#swT').addEventListener('input',swPace);
$('#swAdd').onclick=function(){var d=num($('#swD').value),t=parseT($('#swT').value);if(!d){toast('请填写距离');return;}if($('#swT').value&&!t){toast('用时格式如 25:00 或 1:35.20');return;}
 S.swims.push({id:uid(),date:sel,stroke:$('#swSt').value,dist:d,sec:t,swolf:num($('#swSw').value),note:$('#swN').value.trim()});save();['#swD','#swT','#swSw','#swN'].forEach(function(s){$(s).value='';});swPace();toast(d===100&&$('#swSt').value==='蛙泳'&&t?'已添加，并计入100m蛙泳成绩':'已添加');render();};
$('#pbAdd').onclick=function(){var t=parseT($('#pbT').value),d=$('#pbD').value;if(!t||!d){toast('请填写成绩（如 1:30.50）与日期');return;}
 var prev=pbEntries().reduce(function(b,x){return b==null||x.sec<b?x.sec:b;},null);
 S.pb100br.push({id:uid(),date:d,sec:t,type:$('#pbTy').value,note:$('#pbN').value.trim()});save();$('#pbT').value='';$('#pbN').value='';toast(prev==null||t<prev?'新的个人最好成绩！':'已记录');render();};
$('#rnHistSave').onclick=function(){var v=$('#rnHist').value.trim(),t=parseT(v);if(v&&!t){toast('格式如 2:30');return;}S.run800Hist=t;save();toast('已保存');render();};
$('#rnAdd').onclick=function(){var t=parseT($('#rnT').value),d=$('#rnD').value;if(!t||!d){toast('请填写成绩（如 2:45.3）与日期');return;}
 S.run800.push({id:uid(),date:d,sec:t,type:$('#rnTy').value,note:$('#rnN').value.trim()});save();$('#rnT').value='';$('#rnN').value='';toast(S.run800Hist&&t<=S.run800Hist?'追平/超越历史最佳！':'已记录，距历史最佳 +'+r1(t-(S.run800Hist||t))+'s');render();};
$('#cAdd').onclick=function(){var m=num($('#cMin').value);if(!m){toast('请填写时长');return;}S.cardio.push({id:uid(),date:sel,min:m,floors:num($('#cFl').value),hr:num($('#cHr').value)});save();['#cMin','#cFl','#cHr'].forEach(function(s){$(s).value='';});toast('已添加');render();};

function rSupp(){var dn=suppDone(sel);
 $('#sList').innerHTML=S.supps.length?S.supps.map(function(s){var v=dn[s.id];return'<li><label class="chk" style="font-size:15px;color:var(--fg)"><input type="checkbox" data-sup="'+s.id+'"'+(v?' checked':'')+'><span><b>'+esc(s.name)+'</b> '+(s.dose?'<span class="tag">'+esc(s.dose)+'</span>':'<span class="tag">剂量未填</span>')+'<div class="mut">'+(s.time?'计划：'+esc(s.time):'')+(v&&v.at?' · 已服 '+esc(v.at):'')+'</div></span></label><button class="ghost sm" data-edsup="'+s.id+'">编辑</button><button class="del" data-delsup="'+s.id+'">'+IC('x')+'</button></li>';}).join(''):'<li class="mut">清单为空</li>';
 var n=S.supps.filter(function(x){return dn[x.id];}).length;$('#sRate').textContent=n+'/'+S.supps.length;
 var h='';for(var i=6;i>=0;i--){var d=addDays(sel,-i),l=suppDone(d),c=S.supps.filter(function(x){return l[x.id];}).length,pc=S.supps.length?c/S.supps.length*100:0;h+='<div class="hrow" style="gap:8px;margin-bottom:4px"><span class="mut" style="width:44px">'+d.slice(5)+'</span><div class="bar" style="flex:1"><i style="width:'+pc+'%;background:var(--ok)"></i></div><span class="mut" style="width:36px;text-align:right">'+c+'/'+S.supps.length+'</span></div>';}
 $('#s7').innerHTML=h;
}
var editSup=null;
$('#sAdd').onclick=function(){var n=$('#sName').value.trim();if(!n){toast('请填写名称');return;}
 if(editSup){var s=S.supps.find(function(x){return x.id===editSup;});if(s){s.name=n;s.dose=$('#sDose').value.trim();s.time=$('#sTime').value.trim();}editSup=null;$('#sAdd').textContent='添加';}
 else S.supps.push({id:uid(),name:n,dose:$('#sDose').value.trim(),time:$('#sTime').value.trim()});
 save();['#sName','#sDose','#sTime'].forEach(function(s){$(s).value='';});toast('已保存');render();};

var slQ=null;
function rSleep(){var s=sleepOf(sel),g=S.goals,ls=s||lastSleepBefore(sel);$('#slBed').value=ls?ls.bed:'';$('#slWake').value=ls?ls.wake:'';$('#slNote').value=s?s.note||'':'';slQ=ls?ls.q:null;$('#slReuse').style.display=!s&&ls?'':'none';qSeg();slDurTxt();
 chSleep();
 var l7=[];for(var j=0;j<7;j++){var y=sleepOf(addDays(sel,-j));if(y)l7.push(y);}
 $('#slAvg').textContent=l7.length?'近7天均 '+r1(avg(l7.map(function(x){return x.dur;})))+' h · 质量 '+r1(avg(l7.map(function(x){return x.q;})))+'/5 · 达标 '+l7.filter(function(x){return x.dur>=g.sleepH;}).length+'/'+l7.length:'';
 var list=S.sleep.slice().sort(function(a,b){return a.date<b.date?1:-1;}).slice(0,14);
 $('#slList').innerHTML=list.length?'<ul class="list">'+list.map(function(x){return'<li><div>'+x.date.slice(5)+' · <b>'+r1(x.dur)+'h</b> <span class="mut">'+esc(x.bed)+'→'+esc(x.wake)+' · 质量'+(x.q||'-')+(x.note?' · '+esc(x.note):'')+'</span></div><button class="del" data-delsl="'+x.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'';
}
function qSeg(){var h='';for(var i=1;i<=5;i++)h+='<button data-q="'+i+'" class="'+(slQ===i?'on':'')+'">'+i+'</button>';$('#slQ').innerHTML=h;}
function slDurTxt(){var d=sleepDur($('#slBed').value,$('#slWake').value);$('#slDur').textContent=d?'时长 '+r1(d)+' h'+(d<S.goals.sleepH?'（低于目标）':'（达标）'):'';}
$('#slBed').addEventListener('input',slDurTxt);$('#slWake').addEventListener('input',slDurTxt);
$('#slQ').addEventListener('click',function(e){var b=e.target.closest('[data-q]');if(b){slQ=+b.getAttribute('data-q');qSeg();}});
$('#slSave').onclick=function(){var b=$('#slBed').value,w=$('#slWake').value,d=sleepDur(b,w);if(!d){toast('请填写入睡与起床时间');return;}
 S.sleep=S.sleep.filter(function(x){return x.date!==sel;});S.sleep.push({id:uid(),date:sel,bed:b,wake:w,dur:d,q:slQ,note:$('#slNote').value.trim()});save();toast('已保存');render();};

var bMetric='weight',BM={weight:['体重','kg'],bf:['体脂','%'],waist:['腰围','cm'],rhr:['静息心率','bpm']};
function rBody(){var b=S.body.find(function(x){return x.date===sel;});$('#bW').value=b&&b.weight!=null?b.weight:'';$('#bBf').value=b&&b.bf!=null?b.bf:'';$('#bWa').value=b&&b.waist!=null?b.waist:'';$('#bHr').value=b&&b.rhr!=null?b.rhr:'';
 var pts=S.body.filter(function(x){return x[bMetric]!=null;}).map(function(x){return{d:x.date,y:x[bMetric]};}).sort(function(a,b){return a.d<b.d?-1:1;});
 var t='';if(pts.length){var l=pts[pts.length-1];t='最新 '+l.y+' '+BM[bMetric][1];if(pts.length>1)t+=' · 变化 '+(l.y-pts[0].y>=0?'+':'')+r1(l.y-pts[0].y);if(bMetric==='weight')t+=bmiTxt(l.y);
  var lw=S.body.filter(function(x){return x.weight!=null&&x.bf!=null;}).sort(function(a,b){return a.date<b.date?1:-1;})[0];if(lw)t+=' · 估算瘦体重 '+r1(lw.weight*(1-lw.bf/100))+' kg';}
 $('#bTxt').textContent=t;chBody();
 var list=S.body.slice().sort(function(a,b){return a.date<b.date?1:-1;}).slice(0,30);
 $('#bList').innerHTML=list.length?'<table><tr><th>日期</th><th>体重</th><th>体脂</th><th>腰围</th><th>心率</th><th></th></tr>'+list.map(function(x){var f=function(v){return v==null?'-':v;};return'<tr><td>'+x.date.slice(5)+'</td><td>'+f(x.weight)+'</td><td>'+f(x.bf)+'</td><td>'+f(x.waist)+'</td><td>'+f(x.rhr)+'</td><td><button class="del" data-delb="'+x.id+'">'+IC('x')+'</button></td></tr>';}).join('')+'</table>':'<div class="mut">暂无记录</div>';
}
$('#bSave').onclick=function(){var o={weight:num($('#bW').value),bf:num($('#bBf').value),waist:num($('#bWa').value),rhr:num($('#bHr').value)};if(o.weight==null&&o.bf==null&&o.waist==null&&o.rhr==null){toast('请至少填写一项');return;}
 S.body=S.body.filter(function(x){return x.date!==sel;});o.id=uid();o.date=sel;S.body.push(o);save();toast('已保存');render();};

/* 激素/恢复 */
var RV_SCALES=[['stress','压力','1低-5高'],['energy','精力','1差-5好'],['soreness','酸痛','1无-5重'],['mood','情绪','1差-5好'],['appetite','食欲','1差-5好']];
var rvTmp={},rvMetric='energy',lbMetric=null;
var RVM={rhr:['静息心率','bpm'],hrv:['HRV','ms'],stress:['压力',''],energy:['精力',''],soreness:['酸痛',''],mood:['情绪',''],appetite:['食欲','']};
function rHormone(){$('#otAlert').innerHTML=otHtml(sel)||'<div class="alert ok">'+IC('ok')+' 近期未触发恢复预警（数据越完整越准确：建议每天记录晨起心率、HRV、睡眠与主观指标）。</div>';
 var r=recovOf(sel)||{};$('#rvHr').value=r.rhr!=null?r.rhr:'';$('#rvHrv').value=r.hrv!=null?r.hrv:'';rvTmp={};RV_SCALES.forEach(function(s){rvTmp[s[0]]=r[s[0]]||null;});rvScales();
 $('#rvSeg').innerHTML=Object.keys(RVM).filter(function(k){return k!=='rhr'&&k!=='hrv';}).map(function(k){return'<button data-rvm="'+k+'" class="'+(k===rvMetric?'on':'')+'">'+RVM[k][0]+'</button>';}).join('');
 chRecovery();
 if(!$('#lbDate').value)$('#lbDate').value=sel;
 $('#labNames').innerHTML=LAB_PRESETS.map(function(p){return'<option value="'+esc(p[0])+'">';}).join('');
 $('#labTpl').innerHTML='<span class="mut">常用指标（单位为常见单位，请按化验单修改）：</span>'+LAB_PRESETS.map(function(p,i){return'<button class="chip" data-lab="'+i+'">'+esc(p[0])+'</button>';}).join('');
 var markers={};S.labs.forEach(function(l){markers[l.name]=1;});var mk=Object.keys(markers);if(!lbMetric||!markers[lbMetric])lbMetric=mk[0]||null;
 $('#lbSeg').innerHTML=mk.map(function(k){return'<button data-lbm="'+esc(k)+'" class="'+(k===lbMetric?'on':'')+'">'+esc(k)+'</button>';}).join('');
 var arr=S.labs.filter(function(l){return l.name===lbMetric;}).sort(function(a,b){return a.date<b.date?-1:1;});var last=arr[arr.length-1];
 $('#lbTxt').textContent=last?'单位 '+(last.unit||'-')+(last.lo!=null||last.hi!=null?' · 参考 '+(last.lo!=null?last.lo:'')+'~'+(last.hi!=null?last.hi:'')+'（绿色带）':' · 未填参考范围'):'暂无化验记录';
 CH.line($('#chLab'),{h:170,series:[{name:lbMetric||'',color:'var(--p)',pts:arr.map(function(l){return{d:l.date,y:l.value};}),unit:last&&last.unit?' '+last.unit:''}],band:last?{lo:last.lo,hi:last.hi}:null,emptyMsg:'暂无化验记录',emptyHint:'录入化验单数值后显示趋势与参考范围'});
 var all=S.labs.slice().sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:(a.name<b.name?-1:1);});
 $('#lbList').innerHTML=all.length?'<table><tr><th>日期</th><th>指标</th><th>数值</th><th>参考</th><th></th></tr>'+all.map(function(l){var cls='',fl='';if(l.hi!=null&&l.value>l.hi){cls='hi';fl=' ↑';}else if(l.lo!=null&&l.value<l.lo){cls='lo';fl=' ↓';}else if(l.lo!=null||l.hi!=null)cls='nm';
  return'<tr><td>'+esc(l.date)+'</td><td>'+esc(l.name)+(l.note?'<div class="mut">'+esc(l.note)+'</div>':'')+'</td><td class="'+cls+'">'+l.value+fl+' <span class="mut">'+esc(l.unit||'')+'</span></td><td class="mut">'+(l.lo!=null?l.lo:'')+'~'+(l.hi!=null?l.hi:'')+'</td><td><button class="del" data-dellab="'+l.id+'">'+IC('x')+'</button></td></tr>';}).join('')+'</table><div class="mut">↑/↓ 仅表示超出你填写的参考范围，解读请咨询医生。</div>':'';
}
function rvScales(){$('#rvScales').innerHTML=RV_SCALES.map(function(s){var h='<label style="margin-top:6px">'+s[1]+'（'+s[2]+'）</label><div class="seg">';for(var i=1;i<=5;i++)h+='<button data-rv="'+s[0]+'" data-v="'+i+'" class="'+(rvTmp[s[0]]===i?'on':'')+'">'+i+'</button>';return h+'</div>';}).join('');}
$('#rvScales').addEventListener('click',function(e){var b=e.target.closest('[data-rv]');if(b){var k=b.getAttribute('data-rv'),v=+b.getAttribute('data-v');rvTmp[k]=rvTmp[k]===v?null:v;rvScales();}});
$('#rvSeg').addEventListener('click',function(e){var b=e.target.closest('[data-rvm]');if(b){rvMetric=b.getAttribute('data-rvm');render();}});
$('#lbSeg').addEventListener('click',function(e){var b=e.target.closest('[data-lbm]');if(b){lbMetric=b.getAttribute('data-lbm');render();}});
$('#rvSave').onclick=function(){var o={id:uid(),date:sel,rhr:num($('#rvHr').value),hrv:num($('#rvHrv').value)};RV_SCALES.forEach(function(s){o[s[0]]=rvTmp[s[0]]||null;});
 S.recov=S.recov.filter(function(x){return x.date!==sel;});S.recov.push(o);save();toast('已保存');render();};
$('#lbAdd').onclick=function(){var n=$('#lbName').value.trim(),v=num($('#lbVal').value),d=$('#lbDate').value;if(!n||v==null||!d){toast('请填写日期、指标和数值');return;}
 S.labs.push({id:uid(),date:d,name:n,value:v,unit:$('#lbUnit').value.trim(),lo:num($('#lbLo').value),hi:num($('#lbHi').value),note:$('#lbNote').value.trim()});save();lbMetric=n;$('#lbVal').value='';$('#lbNote').value='';toast('已添加');render();};
$('#lbName').addEventListener('change',function(){var n=this.value.trim(),prev=S.labs.filter(function(l){return l.name===n;}).sort(function(a,b){return a.date<b.date?1:-1;})[0];
 if(prev){$('#lbUnit').value=prev.unit||'';$('#lbLo').value=prev.lo!=null?prev.lo:'';$('#lbHi').value=prev.hi!=null?prev.hi:'';}else{var p=LAB_PRESETS.find(function(x){return x[0]===n;});if(p)$('#lbUnit').value=p[1];}});

/* 伤病与限制 */
function wpOf(d){return S.wristLog.find(function(x){return x.date===d;});}
function restrMatch(ex){ex=(ex||'').replace(/\s/g,'');if(!ex)return null;return S.restricted.find(function(r){var k=r.name.replace(/[（(].*$/,'').replace(/\s/g,'');return k&&(ex.indexOf(k)>=0||k.indexOf(ex)>=0&&ex.length>=2);});}
function restrHint(){var m=restrMatch($('#wEx').value);$('#wRestr').innerHTML=m?'<div class="alert warn" style="margin:8px 0 0">'+IC('bandage')+' 「'+esc(m.name)+'」在受限动作清单中。替代：'+esc(m.alt||'—')+'</div>':'';}
function wristAlert(d){var t=wpOf(d),l=[];for(var i=0;i<3;i++){var x=wpOf(addDays(d,-i));if(x)l.push(x.pain);}var a=avg(l),b=[];for(var j=3;j<14;j++){var y=wpOf(addDays(d,-j));if(y)b.push(y.pain);}var ba=avg(b);
 if(t&&t.pain>=5)return['bad','伤处疼痛 '+t.pain+'/10：建议停止所有诱发动作，仅做无痛活动；持续或加重请就医。'];
 if(a!=null&&ba!=null&&a-ba>=2)return['warn','近3天伤处疼痛均值较前期上升 '+r1(a-ba)+' 分，建议下调上肢负荷并与私教/康复师沟通。'];
 if(t&&t.pain>=3)return['warn','伤处疼痛 '+t.pain+'/10：今日避开受限动作，优先替代方案。'];
 return null;}
var wpTmp={pain:null,trig:[]};
function rInjury(){var wa=wristAlert(sel);$('#injAlert').innerHTML=wa?'<div class="alert '+wa[0]+'">'+IC('bandage')+' '+esc(wa[1])+'</div>':'';
 document.querySelectorAll('.flagLbl').forEach(function(e){e.textContent=flagLabel();});
 $('#injList').innerHTML=S.injuries.length?'':'<div class="mut">暂无伤病记录（可在下方添加，或在「设置」中加载示例配置）。</div>';if(S.injuries.length)$('#injList').innerHTML='<ul class="list">'+S.injuries.map(function(x){return'<li><div><b>'+esc(x.name)+'</b> <span class="tag">'+esc(x.status||'')+'</span><div class="mut">'+esc(x.desc||'')+'</div></div><div class="row" style="gap:2px"><button class="ghost sm" data-injst="'+x.id+'">'+(x.status==='已恢复'?'标记康复中':'标记已恢复')+'</button><button class="del" data-delinj="'+x.id+'">'+IC('x')+'</button></div></li>';}).join('')+'</ul>';
 var w=wpOf(sel);wpTmp={pain:w?w.pain:null,trig:w?(w.trig||[]).slice():[]};$('#wpNote').value=w?w.note||'':'';$('#wpDate').textContent=sel===today()?'':sel;wpSegs();
 chPain();
 var dn=S.rehabLog[sel]||{};$('#rhList').innerHTML=S.rehab.map(function(r){return'<li><label class="chk" style="font-size:15px;color:var(--fg)"><input type="checkbox" data-rh="'+r.id+'"'+(dn[r.id]?' checked':'')+'><span>'+esc(r.name)+'<div class="mut">'+esc(r.dose||'剂量遵康复师安排')+'</div></span></label><button class="del" data-delrh="'+r.id+'">'+IC('x')+'</button></li>';}).join('')||'<li class="mut">清单为空</li>';
 $('#rhRate').textContent=S.rehab.filter(function(r){return dn[r.id];}).length+'/'+S.rehab.length;
 var h7='<div class="mut">近7天</div><div class="row" style="gap:4px">';for(var k=6;k>=0;k--){var dd=addDays(sel,-k),lg=S.rehabLog[dd]||{},c=S.rehab.filter(function(r){return lg[r.id];}).length,full=S.rehab.length&&c===S.rehab.length;h7+='<span class="tag" style="'+(full?'background:var(--ok);color:#fff':c?'border-color:var(--ok)':'')+'">'+dd.slice(8)+'日 '+c+'/'+S.rehab.length+'</span>';}
 $('#rh7').innerHTML=h7+'</div>';
 $('#rsList').innerHTML=S.restricted.map(function(r){return'<li><div><b>'+esc(r.name)+'</b><div class="mut">→ '+esc(r.alt||'')+'</div></div><button class="del" data-delrs="'+r.id+'">'+IC('x')+'</button></li>';}).join('');
 var wf=S.workouts.filter(function(x){return x.wrist;}).sort(function(a,b){return a.date<b.date?1:-1;}).slice(0,15);
 $('#wfList').innerHTML=wf.length?'<ul class="list">'+wf.map(function(x){var p=wpOf(x.date);return'<li><div>'+x.date.slice(5)+' · <b>'+esc(x.exercise)+'</b> '+x.sets+'×'+x.reps+'@'+x.weight+'kg<div class="mut">当日疼痛 '+(p?p.pain+'/10':'未记录')+(x.note?' · '+esc(x.note):'')+'</div></div></li>';}).join('')+'</ul>':'<div class="mut">暂无</div>';
}
function wpSegs(){var h='';for(var i=0;i<=10;i++)h+='<button data-wp="'+i+'" class="'+(wpTmp.pain===i?'on':'')+'">'+i+'</button>';$('#wpSeg').innerHTML=h;
 $('#wpTrig').innerHTML=S.restricted.map(function(r){return r.name;}).concat(['日常活动','其他']).map(function(n){return'<button data-wt="'+esc(n)+'" class="'+(wpTmp.trig.indexOf(n)>=0?'on':'')+'">'+esc(n)+'</button>';}).join('');
 var p=wpTmp.pain;$('#wpHint').textContent=p==null?'':p<=2?'轻微：可在无痛范围训练':p<=4?'中度：避开诱发动作，用替代方案':'较重：停止诱发动作，持续请就医';}
$('#wpSeg').addEventListener('click',function(e){var b=e.target.closest('[data-wp]');if(b){wpTmp.pain=+b.getAttribute('data-wp');wpSegs();}});
$('#wpTrig').addEventListener('click',function(e){var b=e.target.closest('[data-wt]');if(b){var n=b.getAttribute('data-wt'),i=wpTmp.trig.indexOf(n);if(i>=0)wpTmp.trig.splice(i,1);else wpTmp.trig.push(n);wpSegs();}});
$('#wpSave').onclick=function(){if(wpTmp.pain==null){toast('请选择疼痛评分');return;}S.wristLog=S.wristLog.filter(function(x){return x.date!==sel;});S.wristLog.push({date:sel,pain:wpTmp.pain,trig:wpTmp.trig.slice(),note:$('#wpNote').value.trim()});save();toast('已保存');render();};
$('#rhAdd').onclick=function(){var n=$('#rhName').value.trim();if(!n){toast('请填写名称');return;}S.rehab.push({id:uid(),name:n,dose:$('#rhDose').value.trim()});save();$('#rhName').value='';$('#rhDose').value='';render();};
$('#rsAdd').onclick=function(){var n=$('#rsName').value.trim();if(!n){toast('请填写动作');return;}S.restricted.push({id:uid(),name:n,alt:$('#rsAlt').value.trim()});save();$('#rsName').value='';$('#rsAlt').value='';render();};
$('#injAdd').onclick=function(){var n=$('#injName').value.trim();if(!n){toast('请填写名称');return;}S.injuries.push({id:uid(),name:n,desc:$('#injDesc').value.trim(),status:'康复中'});save();$('#injName').value='';$('#injDesc').value='';render();};


/* ---------- 可视化（图表由 src/charts.js 绘制） ---------- */
/** 时间范围：每组图表独立，0=全部 */
var RANGE={};
function rng(k){return RANGE[k]!=null?RANGE[k]:30;}
/** 范围起始日期；全部时返回给定数据中的最早日期 */
function since(k,dates){var n=rng(k);if(n)return addDays(sel,-(n-1));dates=(dates||[]).filter(Boolean).sort();return dates[0]||addDays(sel,-29);}
function daysBetween(a,b){var o=[],d=a;while(d<=b&&o.length<800){o.push(d);d=addDays(d,1);}return o;}
/** 移动平均：按日期向前 n 天窗口 */
function movAvg(pts,n){return pts.map(function(p){var w=pts.filter(function(q){var dd=diffDays(q.d,p.d);return dd>=0&&dd<n;});return{d:p.d,y:r1(avg(w.map(function(q){return q.y;})))};});}
function sortPts(a){return a.filter(function(p){return p.y!=null;}).sort(function(x,y){return x.d<y.d?-1:1;});}

function chTodayWeight(){var pts=sortPts(S.body.map(function(b){return{d:b.date,y:b.weight};})).filter(function(p){return p.d<=sel&&p.d>=addDays(sel,-29);});
 CH.line($('#chOvWt'),{h:100,series:[{name:'体重',color:'var(--acc)',pts:pts,unit:' kg',area:true},{name:'7日均线',color:'var(--warn)',pts:movAvg(pts,7),dash:true,unit:' kg'}],refs:[{y:S.goals.weight,name:'目标',color:'var(--ok)'}],h:80,emptyMsg:'还没有体重记录',emptyHint:'在「今天」或 身体 中记录'});}

function chNutrition(){var g=S.goals,from=since('nut',S.meals.map(function(m){return m.date;})),days=daysBetween(from,sel),cats=[],withMeals=[];
 days.forEach(function(d){var t=dayTot(d),has=dayMeals(d).length>0;if(has)withMeals.push({d:d,t:t});
  cats.push({l:md(d),d:d,v:Math.round(t.k),has:has,color:!has?'var(--bd)':t.k>g.kcal*1.1?'var(--warn)':t.k<g.kcal*0.8?'var(--c)':'var(--acc)',tip:d+'\n热量 '+Math.round(t.k)+' / '+g.kcal+' kcal'+(has?'\n'+(t.k>g.kcal?'超出 ':'差 ')+Math.abs(Math.round(t.k-g.kcal)):'\n无记录')});});
 CH.bars($('#chKcal'),{h:170,cats:cats,goal:g.kcal,goalName:'目标',unit:' kcal',emptyMsg:'暂无饮食记录',emptyHint:'记录餐次后显示每日热量对比',legend:[{name:'目标±10%内',color:'var(--acc)'},{name:'超出',color:'var(--warn)'},{name:'明显不足',color:'var(--c)'}]});
 var n=withMeals.length,aP=n?avg(withMeals.map(function(x){return x.t.p;})):0,aC=n?avg(withMeals.map(function(x){return x.t.c;})):0,aF=n?avg(withMeals.map(function(x){return x.t.f;})):0;
 CH.donut($('#chMacro'),{parts:[{name:'蛋白质',v:aP*4,color:'var(--p)',tip:'蛋白质 日均 '+r1(aP)+'g · '+Math.round(aP*4)+' kcal'},{name:'碳水',v:aC*4,color:'var(--c)',tip:'碳水 日均 '+r1(aC)+'g · '+Math.round(aC*4)+' kcal'},{name:'脂肪',v:aF*9,color:'var(--f)',tip:'脂肪 日均 '+r1(aF)+'g · '+Math.round(aF*9)+' kcal'}],center:Math.round(aP*4+aC*4+aF*9)+'',sub:'kcal/日',emptyMsg:'暂无数据'});
 var hit=withMeals.filter(function(x){return x.t.p>=g.p*0.95;}).length,rate=n?Math.round(hit/n*100):null;
 $('#protRate').innerHTML=n?'<div class="mut">蛋白质达标率（≥目标95%）</div><div class="kpi"><span class="big" style="color:'+(rate>=80?'var(--ok)':rate>=50?'var(--warn)':'var(--bad)')+'">'+rate+'%</span><span class="mut">'+hit+'/'+n+' 天</span></div><div class="bar" style="margin:6px 0"><i style="width:'+rate+'%;background:var(--p)"></i></div><div class="mut">日均蛋白 '+r1(aP)+' g / 目标 '+g.p+' g'+(S.body.length?' · 约 '+r1(aP/(sortPts(S.body.map(function(b){return{d:b.date,y:b.weight};})).pop()||{y:aP}).y)+' g/kg':'')+'</div>':'';
 CH.bars($('#chMacroBar'),{h:150,cats:days.map(function(d){var t=dayTot(d);return{l:md(d),d:d,stack:[{name:'蛋白质',v:Math.round(t.p*4),color:'var(--p)'},{name:'碳水',v:Math.round(t.c*4),color:'var(--c)'},{name:'脂肪',v:Math.round(t.f*9),color:'var(--f)'}]};}),unit:' kcal',emptyMsg:'暂无饮食记录',legend:[{name:'蛋白质',color:'var(--p)'},{name:'碳水',color:'var(--c)'},{name:'脂肪',color:'var(--f)'}]});}

function epley(w){if(!w.weight||!w.reps)return null;return w.reps===1?w.weight:w.weight*(1+w.reps/30);}
var ormSel=null;
function chTrain(){var from=since('train',S.workouts.map(function(w){return w.date;}).concat(S.cardio.map(function(c){return c.date;}))),inR=function(x){return x.date>=from&&x.date<=sel;},ws=S.workouts.filter(inR);
 // 训练量：7天按日，其余按周
 if(rng('train')===7){$('#volTitle').textContent='每日训练量 (kg)';CH.bars($('#chVol'),{h:160,cats:daysBetween(from,sel).map(function(d){var v=dayVol(d);return{l:md(d),d:d,v:Math.round(v),tip:d+'\n训练量 '+Math.round(v)+' kg'};}),unit:' kg',emptyMsg:'这段时间没有力量训练',emptyHint:'记录组数×次数×重量后显示'});}
 else{$('#volTitle').textContent='每周训练量 (kg)';var wk=[],w0=weekStart(from);while(w0<=sel&&wk.length<110){(function(ws0){var we=addDays(ws0,6),list=S.workouts.filter(function(w){return w.date>=ws0&&w.date<=we;}),dd={};list.forEach(function(w){dd[w.date]=1;});var v=list.reduce(function(s,w){return s+vol(w);},0);wk.push({l:md(ws0),d:ws0,v:Math.round(v),tip:ws0+' 周\n训练量 '+Math.round(v)+' kg\n训练 '+Object.keys(dd).length+' 天 · '+list.reduce(function(s,w){return s+(w.sets||0);},0)+' 组'});})(w0);w0=addDays(w0,7);}
  CH.bars($('#chVol'),{h:160,cats:wk,unit:' kg',emptyMsg:'这段时间没有力量训练',emptyHint:'记录组数×次数×重量后显示'});}
 // 肌群
 var mg={};ws.forEach(function(w){var mm=musclesOf(w.exercise),m=mm.p.length?MUS[mm.p[0]][0]:'其他';mg[m]=mg[m]||{s:0,v:0};mg[m].s+=w.sets||0;mg[m].v+=vol(w);});
 CH.hbars($('#chMuscle'),{rows:Object.keys(mg).sort(function(a,b){return mg[b].s-mg[a].s;}).map(function(k){return{l:k,v:mg[k].s,tip:k+'：'+mg[k].s+' 组 · '+Math.round(mg[k].v)+' kg'};}),unit:' 组',emptyMsg:'暂无肌群数据',emptyHint:'按动作名称自动归类到主要肌群'});
 // 1RM
 var cnt={};S.workouts.forEach(function(w){if(w.weight>0&&w.reps)cnt[w.exercise]=(cnt[w.exercise]||0)+1;});var exs=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
 if(!ormSel||exs.indexOf(ormSel)<0)ormSel=exs[0]||null;
 $('#ormEx').innerHTML=exs.length?exs.map(function(e){return'<option'+(e===ormSel?' selected':'')+'>'+esc(e)+'</option>';}).join(''):'<option>无</option>';
 var by={};S.workouts.forEach(function(w){if(w.exercise!==ormSel)return;var e=epley(w);if(e&&(!by[w.date]||e>by[w.date]))by[w.date]=e;});
 var op=Object.keys(by).map(function(d){return{d:d,y:r1(by[d])};}).filter(function(p){return p.d>=from&&p.d<=sel;}),best=Object.keys(by).reduce(function(m,d){return Math.max(m,by[d]);},0);
 CH.line($('#chOrm'),{h:160,from:from,to:sel,series:[{name:'估算1RM',color:'var(--k)',pts:op,unit:' kg',area:true}],refs:[{y:best?r1(best):null,name:'最佳',color:'var(--ok)'}],emptyMsg:'暂无可估算的动作',emptyHint:'记录带重量的组后，按 重量×(1+次数/30) 估算'});
 // 热力日历
 var n=rng('train'),weeks=n?Math.min(52,Math.max(13,Math.ceil(n/7))):52,val={},tip={},from2=addDays(sel,-weeks*7);
 daysBetween(from2,sel).forEach(function(d){var l=S.workouts.filter(function(w){return w.date===d;}),sets=l.reduce(function(s,w){return s+(w.sets||0);},0),cm=S.cardio.filter(function(c){return c.date===d;}).reduce(function(s,c){return s+(c.min||0);},0),sm=S.swims.filter(function(c){return c.date===d;}).reduce(function(s,c){return s+(c.dist||0);},0);
  var sc=sets+cm/10+sm/250;if(!sc)return;val[d]=sc<6?1:sc<12?2:sc<20?3:4;tip[d]=[sets?'力量 '+sets+' 组 · '+Math.round(dayVol(d))+' kg':'',cm?'爬楼 '+cm+' 分':'',sm?'游泳 '+sm+' m':''].filter(Boolean).join('\n');});
 CH.heat($('#chHeat'),{to:sel,weeks:weeks,val:val,tip:tip});}
$('#ormEx').addEventListener('change',function(){ormSel=this.value;render();});

function chPerf(){var from=since('perf',pbEntries().map(function(x){return x.date;}).concat(S.run800.map(function(x){return x.date;})));
 var pe=pbEntries(),best=pe.reduce(function(b,x){return b==null||x.sec<b?x.sec:b;},null);
 CH.line($('#chPb'),{h:160,series:[{name:'100m 蛙泳',color:'var(--c)',pts:pe.filter(function(x){return x.date>=from;}).map(function(x){return{d:x.date,y:x.sec};}),fmt:fmtT}],refs:[{y:best,name:'PB',color:'var(--ok)'}],emptyMsg:'暂无成绩',emptyHint:'记录计时测试或比赛成绩'});
 var rn=S.run800,rb=rn.reduce(function(b,x){return b==null||x.sec<b?x.sec:b;},null);
 CH.line($('#chRun'),{h:160,series:[{name:'800m',color:'var(--warn)',pts:rn.filter(function(x){return x.date>=from;}).map(function(x){return{d:x.date,y:x.sec};}),fmt:fmtT}],refs:[{y:S.run800Hist,name:'历史最佳',color:'var(--ok)'},{y:rb!==S.run800Hist?rb:null,name:'当前最佳',color:'var(--k)'}],emptyMsg:'暂无成绩',emptyHint:'记录 800m 计时后显示与历史最佳的差距'});}

/* 其他测试成绩（纵跳等，可自定义项目） */
var ptEv=null;
function ptFmt(ev,v){return ev&&ev.unit==='s'&&v>=60?fmtT(v):r1(v)+(ev&&ev.unit?' '+ev.unit:'');}
function rPerfTests(){var evs=S.perfEvents;if(!ptEv||!evs.some(function(e){return e.id===ptEv;}))ptEv=evs[0]?evs[0].id:null;var ev=evs.find(function(e){return e.id===ptEv;});
 $('#ptSeg').innerHTML=evs.map(function(e){return'<button data-ptev="'+e.id+'" class="'+(e.id===ptEv?'on':'')+'">'+esc(e.name)+'</button>';}).join('');
 $('#ptEv').innerHTML=evs.map(function(e){return'<option value="'+e.id+'"'+(e.id===ptEv?' selected':'')+'>'+esc(e.name)+'（'+esc(e.unit||'')+(e.better==='lower'?'，越低越好':'，越高越好')+'）</option>';}).join('');
 if(!$('#ptD').value)$('#ptD').value=sel;
 var log=S.perfLog.filter(function(x){return x.ev===ptEv;}).sort(function(a,b){return a.date<b.date?-1:1;}),lower=ev&&ev.better==='lower';
 var best=log.reduce(function(b,x){return b==null||(lower?x.value<b:x.value>b)?x.value:b;},null),from=since('perf',log.map(function(x){return x.date;}));
 $('#ptBox').innerHTML=ev?'<div class="mut">'+(best!=null?'当前最佳 <b>'+ptFmt(ev,best)+'</b>':'暂无成绩')+(ev.hist!=null?' · 历史最佳 '+ptFmt(ev,ev.hist)+(best!=null?'（差 '+r1(Math.abs(best-ev.hist))+'）':''):'')+'</div>':'';
 CH.line($('#chTest'),{h:150,series:[{name:ev?ev.name:'',color:'var(--acc)',pts:log.filter(function(x){return x.date>=from;}).map(function(x){return{d:x.date,y:x.value};}),fmt:function(v){return ptFmt(ev,v);}}],refs:[{y:best,name:'最佳',color:'var(--k)'},{y:ev?ev.hist:null,name:'历史最佳',color:'var(--ok)'}],emptyMsg:'暂无成绩',emptyHint:'选择项目并记录第一次测试'});
 $('#ptList').innerHTML=log.length?'<ul class="list">'+log.slice().reverse().slice(0,10).map(function(x){return'<li><div>'+esc(x.date)+' · <b>'+ptFmt(ev,x.value)+'</b>'+(x.value===best?' '+IC('medal'):'')+(x.note?'<div class="mut">'+esc(x.note)+'</div>':'')+'</div><button class="del" data-delpt="'+x.id+'">'+IC('x')+'</button></li>';}).join('')+'</ul>':'';}
$('#ptAdd').onclick=function(){var raw=$('#ptV').value.trim(),v=raw.indexOf(':')>=0?parseT(raw):num(raw),d=$('#ptD').value,ev=$('#ptEv').value;if(v==null||!d||!ev){toast('请填写项目、成绩和日期');return;}
 S.perfLog.push({id:uid(),date:d,ev:ev,value:v,note:$('#ptN').value.trim()});ptEv=ev;save();$('#ptV').value='';$('#ptN').value='';toast('已记录');render();};
$('#peAdd').onclick=function(){var n=$('#peName').value.trim();if(!n){toast('请填写项目名称');return;}var h=$('#peHist').value.trim(),hv=h?(h.indexOf(':')>=0?parseT(h):num(h)):null;
 var e={id:uid(),name:n,unit:$('#peUnit').value.trim(),better:$('#peBetter').value,hist:hv};S.perfEvents.push(e);ptEv=e.id;save();['#peName','#peUnit','#peHist'].forEach(function(s){$(s).value='';});toast('已添加项目');render();};

function chSleep(){var g=S.goals,from=since('sleep',S.sleep.map(function(x){return x.date;})),days=daysBetween(from,sel);
 CH.bars($('#chSleep'),{h:170,cats:days.map(function(d){var x=sleepOf(d);return{l:md(d),d:d,v:x?r1(x.dur):0,color:x&&x.dur>=g.sleepH?'var(--ok)':'var(--warn)',tip:d+'\n'+(x?'时长 '+r1(x.dur)+' h\n质量 '+(x.q||'-')+'/5\n'+x.bed+' → '+x.wake:'无记录')};}),goal:g.sleepH,goalName:'目标',unit:' h',
  overlay:{name:'质量',color:'var(--k)',max:5,step:1,pts:days.map(function(d){var x=sleepOf(d);return x&&x.q?x.q:null;})},legend:[{name:'达标',color:'var(--ok)'},{name:'不足',color:'var(--warn)'},{name:'质量(右轴 1-5)',color:'var(--k)'}],emptyMsg:'暂无睡眠记录',emptyHint:'记录入睡与起床时间后显示'});}

function chBody(){var from=since('body',S.body.map(function(b){return b.date;})),inR=function(b){return b.date>=from&&b.date<=sel;},bs=S.body.filter(inR);
 var wp=sortPts(bs.map(function(b){return{d:b.date,y:b.weight};})),bf=sortPts(bs.map(function(b){return{d:b.date,y:b.bf};}));
 CH.line($('#chBody'),{h:190,series:[{name:'体重',color:'var(--acc)',pts:wp,unit:' kg'},{name:'7日均线',color:'var(--warn)',pts:movAvg(wp,7),dash:true,unit:' kg'},{name:'体脂(右轴)',color:'var(--p)',pts:bf,axis:'r',unit:' %'}],refs:[{y:S.goals.weight,name:'目标',color:'var(--ok)'}],legend:true,emptyMsg:'暂无体重/体脂记录',emptyHint:'建议每天晨起空腹称重'});
 var both=bs.filter(function(b){return b.weight!=null&&b.bf!=null;});
 CH.stack($('#chComp'),{h:160,unit:' kg',series:[{name:'瘦体重',color:'var(--c)',pts:both.map(function(b){return{d:b.date,y:r1(b.weight*(1-b.bf/100))};})},{name:'脂肪量',color:'var(--f)',pts:both.map(function(b){return{d:b.date,y:r1(b.weight*b.bf/100)};})}],emptyMsg:'需要同日的体重与体脂',emptyHint:'瘦体重 = 体重 × (1 − 体脂%)'});
 CH.line($('#chWaist'),{h:140,series:[{name:'腰围',color:'var(--k)',pts:sortPts(bs.map(function(b){return{d:b.date,y:b.waist};})),unit:' cm',area:true}],emptyMsg:'暂无腰围记录',emptyHint:'每周固定时间测量一次即可'});}

/**
 * 准备度分数（0-100，仅供参考）：
 * 睡眠时长 20% · 睡眠质量 10% · 静息心率相对14天基线 20% · HRV 相对基线 20% · 主观（精力/情绪/酸痛/压力）30%
 * 缺失项按剩余权重归一，至少需要 2 项。
 */
function readiness(d){var parts=[],add=function(w,v,n){if(v!=null&&!isNaN(v))parts.push({w:w,v:Math.max(0,Math.min(1,v)),n:n});};
 var s=sleepOf(d),r=recovOf(d),g=S.goals;if(s){add(0.2,(s.dur-4)/(g.sleepH-4),'睡眠时长');if(s.q)add(0.1,(s.q-1)/4,'睡眠质量');}
 var rhrOf=function(x){var rr=recovOf(x);if(rr&&rr.rhr!=null)return rr.rhr;var b=S.body.find(function(y){return y.date===x;});return b?b.rhr:null;};
 var base=function(fn){var a=[];for(var i=1;i<=14;i++){var v=fn(addDays(d,-i));if(v!=null)a.push(v);}return a.length>=3?avg(a):null;};
 var rh=rhrOf(d),rb=base(rhrOf);if(rh!=null&&rb!=null)add(0.2,0.6+(rb-rh)/10,'静息心率');
 var hv=r&&r.hrv,hb=base(function(x){var q=recovOf(x);return q?q.hrv:null;});if(hv!=null&&hb)add(0.2,0.6+(hv-hb)/hb*2,'HRV');
 if(r){var sub=[r.energy?(r.energy-1)/4:null,r.mood?(r.mood-1)/4:null,r.soreness?(5-r.soreness)/4:null,r.stress?(5-r.stress)/4:null].filter(function(x){return x!=null;});if(sub.length)add(0.3,avg(sub),'主观');}
 if(parts.length<2)return null;var tw=parts.reduce(function(a,p){return a+p.w;},0);
 return{score:Math.round(parts.reduce(function(a,p){return a+p.w*p.v;},0)/tw*100),parts:parts};}
function chRecovery(){var dates=S.recov.map(function(x){return x.date;}).concat(S.sleep.map(function(x){return x.date;})),from=since('rec',dates),days=daysBetween(from,sel);
 var rd=readiness(sel);$('#readyNow').innerHTML=rd?'<div class="score"><span class="big" style="color:'+(rd.score>=70?'var(--ok)':rd.score>=50?'var(--warn)':'var(--bad)')+'">'+rd.score+'</span><div><b>'+(sel===today()?'今日':sel)+'准备度</b><div class="mut">'+(rd.score>=70?'状态良好，可按计划训练':rd.score>=50?'一般，可适当降低强度':'偏低，建议减量或休息')+' · 依据：'+rd.parts.map(function(p){return p.n;}).join('、')+'</div></div></div>':'<div class="mut" style="margin-bottom:6px">准备度需要当天至少 2 项数据（睡眠、晨起心率、HRV、主观指标）。</div>';
 CH.line($('#chReady'),{h:150,series:[{name:'准备度',color:'var(--ok)',pts:days.map(function(d){var x=readiness(d);return{d:d,y:x?x.score:null};}),area:true}],yl:{min:0,max:100},refs:[{y:70,name:'良好',color:'var(--mut)'}],emptyMsg:'暂无准备度数据',emptyHint:'连续记录睡眠与晨起指标后自动计算'});
 var rhrOf=function(x){var rr=recovOf(x);if(rr&&rr.rhr!=null)return rr.rhr;var b=S.body.find(function(y){return y.date===x;});return b?b.rhr:null;};
 CH.line($('#chHrv'),{h:170,series:[{name:'静息心率',color:'var(--bad)',pts:days.map(function(d){return{d:d,y:rhrOf(d)};}),unit:' bpm'},{name:'HRV(右轴)',color:'var(--acc)',pts:days.map(function(d){var x=recovOf(d);return{d:d,y:x?x.hrv:null};}),axis:'r',unit:' ms'}],legend:true,emptyMsg:'暂无心率/HRV记录',emptyHint:'每天晨起同一时间、同一设备测量'});
 CH.line($('#chRv'),{h:140,series:[{name:RVM[rvMetric][0],color:'var(--k)',pts:days.map(function(d){var x=recovOf(d);return{d:d,y:x?x[rvMetric]:null};}),unit:RVM[rvMetric][1]?' '+RVM[rvMetric][1]:''}],yl:['rhr','hrv'].indexOf(rvMetric)<0?{min:1,max:5}:null,emptyMsg:'暂无该指标记录'});}

function chPain(){var from=since('pain',S.wristLog.map(function(x){return x.date;})),flags={};S.workouts.forEach(function(x){if(x.wrist)flags[x.date]=1;});
 var pts=S.wristLog.filter(function(x){return x.date>=from&&x.date<=sel;}).map(function(x){return{d:x.date,y:x.pain};});
 var fl=Object.keys(flags).filter(function(d){return d>=from&&d<=sel;}).map(function(d){var p=wpOf(d);return{d:d,y:p?p.pain:0};});
 CH.line($('#chWp'),{h:160,series:[{name:'疼痛',color:'var(--warn)',pts:pts,unit:'/10',area:true},{name:flagLabel(),color:'var(--bad)',pts:fl,noline:true,unit:'/10'}],yl:{min:0,max:10},refs:[{y:3,name:'调整线',color:'var(--mut)'}],emptyMsg:'暂无疼痛记录',emptyHint:'每天记录 0-10 分（0 分也请记录）'});
 var l7=S.wristLog.filter(function(x){return x.date<=sel&&x.date>addDays(sel,-7);});$('#wpAvg').textContent=l7.length?'近7天均 '+r1(avg(l7.map(function(x){return x.pain;})))+'/10':'';}


/* ==========================================================
 * 肌群模型：动作 → 主/次要肌群，疲劳累计与恢复半衰期
 * ========================================================== */
/** 肌群：[名称, 恢复半衰期(小时)]；下肢与下背恢复较慢 */
var MUS={chest:['胸',36],back:['背',36],delts:['肩',30],biceps:['二头',24],triceps:['三头',24],forearms:['前臂',20],core:['核心',20],lowback:['下背',54],glutes:['臀',48],quads:['股四头',48],hams:['腘绳',48],calves:['小腿',30]};
/** 关键词 → [主要肌群, 次要肌群]（按顺序匹配，越具体越靠前；计入：主要 1 组，次要 0.5 组） */
var EX_MUS=[
 ['俯身飞鸟',['delts'],['back']],['反向飞鸟',['delts'],['back']],['面拉',['delts'],['back']],['侧平举',['delts'],[]],['前平举',['delts'],[]],
 ['推举',['delts'],['triceps']],['肩推',['delts'],['triceps']],
 ['卧推',['chest'],['triceps','delts']],['俯卧撑',['chest'],['triceps','delts','core']],['飞鸟',['chest'],['delts']],['夹胸',['chest'],[]],['胸推',['chest'],['triceps']],
 ['臂屈伸',['triceps'],['chest']],['下压',['triceps'],[]],['三头',['triceps'],[]],
 ['腿弯举',['hams'],[]],['弯举',['biceps'],['forearms']],
 ['引体',['back'],['biceps','forearms']],['下拉',['back'],['biceps']],['划船',['back'],['biceps','lowback']],['耸肩',['back'],[]],
 ['罗马尼亚',['hams','glutes'],['lowback']],['硬拉',['hams','glutes','lowback'],['back','forearms']],['背伸',['lowback'],['glutes']],['山羊挺身',['lowback'],['glutes','hams']],
 ['深蹲',['quads','glutes'],['core','lowback']],['腿举',['quads','glutes'],[]],['腿屈伸',['quads'],[]],['弓步',['quads','glutes'],['hams']],['箭步',['quads','glutes'],['hams']],['保加利亚',['quads','glutes'],['hams']],
 ['臀推',['glutes'],['hams']],['臀桥',['glutes'],['hams']],['提踵',['calves'],[]],
 ['平板',['core'],[]],['卷腹',['core'],[]],['举腿',['core'],[]],['死虫',['core'],[]],['腹',['core'],[]],['农夫',['forearms'],['back','core']],['握力',['forearms'],[]]];
function musclesOf(name){name=name||'';for(var i=0;i<EX_MUS.length;i++)if(name.indexOf(EX_MUS[i][0])>=0)return{p:EX_MUS[i][1],s:EX_MUS[i][2]};return{p:[],s:[]};}
function rirOf(w){return w.rir!=null?w.rir:(w.rpe!=null?Math.max(0,10-w.rpe):null);}
var FATIGUE_RECOVERING=1.5,FATIGUE_HIGH=4,STALE_DAYS=7;
function trainTs(d){var a=d.split('-');return new Date(+a[0],a[1]-1,+a[2],18).getTime();}
function nowTs(){if(sel===today())return Date.now();var a=sel.split('-');return new Date(+a[0],a[1]-1,+a[2],23,59).getTime();}
/** 计算每个肌群：剩余疲劳 f（有效组数×0.5^(经过小时/半衰期)）、近7天有效组数、上次训练日期、状态 */
function muscleState(){var now=nowTs(),st={};Object.keys(MUS).forEach(function(k){st[k]={f:0,sets7:0,last:null};});
 S.workouts.forEach(function(w){if(w.date>sel)return;var r=rirOf(w);if(r!=null&&r>4)return;var m=musclesOf(w.exercise),n=w.sets||1,hrs=Math.max(0,(now-trainTs(w.date))/36e5);
  [[m.p,1],[m.s,0.5]].forEach(function(pr){pr[0].forEach(function(k){var s=st[k];s.f+=n*pr[1]*Math.pow(0.5,hrs/MUS[k][1]);if(diffDays(w.date,sel)<7)s.sets7+=n*pr[1];if(!s.last||w.date>s.last)s.last=w.date;});});});
 Object.keys(st).forEach(function(k){var s=st[k];s.days=s.last?diffDays(s.last,sel):null;
  s.status=!s.last?'never':s.f>=FATIGUE_HIGH?'fatigued':s.f>=FATIGUE_RECOVERING?'recovering':s.days>STALE_DAYS?'stale':'recovered';
  s.eta=s.f>=FATIGUE_RECOVERING?Math.ceil(MUS[k][1]*Math.log(s.f/FATIGUE_RECOVERING)/Math.LN2):0;});
 return st;}
var ST_LABEL={never:'未训练',fatigued:'恢复中（疲劳高）',recovering:'恢复中',recovered:'已恢复',stale:'太久没练'};
var SPLITS=[['推','push',['chest','delts','triceps']],['拉','pull',['back','biceps','forearms']],['腿','legs',['quads','hams','glutes','calves']],['核心与下背','core',['core','lowback']]];
/** 今日推荐：优先选择主要肌群均已恢复、且最久没练的部位；准备度低或无可练部位时建议休息/有氧 */
function recommend(){var st=muscleState(),rd=readiness(sel),hasHist=S.workouts.length>0;
 if(rd&&rd.score<50)return{rest:true,title:'今天以休息或轻松有氧为主',why:'准备度 '+rd.score+'，恢复信号偏弱。'};
 var cands=SPLITS.map(function(sp){var ms=sp[2],ok=ms.slice(0,2).every(function(k){return['recovered','stale','never'].indexOf(st[k].status)>=0;}),days=Math.min.apply(null,ms.slice(0,2).map(function(k){return st[k].days==null?99:st[k].days;}));return{sp:sp,ok:ok,days:days};}).filter(function(c){return c.ok;});
 if(!hasHist)return{title:'全身训练（入门）',why:'还没有训练记录，从全身动作开始，每个动作留 2–3 次余力。',keys:[]};
 if(!cands.length)return{rest:true,title:'各部位仍在恢复，建议有氧或休息',why:'主要肌群剩余疲劳较高。'};
 cands.sort(function(a,b){return b.days-a.days;});var c=cands[0];
 var inj=S.injuries.some(function(x){return x.status!=='已恢复';})&&S.restricted.length?'；注意避开受限动作':'';
 return{title:c.sp[0]+'（'+c.sp[2].map(function(k){return MUS[k][0];}).join('、')+'）',why:c.sp[2].map(function(k){return MUS[k][0];}).slice(0,2).join('、')+'已恢复，'+(c.days>=99?'尚未练过':'距上次训练 '+c.days+' 天')+inj+'。',keys:c.sp[2],split:c.sp[1]};}

/* ---------- 自绘简化人体肌群图（非第三方路径数据） ---------- */
var mapMode='status',musSel=null;
function mir(d){return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,function(m,x,y){return(120-x)+','+y;});}
var BODY_SIL='M60,8 C67,8 71,14 71,21 C71,28 67,33 63,34 L63,38 C70,39 78,41 84,45 C90,48 92,56 93,64 L96,92 L100,128 C101,134 97,136 95,131 L90,100 L86,74 L84,100 L84,124 C85,150 82,178 79,200 L77,228 C77,233 70,233 69,228 L66,190 L62,140 L60,128 L58,140 L54,190 L51,228 C50,233 43,233 43,228 L41,200 C38,178 35,150 36,124 L36,100 L34,74 L30,100 L25,131 C23,136 19,134 20,128 L24,92 L27,64 C28,56 30,48 36,45 C42,41 50,39 57,38 L57,34 C53,33 49,28 49,21 C49,14 53,8 60,8 Z';
var FRONT=[['delts','M36,45 C42,42 48,42 50,46 C46,52 40,56 33,58 C31,52 32,47 36,45 Z'],['chest','M50,47 C54,45 58,46 59.5,48 L59.5,64 C54,67 47,66 43,61 C42,55 45,50 50,47 Z'],
 ['biceps','M33,60 C37,58 40,60 40,64 L37,84 C34,86 30,85 30,82 L31,66 Z'],['forearms','M30,88 C33,86 36,87 36,90 L31,118 C29,121 25,120 25,117 L27,96 Z'],
 ['core','M45,66 C50,69 55,69 59.5,68 L59.5,104 C54,106 49,104 46,100 L44,80 Z'],['quads','M38,126 C44,122 52,124 57,130 L55,172 C52,180 45,180 42,174 C38,160 37,140 38,126 Z'],
 ['calves','M43,188 C46,184 51,184 53,188 L51,220 C49,224 45,224 44,220 Z']];
var BACK=[['back','M50,40 C54,38 58,38 59.5,39 L59.5,82 C54,84 48,82 43,74 C40,66 40,56 42,50 C44,45 47,42 50,40 Z'],['delts','M36,45 C42,42 47,42 49,45 C45,51 39,55 33,57 C31,52 32,47 36,45 Z'],
 ['triceps','M33,60 C37,58 40,60 40,64 L37,84 C34,86 30,85 30,82 L31,66 Z'],['forearms','M30,88 C33,86 36,87 36,90 L31,118 C29,121 25,120 25,117 L27,96 Z'],
 ['lowback','M47,84 C51,86 55,87 59.5,87 L59.5,104 C55,105 50,104 47,101 Z'],['glutes','M38,108 C44,104 53,105 59.5,108 L59.5,124 C54,130 44,130 39,124 C37,118 37,112 38,108 Z'],
 ['hams','M39,130 C45,128 52,129 57,132 L55,172 C52,179 45,179 42,173 C39,160 38,144 39,130 Z'],['calves','M42,182 C47,178 52,179 54,184 L52,212 C50,220 46,220 44,214 C42,204 41,192 42,182 Z']];
function bodyMapSvg(st){var max7=Math.max.apply(null,Object.keys(st).map(function(k){return st[k].sets7;}).concat([1]));
 var shape=function(k,d,ox){var s=st[k],cls='mu '+(mapMode==='status'?'s-'+s.status:'')+(musSel===k?' on':''),style=mapMode==='volume'?' style="fill:var(--acc);opacity:'+(s.sets7?0.18+0.82*s.sets7/max7:0.08).toFixed(2)+'"':'';
  var tip=MUS[k][0]+'\n'+ST_LABEL[s.status]+(s.eta?'（约 '+s.eta+' 小时后恢复）':'')+'\n近7天有效组数 '+r1(s.sets7)+'\n'+(s.last?'上次 '+(s.days===0?'今天':s.days+' 天前'):'暂无记录');
  return'<g transform="translate('+ox+',0)"><path class="'+cls+'"'+style+' data-mus="'+k+'" data-tip="'+esc(tip)+'" d="'+d+'"/><path class="'+cls+'"'+style+' data-mus="'+k+'" data-tip="'+esc(tip)+'" d="'+mir(d)+'"/></g>';};
 var o='<svg viewBox="0 0 250 246" role="img" aria-label="肌群热图">';
 [[FRONT,0,'正面'],[BACK,130,'背面']].forEach(function(f){o+='<g transform="translate('+f[1]+',0)"><path class="sil" d="'+BODY_SIL+'"/></g>';f[0].forEach(function(m){o+=shape(m[0],m[1],f[1]);});o+='<text class="lb" x="'+(f[1]+60)+'" y="244" text-anchor="middle">'+f[2]+'</text>';});
 return o+'</svg>';}
function rMuscle(){var st=muscleState(),rc=recommend();
 if($('#recoBox'))$('#recoBox').innerHTML='<div class="big" style="font-size:20px;color:'+(rc.rest?'var(--warn)':'var(--fg)')+'">'+esc(rc.title)+'</div><div class="mut">'+esc(rc.why)+'</div>'+(!rc.rest&&rc.split?planHint(rc.keys):'');
 $('#mapMode').innerHTML=[['status','恢复状态'],['volume','近7天组数']].map(function(m){return'<button data-mapmode="'+m[0]+'" class="'+(mapMode===m[0]?'on':'')+'">'+m[1]+'</button>';}).join('');
 $('#bodyMap').innerHTML='<div class="bm">'+bodyMapSvg(st)+'</div>';
 $('#mapLegend').innerHTML=mapMode==='status'?'<div class="mlg">'+[['recovered','已恢复','var(--ok)'],['recovering','恢复中','var(--warn)'],['fatigued','疲劳高','var(--bad)'],['stale','太久没练','var(--c)'],['never','未训练','var(--bd)']].map(function(x){return'<span><i style="background:'+x[2]+'"></i>'+x[1]+'</span>';}).join('')+'</div>':'<div class="mlg"><span>颜色越深 = 近7天有效组数越多</span></div>';
 var k=musSel;$('#musDetail').innerHTML=k?'<div class="mdet"><div class="hrow"><b>'+MUS[k][0]+'</b><span class="st-tag st-'+st[k].status+'">'+ST_LABEL[st[k].status]+'</span></div><div class="mut" style="margin-top:4px">近7天有效组数 '+r1(st[k].sets7)+' · 剩余疲劳 '+r1(st[k].f)+' 组 · '+(st[k].last?'上次训练 '+st[k].last:'暂无记录')+(st[k].eta?' · 约 '+st[k].eta+' 小时后恢复':'')+' · 恢复半衰期 '+MUS[k][1]+'h</div></div>':'<div class="mut" style="text-align:center;margin-top:6px">点按肌群查看详情</div>';
 $('#musList').innerHTML='<ul class="list tight">'+Object.keys(MUS).map(function(k){var s=st[k];return'<li data-mus="'+k+'" style="cursor:pointer"><div><b>'+MUS[k][0]+'</b> <span class="st">近7天 '+r1(s.sets7)+' 组'+(s.last?' · '+(s.days===0?'今天':s.days+'天前'):'')+'</span></div><span class="st-tag st-'+s.status+'">'+ST_LABEL[s.status]+'</span></li>';}).join('')+'</ul>';}
function planHint(keys){var best=null,sc=0;S.plans.forEach(function(p){var n=0;p.items.forEach(function(it){var m=musclesOf(it.ex).p;if(m.some(function(x){return keys.indexOf(x)>=0;}))n++;});if(n/Math.max(1,p.items.length)>sc){sc=n/p.items.length;best=p;}});
 return best&&sc>=0.5?'<div class="row" style="margin-top:8px"><button class="sm" data-ss="start" data-plan="'+best.id+'">'+IC('play')+'开始「'+esc(best.name)+'」</button></div>':'';}
document.addEventListener('click',function(e){var li=e.target.closest&&e.target.closest('li[data-ss]');if(li&&!e.target.closest('button')){sessAction(li.getAttribute('data-ss'),li);}});
document.addEventListener('click',function(e){var m=e.target.closest&&e.target.closest('[data-mus]');if(m&&cur==='train'){musSel=m.getAttribute('data-mus');rMuscle();}});

/* ==========================================================
 * 自动进阶：线性 / 双重进阶 / 保持；未做满不加重，连续未完成减载
 * ========================================================== */
var RULE_LABEL={linear:'线性',double:'双重进阶',hold:'保持'};
function exRule(ex){var r=(S.exRules||{})[ex]||{};return{rule:r.rule||'linear',lo:r.lo||null,hi:r.hi||null,inc:r.inc||null};}
function defInc(ex,w){var p=musclesOf(ex).p,lower=p.some(function(k){return['quads','hams','glutes','lowback'].indexOf(k)>=0;});return lower?(w>=60?5:2.5):(w>=20?2.5:1);}
/** 该动作在某日期之前的训练记录（按日分组，每组展开为单组） */
function exHistory(ex,before){var by={};S.workouts.forEach(function(w){if(w.exercise===ex&&w.date<before)(by[w.date]=by[w.date]||[]).push(w);});
 return Object.keys(by).sort().map(function(d){var sets=[];by[d].forEach(function(w){for(var k=0;k<(w.sets||1);k++)sets.push(w);});return{d:d,sets:sets,w:Math.max.apply(null,sets.map(function(x){return x.weight||0;})),minR:Math.min.apply(null,sets.map(function(x){return x.reps||0;})),tot:sets.reduce(function(a,x){return a+(x.reps||0);},0)};});}
/** 是否完成：有目标次数则每组≥目标；双重进阶看是否全部达到上限；否则以首组次数为基准 */
function sessComplete(s,rule,need){return s.sets.every(function(x){var t=x.target&&x.target.reps?x.target.reps:need;return(x.reps||0)>=t;});}
function roundW(v,st){return Math.round(v/st)*st;}
/**
 * 下次目标：返回 {w, reps, sets, why, kind}；kind = up/reps/hold/deload
 * 规则优先级：恢复期前2周 → 伤处不适 → 连续2次未完成/停滞减载 → 各规则
 */
function nextTarget(ex,setsN){var rule=exRule(ex),hist=exHistory(ex,sel),last=hist[hist.length-1],wk=recWeek(sel);if(!last)return null;
 var w=last.w,inc=rule.inc||defInc(ex,w),n=setsN||last.sets.length,base=last.sets[0].target&&last.sets[0].target.reps||(rule.rule==='double'?(rule.lo||8):last.sets[0].reps);
 var keepR=rule.rule==='double'?Math.max(rule.lo||1,last.minR):base;
 var out=function(w2,r2,why,kind){return{w:r1(w2),reps:r2,sets:n,why:why,kind:kind,rule:rule.rule};};
 if(wk&&wk<=2)return out(w,keepR,'恢复期第'+wk+'周，先保持 '+w+'kg，每组留 3–4 次余力。','hold');
 if(last.sets.some(function(x){return x.wrist;}))return out(w,keepR,'上次标记了'+flagLabel()+'，先保持重量，确认无痛再加。','hold');
 if(!w)return out(0,last.minR+1,'自重动作，下次每组争取多做 1 次。','reps');
 var need=rule.rule==='double'?(rule.lo||8):base,done=sessComplete(last,rule,need);
 var fails=0;for(var i=hist.length-1;i>=0&&hist[i].w>=w;i--){if(sessComplete(hist[i],rule,need))break;fails++;}
 var flat=0;for(var j=hist.length-1;j>0&&hist[j].w===w&&hist[j].tot<=hist[j-1].tot&&hist[j-1].w===w;j--)flat++;
 var top=rule.rule==='double'?last.minR>=(rule.hi||12):done;
 if(rule.rule!=='hold'&&(fails>=2||(flat>=2&&!top)))return out(roundW(w*0.9,inc>=2.5?2.5:0.5),rule.rule==='double'?(rule.lo||8):base,(fails>=2?'连续 '+fails+' 次没做满':'连续 '+(flat+1)+' 次没有进步')+'，减载 10% 再重新往上加。','deload');
 if(rule.rule==='hold')return out(w,keepR,'这个动作设为保持，维持重量和次数。','hold');
 if(rule.rule==='double'){var lo=rule.lo||8,hi=rule.hi||12;
  if(last.minR>=hi)return out(w+inc,lo,'每组都做到了 '+hi+' 次上限，加 '+inc+'kg，次数回到 '+lo+'。','up');
  var t=Math.min(hi,Math.max(lo,last.minR+1));return out(w,t,'还没全部做到 '+hi+' 次，先在 '+w+'kg 把最少的那组提到 '+t+' 次。','reps');}
 if(done){var rr=avg(last.sets.map(rirOf));return out(w+inc,base,'上次 '+last.sets.length+' 组都做满 '+base+' 次'+(rr!=null&&rr<=0.5?'（接近力竭，加重后注意动作）':'')+'，加 '+inc+'kg。','up');}
 return out(w,base,'上次有组没做满 '+base+' 次，不加重，先在原重量做满。','hold');}

/* ==========================================================
 * 训练引导：计划 → 逐组完成（休息计时）→ 完成总结
 * ========================================================== */
var PLAN_TPL=[['全身 A',[['杠铃深蹲',3,5,null,'linear'],['杠铃卧推',3,5,null,'linear'],['坐姿划船',3,8,12,'double'],['平板支撑',3,30,null,'hold']]],
 ['上肢',[['杠铃卧推',3,6,null,'linear'],['高位下拉',3,8,12,'double'],['站姿推举',3,6,10,'double'],['坐姿划船',3,8,12,'double'],['二头弯举',2,10,15,'double'],['绳索下压',2,10,15,'double']]],
 ['下肢',[['杠铃深蹲',3,5,null,'linear'],['罗马尼亚硬拉',3,6,10,'double'],['腿举',3,10,15,'double'],['腿弯举',2,10,15,'double'],['提踵',3,12,20,'double']]],
 ['推',[['杠铃卧推',3,5,null,'linear'],['站姿推举',3,6,10,'double'],['侧平举',3,12,20,'double'],['绳索下压',3,10,15,'double']]],
 ['拉',[['引体向上',3,5,10,'double'],['坐姿划船',3,8,12,'double'],['面拉',3,12,20,'double'],['二头弯举',3,10,15,'double']]]];
var editPlan=null,showSummary=null,restTimer=null;
function planMuscles(p){var o={};p.items.forEach(function(it){musclesOf(it.ex).p.forEach(function(k){o[MUS[k][0]]=1;});});return Object.keys(o);}
function fmtDur(ms){var m=Math.floor(ms/60000),s=Math.floor(ms/1000)%60;return m+':'+pad(s);}
function curSet(a){var it=a.items[a.cur];if(!it)return null;var j=it.sets.findIndex(function(s){return!s.done;});return j<0?null:j;}
function startSession(plan){var items=(plan?plan.items:[]).map(function(it){return newItem(it.ex,it.sets,it.lo,it.rest);});
 S.active={id:uid(),date:sel,name:plan?plan.name:'自由训练',planId:plan?plan.id:null,start:Date.now(),items:items,cur:0,restEnd:null,restTotal:0};save();render();window.scrollTo(0,0);}
function newItem(ex,nSets,lo,rest){var nt=nextTarget(ex,nSets),r=exRule(ex);
 var tw=nt?nt.w:0,tr=nt?nt.reps:(lo||r.lo||8),why=nt?nt.why:'第一次做这个动作：选一个能完成 '+tr+' 次、还留 2–3 次余力的重量。';
 var sets=[];for(var i=0;i<(nSets||3);i++)sets.push({tw:tw,tr:tr,w:tw,r:tr,rir:2,done:false});
 return{ex:ex,rule:r.rule,why:why,kind:nt?nt.kind:'new',rest:rest||(musclesOf(ex).p.some(function(k){return['quads','hams','glutes','lowback','back','chest'].indexOf(k)>=0;})?150:90),sets:sets};}
var RIR_TXT=['力竭，一次也做不动了','还能做 1 次','还能做 2 次','还能做 3 次','还能做 4 次','还能做 5 次以上，很轻松'];
function sessAction(act,t){var a=S.active,it=a&&a.items[a.cur],j=a?curSet(a):null,v=t.getAttribute('data-v');
 if(act==='start'){var p=S.plans.find(function(x){return x.id===t.getAttribute('data-plan');});if(S.active&&!confirm('已有进行中的训练，放弃并开始新的？'))return;startSession(p||null);return;}
 if(act==='free'){startSession(null);return;}
 if(act==='rec'){if(!S.active){adjOpen=false;startSession(recPlan());}if(cur!=='train')show('train',true);return;}
 if(act==='adj'){adjOpen=!adjOpen;rSession();return;}
 if(act==='tpl'){var tp=PLAN_TPL[+v];S.plans.push({id:uid(),name:tp[0],items:tp[1].map(function(x){return{ex:x[0],sets:x[1],lo:x[2],hi:x[3],rule:x[4]};})});tp[1].forEach(function(x){if(!S.exRules[x[0]])S.exRules[x[0]]={rule:x[4],lo:x[4]==='double'?x[2]:null,hi:x[3]};});save();toast('已添加计划「'+tp[0]+'」');render();return;}
 if(act==='newplan'){editPlan={id:null,name:'',items:[{ex:'',sets:3,lo:8,hi:null,rule:'linear'}]};render();return;}
 if(act==='editplan'){var pp=S.plans.find(function(x){return x.id===v;});editPlan=JSON.parse(JSON.stringify(pp));editPlan.items.forEach(function(x){var r=exRule(x.ex);x.rule=r.rule;x.hi=r.hi||x.hi;});render();return;}
 if(act==='pe-add'){readPlanForm();editPlan.items.push({ex:'',sets:3,lo:8,hi:null,rule:'linear'});render();return;}
 if(act==='pe-del'){readPlanForm();editPlan.items.splice(+v,1);render();return;}
 if(act==='pe-cancel'){editPlan=null;render();return;}
 if(act==='pe-save'){readPlanForm();var its=editPlan.items.filter(function(x){return x.ex;});if(!editPlan.name||!its.length){toast('请填写计划名称和至少一个动作');return;}
  its.forEach(function(x){S.exRules[x.ex]={rule:x.rule,lo:x.rule==='double'?x.lo:null,hi:x.rule==='double'?(x.hi||x.lo+4):null};});
  var pl={id:editPlan.id||uid(),name:editPlan.name,items:its.map(function(x){return{ex:x.ex,sets:x.sets,lo:x.lo,hi:x.hi,rule:x.rule};})};S.plans=S.plans.filter(function(x){return x.id!==pl.id;});S.plans.push(pl);editPlan=null;save();toast('计划已保存');render();return;}
 if(act==='pe-delplan'){if(!confirm('删除该计划？（不影响训练记录）'))return;S.plans=S.plans.filter(function(x){return x.id!==editPlan.id;});editPlan=null;save();render();return;}
 if(act==='summary-close'){showSummary=null;render();return;}
 if(!a)return;
 if(act==='w'||act==='r'){if(j==null)return;var s=it.sets[j],stp=act==='w'?(defInc(it.ex,s.w)>=2.5?2.5:1):1;s[act]=Math.max(0,r1(s[act]+(+v)*stp));save();rSession();return;}
 if(act==='rir'){if(j==null)return;it.sets[j].rir=+v;save();rSession();return;}
 if(act==='done'){if(j==null)return;var st=it.sets[j];var e={id:uid(),date:a.date,exercise:it.ex,sets:1,reps:st.r,weight:st.w,rir:st.rir,rpe:10-st.rir,target:{reps:st.tr,weight:st.tw},session:a.id,note:'',wrist:!!it.wrist};
  S.workouts.push(e);st.done=true;st.eid=e.id;st.miss=st.r<st.tr;
  it.sets.forEach(function(s2,i2){if(i2>j&&!s2.done&&s2.w===s2.tw)s2.w=st.w;});
  if(curSet(a)==null){var nx=a.items.findIndex(function(x){return x.sets.some(function(s2){return!s2.done;});});if(nx>=0)a.cur=nx;}
  a.restTotal=it.rest;a.restEnd=Date.now()+it.rest*1000;adjOpen=false;save();tickRest();render();return;}
 if(act==='undo'){var s3=it.sets[+v];if(!s3||!s3.done)return;S.workouts=S.workouts.filter(function(x){return x.id!==s3.eid;});s3.done=false;s3.eid=null;s3.miss=false;save();render();return;}
 if(act==='flag'){it.wrist=!it.wrist;it.sets.forEach(function(s4){if(s4.eid){var w4=S.workouts.find(function(x){return x.id===s4.eid;});if(w4)w4.wrist=it.wrist;}});save();toast(it.wrist?'已标记'+flagLabel()+'，下次将保持重量':'已取消标记');rSession();return;}
 if(act==='pick'){a.cur=+v;save();render();return;}
 if(act==='addset'){var ls=it.sets[it.sets.length-1];it.sets.push({tw:ls.tw,tr:ls.tr,w:ls.w,r:ls.tr,rir:2,done:false});save();render();return;}
 if(act==='skip'){var nx2=a.items.findIndex(function(x,i){return i>a.cur&&x.sets.some(function(s2){return!s2.done;});});if(nx2<0)nx2=a.items.findIndex(function(x,i){return i!==a.cur&&x.sets.some(function(s2){return!s2.done;});});if(nx2>=0)a.cur=nx2;save();render();return;}
 if(act==='addex'){var ex=($('#ssEx').value||'').trim();if(!ex){toast('请输入动作名称');return;}a.items.push(newItem(ex,3));a.cur=a.items.length-1;save();render();return;}
 if(act==='rest-skip'){a.restEnd=null;save();rSession();return;}
 if(act==='rest-add'){a.restEnd=(a.restEnd||Date.now())+30000;a.restTotal+=30;save();rSession();return;}
 if(act==='finish'){var doneSets=a.items.reduce(function(n,x){return n+x.sets.filter(function(s){return s.done;}).length;},0);if(!doneSets){if(confirm('还没有完成任何一组，放弃本次训练？')){S.active=null;save();render();}return;}
  if(doneSets<a.items.reduce(function(n,x){return n+x.sets.length;},0)&&!confirm('还有未完成的组，确定结束？'))return;finishSession();return;}
 if(act==='discard'){if(!confirm('放弃本次训练并删除已记录的组？'))return;var ids=[];a.items.forEach(function(x){x.sets.forEach(function(s){if(s.eid)ids.push(s.eid);});});S.workouts=S.workouts.filter(function(x){return ids.indexOf(x.id)<0;});S.active=null;save();render();return;}}
function readPlanForm(){if(!editPlan)return;editPlan.name=($('#peName2')||{}).value||editPlan.name;editPlan.items.forEach(function(x,i){var g=function(f){var el=document.getElementById('pe-'+f+'-'+i);return el?el.value:null;};x.ex=(g('ex')||'').trim();x.sets=num(g('sets'))||3;x.lo=num(g('lo'))||8;x.hi=num(g('hi'));x.rule=g('rule')||'linear';});}
function finishSession(){var a=S.active,end=Date.now(),res=[],tot=0,vol0=0,prs=[];
 a.items.forEach(function(it){var ds=it.sets.filter(function(s){return s.done;});if(!ds.length)return;tot+=ds.length;var v=ds.reduce(function(n,s){return n+s.w*s.r;},0);vol0+=v;
  var best=Math.max.apply(null,ds.map(function(s){return epley({weight:s.w,reps:s.r})||0;})),prev=S.workouts.filter(function(w){return w.exercise===it.ex&&w.date<a.date;}).reduce(function(m,w){return Math.max(m,epley(w)||0);},0);
  if(best>0&&prev>0&&best>prev+0.05)prs.push(it.ex+' 估算1RM '+r1(best)+'kg（+'+r1(best-prev)+'）');
  res.push({ex:it.ex,sets:ds.map(function(s){return s.r+'×'+s.w;}).join(' / '),miss:ds.some(function(s){return s.miss;})});});
 var saved=sel;sel=addDays(a.date,1);res.forEach(function(r){var nt=nextTarget(r.ex);r.next=nt?nt.w+'kg × '+nt.reps:'';r.why=nt?nt.why:'';});sel=saved;
 var sm={id:a.id,date:a.date,name:a.name,start:a.start,end:end,sets:tot,volume:Math.round(vol0),prs:prs,items:res};S.sessions.push(sm);S.active=null;showSummary=sm.id;save();toast('训练完成');render();window.scrollTo(0,0);}
function tickRest(){if(restTimer)return;restTimer=setInterval(function(){var a=S.active;if(!a){clearInterval(restTimer);restTimer=null;return;}
 var el=document.getElementById('ssElapsed');if(el)el.textContent=fmtDur(Date.now()-a.start);
 if(a.restEnd){var left=a.restEnd-Date.now(),rt=document.getElementById('restT'),rb=document.getElementById('restB');
  if(left<=0){a.restEnd=null;save();if(navigator.vibrate)try{navigator.vibrate([200,100,200]);}catch(e){}toast('休息结束，开始下一组');if(cur==='train')rSession();}
  else{if(rt)rt.textContent=fmtDur(left);if(rb)rb.style.width=(left/(a.restTotal*1000)*100).toFixed(1)+'%';}}},500);}
var sessMore=false,plansOpen=false,adjOpen=false;
document.addEventListener('toggle',function(e){var id=e.target&&e.target.id;if(id==='ssMore')sessMore=e.target.open;else if(id==='ssPlans')plansOpen=e.target.open;},true);
function bestPlanFor(keys){var best=null,sc=0;S.plans.forEach(function(p){var n=0;p.items.forEach(function(it){if(musclesOf(it.ex).p.some(function(x){return keys.indexOf(x)>=0;}))n++;});var r=n/Math.max(1,p.items.length);if(r>sc){sc=r;best=p;}});return sc>=0.5?best:null;}
/** 今日推荐对应的计划：优先匹配已有计划，否则用通用模板（推/拉/下肢/全身） */
function recPlan(){var rc=recommend(),p=rc.keys&&rc.keys.length?bestPlanFor(rc.keys):null;if(p)return p;
 var nm={push:'推',pull:'拉',legs:'下肢'}[rc.split]||'全身 A',tp=PLAN_TPL.find(function(t){return t[0]===nm;});
 tp[1].forEach(function(x){if(!S.exRules[x[0]])S.exRules[x[0]]={rule:x[4],lo:x[4]==='double'?x[2]:null,hi:x[3]};});
 return{id:null,name:tp[0],items:tp[1].map(function(x){return{ex:x[0],sets:x[1],lo:x[2],hi:x[3],rule:x[4]};})};}
function rSession(){var box=$('#sessBox');if(!box)return;var a=S.active,pb0=$('#plansBox'),mw=$('#musWrap');if(pb0)pb0.innerHTML='';if(mw)mw.style.display=(a||showSummary||editPlan)?'none':'';
 if(showSummary){var sm=S.sessions.find(function(x){return x.id===showSummary;});if(sm){box.innerHTML='<div class="card"><div class="sess-h"><div><div class="mut">训练完成</div><h2 class="rec-t">'+esc(sm.name)+'</h2></div>'+IC('trophy')+'</div>'+
  '<div class="kpis"><div><b>'+fmtDur(sm.end-sm.start)+'</b><span>时长</span></div><div><b>'+sm.sets+'</b><span>组</span></div><div><b>'+(sm.volume>=1000?r1(sm.volume/1000)+'k':sm.volume)+'</b><span>kg</span></div><div><b>'+sm.prs.length+'</b><span>纪录</span></div></div>'+
  (sm.prs.length?'<div class="why">'+IC('medal')+'<span>'+sm.prs.map(esc).join('<br>')+'</span></div>':'')+
  '<ul class="list">'+sm.items.map(function(r){return'<li><div><b>'+esc(r.ex)+'</b> <span class="st">'+esc(r.sets)+'</span>'+(r.next?'<div class="mut">下次 '+esc(r.next)+' · '+esc(r.why)+'</div>':'')+'</div></li>';}).join('')+'</ul>'+
  '<button class="btn-big" data-ss="summary-close">完成</button></div>';return;}}
 if(a){tickRest();var total=0,dn=0;a.items.forEach(function(x){total+=x.sets.length;dn+=x.sets.filter(function(s){return s.done;}).length;});var it=a.items[a.cur],j=curSet(a),s=it&&j!=null?it.sets[j]:null;
  var h='<div class="card"><div class="sess-h"><div><div class="mut">'+esc(a.name)+' · '+dn+'/'+total+' 组</div><span class="big" id="ssElapsed">'+fmtDur(Date.now()-a.start)+'</span></div><button class="'+(dn===total?'':'ghost ')+'sm" data-ss="finish">'+IC('flag')+'结束</button></div><div class="pbar"><i style="width:'+(total?dn/total*100:0)+'%"></i></div></div>';
  if(a.restEnd&&a.restEnd>Date.now())h+='<div class="rest">'+IC('timer')+'<div><div class="mut" style="font-size:11px">休息</div><span class="big" id="restT">'+fmtDur(a.restEnd-Date.now())+'</span></div><div class="pbar"><i id="restB" style="width:'+((a.restEnd-Date.now())/(a.restTotal*1000)*100)+'%"></i></div><button class="ghost sm" data-ss="rest-add">+30秒</button><button class="ghost sm" data-ss="rest-skip">跳过</button></div>';
  if(dn===total)h+='<div class="card tc"><h2 class="rec-t">全部完成</h2><button class="btn-big" data-ss="finish">'+IC('check')+'完成训练</button></div>';
  else if(it){h+='<div class="card"><div class="exh"><h2>'+esc(it.ex)+'</h2><span class="mut">'+(s?'第 '+(j+1)+' / '+it.sets.length+' 组':'已完成')+'</span></div>';
   var rm=restrMatch(it.ex);if(rm)h+='<div class="alert warn">'+IC('bandage')+' 受限动作 · 可替代：'+esc(rm.alt||'')+'</div>';
   if(s){h+='<div class="target"><b>'+s.w+'</b><span>kg</span><i>×</i><b>'+s.r+'</b><span>次</span></div>';
    if(adjOpen)h+='<div class="stp"><div><label>重量</label><div class="v"><button data-ss="w" data-v="-1" aria-label="减重">'+IC('minus')+'</button><b>'+s.w+'</b><button data-ss="w" data-v="1" aria-label="加重">'+IC('plus')+'</button></div></div><div><label>次数</label><div class="v"><button data-ss="r" data-v="-1" aria-label="减少次数">'+IC('minus')+'</button><b>'+s.r+'</b><button data-ss="r" data-v="1" aria-label="增加次数">'+IC('plus')+'</button></div></div></div>'+
     '<label>余力 RIR</label><div class="rir">'+[0,1,2,3,4,5].map(function(k){return'<button data-ss="rir" data-v="'+k+'" class="'+(s.rir===k?'on':'')+'">'+(k===5?'5+':k)+'</button>';}).join('')+'</div>';
    h+='<div class="act2"><button class="btn-big" data-ss="done">'+IC('check')+'完成</button><button class="ghost btn-big" data-ss="adj">'+(adjOpen?'收起':'调整')+'</button></div>';}
   else h+='<button class="btn-big" data-ss="skip">'+IC('skip')+'下一个动作</button>';
   h+='</div>';}
  if(it)h+='<details class="card" id="ssMore"'+(sessMore?' open':'')+'><summary><b>更多</b> <span class="mut">目标说明 · 组 · 动作队列</span></summary>'+
   '<div class="why">'+IC('bulb')+'<span>'+RULE_LABEL[it.rule||'linear']+' · 目标 '+it.sets[0].tr+' 次'+(it.sets[0].tw?' @ '+it.sets[0].tw+'kg':'')+'。'+esc(it.why)+'</span></div>'+
   '<ul class="sets">'+it.sets.map(function(x,i){return'<li class="'+(i===j?'cur':'')+(x.done?' done':'')+(x.miss?' miss':'')+'" '+(x.done?'data-ss="undo" data-v="'+i+'" title="点按撤销"':'')+'><span class="mut">第'+(i+1)+'组</span><span>'+(x.done?'<b>'+x.r+' × '+x.w+'kg</b> · RIR '+x.rir:x.tr+' × '+x.tw+'kg')+'</span><span class="ck">'+(x.done?IC('check'):'')+'</span></li>';}).join('')+'</ul>'+
   '<div class="mut" style="font-size:12px">RIR＝还能再做几次（0 力竭，2 留两次，4 很轻松）；RPE＝10−RIR。点已完成的组可撤销。</div>'+
   '<div class="row" style="margin-top:8px"><button class="ghost sm" data-ss="addset">'+IC('plus')+'加一组</button><button class="ghost sm" data-ss="skip">'+IC('skip')+'下一个动作</button><button class="ghost sm" data-ss="flag" style="'+(it.wrist?'color:var(--warn)':'')+'">'+IC('bandage')+(it.wrist?'已标记':'')+esc(flagLabel())+'</button></div>'+
   '<h3 style="margin-top:12px">动作队列</h3><ul class="list queue">'+a.items.map(function(x,i){var d2=x.sets.filter(function(q){return q.done;}).length;return'<li data-ss="pick" data-v="'+i+'" class="'+(i===a.cur?'on':'')+'"><div><b>'+esc(x.ex)+'</b> <span class="st">'+d2+'/'+x.sets.length+'</span></div>'+(d2===x.sets.length?IC('check'):'')+'</li>';}).join('')+'</ul>'+
   '<div class="qrow"><input id="ssEx" list="exList" placeholder="添加动作"><button class="ghost" data-ss="addex">'+IC('plus')+'添加</button></div>'+
   '<div class="row" style="margin-top:8px"><button class="ghost sm" data-ss="discard" style="color:var(--bad)">放弃本次训练</button></div></details>';
  box.innerHTML=h;return;}
 if(editPlan){var e=editPlan;box.innerHTML='<div class="card"><h2>'+(e.id?'编辑计划':'新建计划')+'</h2><div><label>名称</label><input id="peName2" value="'+esc(e.name)+'" placeholder="如 上肢 A"></div><div style="margin-top:10px">'+
  e.items.map(function(x,i){return'<div class="pe-row"><div><label>动作</label><input id="pe-ex-'+i+'" list="exList" value="'+esc(x.ex)+'"></div><div><label>组</label><input id="pe-sets-'+i+'" type="number" value="'+x.sets+'"></div><div><label>次数</label><input id="pe-lo-'+i+'" type="number" value="'+(x.lo||'')+'"></div><div><label>上限</label><input id="pe-hi-'+i+'" type="number" value="'+(x.hi||'')+'" placeholder="-"></div></div>'+
   '<div class="pe-row2"><div><label>进阶规则</label><select id="pe-rule-'+i+'">'+Object.keys(RULE_LABEL).map(function(k){return'<option value="'+k+'"'+(x.rule===k?' selected':'')+'>'+RULE_LABEL[k]+(k==='double'?'（次数到上限再加重）':k==='linear'?'（做满即加重）':'')+'</option>';}).join('')+'</select></div><div></div><button class="del" data-ss="pe-del" data-v="'+i+'" aria-label="删除动作">'+IC('x')+'</button></div>';}).join('')+
  '</div><div class="row"><button class="ghost sm" data-ss="pe-add">'+IC('plus')+'添加动作</button></div><div class="row" style="margin-top:10px"><button data-ss="pe-save">保存</button><button class="ghost" data-ss="pe-cancel">取消</button>'+(e.id?'<button class="ghost" data-ss="pe-delplan" style="color:var(--bad)">删除</button>':'')+'</div></div>';return;}
 var rc=recommend();
 box.innerHTML='<div class="card"><div class="mut">今日推荐</div><h2 class="rec-t">'+esc(rc.title)+'</h2><div class="mut">'+esc(rc.why)+'</div><button class="btn-big'+(rc.rest?' ghost':'')+'" data-ss="rec">'+IC('play')+(rc.rest?'仍要训练':'开始今日推荐')+'</button></div>';
 var pb=$('#plansBox');if(pb)pb.innerHTML='<details class="card" id="ssPlans"'+(plansOpen?' open':'')+'><summary><b>其他计划</b> <span class="mut">'+(S.plans.length?S.plans.length+' 个':'模板 / 自由训练')+'</span></summary>'+
  S.plans.map(function(p){return'<div class="plan"><div><b>'+esc(p.name)+'</b><div class="mut">'+p.items.length+' 个动作 · '+esc(planMuscles(p).join('、'))+'</div></div><div class="row" style="gap:6px"><button class="ghost sm" data-ss="editplan" data-v="'+p.id+'" aria-label="编辑计划">'+IC('edit')+'</button><button class="sm" data-ss="start" data-plan="'+p.id+'">开始</button></div></div>';}).join('')+
  '<div class="row" style="margin-top:10px"><button class="ghost sm" data-ss="free">'+IC('play')+'自由训练</button><button class="ghost sm" data-ss="newplan">'+IC('plus')+'新建计划</button></div>'+
  '<div class="row" style="margin-top:8px"><span class="mut">从模板添加：</span>'+PLAN_TPL.map(function(t,i){return'<button class="chip" data-ss="tpl" data-v="'+i+'">'+t[0]+'</button>';}).join('')+'</div></details>';}

/* ---------- 自动化：快速输入 / 一键操作 / 训练建议 ---------- */
/** 当前时段默认餐次 */
function mealByHour(){var h=new Date().getHours();return h<10?'早餐':h<14?'午餐':h<17?'加餐':h<21?'晚餐':'加餐';}
function normName(n){return String(n).replace(/[（(].*?[）)]/g,'').replace(/\s/g,'').toLowerCase();}
/** 在食物库中匹配名称：自定义优先；完全相等 > 文本包含最长关键字 > 关键字包含文本 */
function matchFood(name){var t=normName(name);if(!t)return null;var best=null,score=0,cs=(S.customFoods||[]),list=cs.concat(FOOD_DB.foods||[]);
 list.forEach(function(f){var bonus=f.custom?5:0;[f.name].concat(f.aliases||[]).forEach(function(k){k=normName(k);if(!k)return;var sc=0;if(k===t)sc=1000+bonus*100;else if(t.indexOf(k)>=0)sc=100+k.length+bonus;else if(k.indexOf(t)>=0&&t.length>=2)sc=50+t.length+bonus;if(sc>score){score=sc;best=f;}});});return best;}
var CN_NUM={'半':0.5,'一':1,'两':2,'二':2,'三':3,'四':4,'五':5,'六':6};
var COUNT_UNITS='个|只|勺|碗|杯|片|根|盒|份|袋|瓶|块|把',KCAL_UNITS='kcal|千卡|大卡|卡';
/** 解析一行文字为营养估算：如 "鸡胸肉200g 米饭1碗 鸡蛋2个"、"外卖 650"（只填热量）、自定义食物或组合名 */
function parseQuick(text){var out={items:[],miss:[]},cs=(S.customFoods||[]).filter(function(f){return f.custom;}).sort(function(a,b){return b.name.length-a.name.length;});
 var U='(?:'+KCAL_UNITS+'|kg|g|克|ml|毫升|'+COUNT_UNITS+')';
 text=String(text||'');
 // 自定义名称（可能含 + 等分隔符）先整体替换为占位符，保证优先匹配
 cs.forEach(function(f,i){if(f.name&&text.indexOf(f.name)>=0)text=text.split(f.name).join(' \u0001'+i+'\u0001');});
 text=text.replace(new RegExp('([半一两二三四五六])('+COUNT_UNITS+')','g'),function(m,a,b){return CN_NUM[a]+b;})
  .replace(new RegExp('([^\\s\\d,，、;；+])\\s+(\\d+(?:\\.\\d+)?\\s*'+U+'?)(?=$|[\\s,，、;；+])','gi'),'$1$2');
 text.split(/[，,、;；\n+]+|\s+/).forEach(function(tok){tok=tok.trim();if(!tok)return;
  var name=tok,q=null,u='',m=tok.match(new RegExp('^(.*?)(\\d+(?:\\.\\d+)?)\\s*('+U+')?$','i'));
  if(m&&m[1]){name=m[1];q=+m[2];u=(m[3]||'').toLowerCase();}else{m=tok.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*('+U+')?(.+)$','i'));if(m){q=+m[1];u=(m[2]||'').toLowerCase();name=m[3];}}
  var ph=name.match(/^\u0001(\d+)\u0001$/),label=ph?cs[+ph[1]].name:name;
  if(new RegExp('^(?:'+KCAL_UNITS+')$','i').test(u)){out.items.push({name:label,kcal:q,p:0,c:0,f:0,src:'quick',kcalOnly:true});return;}
  var fav=!ph&&S.favFoods.find(function(x){return normName(x.food)===normName(name);});
  if(fav&&(!u||u==='份')){var k=q||1;out.items.push({name:fav.food+(k!==1?' ×'+k:''),kcal:fav.kcal*k,p:fav.p*k,c:fav.c*k,f:fav.f*k,src:'custom'});return;}
  var f=ph?cs[+ph[1]]:matchFood(name);
  if(!f){if(q!=null&&!u&&q>=50&&name){out.items.push({name:name,kcal:q,p:0,c:0,f:0,src:'quick',kcalOnly:true});return;}out.miss.push(tok.replace(/\u0001(\d+)\u0001/,function(x,i){return cs[+i].name;}));return;}
  var units=unitsOf(f),g,amt=q,unit=u||'';
  if(u==='g'||u==='克'||u==='ml'||u==='毫升')g=q;else if(u==='kg')g=q*1000;
  else if(u){if(units[u])g=q*units[u];else{out.miss.push(label+q+u+'（未知单位）');return;}}
  else if(q!=null){var fu=Object.keys(units)[0];if(q>=10||!fu){g=q;unit='g';}else{g=q*units[fu];unit=fu;}}
  else{var fu2=Object.keys(units)[0];g=fu2?units[fu2]:100;amt=fu2?1:100;unit=fu2||'g';}
  if(unit==='克')unit='g';
  var it=fromFood(f,g,amt,unit);it.name=f.custom?(f.name+(unit==='份'&&amt!==1?' ×'+amt:unit!=='份'?' '+Math.round(g)+'g':'')):it.name+' '+Math.round(g)+'g';out.items.push(it);});
 return out;}
function qPreview(inp,box){var v=$(inp).value.trim();if(!v){if(inp==='#qText')$(box).textContent='';else $(box).textContent='';return;}var r=parseQuick(v),k=0,p=0;r.items.forEach(function(i){k+=i.kcal;p+=i.p;});
 $(box).innerHTML=(r.items.length?'估算 '+Math.round(k)+' kcal · 蛋白 '+r1(p)+'g（'+r.items.map(function(i){return esc(i.name)+(i.kcalOnly?' 仅热量':'');}).join('、')+'）':'')+(r.miss.length?' <span style="color:var(--warn)">未识别：'+esc(r.miss.join('、'))+'</span>':'');}
function quickAdd(inp,box){var r=parseQuick($(inp).value);if(!r.items.length){toast(r.miss.length?'未识别：'+r.miss.join('、'):'请输入内容');return;}var meal=cur==='diet'?dMeal():mealByHour();
 r.items.forEach(function(i){i.meal=meal;S.meals.push(mkMeal(i));});save();$(inp).value='';$(box).textContent='';
 toast('已记入'+meal+' '+r.items.length+' 项'+(r.miss.length?'，未识别 '+r.miss.length+' 项':''));render();}
['#qText2'].forEach(function(id){var box='#qPrev2';$(id).addEventListener('input',function(){qPreview(id,box);});$(id).addEventListener('keydown',function(e){if(e.key==='Enter')quickAdd(id,box);});});
$('#qAdd2').onclick=function(){quickAdd('#qText2','#qPrev2');};
/** 一键：补剂全部打卡 */
function suppAll(){var L=S.suppLog[sel]||(S.suppLog[sel]={}),n=new Date(),at=pad(n.getHours())+':'+pad(n.getMinutes());S.supps.forEach(function(s){if(!L[s.id])L[s.id]={at:at};});save();toast('补剂已全部打卡');render();}
/** 一键：重复昨天饮食 */
function repeatDiet(){var y=addDays(sel,-1),src=dayMeals(y);if(!src.length){toast('昨天没有饮食记录');return;}if(dayMeals(sel).length&&!confirm('当日已有记录，仍追加昨天的 '+src.length+' 条？'))return;
 src.forEach(function(m){var o=JSON.parse(JSON.stringify(m));o.id=uid();o.date=sel;S.meals.push(o);});save();toast('已复制昨天 '+src.length+' 条');render();}
/** 一键：重复上次训练（复制最近一次训练日的所有动作） */
function repeatTrain(){var ds=S.workouts.filter(function(w){return w.date<sel;}).map(function(w){return w.date;}).sort();if(!ds.length){toast('没有更早的训练记录');return;}var d=ds[ds.length-1],src=S.workouts.filter(function(w){return w.date===d;});
 if(S.workouts.some(function(w){return w.date===sel;})&&!confirm('当日已有训练，仍追加 '+d+' 的 '+src.length+' 项？'))return;
 src.forEach(function(w){S.workouts.push({id:uid(),date:sel,exercise:w.exercise,sets:w.sets,reps:w.reps,weight:w.weight,rpe:null,note:'',wrist:false});});save();toast('已复制 '+d.slice(5)+' 的 '+src.length+' 项（RPE 待填）');render();}
/** 睡眠：最近一次记录（早于给定日期） */
function lastSleepBefore(d){return S.sleep.filter(function(x){return x.date<d;}).sort(function(a,b){return a.date<b.date?1:-1;})[0]||null;}
function reuseSleep(){var l=lastSleepBefore(sel);if(!l){toast('没有可沿用的睡眠记录');return;}S.sleep=S.sleep.filter(function(x){return x.date!==sel;});S.sleep.push({id:uid(),date:sel,bed:l.bed,wake:l.wake,dur:l.dur,q:l.q,note:'沿用上次'});save();toast('已沿用 '+l.bed+'→'+l.wake);render();}
/** 训练：自动带出上次组数/次数/重量，并给出加重建议 */
function lastSet(ex){return S.workouts.filter(function(w){return w.exercise===ex&&w.date<=sel;}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;})[0]||null;}
function autoFill(){var ex=$('#wEx').value.trim(),p=ex&&lastSet(ex);if(!p){$('#wSug').innerHTML='';return;}
 if(!$('#wS').value)$('#wS').value=p.sets;if(!$('#wR').value)$('#wR').value=p.reps;if(!$('#wW').value)$('#wW').value=p.weight;
 var nt=nextTarget(ex);if(!nt){$('#wSug').innerHTML='';return;}
 $('#wSug').innerHTML='<div class="sug"><span>'+IC('bulb')+' 下次 '+nt.w+'kg × '+nt.reps+'：'+esc(nt.why)+'</span>'+(nt.w!==p.weight||nt.reps!==p.reps?'<button class="sm" id="wUseSug" data-w="'+nt.w+'" data-r="'+nt.reps+'">采用</button>':'')+'</div>';}
$('#wEx').addEventListener('change',autoFill);
$('#dRepeat').onclick=repeatDiet;$('#wRepeat').onclick=repeatTrain;$('#sAll').onclick=suppAll;$('#slReuse').onclick=reuseSleep;

/* ---------- 批量导入 CSV ---------- */
var CSV_ALIAS={'日期':'date','餐次':'meal','食物':'food','热量':'kcal','蛋白质':'p','蛋白':'p','碳水':'c','脂肪':'f','动作':'exercise','组数':'sets','次数':'reps','重量':'weight','备注':'note','体重':'weight','体脂':'bf','腰围':'waist','静息心率':'rhr','入睡':'bed','起床':'wake','质量':'q','指标':'name','数值':'value','单位':'unit','下限':'lo','上限':'hi','时长':'min','层数':'floors','心率':'hr','泳姿':'stroke','距离':'dist','用时':'time','swolf':'swolf'};
/** 类型识别顺序即优先级；cols 为模板列 */
var CSV_TYPES=[['workouts','力量训练',['date','exercise','sets','reps','weight','rpe','note'],['exercise','sets','reps']],['meals','饮食',['date','meal','food','kcal','p','c','f'],['food']],['labs','化验',['date','name','value','unit','lo','hi','note'],['name','value']],
 ['sleep','睡眠',['date','bed','wake','q','note'],['bed','wake']],['swims','游泳',['date','stroke','dist','time','swolf','note'],['stroke','dist']],['cardio','爬楼',['date','min','floors','hr'],['min']],['body','身体指标',['date','weight','bf','waist','rhr'],[]]];
function parseCSV(txt){txt=txt.replace(/^\ufeff/,'');var rows=[],row=[],f='',q=false;for(var i=0;i<txt.length;i++){var ch=txt[i];
 if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
 else if(ch==='"')q=true;else if(ch===','){row.push(f);f='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=ch;}
 if(f||row.length){row.push(f);rows.push(row);}return rows.filter(function(r){return r.some(function(c){return c.trim();});});}
function normDate(s){var m=String(s||'').trim().match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);return m?m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]):null;}
function normTime(s){var m=String(s||'').trim().match(/^(\d{1,2}):(\d{2})/);return m?pad(+m[1])+':'+m[2]:null;}
function importCSV(txt){var rows=parseCSV(txt);if(rows.length<2)throw new Error('至少需要表头和一行数据');
 var hd=rows[0].map(function(h){h=h.trim();return CSV_ALIAS[h]||h.toLowerCase();});
 var type=CSV_TYPES.find(function(t){return hd.indexOf('date')>=0&&t[3].every(function(c){return hd.indexOf(c)>=0;})&&(t[3].length||['weight','bf','waist','rhr'].some(function(c){return hd.indexOf(c)>=0;}));});
 if(!type)throw new Error('无法识别类型，请检查表头（需含 date 列）');
 var data=rows.slice(1).map(function(r){var o={};hd.forEach(function(h,i){o[h]=(r[i]||'').trim();});return o;}),ok=0,bad=0;
 if(!confirm('识别为「'+type[1]+'」，共 '+data.length+' 行，确定导入？'))return null;
 data.forEach(function(o){var d=normDate(o.date);if(!d){bad++;return;}var n=function(k){return num(o[k]);};
  if(type[0]==='meals'){var p=n('p')||0,c=n('c')||0,f=n('f')||0,k=n('kcal');if(k==null)k=p*4+c*4+f*9;S.meals.push({id:uid(),date:d,meal:o.meal||'加餐',food:o.food,kcal:k,p:p,c:c,f:f});}
  else if(type[0]==='workouts'){if(!n('sets')||!n('reps')){bad++;return;}S.workouts.push({id:uid(),date:d,exercise:o.exercise,sets:n('sets'),reps:n('reps'),weight:n('weight')||0,rpe:n('rpe'),note:o.note||'',wrist:false});}
  else if(type[0]==='labs'){if(n('value')==null){bad++;return;}S.labs.push({id:uid(),date:d,name:o.name,value:n('value'),unit:o.unit||'',lo:n('lo'),hi:n('hi'),note:o.note||''});}
  else if(type[0]==='sleep'){var b=normTime(o.bed),w=normTime(o.wake);if(!b||!w){bad++;return;}S.sleep=S.sleep.filter(function(x){return x.date!==d;});S.sleep.push({id:uid(),date:d,bed:b,wake:w,dur:sleepDur(b,w),q:n('q'),note:o.note||''});}
  else if(type[0]==='swims'){if(!n('dist')){bad++;return;}S.swims.push({id:uid(),date:d,stroke:o.stroke,dist:n('dist'),sec:parseT(o.time),swolf:n('swolf'),note:o.note||''});}
  else if(type[0]==='cardio'){if(!n('min')){bad++;return;}S.cardio.push({id:uid(),date:d,min:n('min'),floors:n('floors'),hr:n('hr')});}
  else if(type[0]==='body'){var ob={weight:n('weight'),bf:n('bf'),waist:n('waist'),rhr:n('rhr')};if(ob.weight==null&&ob.bf==null&&ob.waist==null&&ob.rhr==null){bad++;return;}S.body=S.body.filter(function(x){return x.date!==d;});ob.id=uid();ob.date=d;S.body.push(ob);}
  ok++;});
 save();return type[1]+'：导入 '+ok+' 行'+(bad?'，跳过 '+bad+' 行无效':'');}
function download(name,content,mime){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
$('#csvTpl').innerHTML='<span class="mut">下载模板：</span>'+CSV_TYPES.map(function(t,i){return'<button class="chip" data-csvtpl="'+i+'">'+t[1]+'</button>';}).join('');
$('#csvBtn').onclick=function(){$('#csvFile').click();};
$('#csvFile').onchange=function(){var f=this.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var m=importCSV(rd.result);if(m){toast(m);render();}}catch(e){toast('导入失败：'+e.message);}};rd.readAsText(f);this.value='';};

/* ---------- 设置：个人配置 / 示例配置 / 自定义食物库 ---------- */
function rSettings(){var pf=S.profile;$('#pfName').value=pf.name||'';$('#pfH').value=pf.height||'';$('#pfFlag').value=pf.injuryFlagLabel||'';
 $('#exList2').innerHTML=EXAMPLE_PROFILES.length?EXAMPLE_PROFILES.map(function(e,i){return'<li><div><b>'+esc(e.title)+'</b><div class="mut">'+esc(e._comment||'')+'</div></div><button class="ghost sm" data-applyex="'+i+'">加载</button></li>';}).join(''):'<li class="mut">无内置示例</li>';
 $('#cfInfo').textContent='内置 '+(FOOD_DB.foods||[]).length+' 项 · 自定义 '+(S.customFoods||[]).length+' 项';
 var g=S.goals;$('#gSl').value=g.sleepH;$('#gTd').value=g.trainDays;$('#gSt').value=g.stairMin;$('#gWt').value=g.weight!=null?g.weight:'';}
$('#pfSave').onclick=function(){S.profile.name=$('#pfName').value.trim();S.profile.height=num($('#pfH').value);S.profile.injuryFlagLabel=$('#pfFlag').value.trim()||'伤处不适';save();applyTitle();toast('已保存');};
function applyTitle(){var n=S.profile.name;document.title=(n?n+' · ':'')+'FreeBody';}
/** 应用示例配置：合并个人配置与清单（追加，不删除已有数据，不写入任何记录） */
function applyExample(e){if(!confirm('加载「'+e.title+'」？将合并其配置与清单（伤病、受限动作、康复动作等），不会删除已有记录。'))return;
 if(e.profile)for(var k in e.profile)S.profile[k]=e.profile[k];if(e.run800Hist!=null&&S.run800Hist==null)S.run800Hist=e.run800Hist;
 [['injuries',['name','desc','status']],['rehab',['name','dose']],['restricted',['name','alt']]].forEach(function(spec){(e[spec[0]]||[]).forEach(function(it){if(S[spec[0]].some(function(x){return x.name===it.name;}))return;var o={id:uid()};spec[1].forEach(function(f){o[f]=it[f]||'';});S[spec[0]].push(o);});});
 save();applyTitle();toast('示例配置已加载');render();}
$('#cfBtn').onclick=function(){$('#cfFile').click();};
/** 导入自定义食物库：格式同 data/foods.json（{foods:[...]}）或直接为数组 */
$('#cfFile').onchange=function(){var f=this.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var d=JSON.parse(rd.result),arr=Array.isArray(d)?d:d.foods;if(!Array.isArray(arr))throw new Error('缺少 foods 数组');
 var ok=arr.filter(function(x){return x&&x.name&&[x.kcal,x.p,x.c,x.f].every(function(v){return typeof v==='number'&&v>=0;});});
 ok.forEach(function(x){S.customFoods=S.customFoods.filter(function(y){return y.name!==x.name;});S.customFoods.push({id:x.id||uid(),name:x.name,category:x.category||'自定义',kcal:x.kcal,p:x.p,c:x.c,f:x.f,aliases:Array.isArray(x.aliases)?x.aliases:undefined,units:x.units&&typeof x.units==='object'?x.units:undefined,servings:Array.isArray(x.servings)?x.servings:undefined,na:typeof x.na==='number'?x.na:undefined,fib:typeof x.fib==='number'?x.fib:undefined,source:x.source||'自定义导入',custom:true});});
 save();toast('导入 '+ok.length+' 项'+(arr.length-ok.length?'，跳过 '+(arr.length-ok.length)+' 项无效':''));render();}catch(e){toast('导入失败：'+e.message);}};rd.readAsText(f);this.value='';};
$('#cfClear').onclick=function(){if(confirm('清空自定义食物？')){S.customFoods=[];save();render();}};
$('#g2Save').onclick=function(){var a=num($('#gSl').value),b=num($('#gTd').value),c=num($('#gSt').value);if(a)S.goals.sleepH=a;if(b)S.goals.trainDays=b;if(c)S.goals.stairMin=c;S.goals.weight=num($('#gWt').value);save();toast('已保存');};
$('#exp').onclick=function(){var blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='freebody-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);toast('已导出');};
$('#impBtn').onclick=function(){$('#imp').click();};
$('#exFile').onchange=function(){var f=this.files[0],inp=this;if(!f)return;var rd=new FileReader();rd.onload=function(){try{var d=JSON.parse(rd.result);if(!d||typeof d!=='object'||Array.isArray(d)||d.meals)throw new Error('不是配置文件（完整备份请用「数据备份」导入）');if(!d.title)d.title=f.name;applyExample(d);}catch(err){toast('读取失败：'+err.message);}inp.value='';};rd.readAsText(f);};
$('#exFileBtn').onclick=function(){$('#exFile').click();};
$('#imp').onchange=function(){var f=this.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var d=JSON.parse(rd.result);if(!d||typeof d!=='object'||!Array.isArray(d.meals)||!d.goals)throw new Error('格式不符');
 if(!confirm('导入将覆盖当前全部数据，确定？'))return;localStorage.setItem(KEY,JSON.stringify(d));S=load();applyTheme();applyTitle();toast('导入成功');render();}catch(e){toast('导入失败：'+e.message);}};rd.readAsText(f);this.value='';};
$('#wipe').onclick=function(){if(confirm('确定清空全部数据？建议先导出备份。')&&confirm('再次确认：不可恢复')){localStorage.removeItem(KEY);S=load();save();toast('已清空');render();}};

/* 通用点击：删除/模板 */
document.addEventListener('click',function(e){var t=e.target.closest('button,input[type=checkbox]');if(!t)return;var a;
 if((a=t.getAttribute('data-delmeal'))){S.meals=S.meals.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delw'))){S.workouts=S.workouts.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delsw'))){S.swims=S.swims.filter(function(x){return x.id!==a;});}
 else if(t.id==='ovSuppAll'){suppAll();return;}
 else if(t.id==='ovDietRepeat'){repeatDiet();return;}
 else if(t.id==='ovSlReuse'){reuseSleep();return;}
 else if(t.id==='wUseSug'){$('#wW').value=t.getAttribute('data-w');if(t.getAttribute('data-r'))$('#wR').value=t.getAttribute('data-r');$('#wSug').innerHTML='';return;}
 else if((a=t.getAttribute('data-csvtpl'))!=null){var ct=CSV_TYPES[+a];download('template-'+ct[0]+'.csv','\ufeff'+ct[2].join(',')+'\n','text/csv');return;}
 else if(t.hasAttribute('data-ss')){sessAction(t.getAttribute('data-ss'),t);return;}
 else if((a=t.getAttribute('data-mapmode'))){mapMode=a;render();return;}
 else if((a=t.getAttribute('data-rngk'))){RANGE[a]=+t.getAttribute('data-rngv');render();return;}
 else if((a=t.getAttribute('data-delpt'))){S.perfLog=S.perfLog.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-ptev'))){ptEv=a;render();return;}
 else if((a=t.getAttribute('data-applyex'))!=null){applyExample(EXAMPLE_PROFILES[+a]);return;}
 else if((a=t.getAttribute('data-delrs'))){S.restricted=S.restricted.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delrh'))){S.rehab=S.rehab.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delinj'))){if(!confirm('删除该伤病档案？'))return;S.injuries=S.injuries.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-injst'))){var ij=S.injuries.find(function(x){return x.id===a;});if(ij)ij.status=ij.status==='已恢复'?'康复中':'已恢复';}
 else if((a=t.getAttribute('data-rh'))){var RL=S.rehabLog[sel]||(S.rehabLog[sel]={});if(t.checked)RL[a]=1;else delete RL[a];}
 else if((a=t.getAttribute('data-delrn'))){S.run800=S.run800.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delpb'))){S.pb100br=S.pb100br.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delc'))){S.cardio=S.cardio.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delsl'))){S.sleep=S.sleep.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delb'))){S.body=S.body.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-dellab'))){S.labs=S.labs.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delsup'))){if(!confirm('从清单删除该补剂？'))return;S.supps=S.supps.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-sup'))){var L=S.suppLog[sel]||(S.suppLog[sel]={});if(t.checked){var n=new Date();L[a]={at:pad(n.getHours())+':'+pad(n.getMinutes())};}else delete L[a];}
 else if((a=t.getAttribute('data-edsup'))){var s=S.supps.find(function(x){return x.id===a;});if(s){$('#sName').value=s.name;$('#sDose').value=s.dose||'';$('#sTime').value=s.time||'';editSup=a;$('#sAdd').textContent='保存修改';$('#sName').focus();}return;}
 else if((a=t.getAttribute('data-food'))!=null){pickFood=allFoods()[+a];if(pickFood){if(!$('#mG').value)$('#mG').value=100;applyFood();}$('#mG').focus();return;}
 else if((a=t.getAttribute('data-fav'))!=null){var f=S.favFoods[+a];if(f){$('#mFood').value=f.food;$('#mP').value=f.p;$('#mC').value=f.c;$('#mF').value=f.f;$('#mK').value=f.kcal;}return;}
 else if((a=t.getAttribute('data-ex'))){$('#wEx').value=a;['#wS','#wR','#wW'].forEach(function(s){$(s).value='';});lastHint();restrHint();autoFill();$('#wS').focus();return;}
 else if((a=t.getAttribute('data-lab'))!=null){var p=LAB_PRESETS[+a];$('#lbName').value=p[0];$('#lbName').dispatchEvent(new Event('change'));if(!$('#lbUnit').value)$('#lbUnit').value=p[1];$('#lbVal').focus();return;}
 else return;
 save();render();});
/* 长按删除常用食物 */
(function(){var tm;document.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-fav]');if(!b)return;tm=setTimeout(function(){var i=+b.getAttribute('data-fav');if(confirm('删除常用「'+S.favFoods[i].food+'」？')){S.favFoods.splice(i,1);save();render();}},650);});['pointerup','pointerleave','pointercancel'].forEach(function(ev){document.addEventListener(ev,function(){clearTimeout(tm);});});})();

var rz;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(render,200);});
if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',render);
if(window.FitIcons)FitIcons.hydrate();
if(S.active)setTimeout(tickRest,0);
applyTheme();applyTitle();show('overview');
// 调试/测试钩子（不影响正常使用）
window.__freeBody={get state(){return S;},show:show,otSignals:otSignals,_importCSV:importCSV,_parseQuick:parseQuick,_weightETA:weightETA,_calcTarget:calcTarget,_tgtCfg:tgtCfg,_nextTarget:nextTarget,_muscleState:muscleState,_recommend:recommend};
})();
