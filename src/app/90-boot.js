/* 90-boot.js — 全局事件、启动、可访问性、日期输入、快捷键、PWA、调试钩子 */
/* 通用点击：删除/模板 */
document.addEventListener('click',function(e){var t=e.target.closest('button,input[type=checkbox]');if(!t)return;var a;
 if((a=t.getAttribute('data-delmeal'))){S.meals=S.meals.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delw'))){S.workouts=S.workouts.filter(function(x){return x.id!==a;});}
 else if((a=t.getAttribute('data-delsw'))){S.swims=S.swims.filter(function(x){return x.id!==a;});}
 else if(t.id==='ovSuppAll'){suppAll();return;}
 else if(t.id==='helloX'){S.hideHello=true;save();render();return;}
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
applyTheme();applyMotion();applyTitle();show('overview');
/* 存储安全（v2.6）：启动时申请持久存储、检查备份提醒与用量 */
if(DEMO)storeAlert('demo');else(function(){STORE.used=lsUsage(JSON.stringify(S));STORE.pct=quotaPct(STORE.used);if(!META.firstUse&&hasUserData(S)){META.firstUse=firstDataDate(S)||today();metaSave();}
 var w=META.warned||(META.warned={}),lv=quotaLevel(STORE.pct,w);if(lv){metaSave();storeAlert(lv);}else if(backupDue(META,today(),hasUserData(S)))storeAlert('backup');
 storePersist(false);})();
/* ---------- 多端：主题色 / 键盘 / 可访问性 / 尺寸变化 / PWA ---------- */
/** 浏览器 UI 颜色跟随当前主题（手动切换时覆盖媒体查询） */
function syncThemeColor(){var ms=document.querySelectorAll('meta[name=theme-color]'),c=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f6f5f1';Array.prototype.forEach.call(ms,function(m){if((S.theme||'auto')==='auto')m.setAttribute('content',m.getAttribute('media')&&/dark/.test(m.getAttribute('media'))?'#0b0c0f':'#f5f5f7');else m.setAttribute('content',c);});}
syncThemeColor();(function(){var _a=applyTheme;applyTheme=function(){_a();syncThemeColor();};})();
/** 非按钮的可点元素可用键盘聚焦，Enter / 空格触发 */
var TAP_SEL='[data-go]:not(button),[data-sub]:not(button),[data-entry],[data-fopen],[data-calday]:not(button)';
var A11Y_ID=0,CTRL='input,select,textarea';
/** 可访问性补全：可点元素可聚焦；标签关联控件；成组按钮加 group；嵌套可点区域只让标题行获得焦点 */
function a11y(root){root=root&&root.querySelectorAll?root:document;
 Array.prototype.forEach.call(root.querySelectorAll(TAP_SEL),function(el){if(el.hasAttribute('tabindex')||el.hasAttribute('data-a11y'))return;
  if(el.querySelector(TAP_SEL+',button,a[href],'+CTRL)){el.setAttribute('data-a11y','1');var h=el.querySelector('.hrow')||el.querySelector('h2,h3');if(h&&!h.hasAttribute('tabindex')){h.setAttribute('tabindex','0');h.setAttribute('role','button');h.setAttribute('data-proxy','1');}return;}
  el.setAttribute('tabindex','0');el.setAttribute('role','button');});
 Array.prototype.forEach.call(root.querySelectorAll('label:not([for]):not([data-a11y])'),function(lb){lb.setAttribute('data-a11y','1');if(lb.querySelector(CTRL))return;
  var nx=lb.nextElementSibling;if(!nx)return;var c=nx.matches(CTRL)?nx:nx.querySelectorAll(CTRL).length===1?nx.querySelector(CTRL):null;
  if(c){if(!c.id)c.id='fb-c'+(++A11Y_ID);lb.setAttribute('for',c.id);return;}
  if(!lb.id)lb.id='fb-l'+(++A11Y_ID);if(!nx.hasAttribute('role'))nx.setAttribute('role','group');nx.setAttribute('aria-labelledby',lb.id);});
 Array.prototype.forEach.call(root.querySelectorAll('button:not([aria-label])'),function(b){if(b.textContent.trim())return;var t=b.getAttribute('title');if(t)b.setAttribute('aria-label',t);});
 Array.prototype.forEach.call(document.querySelectorAll('#nav button'),function(b){if(b.classList.contains('on'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
/* 渲染之外动态插入的内容（弹层、导入预览、拍照识别等）也补全 */
(function(){if(!window.MutationObserver)return;var q=false;new MutationObserver(function(){if(q)return;q=true;setTimeout(function(){q=false;a11y();},0);}).observe(document.body,{childList:true,subtree:true});})();
/** 切换页面时告知屏幕阅读器 */
function srSay(t){var l=$('#srLive');if(!l)return;l.textContent='';setTimeout(function(){l.textContent=t;},40);}
(function(){var _s=show;show=function(id){_s.apply(this,arguments);if(SEC_LABEL[cur])srSay('已打开 '+SEC_LABEL[cur]);};})();
/* 网格补位：平板 / 桌面下，一行未排满的卡片均分剩余列，避免零散留白；页头高度供侧边导航顶部对齐 */
function layFill(){var hd=document.querySelector('header');if(hd)document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px');
 var sec=document.querySelector('section.on');if(!sec)return;var kids=[].slice.call(sec.children);kids.forEach(function(el){el.style.gridColumn='';});
 var cs=getComputedStyle(sec);if(cs.display!=='grid'||sec.hasAttribute('data-lay'))return;var cols=parseInt(cs.getPropertyValue('--cols'),10)||0;if(!cols)return;
 var row=[],used=0,flush=function(){if(row.length&&used<cols){var w=Math.floor(cols/row.length);if(w*row.length===cols)row.forEach(function(x){x.el.style.gridColumn='span '+w;});else row[row.length-1].el.style.gridColumn='span '+(row[row.length-1].s+cols-used);}row=[];used=0;};
 kids.forEach(function(el){if(getComputedStyle(el).display==='none')return;var m=/span (\d+)/.exec(getComputedStyle(el).gridColumnStart),s=m?+m[1]:cols;
  if(s>=cols){flush();return;}if(used+s>cols)flush();row.push({el:el,s:s});used+=s;if(used===cols){row=[];used=0;}});flush();}
/* 日期 / 时间输入（v2.4.1）：WebKit 去掉原生外观后，内部 ::-webkit-date-and-time-value 仍带 margin 与行高，文字会贴顶、框高不一。
   改为「可见的普通元素显示格式化值 + 透明的原生 input 覆盖其上唤起选择器」。原生 input 仍是真实的表单控件（可聚焦、可读屏、值不变）。 */
var DT_PH={date:'选择日期',time:'选择时间','datetime-local':'选择日期时间',month:'选择月份'};
var DT_WD=['周日','周一','周二','周三','周四','周五','周六'];
function dtFmt(el){var v=el.value;if(!v)return'';var m;
 if(el.type==='date'&&(m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v))){var y=+m[1],mo=+m[2],d=+m[3];
  if(el.id==='dSel'){var wd=DT_WD[new Date(y,mo-1,d).getDay()];return(y===new Date().getFullYear()?'':y+'年')+mo+'月'+d+'日 '+wd;}
  return y+'年'+mo+'月'+d+'日';}
 if(el.type==='time')return v.slice(0,5);
 if(el.type==='month'&&(m=/^(\d{4})-(\d{2})$/.exec(v)))return m[1]+'年'+(+m[2])+'月';
 if(el.type==='datetime-local')return v.replace('T',' ').slice(0,16);
 return v;}
function dtSync(el){var w=el.parentNode;if(!w||!w.classList||!w.classList.contains('dtf'))return;var t=dtFmt(el),v=w.querySelector('.dtf-v');
 if(v)v.textContent=t||el.getAttribute('placeholder')||DT_PH[el.type]||'选择';w.classList.toggle('dt-empty',!t);}
var DT_DESC=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
function dtWrap(){document.querySelectorAll('input[type=date],input[type=time],input[type=datetime-local],input[type=month]').forEach(function(el){
  var w=el.parentNode;
  if(!w.classList||!w.classList.contains('dtf')){w=document.createElement('span');w.className='dtf'+(el.id==='dSel'?' dtf-bar':'');el.parentNode.insertBefore(w,el);
   var v=document.createElement('span');v.className='dtf-v';v.setAttribute('aria-hidden','true');w.appendChild(v);
   if(el.id!=='dSel'){var ic=document.createElement('span');ic.className='dtf-i';ic.setAttribute('aria-hidden','true');ic.innerHTML=IC(el.type==='time'?'clock':'calendar');w.appendChild(ic);}
   w.appendChild(el);
   if(DT_DESC&&DT_DESC.set)try{Object.defineProperty(el,'value',{configurable:true,get:function(){return DT_DESC.get.call(this);},set:function(x){DT_DESC.set.call(this,x);dtSync(this);}});}catch(e){}
   if(!el.getAttribute('aria-label')){var lb=w.parentNode&&w.parentNode.querySelector('label');if(lb)el.setAttribute('aria-label',lb.textContent.trim());}
  }
  dtSync(el);});}
function dtPick(el){if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)return false;try{if(el.showPicker){el.showPicker();return true;}}catch(e){}return false;}
['input','change','blur'].forEach(function(ev){document.addEventListener(ev,function(e){var t=e.target;if(t&&t.tagName==='INPUT')dtSync(t);},true);});
document.addEventListener('click',function(e){var t=e.target;if(t&&t.tagName==='INPUT'&&t.parentNode&&t.parentNode.classList&&t.parentNode.classList.contains('dtf'))dtPick(t);},true);
document.addEventListener('keydown',function(e){var t=e.target;if(!(t&&t.tagName==='INPUT'&&t.parentNode&&t.parentNode.classList&&t.parentNode.classList.contains('dtf')))return;
 if(e.key==='Enter'||e.key===' '){if(dtPick(t))e.preventDefault();}},true);
(function(){var _r=render;render=function(){_r.apply(this,arguments);a11y();dtWrap();todayBtn();layFill();};})();a11y();dtWrap();todayBtn();layFill();window.addEventListener('resize',layFill);
impFromHash();
function typing(el){return el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable);}
/** 快捷键（不在输入框内时）：1–4 切换分组，← / → 前后一天，T 回到今天，/ 搜索食物，Esc 返回 */
document.addEventListener('keydown',function(e){var t=e.target;
 if((e.key==='Enter'||e.key===' ')&&t&&t.matches&&t.matches(TAP_SEL+',[data-proxy]')){e.preventDefault();t.click();return;}
 if(e.key==='Escape'){if(typing(t))t.blur();var bk0=document.querySelector('#subnav .back');if(bk0)bk0.click();return;}
 if(e.ctrlKey||e.metaKey||e.altKey||typing(t))return;
 var k=e.key;
 if(/^[1-4]$/.test(k)){show(GROUPS[+k-1][0]);e.preventDefault();}
 else if(k==='ArrowLeft'){$('#dPrev').click();e.preventDefault();}
 else if(k==='ArrowRight'){$('#dNext').click();e.preventDefault();}
 else if(k==='t'||k==='T'){$('#dToday').click();}
 else if(k==='/'){e.preventDefault();if(cur!=='dietAdd')openAdd(dMeal(),'search');else{faTab='search';rDietAdd();}$('#faSearch').focus();}
});
/** 尺寸 / 方向变化后重绘（图表按容器宽度绘制） */
(function(){var tm,w=window.innerWidth;window.addEventListener('resize',function(){clearTimeout(tm);tm=setTimeout(function(){if(Math.abs(window.innerWidth-w)>40){w=window.innerWidth;render();}},200);});})();
/** PWA：仅在 http(s) 下启用 manifest 与 service worker；file:// 直接打开时静默跳过（单文件用法不受影响） */
(function(){var web=/^https?:$/.test(location.protocol);if(!web)return;
 if(window.__fbPwaMeta!==false){var l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);}
 if(!('serviceWorker' in navigator))return;
 var btn=$('#swUpd'),reloading=false;
 function offer(w){if(!w)return;btn.hidden=false;btn.onclick=function(){btn.textContent='正在更新…';w.postMessage('skipWaiting');};}
 navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloading)return;reloading=true;location.reload();});
 window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').then(function(reg){
  if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
  reg.addEventListener('updatefound',function(){var nw=reg.installing;if(!nw)return;nw.addEventListener('statechange',function(){if(nw.state==='installed'&&navigator.serviceWorker.controller)offer(nw);});});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')reg.update().catch(function(){});});
 }).catch(function(){});});
})();
// 调试/测试钩子（不影响正常使用）
window.__freeBody={get state(){return S;},show:show,otSignals:otSignals,_importCSV:importCSV,_parseQuick:parseQuick,_weightETA:weightETA,_calcTarget:calcTarget,_tgtCfg:tgtCfg,_nextTarget:nextTarget,_muscleState:muscleState,_recommend:recommend};
