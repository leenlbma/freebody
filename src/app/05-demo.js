/* 05-demo.js — 演示数据：虚构的 4 周记录，只在内存中使用（#demo），不写入本机存储 */
/* ---------- 演示模式 ---------- */
/**
 * 生成演示数据（虚构，与任何真实用户无关）。同一天调用结果相同，便于截图与测试。
 * @param {string} day 今天，YYYY-MM-DD
 * @returns {object} 与 defaults() 同结构的完整数据
 */
function demoData(day){var d=defaults(),seed=7,n=0;
 var rnd=function(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;},id=function(p){return'demo-'+p+(++n);};
 var M=[['早餐','燕麦牛奶 290g',420,18,58,13],['早餐','全麦面包 2片 + 鸡蛋 2个',380,22,36,15],['午餐','米饭 200g',232,5,52,1],['午餐','鸡胸肉沙拉 330g',360,36,14,17],
  ['晚餐','番茄炒蛋 250g',265,14,11,19],['晚餐','清炒西兰花 200g',138,6,15,8],['晚餐','清蒸鱼 200g',230,38,2,8],['加餐','希腊酸奶 170g',100,17,6,1],['加餐','香蕉 1根（120g）',107,1,27,0]];
 var PLAN=[[['杠铃深蹲',60,5],['杠铃卧推',45,6],['坐姿划船',40,10]],[['罗马尼亚硬拉',60,8],['哑铃肩推',14,10],['高位下拉',45,10]]];
 d.profile.height=172;d.goals.weight=68;d.goals.kcal=1900;d.goals.p=115;d.goals.c=210;d.goals.f=60;d.hideHello=true;
 d.supps=[{id:'demo-s1',name:'肌酸',dose:'5g',time:'每天固定时间'},{id:'demo-s2',name:'维生素D',dose:'',time:'随餐'},{id:'demo-s3',name:'鱼油 Omega-3',dose:'',time:'随餐'}];
 for(var k=27;k>=0;k--){var dt=addDays(day,-k),wd=parse(dt).getDay();
  M.forEach(function(m,i){if((i===1&&k%2)||(i===0&&!(k%2))||(i===6&&k%3)||(i===4&&!(k%3))||(i===8&&k%2))return;if(k===0&&m[0]!=='早餐'&&m[0]!=='午餐')return;
   var f=1+(rnd()-0.5)*0.16;d.meals.push({id:id('m'),date:dt,meal:m[0],food:m[1],name:m[1],kcal:Math.round(m[2]*f),p:Math.round(m[3]*f),c:Math.round(m[4]*f),f:Math.round(m[5]*f),src:'lib'});});
  var bh=23+Math.floor(rnd()*2)%2,bm=Math.floor(rnd()*50),dur=Math.round((6.4+rnd()*1.6)*10)/10;
  d.sleep.push({id:id('sl'),date:dt,bed:(bh===24?'00':bh)+':'+pad2(bm),wake:'07:'+pad2(Math.floor(rnd()*30)),dur:dur,q:dur>7.2?4:3});
  d.body.push({id:id('b'),date:dt,weight:Math.round((70.8-(27-k)*0.04+(rnd()-0.5)*0.5)*10)/10});
  d.recov.push({id:id('r'),date:dt,rhr:57+Math.floor(rnd()*5),hrv:55+Math.floor(rnd()*16),stress:2,energy:3+Math.floor(rnd()*2),soreness:2,mood:4});
  if(k>0){var lg={};d.supps.forEach(function(s,i){if(i<2||rnd()>0.4)lg[s.id]={at:'08:'+pad2(Math.floor(rnd()*40))};});d.suppLog[dt]=lg;}
  if(k>0&&(wd===1||wd===3||wd===5)){var p=PLAN[wd===3?1:0],wk=Math.floor((27-k)/7);
   p.forEach(function(e){for(var s=0;s<3;s++)d.workouts.push({id:id('w'),date:dt,exercise:e[0],sets:1,reps:e[2]-(s===2&&rnd()>0.7?1:0),weight:e[1]+wk*2.5,rir:s===2?1:2});});}
  if(wd===6)d.cardio.push({id:id('c'),date:dt,min:25,floors:30+Math.floor(rnd()*10),hr:132});}
 d.labs.push({id:'demo-l1',date:addDays(day,-20),name:'维生素D（25-OH）',value:26,unit:'ng/mL',lo:30,hi:100,note:'演示数据'});
 d.notes.push({id:'demo-n1',date:addDays(day,-3),title:'深蹲手感',text:'第三组速度略慢，下次保持重量，先把第三组做到 RIR 2 再加重。',tags:['训练']});
 return d;}
function pad2(v){return(v<10?'0':'')+v;}
