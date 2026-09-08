'use strict';
// Every branch has its own silhouette and timing. Geometry extends the existing
// Canvas combat renderer: cones, trajectories, cracks and fields express hit areas.
const skillVisuals=[];const manifestationArt=new Image(),manifestationFrames=[];
const rankLevels=[1,1,4,8,12,16,20];
const masteryNames=[
 [['雙鐘震天','餘音不絕','燼脈裂地','終焉鐘葬'],['流星追獵','急雨連星','熔河殘跡','赤日墜世'],['巡火雙衛','回息燈芯','烈焰壁壘','九曜護身']],
 [['骨芽繁殖','枯木回春','荊林結界','萬骸花海'],['倒鉤骨槍','疾棘連發','分枝追獵','穿城白棘'],['纏根囚牢','生息深井','枯榮共生','地骸吞城']],
 [['回旋墨頁','疾書無間','裂隙回聲','萬象歸零'],['折頁返刃','無聲疾筆','三疊影步','斷章絕界'],['深墨牽引','空白回息','碎頁風暴','永夜墨淵']],
 [['霜槍分流','寒息凝聚','冰晶追擊','萬槍冰獄'],['雙重寒潮','凝冬永息','碎霜餘震','永夜封城'],['雙鏡冰衛','誓盾回息','冰甲反攻','極北聖壁']],
 [['饕牙連噬','吐納回息','餓佛血宴','吞天饕口'],['二重腹雷','震腹吐納','崩地連震','血海山崩'],['血衣雙咒','血息輪轉','赤念護體','萬血朝宗']],
 [['羽落成災','焚羽不熄','天譴傾盆','萬羽蔽日'],['雙翼齊斬','折翼無聲','連環俯衝','墜天絕擊'],['雙環同轉','環息回流','環刃反噬','審判千環']]
];
const masteryDetails=[
 ['追加第二次鐘震','追落兩顆隕燼','增加一組巡火護衛'],
 ['額外種下兩株骨芽','追加倒鉤骨刺扇射','根井外圍長出一圈骨刺'],
 ['追加回旋墨刃','落點再斬一道橫刃','墨淵周圍迸發穿透頁刃'],
 ['追加一束冰槍','寒潮後再凍結一次','增加一组寒鏡護衛'],
 ['連續吞噬第二口並回血','腹雷後追加震地','血咒同時給予血色護盾'],
 ['再多灑一列羽毛','俯衝落點追加一圈震波','光環多轉一個並反彈子彈']
];
function extendSkillTrees(){for(let id=0;id<skillTrees.length;id++)for(let b=0;b<3;b++){const spec=skillTrees[id][b];if(spec.nodes.length>3)continue;for(let i=0;i<4;i++)spec.nodes.push([masteryNames[id][b][i],i===0?masteryDetails[id][b]+'。':i===1?'技能冷卻縮短 20%，消耗減少 4 靈息。':i===2?masteryDetails[id][b]+'；追加效果再強化，並獲得 20 護盾。':'終極形態：'+masteryDetails[id][b]+'；追加效果增至三重。']);}}
function emitSkillVisual(c){
 const nearSelf=c.branch===0&&[2,3,4,5].includes(c.type)||c.branch===2&&[0,3,5].includes(c.type)||c.branch===1&&[1,2,4].includes(c.type);
 skillVisuals.push({...c,x:nearSelf?p.x:c.x,y:nearSelf?p.y:c.y,age:0,life:c.melee?.3:c.branch===2?(c.type===4?6:c.type===1||c.type===2?4:6):1.3});if(skillVisuals.length>35)skillVisuals.shift();
}
function updateSkillVisuals(dt){for(let i=skillVisuals.length-1;i>=0;i--){skillVisuals[i].age+=dt;if(skillVisuals[i].age>=skillVisuals[i].life)skillVisuals.splice(i,1)}}
function releaseMastery(c){
 const r=c.rank;if(r<4)return;const scale=r>=7?3:r>=6?2:1,power=gearPower(),d=22*power*scale,at={x:c.x,y:c.y};
 if(r>=6)p.shield=Math.max(p.shield,20);
 if(c.type===0){if(c.branch===0)castFields.push({kind:'meteor',x:p.x,y:p.y,r:240,delay:.55,life:2,damage:d*2,element:0});else if(c.branch===1)for(let i=0;i<scale*2;i++)castFields.push({kind:'meteor',x:at.x+Math.cos(i*2.4)*70,y:at.y+Math.sin(i*2.4)*60,r:70,delay:.7+i*.15,life:3,damage:d,element:0,burn:true});else wards.push({element:0,rank:3,life:5+scale,tick:.2});}
 if(c.type===1){if(c.branch===0)for(let i=0;i<2*scale;i++)turrets.push({x:at.x+Math.cos(i*2.4)*90,y:at.y+Math.sin(i*2.4)*70,life:12,attack:.2});else if(c.branch===1)fanShot({...c,rank:3},3+scale*2,d,4,1);else{for(let i=0;i<8;i++){const a=i*Math.PI/4;castFields.push({kind:'meteor',x:at.x+Math.cos(a)*130,y:at.y+Math.sin(a)*90,r:45,delay:.7,life:2,damage:d,element:1})}}}
 if(c.type===2){if(c.branch===1)burstAt(p.x,p.y,125,d*2,2);else for(let i=0;i<4*scale;i++){fire(at.x,at.y,i*Math.PI*2/(4*scale),d,350,classes[2].color,4);shots[shots.length-1].element=2;shots[shots.length-1].large=true;}}
 if(c.type===3){if(c.branch===0)fanShot({...c,rank:3},3+scale*2,d,4,3);else if(c.branch===1)castFields.push({kind:'meteor',x:at.x,y:at.y,r:180,delay:.75,life:2,damage:d*2,element:3,freeze:1});else wards.push({element:3,rank:3,life:5+scale,tick:.2});}
 if(c.type===5){if(c.branch===0){for(let i=0;i<scale;i++)castFields.push({kind:'danger',x:p.x,y:p.y,r:170+i*60,delay:.2+i*.3,life:2,element:5,damage:d*1.6});}
  else if(c.branch===1)castFields.push({kind:'vortex',x:at.x,y:at.y,r:150+scale*25,life:4,tick:0,damage:d,element:5,rank:3});
  else{p.inv=Math.max(p.inv,.6);for(const f of foes)if(f.hp>0&&dist(f,p)<230)f.slow=3;}}
 if(c.type===4){if(c.branch===0){burstAt(p.x,p.y,160,d*2,4);p.hp=Math.min(p.maxhp,p.hp+8*scale);p.satiety=Math.min(100,(p.satiety||0)+10*scale);}else if(c.branch===1)for(let i=0;i<scale;i++)castFields.push({kind:'meteor',x:p.x,y:p.y,r:190+i*20,delay:.75+i*.3,life:3,damage:d*2,element:4});else p.shield=Math.max(p.shield,30*scale);}
}
function fxPath(c,points,fill=false){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(fill){c.closePath();c.fill()}else c.stroke()}
function fxSpikes(c,r,n,phase,col){c.strokeStyle=col;c.fillStyle=col;for(let i=0;i<n;i++){const a=i*Math.PI*2/n,rr=r*(.4+phase*.6),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.57;fxPath(c,[[x-5,y],[x+Math.cos(a)*12,y-35-20*phase],[x+5,y+2]],true)}}
function drawSkillVisuals(){
 for(const e of skillVisuals){const t=e.age/e.life,k=Math.min(1,t*3),col=classes[e.type].color,angle=Math.atan2(e.dy||0,e.dx||1),r=e.melee?90:145+(Math.min(e.rank,7)-1)*8;
 ctx.save();if(e.branch===2&&(e.type===0||e.type===3)){e.x=p.x;e.y=p.y}ctx.translate(e.x,e.y);const texture=manifestationFrames[e.branch*5+e.type];if(texture&&!e.melee){ctx.save();ctx.globalAlpha=Math.min(1,e.age*8,(1-t)*3)*.9;const height=(e.branch===2?160:200)*(0.8+k*.2);drawMotionTile(ctx,texture,0,35,height);ctx.restore();}ctx.globalAlpha=Math.min(1,(1-t)*2);ctx.lineWidth=3;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=8;
 if(e.type===0){
  if(e.branch===0){for(let j=0;j<3;j++){const q=Math.max(0,k-j*.18);if(q)groundRing(0,0,r*q*1.5,col,.8-j*.18,4-j)}ctx.save();ctx.translate(0,-30-20*(1-k));ctx.scale(1,1.2);fxPath(ctx,[[-30,0],[-23,-40],[-14,-49],[14,-49],[23,-40],[30,0]],false);fxPath(ctx,[[-35,0],[35,0]],false);ctx.beginPath();ctx.arc(0,5,7,0,7);ctx.fill();ctx.restore();}
  else if(e.branch===1){for(let i=0;i<5;i++){const a=i*2.4,x=Math.cos(a)*70,y=Math.sin(a)*45,fall=Math.max(0,1-t*2+i*.1)*190;ctx.lineWidth=7;fxPath(ctx,[[x-55,y-fall-85],[x,y-fall]],false);ctx.beginPath();ctx.arc(x,y-fall,12,0,7);ctx.fill();groundRing(x,y,30*k,col,.5,2);}}
  else{for(let i=0;i<6;i++){const a=e.age*3+i*Math.PI/3,x=Math.cos(a)*65,y=Math.sin(a)*37-25;ctx.beginPath();ctx.arc(x,y,8+Math.sin(e.age*8+i)*2,0,7);ctx.fill();}groundRing(0,0,75,col,.8,3);}
 }else if(e.type===1){
  if(e.branch===0){fxSpikes(ctx,r,9,k,'#e4dec1');for(let i=0;i<3;i++){const a=i*2.1;ctx.lineWidth=5;fxPath(ctx,[[0,0],[Math.cos(a)*40,-20+Math.sin(a)*35],[Math.cos(a)*80,Math.sin(a)*65-45*k]],false)}}
  else if(e.branch===1){ctx.rotate(angle);for(let i=-3;i<=3;i++){ctx.save();ctx.rotate(i*.16);ctx.fillStyle='#ded7b8';fxPath(ctx,[[20+k*100,-5],[70+k*180,0],[20+k*100,5],[28+k*100,0]],true);ctx.restore();}}
  else{for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.lineWidth=4;fxPath(ctx,[[Math.cos(a)*r,Math.sin(a)*r*.57],[Math.cos(a+.3)*r*.5,Math.sin(a+.3)*r*.3], [Math.cos(a+.7)*20,Math.sin(a+.7)*12]],false)}fxSpikes(ctx,r,8,k,'#e6e0ca');}
 }else if(e.type===2){
  if(e.branch===0){for(let i=0;i<12;i++){const a=i*Math.PI/6+e.age*.6;ctx.save();ctx.translate(Math.cos(a)*r*k,Math.sin(a)*r*k*.57-15);ctx.rotate(a);ctx.fillStyle=i%2?'#24223b':'#bebaff';fxPath(ctx,[[-14,-9],[14,-5],[9,11],[-16,6]],true);ctx.restore();}}
  else if(e.branch===1){ctx.rotate(angle);ctx.lineWidth=10*(1-t);fxPath(ctx,[[-200,-20],[-40,15],[80,-55],[130,-15]],false);ctx.lineWidth=2;ctx.strokeStyle='#efebff';fxPath(ctx,[[-190,-20],[-35,12],[84,-51],[125,-14]],false);}
  else{ctx.fillStyle='#0d092be0';ctx.beginPath();ctx.ellipse(0,0,r*.8,r*.42,0,0,7);ctx.fill();for(let i=0;i<7;i++){ctx.save();ctx.scale(1,.57);ctx.rotate(e.age*2+i*.9);ctx.beginPath();ctx.arc(0,0,25+i*16,0,1.5);ctx.stroke();ctx.restore();}}
 }else if(e.type===3){
  if(e.branch===0){ctx.rotate(angle);for(let i=-3;i<=3;i++){ctx.save();ctx.rotate(i*.2);ctx.fillStyle='#c5f6ff';fxPath(ctx,[[20+k*90,-5],[100+k*120,0],[20+k*90,5],[37+k*90,0]],true);ctx.restore();}}
  else if(e.branch===1){fxSpikes(ctx,r,12,k,'#b9efff');for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.save();ctx.scale(1,.57);ctx.rotate(a);fxPath(ctx,[[0,0],[r*k,0]],false);for(let n=1;n<4;n++)fxPath(ctx,[[n*r*k/4-12,-15],[n*r*k/4,0],[n*r*k/4-12,15]],false);ctx.restore();}}
  else{for(let i=0;i<5;i++){const a=e.age+i*Math.PI*2/5;ctx.save();ctx.translate(Math.cos(a)*65,Math.sin(a)*38-30);ctx.fillStyle='#83cce944';fxPath(ctx,[[-17,-27],[17,-27],[22,4],[0,25],[-22,4]],true);ctx.stroke();ctx.restore();}}
 }else{
  if(e.branch===0){ctx.rotate(angle);ctx.scale(1,.65);const reach=r*k;ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,reach,-1.1,1.1);ctx.stroke();ctx.fillStyle='#ffe1bb';for(let i=0;i<8;i++){const a=-1+i*2/7,x=Math.cos(a)*reach,y=Math.sin(a)*reach;fxPath(ctx,[[x-7,y-8],[x-23,y],[x-7,y+8]],true)}}
  else if(e.branch===1){ctx.strokeStyle='#e09b75';for(let i=0;i<9;i++){const a=i*7/9;fxPath(ctx,[[0,0],[Math.cos(a)*r*.4,Math.sin(a)*r*.23],[Math.cos(a+.15)*r*k,Math.sin(a+.15)*r*k*.57]],false)}for(let i=0;i<3;i++)groundRing(0,0,(r+25*i)*k,'#ac545b',.7,4-i);}
  else{ctx.strokeStyle='#ce6679';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,r*.85,r*.48,0,0,7);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6+e.age*.4,x=Math.cos(a)*r*.85,y=Math.sin(a)*r*.48;ctx.fillStyle='#e9989c';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();fxPath(ctx,[[x*.85,y*.85],[x*.72,y*.72-25]],false)}ctx.fillStyle='#70132d66';ctx.beginPath();ctx.ellipse(0,0,r*.7,r*.38,0,0,7);ctx.fill();}
 }
 ctx.restore();
 }
}
function drawDistinctProjectile(sh){
 const c=ctx,a=Math.atan2(sh.vy,sh.vx),id=sh.element||0,size=sh.large?1.6:1;
 c.save();c.translate(sh.x,sh.y-25);c.rotate(a);c.scale(size,size);c.fillStyle=sh.enemy?'#ff8468':classes[id].color;c.strokeStyle=sh.enemy?'#ffbca2':classes[id].color;c.lineWidth=2;c.shadowColor=c.fillStyle;c.shadowBlur=sh.enemy?2:8;
 if(sh.enemy){fxPath(c,[[-15,-3],[9,0],[-15,3]],true);}
 else if(id===0){c.fillStyle='#ffae4f';c.beginPath();c.ellipse(0,0,11,6,0,0,7);c.fill();fxPath(c,[[-5,-5],[-28,0],[-5,5]],true);c.fillStyle='#fff0b3';c.beginPath();c.arc(3,0,4,0,7);c.fill();}
 else if(id===1){c.fillStyle='#e5debc';fxPath(c,[[-17,-3],[15,0],[-17,3],[-10,0]],true);c.beginPath();c.arc(-15,0,4,0,7);c.fill();}
 else if(id===2){c.fillStyle='#c4beff';fxPath(c,[[-15,-9],[13,-3],[6,10],[-18,5]],true);c.strokeStyle='#322447';fxPath(c,[[-9,-3],[6,0],[-8,3]],false);}
 else if(id===3){c.fillStyle='#d6fbff';fxPath(c,[[-18,-4],[19,0],[-18,4],[-10,0]],true);c.strokeStyle='#6bbedc';fxPath(c,[[-7,-7],[0,0],[-7,7]],false);}
 else{c.fillStyle='#d87a8e';fxPath(c,[[-12,-4],[10,0],[-12,4]],true);}
 c.restore();return true;
}
