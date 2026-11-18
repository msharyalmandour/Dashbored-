/* ويسي v2 — monoline character. The head is the Wesync tile, the face is the two sync waves,
   with a body, arms and hands. new WesyLine(host,{state,line,ink,bg,paper}) .set(state) .tap() .level(v) .destroy()
   states: idle | greet | listening | thinking | working | success | error | sleep */
(function(){
const NS='http://www.w3.org/2000/svg';
const DEF={line:'#E9651F',ink:'#1E0B05',bg:'#F3E9DC',gold:'#E39A2E',cheek:'#F2A982',paper:true,shadow:true};
const W0=246,W1=354,WY=[206,226],AMP=7;
function wave(y,amp,ph,rip){let d='';for(let i=0;i<=28;i++){const t=i/28,x=W0+(W1-W0)*t;
 const e=Math.sin(Math.PI*t);const yy=y+Math.sin(t*Math.PI*2+ph)*amp*(0.35+0.65*e)+(rip?Math.sin(t*22+rip)*3*e:0);
 d+=(i?'L':'M')+x.toFixed(1)+' '+yy.toFixed(1)}return d}
// arm in local coords: shoulder at 0,0 pointing down (+y). mitten hand with finger loops (SOLTO-like)
const ARM='M0 0 C 12 50 10 100 0 140';
const HAND='M-12 138 C -34 144 -32 180 -8 182 C 12 184 26 170 20 152 C 16 140 6 136 -12 138 Z M -22 150 C -38 142 -44 156 -34 164';
const BODY={
 paper:{d:'M166 80 L376 80 L450 154 L450 516 Q450 528 438 528 L162 528 Q150 528 150 516 L150 96 Q150 80 166 80 Z',x:'M376 80 L376 140 Q376 154 390 154 L450 154',lines:[[200,300,400],[200,470,330]],sh:[[150,320],[450,320]],legs:[250,350]},
 book:{d:'M168 80 L436 80 Q450 80 450 94 L450 514 Q450 528 436 528 L168 528 Q150 528 150 510 L150 98 Q150 80 168 80 Z',x:'M182 82 L182 526 M398 80 L398 30 L413 46 L428 30 L428 80 M220 266 L410 266',lines:[[226,470,380]],sh:[[150,320],[450,320]],legs:[250,350]},
 clip:{d:'M176 92 L424 92 Q452 92 452 120 L452 504 Q452 532 424 532 L176 532 Q148 532 148 504 L148 120 Q148 92 176 92 Z',x:'M250 68 L350 68 Q362 68 362 80 L362 110 L238 110 L238 80 Q238 68 250 68 Z M290 68 Q290 48 300 48 Q310 48 310 68 M174 126 L426 126 L426 508 L174 508 Z',lines:[[200,300,400],[200,470,340]],sh:[[148,330],[452,330]],legs:[250,350]},
 lens:{d:'M300 64 A 128 128 0 1 0 300.1 64 Z M276 316 L276 528 Q276 540 288 540 L312 540 Q324 540 324 528 L324 316',x:'M218 120 Q236 96 262 86',lines:[],sh:[[276,370],[324,370]],legs:[290,310],nochest:true}};
BODY.clip.ring=[300,186,86];
const POSE={ // [leftDeg,rightDeg] ; left outward = +, right outward = −
 idle:[22,-20],typing:[-38,38],greet:[150,-14],listening:[160,-18],thinking:[18,152],working:[48,-52],success:[158,-158],error:[8,-8],sleep:[10,-10]};
class WesyLine{
 constructor(host,o={}){this.o=Object.assign({},DEF,o.style==='ink'?{line:'#1E0B05',bg:'#FFFFFF',sw:9,accent:'#E9651F'}:{},o);this.host=host;this.state=o.state||'idle';this.lv=0;this.rip=0;this.t0=performance.now();
  this.cur=[...POSE[this.state]];this.jump=0;this.shake=0;this.blink=0;this.nb=performance.now()+1800;this.build();this.set(this.state);
  this.raf=requestAnimationFrame(this.tick.bind(this))}
 el(t,a,p){if(a.stroke&&a.fill==null)a.fill='none';const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);(p||this.svg).appendChild(e);return e}
 build(){const o=this.o;const s=this.svg=document.createElementNS(NS,'svg');s.setAttribute('viewBox',o.crop==='head'?'130 16 340 340':'40 -10 520 720');s.style.width='100%';s.style.height='100%';s.style.overflow=o.crop?'hidden':'visible';
  this.host.innerHTML='';this.host.appendChild(s);const AC=o.accent||o.line;const L={stroke:o.line,'stroke-width':o.sw||7,'stroke-linecap':'round','stroke-linejoin':'round'};
  this.shadow=this.el('ellipse',{cx:300,cy:666,rx:110,ry:o.style==='ink'?14:12,fill:o.ink,opacity:o.shadow?(o.style==='ink'?.92:.08):0});
  const g=this.g=this.el('g',{});
  // legs
  this.legs=this.el('g',{},g);
  const B=this.B=BODY[o.body||'paper'];const [la,lb]=B.legs;const ly=o.body==='lens'?538:522;
  this.el('path',Object.assign({d:`M${la} ${ly} C ${la-3} 572 ${la-8} 610 ${la-10} 640 L ${la-42} 640`},L),this.legs);
  this.el('path',Object.assign({d:`M${lb} ${ly} C ${lb+3} 572 ${lb+8} 610 ${lb+10} 640 L ${lb+42} 640`},L),this.legs);
  this.up=this.el('g',{},g);
  // arms behind body? left arm group
  this.armL=this.el('g',{},this.up);this.el('path',Object.assign({d:ARM+' '+HAND},L),this.armL);
  // body
  if(o.style==='ink'&&!o.hollow)this.el('path',Object.assign({d:B.d,fill:o.ink,transform:'translate(14 12)'},L),this.up);
  this.el('path',Object.assign({d:B.d,fill:o.hollow?'none':o.bg},L),this.up);
  this.el('path',Object.assign({d:B.x,'stroke-width':(o.sw||7)-1},L),this.up);
  B.lines.forEach(([x,y0,w])=>{for(let k=0;k<4;k++){const yy=y0+k*0;}});
  this.txt=this.el('g',{},this.up);B.lines.forEach(([x,y,x2])=>this.el('path',{d:`M${x} ${y} L${x2} ${y}`,stroke:AC,'stroke-width':6,'stroke-linecap':'round',opacity:.55},this.txt));
  this.el('path',Object.assign({d:'M250 330 C 262 370 262 420 250 460',opacity:.0},L),this.up);
  // Saudi touch: bisht (black cloak, gold trim) + shemagh (red check) + agal
  if(o.saudi){const id='sm'+Math.random().toString(36).slice(2,7);
   const df=this.el('defs',{});const SC=o.shemagh||'#E9651F';const pt=this.el('pattern',{id,width:26,height:26,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},df);
   this.el('rect',{width:26,height:26,fill:'#FFFFFF'},pt);
   this.el('rect',{x:0,y:10,width:26,height:6,fill:SC},pt);this.el('rect',{x:10,y:0,width:6,height:26,fill:SC},pt);
   this.el('rect',{x:10,y:10,width:6,height:6,fill:'#FFFFFF'},pt);
   if(o.saudi!=='head'){const G='#E39A2E';
    [[1,'M168 262 C 150 340 136 430 122 532 L 206 532 L 206 262 Z','M206 266 L 206 530'],[-1,'M432 262 C 450 340 464 430 478 532 L 394 532 L 394 262 Z','M394 266 L 394 530']].forEach(([sd,d,tr])=>{
     this.el('path',Object.assign({},L,{d,fill:o.ink}),this.up);
     this.el('path',{d:tr,stroke:G,'stroke-width':7,'stroke-linecap':'round'},this.up);
     this.el('path',{d:tr.replace(/(\d+) 266 L (\d+) 530/,(m,a,b)=>`${+a+sd*12} 280 L ${+b+sd*12} 520`),stroke:G,'stroke-width':3,'stroke-dasharray':'2 9','stroke-linecap':'round'},this.up)})}
   const SH='M300 34 C 196 34 146 104 142 196 L 118 360 Q 168 338 212 300 L 388 300 Q 432 338 482 360 L 458 196 C 454 104 404 34 300 34 Z';
   if(o.style==='ink')this.el('path',Object.assign({},L,{d:SH,fill:o.ink,transform:'translate(10 8)'}),this.up);
   this.el('path',Object.assign({},L,{d:SH,fill:`url(#${id})`}),this.up);
   this.el('path',Object.assign({},L,{d:'M204 140 Q 300 86 396 140',stroke:'#FFFFFF','stroke-width':12}),this.up);
   [62,80].forEach(y=>this.el('ellipse',{cx:300,cy:y,rx:110,ry:19,fill:'none',stroke:o.ink,'stroke-width':12},this.up));
   this.el('path',{d:'M182 70 Q 170 110 176 150 M418 70 Q 430 110 424 150',stroke:o.ink,'stroke-width':6,'stroke-linecap':'round',fill:'none',opacity:.0},this.up);
  }
  if(B.ring){const [cx,cy,r]=B.ring;this.el('circle',Object.assign({cx,cy,r,fill:o.hollow?'none':o.bg},L,{'stroke-width':(o.sw||7)+1}),this.up);
   this.el('path',{d:`M${cx-r+22} ${cy-28} A ${r-22} ${r-22} 0 0 1 ${cx-28} ${cy-r+22}`,fill:'none',stroke:AC,'stroke-width':6,'stroke-linecap':'round',opacity:.8},this.up)}
  // chest mark: the two waves small, dashed — the "sync" stitched on him
  this.chest=[0,1].map(i=>this.el('path',{fill:'none',stroke:AC,'stroke-width':5,'stroke-linecap':'round','stroke-dasharray':'2 11',opacity:.85},this.up));
  // right arm + paper
  this.armR=this.el('g',{},this.up);
  this.paper=this.el('g',{},this.armR);
  if((o.body||'paper')==='lens'){
  this.el('rect',Object.assign({x:-30,y:150,width:58,height:74,rx:8,fill:o.bg,transform:'rotate(-8 0 187)'},L),this.paper);
  [172,188,204].forEach((y,i)=>this.el('path',{d:`M${-20} ${y} l ${i==2?22:36} -5`,stroke:o.line,'stroke-width':5,'stroke-linecap':'round'},this.paper));
  }else{ // a magnifying lens — research
  this.el('path',Object.assign({d:'M0 168 L 4 198'},L,{'stroke-width':10}),this.paper);
  this.el('circle',Object.assign({cx:6,cy:226,r:26,fill:o.bg},L),this.paper);
  this.el('path',{d:'M-8 222 Q -6 210 6 208',fill:'none',stroke:o.line,'stroke-width':4,'stroke-linecap':'round',opacity:.6},this.paper);}
  this.el('path',Object.assign({d:ARM+' '+HAND},L),this.armR);
  // keyboard (typing state)
  this.kb=this.el('g',{opacity:0},this.up);
  if(o.style==='ink')this.el('rect',Object.assign({x:176,y:446,width:262,height:66,rx:16,fill:o.ink},L),this.kb);
  this.el('rect',Object.assign({x:166,y:438,width:262,height:66,rx:16,fill:o.bg},L),this.kb);
  this.keys=[];for(let r=0;r<3;r++)for(let c=0;c<(r==2?1:9);c++){const k=r==2?this.el('rect',{x:240,y:484,width:114,height:10,rx:5,fill:o.line,opacity:.85},this.kb):this.el('rect',{x:186+c*25,y:452+r*15,width:17,height:9,rx:3,fill:o.line,opacity:.85},this.kb);this.keys.push(k)}
  this.chars=[0,1,2,3].map(()=>this.el('text',{x:300,y:430,'font-size':26,'font-weight':800,fill:AC,opacity:0,'font-family':'Tajawal,system-ui','text-anchor':'middle'},this.kb));
  // head = the tile
  this.head=this.el('g',{},this.up);
  
  this.cheeks=[[244,194],[356,194]].map(([x,y])=>this.el('ellipse',{cx:x,cy:y,rx:15,ry:9,fill:o.cheek,opacity:.7},this.head));
  this.eyes=[[270,160],[330,160]].map(([x,y])=>{const e=this.el('g',{},this.head);
   const w=this.el('ellipse',{cx:x,cy:y,rx:15,ry:21,fill:o.ink},e);
   const gl=this.el('circle',{cx:x+4,cy:y-7,r:5.5,fill:'#fff'},e);this.el('circle',{cx:x-4,cy:y+7,r:2.4,fill:'#fff'},e);
   const lid=this.el('path',{d:'',fill:'none',stroke:o.ink,'stroke-width':6.5,'stroke-linecap':'round','stroke-linejoin':'round'},this.head);return {e,w,gl,lid,x,y}});
  this.mouth=this.el('path',{fill:'none',stroke:o.ink,'stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'},this.head);
  this.tongue=this.el('ellipse',{cx:300,cy:220,rx:9,ry:5,fill:'#E9651F',opacity:0},this.head);
  // antenna/hair: a tiny sync spark on top
  
  // fx
  this.fx=this.el('g',{});
  this.dots=[0,1,2].map(i=>this.el('circle',{cx:430+i*24,cy:70-i*18,r:6+i*2,fill:o.line,opacity:0},this.fx));
  this.stars=[[150,120],[452,96],[468,300],[132,330]].map(([x,y])=>this.el('path',{d:`M${x} ${y-16}L${x+5} ${y-5}L${x+16} ${y}L${x+5} ${y+5}L${x} ${y+16}L${x-5} ${y+5}L${x-16} ${y}L${x-5} ${y-5}Z`,fill:o.gold,opacity:0},this.fx));
  this.z=this.el('text',{x:420,y:70,'font-size':44,'font-weight':800,fill:o.line,opacity:0,'font-family':'system-ui'},this.fx);this.z.textContent='z';
  s.addEventListener('pointerdown',()=>this.tap());
 }
 set(st){this.state=st;this.st0=performance.now();
  if(this.kb){if(st==='typing'){this.up.appendChild(this.kb);this.up.appendChild(this.armL);this.up.appendChild(this.armR)}else{this.up.insertBefore(this.armL,this.up.firstChild);this.up.insertBefore(this.armR,this.kb)}}
 if(st==='success'){this.jump=1}if(st==='error'){this.shake=1}return this}
 tap(){this.jump=Math.max(this.jump,.6);this.rip+=6;if(this.state==='sleep')this.set('greet');return this}
 level(v){this.lv=Math.max(0,Math.min(1,v));return this}
 lookAt(){if(this.state==='sleep')this.set('greet')}
 tick(now){const t=(now-this.t0)/1000,st=this.state,o=this.o,el=(now-this.st0)/1000;
  // pose easing
  const P=POSE[st];let tl=P[0],tr=P[1];
  if(st==='greet')tl+=Math.sin(t*9)*16;
  if(st==='working'){tl+=Math.sin(t*7)*6;tr+=Math.sin(t*7+1)*4}
  if(st==='listening')tl+=Math.sin(t*2)*4;
  if(st==='typing'){tl+=Math.max(0,Math.sin(t*14))*7;tr-=Math.max(0,Math.sin(t*14+1.7))*7}
  if(st==='idle'){tl+=Math.sin(t*1.6)*3;tr-=Math.sin(t*1.6+.6)*3}
  this.cur[0]+=(tl-this.cur[0])*.14;this.cur[1]+=(tr-this.cur[1])*.14;
  this.armL.setAttribute('transform',`translate(${this.B.sh[0][0]} ${this.B.sh[0][1]}) rotate(${this.cur[0].toFixed(2)})`);
  this.armR.setAttribute('transform',`translate(${this.B.sh[1][0]} ${this.B.sh[1][1]}) rotate(${this.cur[1].toFixed(2)})`);
  this.paper.style.opacity=(o.paper&&st!=='success'&&st!=='thinking'&&st!=='typing')?1:0;
  this.kb.setAttribute('opacity',st==='typing'?1:0);
  if(st==='typing'){const ki=Math.floor(t*9)%this.keys.length;this.keys.forEach((k,i)=>k.setAttribute('fill',i===ki||i===(ki*7)%this.keys.length?(o.accent||'#E9651F'):o.line));
   const G='دراسةبحثمرجعنتائج';this.chars.forEach((c,i)=>{const u=((t*1.3+i/4)%1);c.textContent=G[(Math.floor(t*1.3+i/4)*3+i)%G.length];c.setAttribute('x',(250+i*34+Math.sin(u*5+i)*10).toFixed(1));c.setAttribute('y',(430-u*90).toFixed(1));c.setAttribute('opacity',(Math.sin(u*Math.PI)*.9).toFixed(2))})}
  // body motion
  const br=st==='sleep'?Math.sin(t*1.4)*.012:Math.sin(t*2.2)*.008;
  let dy=0;if(this.jump>0){dy=-Math.sin(this.jump*Math.PI)*70;this.jump=Math.max(0,this.jump-.03);if(st==='success'&&this.jump===0&&el<2.4)this.jump=1}
  let dx=0;if(this.shake>0){dx=Math.sin(now/28)*10*this.shake;this.shake=Math.max(0,this.shake-.015)}
  const tilt=st==='typing'?Math.sin(t*3)*1.5:st==='thinking'?-5:st==='listening'?4:st==='sleep'?-4:Math.sin(t*1.1)*1.2;
  this.up.setAttribute('transform',`translate(${dx} ${dy}) translate(300 528) scale(${1-br} ${1+br}) rotate(${tilt*.25}) translate(-300 -528)`);
  this.legs.setAttribute('transform',`translate(${dx} ${dy*.6})`);
  this.head.setAttribute('transform',`rotate(${tilt} 300 300)`);
  this.shadow.setAttribute('rx',110+dy*.6);
  // eyes / blink
  if(now>this.nb){this.blink=1;this.nb=now+2200+Math.random()*2600}
  const bl=this.blink>0?Math.sin(this.blink*Math.PI):0;this.blink=Math.max(0,this.blink-.12);
  const big=st==='listening'?1.18:1;
  this.eyes.forEach(E=>{let closed=0,lid='';
   if(st==='sleep')closed=1;
   if(st==='success')lid=`M${E.x-14} ${E.y+6} Q ${E.x} ${E.y-16} ${E.x+14} ${E.y+6}`;
   if(st==='error')lid=`M${E.x-14} ${E.y-26} L ${E.x+12} ${E.y-32}`;
   if(closed)lid=`M${E.x-14} ${E.y+2} Q ${E.x} ${E.y+12} ${E.x+14} ${E.y+2}`;
   const hide=closed||st==='success';E.e.style.opacity=hide?0:1;
   const lx=st==='thinking'?5:0,ly=st==='thinking'?-5:st==='typing'?6:0;
   const sq=1-bl*.92;E.w.setAttribute('ry',(21*big*sq).toFixed(1));E.w.setAttribute('rx',(15*big).toFixed(1));E.e.querySelectorAll('circle').forEach(c=>c.style.opacity=sq>.5?1:0);
   E.e.setAttribute('transform',`translate(${lx} ${ly})`);
   E.lid.setAttribute('d',lid);if(st==='error'&&E.x>300)E.lid.setAttribute('d',`M${E.x-12} ${E.y-32} L ${E.x+14} ${E.y-26}`)});
  // waves = sync
  let ph=Math.sin(t*1.1)*.25,amp=AMP,gap=1,col=o.ink,sp=t*1.6;
  if(st==='thinking'){ph=1.6+Math.sin(t*3)*1.2;sp=t*4}
  if(st==='working'){sp=t*5;ph=Math.sin(t*5)*.5}
  if(st==='listening'){amp=AMP*(.6+this.lv*2.2+Math.abs(Math.sin(t*6))*.6);sp=t*5}
  if(st==='success'){ph=0;col=o.gold;amp=AMP*1.3}
  if(st==='error'){ph=Math.PI;gap=1.9;amp=AMP*.8}
  if(st==='sleep'){amp=AMP*.35;sp=t*.7}
  this.rip*=.94;
  { let d='',fill='none',tg=0;const br2=Math.sin(t*2.2)*1.2;
   if(st==='success'||st==='greet'){const w=st==='success'?26:20;d=`M${300-w} 200 Q 300 ${st==='success'?240:228} ${300+w} 200 Z`;fill=o.ink;tg=1}
   else if(st==='listening'){const r=8+this.lv*8+Math.abs(Math.sin(t*6))*3;d=`M300 ${206-r} a ${r*.8} ${r} 0 1 0 0.1 0 Z`;fill=o.ink}
   else if(st==='thinking'||st==='working'||st==='typing'){let q='';for(let k=0;k<=14;k++){const u=k/14;q+=(k?'L':'M')+(286+28*u).toFixed(1)+' '+(210+Math.sin(u*Math.PI*2+sp)*4).toFixed(1)}d=q}
   else if(st==='error'){d='M280 216 Q 290 204 300 212 Q 310 220 320 208'}
   else if(st==='sleep'){d='M292 210 Q 300 214 308 210'}
   else {d=`M280 ${203+br2} Q 290 ${219+br2} 300 ${205+br2} Q 310 ${219+br2} 320 ${203+br2}`}
   this.mouth.setAttribute('d',d);this.mouth.setAttribute('fill',fill);this.tongue.setAttribute('opacity',tg);this.tongue.setAttribute('cy',st==='success'?224:216);this.tongue.setAttribute('rx',st==='success'?11:8)}
  this.chest.forEach((p,i)=>{if(this.B.nochest){p.setAttribute('d','');return}p.setAttribute('d',wave(0,0,0,0).replace(/[\d.]+ [\d.]+/g,m=>m));
   let d='';for(let k=0;k<=24;k++){const u=k/24,x=246+108*u,y=372+i*30+Math.sin(u*Math.PI*2+sp+(i?ph:0))*9;d+=(k?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}
   p.setAttribute('d',d);p.setAttribute('stroke',st==='success'?o.gold:(o.accent||o.line))});
  // fx
  this.dots.forEach((d,i)=>d.setAttribute('opacity',st==='thinking'?(.25+.75*Math.max(0,Math.sin(t*4-i*.9))).toFixed(2):0));
  this.stars.forEach((s,i)=>{const a=st==='success'?Math.max(0,Math.sin(el*3-i*.5)):0;s.setAttribute('opacity',a.toFixed(2));
   s.setAttribute('transform',`rotate(${(t*60+i*40)%360} ${s.getBBox?0:0} 0)`)});
  this.z.setAttribute('opacity',st==='sleep'?(.4+.6*Math.abs(Math.sin(t*1.2))).toFixed(2):0);
  this.z.setAttribute('y',(70-((t*14)%30)).toFixed(1));
  this.raf=requestAnimationFrame(this.tick.bind(this))}
 destroy(){cancelAnimationFrame(this.raf);this.host.innerHTML=''}
}
/* Team mark — "W": two students high-five; their raised arms draw the W. Hands meet = sync.
   new TeamW(host,{color,gold,state:'idle'|'sync'|'loading'}) */
class TeamW{
 constructor(host,o={}){this.o=Object.assign({color:'#F3E9DC',gold:'#FFC777',state:'idle',sw:28},o);this.host=host;this.t0=performance.now();this.k=0;this.build();this.set(this.o.state);this.raf=requestAnimationFrame(this.tick.bind(this))}
 build(){const s=this.svg=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 400 320');s.style.width='100%';s.style.height='100%';s.style.overflow='visible';this.host.innerHTML='';this.host.appendChild(s);
  const mk=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);s.appendChild(e);return e};
  const L={fill:'none',stroke:this.o.color,'stroke-width':this.o.sw,'stroke-linecap':'round','stroke-linejoin':'round'};
  this.p=[mk('path',L),mk('path',L)];this.h=[mk('circle',{r:24,fill:this.o.color}),mk('circle',{r:24,fill:this.o.color})];
  this.spark=mk('path',{fill:this.o.gold,opacity:0});
  s.addEventListener('pointerdown',()=>this.set(this.o.state==='sync'?'idle':'sync'))}
 set(st){this.o.state=st;this.s0=performance.now();return this}
 tick(now){const t=(now-this.t0)/1000,st=this.o.state;
  const tg=st==='sync'?1:st==='loading'?(.5+.5*Math.sin(t*4)):0;this.k+=(tg-this.k)*.12;
  const gap=(1-this.k)*26; const col=st==='sync'&&this.k>.85?this.o.gold:this.o.color;
  [[0,1],[1,-1]].forEach(([i,dir])=>{const cx=i?268:132,bob=st==='idle'?Math.sin(t*2+i*2)*5:0;
   const outer=[cx-dir*74,46+bob],inner=[200-dir*(gap/2+6),58+gap*.6];
   const sh=[cx,154];const hip=[cx,214];
   const so=[cx-dir*20,154],si=[cx+dir*20,154];const d=`M${outer[0]} ${outer[1]} L${so[0]} ${so[1]} L${si[0]} ${si[1]} L${inner[0]} ${inner[1]} M${sh[0]} ${sh[1]} L${hip[0]} ${hip[1]} M${cx-20} ${280} L${hip[0]} ${hip[1]} L${cx+20} 280`;
   this.p[i].setAttribute('d',d);this.p[i].setAttribute('stroke',col);
   this.h[i].setAttribute('cx',cx);this.h[i].setAttribute('cy',104+bob*.4);this.h[i].setAttribute('fill',col)});
  const sp=st==='sync'?Math.max(0,Math.sin(Math.min(1,(now-this.s0)/700)*Math.PI)):0;const r=10+sp*26;
  this.spark.setAttribute('d',`M200 ${30-r}L${200+r*.28} ${30-r*.28}L${200+r} 30L${200+r*.28} ${30+r*.28}L200 ${30+r}L${200-r*.28} ${30+r*.28}L${200-r} 30L${200-r*.28} ${30-r*.28}Z`);
  this.spark.setAttribute('opacity',sp.toFixed(2));
  this.raf=requestAnimationFrame(this.tick.bind(this))}
 destroy(){cancelAnimationFrame(this.raf);this.host.innerHTML=''}
}
window.WesyLine=WesyLine;window.TeamW=TeamW;
})();
