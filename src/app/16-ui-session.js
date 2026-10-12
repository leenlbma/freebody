/* 16-ui-session.js — 肌群热图、训练计划与按组训练 */
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
 $('#mapLegend').innerHTML=mapMode==='status'?'<div class="mlg">'+[['recovered','已恢复','var(--mu-rec)'],['recovering','恢复中','var(--mu-ing)'],['fatigued','疲劳高','var(--mu-fat)'],['stale','太久没练','var(--mu-old)'],['never','未训练','var(--mu-no)']].map(function(x){return'<span><i style="background:'+x[2]+'"></i>'+x[1]+'</span>';}).join('')+'</div>':'<div class="mlg"><span>颜色越深 = 近7天有效组数越多</span></div>';
 var k=musSel;$('#musDetail').innerHTML=k?'<div class="mdet"><div class="hrow"><b>'+MUS[k][0]+'</b><span class="st-tag st-'+st[k].status+'">'+ST_LABEL[st[k].status]+'</span></div><div class="mut" style="margin-top:4px">近7天有效组数 '+r1(st[k].sets7)+' · 剩余疲劳 '+r1(st[k].f)+' 组 · '+(st[k].last?'上次训练 '+st[k].last:'暂无记录')+(st[k].eta?' · 约 '+st[k].eta+' 小时后恢复':'')+' · 恢复半衰期 '+MUS[k][1]+'h</div></div>':'<div class="mut" style="text-align:center;margin-top:6px">点按肌群查看详情</div>';
 $('#musList').innerHTML='<ul class="list tight">'+Object.keys(MUS).map(function(k){var s=st[k];return'<li data-mus="'+k+'" style="cursor:pointer"><div><b>'+MUS[k][0]+'</b> <span class="st">近7天 '+r1(s.sets7)+' 组'+(s.last?' · '+(s.days===0?'今天':s.days+'天前'):'')+'</span></div><span class="st-tag st-'+s.status+'">'+ST_LABEL[s.status]+'</span></li>';}).join('')+'</ul>';}
function planHint(keys){var best=null,sc=0;S.plans.forEach(function(p){var n=0;p.items.forEach(function(it){var m=musclesOf(it.ex).p;if(m.some(function(x){return keys.indexOf(x)>=0;}))n++;});if(n/Math.max(1,p.items.length)>sc){sc=n/p.items.length;best=p;}});
 return best&&sc>=0.5?'<div class="actions"><button data-ss="start" data-plan="'+best.id+'">'+IC('play')+'开始「'+esc(best.name)+'」</button></div>':'';}
document.addEventListener('click',function(e){var li=e.target.closest&&e.target.closest('li[data-ss]');if(li&&!e.target.closest('button')){sessAction(li.getAttribute('data-ss'),li);}});
document.addEventListener('click',function(e){var m=e.target.closest&&e.target.closest('[data-mus]');if(m&&cur==='train'){musSel=m.getAttribute('data-mus');rMuscle();}});

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
 if(act==='done'){if(j==null)return;var st=it.sets[j];
  if(!(st.r>0)){toast('次数为 0，不计入本组；请先点「调整」填写次数');adjOpen=true;render();return;}
  if(!(st.w>0)&&!it.zeroOk){if(!confirm('当前重量为 0 kg。\n自重动作可直接记录；负重动作请先点「调整」填写重量。\n\n确定按 0 kg（自重）记录？')){adjOpen=true;render();return;}it.zeroOk=true;}
  var e={id:uid(),date:a.date,exercise:it.ex,sets:1,reps:st.r,weight:st.w,rir:st.rir,rpe:10-st.rir,target:{reps:st.tr,weight:st.tw},session:a.id,note:'',wrist:!!it.wrist};
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
/** 会话小结的组记录（存储格式「次×kg」保持不变，仅显示时转换）：5×60 → 5 次 × 60 kg；5×0 → 5 次 · 自重 */
function fmtSessSets(t){var parts=String(t||'').split(' / '),out=[],i=0;while(i<parts.length){var m=/^(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)$/.exec(parts[i]),k=1;while(i+k<parts.length&&parts[i+k]===parts[i])k++;
  var s=m?(+m[2]>0?m[1]+' 次 × '+m[2]+' kg':m[1]+' 次 · 自重'):parts[i];out.push(k>1?k+' 组 '+s:s);i+=k;}return out.join(' / ');}
function finishSession(){var a=S.active,end=Date.now(),res=[],tot=0,vol0=0,prs=[];
 a.items.forEach(function(it){var ds=it.sets.filter(function(s){return s.done&&s.r>0;});if(!ds.length)return;tot+=ds.length;var v=ds.reduce(function(n,s){return n+s.w*s.r;},0);vol0+=v;
  var best=Math.max.apply(null,ds.map(function(s){return epley({weight:s.w,reps:s.r})||0;})),prev=S.workouts.filter(function(w){return w.exercise===it.ex&&w.date<a.date;}).reduce(function(m,w){return Math.max(m,epley(w)||0);},0);
  if(best>0&&prev>0&&best>prev+0.05)prs.push(it.ex+' 估算1RM '+r1(best)+'kg（+'+r1(best-prev)+'）');
  res.push({ex:it.ex,sets:ds.map(function(s){return s.r+'×'+s.w;}).join(' / '),miss:ds.some(function(s){return s.miss;})});});
 var saved=sel;sel=addDays(a.date,1);res.forEach(function(r){var nt=nextTarget(r.ex);r.next=nt?(nt.w>0?nt.w+' kg × '+nt.reps+' 次':nt.reps+' 次（自重）'):'';r.why=nt?nt.why:'';});sel=saved;
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
  '<div class="kpis"><div><b>'+fmtDur(sm.end-sm.start)+'</b><span>时长</span></div><div><b>'+sm.sets+'</b><span>组</span></div><div><b>'+(!sm.volume?'—':sm.volume>=1000?r1(sm.volume/1000)+'k':sm.volume)+'</b><span>训练量 kg</span></div><div><b>'+sm.prs.length+'</b><span>纪录</span></div></div>'+
  (sm.prs.length?'<div class="why">'+IC('medal')+'<span>'+sm.prs.map(esc).join('<br>')+'</span></div>':'')+
  '<ul class="list">'+sm.items.map(function(r){return'<li><div><b>'+esc(r.ex)+'</b> <span class="st">'+esc(fmtSessSets(r.sets))+'</span>'+(r.next?'<div class="mut">下次 '+esc(r.next)+' · '+esc(r.why)+'</div>':'')+'</div></li>';}).join('')+'</ul>'+
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
   '<div class="actions"><button class="ghost sm" data-ss="addset">'+IC('plus')+'加一组</button><button class="ghost sm" data-ss="skip">'+IC('skip')+'下一个动作</button><button class="ghost sm" data-ss="flag" style="'+(it.wrist?'color:var(--warn)':'')+'">'+IC('bandage')+(it.wrist?'已标记':'')+esc(flagLabel())+'</button></div>'+
   '<h3 style="margin-top:12px">动作队列</h3><ul class="list queue">'+a.items.map(function(x,i){var d2=x.sets.filter(function(q){return q.done;}).length;return'<li data-ss="pick" data-v="'+i+'" class="'+(i===a.cur?'on':'')+'"><div><b>'+esc(x.ex)+'</b> <span class="st">'+d2+'/'+x.sets.length+'</span></div>'+(d2===x.sets.length?IC('check'):'')+'</li>';}).join('')+'</ul>'+
   '<div class="qrow"><input id="ssEx" list="exList" placeholder="添加动作"><button class="ghost" data-ss="addex">'+IC('plus')+'添加</button></div>'+
   '<div class="danger-zone"><button class="danger" data-ss="discard">放弃本次训练</button></div></details>';
  box.innerHTML=h;return;}
 if(editPlan){var e=editPlan;box.innerHTML='<div class="card"><h2>'+(e.id?'编辑计划':'新建计划')+'</h2><div><label>名称</label><input id="peName2" value="'+esc(e.name)+'" placeholder="如 上肢 A"></div><div style="margin-top:10px">'+
  e.items.map(function(x,i){return'<div class="pe-row"><div><label>动作</label><input id="pe-ex-'+i+'" list="exList" value="'+esc(x.ex)+'"></div><div><label>组</label><input id="pe-sets-'+i+'" type="number" value="'+x.sets+'"></div><div><label>次数</label><input id="pe-lo-'+i+'" type="number" value="'+(x.lo||'')+'"></div><div><label>上限</label><input id="pe-hi-'+i+'" type="number" value="'+(x.hi||'')+'" placeholder="-"></div></div>'+
   '<div class="pe-row2"><div><label>进阶规则</label><select id="pe-rule-'+i+'">'+Object.keys(RULE_LABEL).map(function(k){return'<option value="'+k+'"'+(x.rule===k?' selected':'')+'>'+RULE_LABEL[k]+(k==='double'?'（次数到上限再加重）':k==='linear'?'（做满即加重）':'')+'</option>';}).join('')+'</select></div><div></div><button class="del" data-ss="pe-del" data-v="'+i+'" aria-label="删除动作">'+IC('x')+'</button></div>';}).join('')+
  '</div><div class="actions"><button class="ghost sm" data-ss="pe-add">'+IC('plus')+'添加动作</button></div><div class="actions"><button data-ss="pe-save">保存</button><button class="ghost" data-ss="pe-cancel">取消</button>'+(e.id?'<button class="ghost" data-ss="pe-delplan" style="color:var(--bad)">删除</button>':'')+'</div></div>';return;}
 var rc=recommend();
 box.innerHTML='<div class="card"><div class="mut">今日推荐</div><h2 class="rec-t">'+esc(rc.title)+'</h2><div class="mut">'+esc(rc.why)+'</div><button class="btn-big'+(rc.rest?' ghost':'')+'" data-ss="rec">'+IC('play')+(rc.rest?'仍要训练':'开始今日推荐')+'</button></div>';
 var pb=$('#plansBox');if(pb)pb.innerHTML='<details class="card" id="ssPlans"'+(plansOpen?' open':'')+'><summary><b>其他计划</b> <span class="mut">'+(S.plans.length?S.plans.length+' 个':'模板 / 自由训练')+'</span></summary>'+
  S.plans.map(function(p){return'<div class="plan"><div><b>'+esc(p.name)+'</b><div class="mut">'+p.items.length+' 个动作 · '+esc(planMuscles(p).join('、'))+'</div></div><div class="row" style="gap:6px"><button class="ghost sm" data-ss="editplan" data-v="'+p.id+'" aria-label="编辑计划">'+IC('edit')+'</button><button class="sm" data-ss="start" data-plan="'+p.id+'">开始</button></div></div>';}).join('')+
  '<div class="actions"><button class="ghost sm" data-ss="free">'+IC('play')+'自由训练</button><button class="ghost sm" data-ss="newplan">'+IC('plus')+'新建计划</button></div>'+
  '<div class="row" style="margin-top:8px"><span class="mut">从模板添加：</span>'+PLAN_TPL.map(function(t,i){return'<button class="chip" data-ss="tpl" data-v="'+i+'">'+t[0]+'</button>';}).join('')+'</div></details>';}

