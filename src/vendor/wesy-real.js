/* نسخة brand/wesy-real.js مع تعديلين للهوية (ممنوع أخضر وأزرق برّا زي اليوم الوطني): ألوان كتب stage 2–3 صارت برتقالي/ذهبي/بني، وقطرة العرق كريمية بدل الأزرق. */
/* ويسي v3 — a real Saudi researcher at his laptop. Beard, shemagh (Wesync check), agal, thobe + bisht.
   Arms use 2-bone IK, so every pose moves like a real arm.
   new WesyReal(host,{state,shemagh,crop,shadow}) .set(state) .tap() .level(v) .destroy()
   states: idle | greet | listening | thinking | typing | working | success | error | sleep   (idle sips qahwa now and then) */
(function(){
const NS='http://www.w3.org/2000/svg';
const C={ink:'#1E0B05',skin:'#C98A5E',skinD:'#A96C45',beard:'#2A170D',thobe:'#FFFFFF',bisht:'#1E0B05',gold:'#E39A2E',ember:'#E9651F',lid:'#EFE8DF',cheek:'#E08A6A'};
const SH=[[208,384],[392,384]],UA=92,FA=88;
function ik(S,T,a,b,out){let dx=T[0]-S[0],dy=T[1]-S[1],d=Math.hypot(dx,dy);d=Math.min(d,a+b-2);d=Math.max(d,Math.abs(a-b)+2);
 const base=Math.atan2(dy,dx),k=Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
 const e1=[S[0]+a*Math.cos(base+k),S[1]+a*Math.sin(base+k)],e2=[S[0]+a*Math.cos(base-k),S[1]+a*Math.sin(base-k)];
 const E=(Math.abs(e1[0]-300)*out>Math.abs(e2[0]-300)*out)?e1:e2;const h=[S[0]+(T[0]-S[0])*(d/Math.hypot(dx,dy)||1),0];
 const ang=Math.atan2(T[1]-E[1],T[0]-E[0]);return {E,H:[E[0]+b*Math.cos(ang),E[1]+b*Math.sin(ang)]}}
class WesyReal{
 constructor(host,o={}){this.o=Object.assign({state:'idle',shemagh:'#C8102E',shadow:true,outfit:'normal',stage:0,formal:false,glasses:false,follow:false,confetti:true,settleAfter:0},o);this.lastAct=performance.now();this.paused=false;if(this.o.outfit==='national'&&!o.shemagh)this.o.shemagh='#1F7A3A';this.ptr=null;this.excite=0;this.browUp=0;this.host=host;this.state=this.o.state;this.t0=performance.now();this.st0=this.t0;
  this.lv=0;this.blink=0;this.nb=this.t0+2500+Math.random()*3000;this.hand=[[250,470],[350,470]];this.head=[0,0,0];this.jump=0;this.shake=0;this.sipAt=this.t0+5000;this.sip=0;
  this.build();this.raf=requestAnimationFrame(this.tick.bind(this))}
 el(t,a,p){if(a.stroke&&a.fill==null)a.fill='none';const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);(p||this.svg).appendChild(e);return e}
 build(){const o=this.o,s=this.svg=document.createElementNS(NS,'svg');
  s.setAttribute('viewBox',o.vb||(o.crop==='head'?'196 92 208 208':'40 70 520 500'));s.style.width='100%';s.style.height='100%';s.style.overflow=o.crop?'hidden':'visible';
  this.host.innerHTML='';this.host.appendChild(s);
  const id='wr'+Math.random().toString(36).slice(2,7),df=this.el('defs',{});
  const pt=this.el('pattern',{id,width:12,height:12,patternUnits:'userSpaceOnUse',patternTransform:'rotate(0)'},df);
  this.el('rect',{width:12,height:12,fill:'#fff'},pt);this.el('rect',{x:1,y:4,width:10,height:4,fill:o.shemagh},pt);this.el('rect',{x:4,y:1,width:4,height:10,fill:o.shemagh},pt);
  const I={stroke:C.ink,'stroke-width':7,'stroke-linejoin':'round','stroke-linecap':'round'};const A=(x,y)=>Object.assign({},I,x||{},y||{});
  this.shadowE=this.el('ellipse',{cx:300,cy:548,rx:200,ry:12,fill:C.ink,opacity:o.shadow?.9:0});
  this.body=this.el('g',{});
  // torso: thobe + bisht
  this.el('path',A({d:'M168 540 C 168 450 176 400 214 380 Q 300 352 386 380 C 424 400 432 450 432 540 Z',fill:C.thobe}),this.body);
  this.el('path',A({d:'M168 540 C 168 450 176 400 214 380 Q 246 370 262 368 L 270 540 Z',fill:C.bisht}),this.body);
  this.el('path',A({d:'M432 540 C 432 450 424 400 386 380 Q 354 370 338 368 L 330 540 Z',fill:C.bisht}),this.body);
  this.el('path',{d:'M264 372 L 272 540 M336 372 L 328 540',stroke:C.gold,'stroke-width':6,'stroke-linecap':'round'},this.body);
  this.el('path',{d:'M252 384 L 258 536 M348 384 L 342 536',stroke:C.gold,'stroke-width':3,'stroke-dasharray':'2 8','stroke-linecap':'round'},this.body);
  this.el('path',{d:'M300 368 L 300 420',stroke:C.ink,'stroke-width':4,'stroke-linecap':'round',opacity:.5},this.body);
  // head group
  this.hg=this.el('g',{},this.body);
  this.el('path',A({d:'M300 88 C 284 92 256 102 240 116 C 208 140 196 186 198 240 C 200 286 206 306 214 318 L 136 408 L 262 544 L 286 344 L 314 344 L 338 544 L 464 408 L 386 318 C 394 306 400 286 402 240 C 404 186 392 140 360 116 C 344 102 316 92 300 88 Z',fill:`url(#${id})`}),this.hg); // shemagh: crown + sides + two drapes
  const bord=(a,b,sg)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*sg,ny=dx/l*sg;[[10,'#fff',14],[19,o.shemagh,4],[26,o.shemagh,2.5]].forEach(([d,c,w])=>this.el('path',{d:`M${(a[0]+nx*d).toFixed(1)} ${(a[1]+ny*d).toFixed(1)} L${(b[0]+nx*d).toFixed(1)} ${(b[1]+ny*d).toFixed(1)}`,stroke:c,'stroke-width':w,'stroke-linecap':'round'},this.hg))};
  bord([140,410],[258,538],-1);bord([460,410],[342,538],1);
  this.el('path',{d:'M136 408 L 262 544 L 286 344 M464 408 L 338 544 L 314 344',stroke:C.ink,'stroke-width':6,'stroke-linejoin':'round','stroke-linecap':'round'},this.hg);
  this.el('path',A({d:'M276 300 L 276 352 Q 300 366 324 352 L 324 300 Z',fill:C.skinD}),this.hg); // neck
  this.el('path',A({d:'M300 148 C 250 148 234 186 234 226 C 234 280 262 314 300 314 C 338 314 366 280 366 226 C 366 186 350 148 300 148 Z',fill:C.skin}),this.hg); // face
  this.cheeks=[[262,246],[338,246]].map(([x,y])=>this.el('ellipse',{cx:x,cy:y,rx:13,ry:7,fill:C.cheek,opacity:.45},this.hg));
  // beard + moustache
  this.el('path',{d:'M236 232 C 236 284 264 318 300 318 C 336 318 364 284 364 232 C 358 258 346 268 332 270 C 320 262 280 262 268 270 C 254 268 242 258 236 232 Z',fill:C.beard,stroke:C.ink,'stroke-width':5,'stroke-linejoin':'round'},this.hg);
  this.mouth=this.el('path',{d:'',fill:'#7A2E1C',stroke:C.ink,'stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'},this.hg);
  this.teeth=this.el('path',{d:'',fill:'#fff'},this.hg);this.tongue=this.el('ellipse',{cx:300,cy:292,rx:9,ry:5,fill:'#E07A6A',opacity:0},this.hg);
  this.moust=this.el('path',{d:'M272 270 Q 286 258 300 264 Q 314 258 328 270 Q 314 268 300 272 Q 286 268 272 270 Z',fill:C.beard,stroke:C.ink,'stroke-width':4,'stroke-linejoin':'round'},this.hg);
  this.el('path',{d:'M298 214 Q 290 240 296 248 Q 304 252 312 246',stroke:C.ink,'stroke-width':4.5,'stroke-linecap':'round','stroke-linejoin':'round'},this.hg); // nose
  // eyes
  this.eyes=[[272,212],[328,212]].map(([x,y],i)=>{const g=this.el('g',{},this.hg);
   const w=this.el('ellipse',{cx:x,cy:y,rx:14,ry:10,fill:'#fff',stroke:C.ink,'stroke-width':3.5},g);
   const ir=this.el('g',{},g);this.el('circle',{cx:x,cy:y,r:8,fill:'#2A160C'},ir);this.el('circle',{cx:x+2.5,cy:y-2.5,r:2.4,fill:'#fff'},ir);
   const lid=this.el('path',{d:'',fill:C.skin},g);const lash=this.el('path',{d:'',stroke:C.ink,'stroke-width':4,'stroke-linecap':'round'},g);
   const brow=this.el('path',{d:'',stroke:C.beard,'stroke-width':8,'stroke-linecap':'round'},this.hg);return {g,w,ir,lid,lash,brow,x,y,i}});
  // shemagh front edge + agal
  this.el('path',{d:'M236 132 L 364 132 L 378 252 C 372 212 364 182 352 168 Q 326 160 300 166 Q 274 160 248 168 C 236 182 228 212 222 252 Z',fill:`url(#${id})`},this.hg);
  this.el('path',{d:'M228 252 C 232 212 240 184 250 170 Q 274 162 300 168 Q 326 162 350 170 C 360 184 368 212 372 252',stroke:C.ink,'stroke-width':6,'stroke-linejoin':'round','stroke-linecap':'round'},this.hg);

  this.el('path',{d:'M300 92 L 300 126 M270 104 Q 280 116 280 128 M330 104 Q 320 116 320 128',stroke:C.ink,'stroke-width':3.5,'stroke-linecap':'round',opacity:.45},this.hg);
  [136,150].forEach(y=>this.el('ellipse',{cx:300,cy:y,rx:80,ry:12,stroke:C.ink,'stroke-width':12},this.hg));
  if(o.glasses||o.outfit==='deadline'){[[272,212],[328,212]].forEach(([x,y])=>this.el('circle',{cx:x,cy:y,r:21,stroke:C.ink,'stroke-width':5,fill:'rgba(255,255,255,.12)'},this.hg));this.el('path',{d:'M293 210 Q 300 204 307 210',stroke:C.ink,'stroke-width':5},this.hg)}
  if(o.outfit==='deadline'){this.sweat=this.el('path',{d:'M370 176 Q 362 192 370 198 Q 378 192 370 176 Z',fill:'#FFE3C2',stroke:C.ink,'stroke-width':3},this.hg)}
  this.cap=this.el('g',{opacity:o.outfit==='grad'?1:0},this.hg);
  this.el('path',A({d:'M300 52 L 392 84 L 300 116 L 208 84 Z',fill:C.ink}),this.cap);this.el('path',A({d:'M250 100 L 250 124 Q 300 142 350 124 L 350 100',fill:C.ink}),this.cap);
  this.el('path',{d:'M300 84 L 384 98 L 384 140',stroke:C.gold,'stroke-width':5,'stroke-linecap':'round'},this.cap);this.el('circle',{cx:384,cy:146,r:8,fill:C.gold},this.cap);
  // arms (front)
  this.arms=[0,1].map(i=>{const g=this.el('g',{},this.body);
   const up=this.el('path',{stroke:C.ink,'stroke-width':44,'stroke-linecap':'round'},g),upi=this.el('path',{stroke:C.bisht,'stroke-width':32,'stroke-linecap':'round'},g);
   const fo=this.el('path',{stroke:C.ink,'stroke-width':36,'stroke-linecap':'round'},g),foi=this.el('path',{stroke:C.thobe,'stroke-width':24,'stroke-linecap':'round'},g);
   const cuff=this.el('circle',{r:3,fill:C.gold},g);
   const hand=this.el('g',{},g);this.el('ellipse',A({cx:0,cy:0,rx:17,ry:15,fill:C.skin,'stroke-width':5}),hand);this.el('path',{d:'M-6 -6 Q 0 -2 6 -6',stroke:C.skinD,'stroke-width':3,'stroke-linecap':'round'},hand);
   const cup=this.el('g',{opacity:0},hand);this.el('path',A({d:'M-12 -30 L 12 -30 L 9 -10 L -9 -10 Z',fill:'#fff','stroke-width':4}),cup);this.el('path',{d:'M-10 -24 L 10 -24',stroke:C.gold,'stroke-width':3},cup);
   return {g,up,upi,fo,foi,cuff,hand,cup}});
  // laptop + desk + finjan
  this.lap=this.el('g',{});
  this.el('path',A({d:'M60 548 L 540 548'}),this.lap);
  this.el('rect',A({x:204,y:426,width:192,height:122,rx:14,fill:C.ink,transform:'translate(9 7)'}),this.lap);
  this.el('rect',A({x:204,y:426,width:192,height:122,rx:14,fill:C.lid}),this.lap);
  this.logo=[0,1].map(i=>this.el('path',{stroke:C.ember,'stroke-width':6,'stroke-linecap':'round'},this.lap));
  this.glow=this.el('ellipse',{cx:300,cy:420,rx:110,ry:16,fill:'#FFF4E6',opacity:.0},this.lap);
  const f=this.el('g',{transform:'translate(468 548)'},this.lap);this.el('path',A({d:'M-16 -30 L 16 -30 L 12 0 L -12 0 Z',fill:'#fff','stroke-width':5}),f);this.el('path',{d:'M-14 -22 L 14 -22',stroke:C.gold,'stroke-width':3},f);
  this.deskCup=f;
  this.steam=[0,1].map(i=>this.el('path',{stroke:C.ink,'stroke-width':3,'stroke-linecap':'round',opacity:0},this.lap));
  if(o.outfit==='ramadan'){f.style.display='none';const L=this.el('g',{transform:'translate(112 548)'},this.lap);
   this.lglow=this.el('circle',{cx:0,cy:-50,r:46,fill:'#FFC777',opacity:.35},L);
   this.el('path',A({d:'M-22 -18 L 22 -18 L 18 -76 L -18 -76 Z',fill:'#FFD58A','stroke-width':5}),L);this.el('path',A({d:'M-26 -18 L 26 -18 L 26 0 L -26 0 Z M-14 -76 L 0 -96 L 14 -76',fill:C.gold,'stroke-width':5}),L);
   this.el('path',{d:'M-6 -58 A 10 10 0 1 0 6 -38 A 8 8 0 1 1 -6 -58 Z',fill:C.ember},L);
   const D=this.el('g',{transform:'translate(474 548)'},this.lap);this.el('path',A({d:'M-34 -14 Q 0 6 34 -14 Z',fill:'#fff','stroke-width':5}),D);[[-14,-20],[2,-24],[16,-20],[-4,-30]].forEach(([x,y])=>this.el('ellipse',{cx:x,cy:y,rx:9,ry:6,fill:'#6B3A1E',stroke:C.ink,'stroke-width':3},D))}
  if(o.outfit==='national'){this.el('path',A({d:'M396 432 L 396 476 L 384 466 L 372 476 L 372 432 Z',fill:'#1F7A3A','stroke-width':4}),this.lap)}
  if(o.outfit==='deadline'){const P=this.el('g',{transform:'translate(100 548)'},this.lap);[0,1,2,3].forEach(i=>this.el('rect',A({x:-36+i*3,y:-10-i*9,width:72,height:9,rx:2,fill:'#fff','stroke-width':3,transform:`rotate(${(i%2?3:-4)} 0 0)`}),P))}
  if(o.stage>=2){const B=this.el('g',{transform:'translate(112 548)'},this.lap);[['#E9651F',0],['#FFC777',-22],['#7A2E1C',-44]].slice(0,o.stage>=3?3:2).forEach(([c,y],i)=>this.el('rect',A({x:-44+i*4,y:y-22,width:88-i*8,height:22,rx:4,fill:c,'stroke-width':4}),B))}
  if(o.stage>=3){const T=this.el('g',{transform:'translate(112 '+(548-66-12)+')'},this.lap);this.el('path',A({d:'M-16 -40 L 16 -40 L 12 -14 Q 0 -4 -12 -14 Z M-6 -8 L 6 -8 L 8 0 L -8 0 Z',fill:C.gold,'stroke-width':4}),T)}
  this.conf=[...Array(18)].map((_,i)=>this.el('rect',{width:8,height:14,rx:2,fill:[C.ember,C.gold,'#1F7A3A','#fff'][i%4],stroke:C.ink,'stroke-width':1.5,opacity:0},this.lap));
  // fx
  this.fx=this.el('g',{});
  this.dots=[0,1,2].map(i=>this.el('circle',{cx:396+i*20,cy:132-i*16,r:6+i*2.5,fill:C.ink,opacity:0},this.fx));
  this.stars=[[150,170],[450,150],[470,300],[132,310]].map(([x,y])=>this.el('path',{d:`M${x} ${y-16}L${x+5} ${y-5}L${x+16} ${y}L${x+5} ${y+5}L${x} ${y+16}L${x-5} ${y+5}L${x-16} ${y}L${x-5} ${y-5}Z`,fill:C.gold,opacity:0},this.fx));
  this.haha=[0,1,2].map(i=>{const t=this.el('text',{x:0,y:0,'font-size':26,'font-weight':800,fill:C.ember,opacity:0,'font-family':'Tajawal,system-ui','text-anchor':'middle'},this.fx);t.textContent='هه';return t});
  this.z=this.el('text',{x:390,y:150,'font-size':42,'font-weight':800,fill:C.ember,opacity:0,'font-family':'system-ui'},this.fx);this.z.textContent='z';
  this.chars=[0,1,2,3].map(()=>this.el('text',{x:300,y:410,'font-size':24,'font-weight':800,fill:C.ember,opacity:0,'font-family':'Tajawal,system-ui','text-anchor':'middle'},this.fx));
  s.addEventListener('pointerdown',()=>this.tap());
  if(o.follow){this._pm=e=>{this.wake();const r=s.getBoundingClientRect();this.ptr=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]};addEventListener('pointermove',this._pm)}
 }
 set(st){this.state=st;this.st0=performance.now();this.wake&&this.wake();if(st==='success'||st==='celebrate')this.jump=1;if(st==='error')this.shake=1;if(st==='idle')this.sipAt=this.st0+4000;return this}
 tap(){this.wake();if(this.state==='sleep')this.set('greet');else this.jump=Math.max(this.jump,.5);return this}
 level(v){this.lv=Math.max(0,Math.min(1,v));return this}
 lookAt(){if(this.state==='sleep')this.set('greet')}
 tick(now){const t=(now-this.t0)/1000,el=(now-this.st0)/1000,st=this.state;
  // --- hand targets (viewer-left = arm 0)
  let T0=[250,470],T1=[350,470],hx=0,hy=0,hr=0,look=[0,0],brow=0,mouth='grin',sipping=false,wink=-1,laughing=false,squint=.55;
  if(st==='idle'){const c=(t%11);if(c>7.5&&c<9.2){laughing=true}else if(c>3&&c<3.8){wink=1;mouth='laugh'}}
  if(st==='idle'){T0=[262,456];T1=[338,456];look=[Math.sin(t*.7)*3,0];
   if(now>this.sipAt){this.sip=Math.min(1,this.sip+.02);if(now>this.sipAt+3200){this.sipAt=now+7000+Math.random()*5000}}else this.sip=Math.max(0,this.sip-.03);
   if(this.sip>0){const k=this.sip<.5?this.sip*2:1,ph=(now-this.sipAt)/1000;const up=ph<2.6?Math.min(1,ph/0.8):Math.max(0,1-(ph-2.6)/.6);
    T1=[338+(314-338)*up,456+(290-456)*up];hr=-3*up;look=[-2*up,-2*up];sipping=up>.05}}
  if(st==='typing'||st==='working'){const r=st==='typing';T0=[256+Math.sin(t*15)*4,470+Math.max(0,Math.sin(t*15))*-8];T1=[344+Math.sin(t*13+1)*4,470+Math.max(0,Math.sin(t*13+1.3))*-8];
   const rl=(t*0.9)%1;look=[r?(6-12*rl):Math.sin(t*2)*6,6];hy=3;hr=Math.sin(t*1.3)*1.5;mouth='smile';squint=.35}
  if(st==='thinking'){T0=[290,318+Math.sin(t*4)*6];T1=[338,456];look=[5,-6];brow=-5;hr=-6;mouth='smirk';squint=.2}
  if(st==='greet'){T0=[180+Math.sin(t*10)*16,226];T1=[338,456];mouth='laugh';brow=-4;hr=4;wink=(Math.sin(t*1.5)>.5)?1:-1}
  if(st==='success'){T0=[188,182+Math.sin(t*8)*6];T1=[412,182+Math.sin(t*8+1)*6];mouth='laugh';brow=-6;laughing=true}
  if(st==='error'){T0=[262,456];T1=[330,190];mouth='oops';brow=4;hr=-4;squint=0}
  if(st==='listening'){T0=[262,456];T1=[338,456];hr=6+Math.sin(t*2)*2;hy=Math.sin(t*3.2)*3*(.4+this.lv);look=[-4,0];mouth='smallo';squint=.3}
  if(st==='sleep'){T0=[262,462];T1=[338,462];hy=16;hr=-10;mouth='closed';squint=0}
  if(st==='laugh'){T0=[262,456];T1=[338,452];laughing=true}
  if(st==='wink'){T0=[262,456];T1=[396+Math.sin(t*2)*3,262];wink=1;mouth='grin';brow=0;hr=5;this.browUp=Math.max(this.browUp,.8)}
  if(st==='yawn'){const c=(el%5)/5,y=Math.sin(Math.min(1,c*1.6)*Math.PI);T0=[226-40*y,456-260*y];T1=[374+40*y,456-260*y];mouth=y>.3?'yawn':'closed';squint=1;hr=-6*y;hy=-6*y}
  if(st==='deadline'){T0=[256+Math.sin(t*24)*4,470+Math.max(0,Math.sin(t*24))*-9];T1=[344+Math.sin(t*22+1)*4,470+Math.max(0,Math.sin(t*22+1.3))*-9];const rl=(t*1.6)%1;look=[6-12*rl,7];mouth='oops';hy=4;squint=0}
  if(st==='celebrate'){const k=Math.min(1,el/0.6);T0=[188,182+Math.sin(t*8)*6];T1=[412,170];laughing=true}
  if(this.o.formal){if(wink>=0)wink=-1;if(mouth==='laugh'||mouth==='grin')mouth='smile';if(laughing&&st!=='success'&&st!=='celebrate'){laughing=false;mouth='smile'}}
  if(this.excite>0){mouth='laugh';brow=-6;hy-=3}
  if(this.ptr&&(st==='idle'||st==='greet')){look=[(this.ptr[0]-.5)*14,(this.ptr[1]-.4)*10];hr+= (this.ptr[0]-.5)*6}
  if(laughing){mouth='laugh';hy=Math.abs(Math.sin(t*14))*-5;hr=Math.sin(t*3)*3+4;if(st!=='success'){T1=[330,300+Math.sin(t*14)*4]}}
  const e=st==='sleep'?.05:.16;this.hand[0][0]+=(T0[0]-this.hand[0][0])*e;this.hand[0][1]+=(T0[1]-this.hand[0][1])*e;this.hand[1][0]+=(T1[0]-this.hand[1][0])*e;this.hand[1][1]+=(T1[1]-this.hand[1][1])*e;
  this.head[0]+=(hr-this.head[0])*.08;this.head[1]+=(hy-this.head[1])*.08;
  // body breath, jump, shake
  const br=Math.sin(t*(st==='sleep'?1.2:2))*(st==='sleep'?2.5:1.6);
  let dy=0;if(this.jump>0){dy=-Math.sin(this.jump*Math.PI)*26;this.jump=Math.max(0,this.jump-.035);if(st==='success'&&this.jump===0&&el<2)this.jump=1}
  let shx=0;if(this.shake>0){shx=Math.sin(now/40)*5*this.shake;this.shake=Math.max(0,this.shake-.012)}
  this.body.setAttribute('transform',`translate(0 ${dy}) translate(300 540) scale(1 ${1+br/400}) translate(-300 -540)`);
  this.hg.setAttribute('transform',`translate(${shx} ${this.head[1]+br*.6}) rotate(${this.head[0]} 300 340)`);
  // arms (IK); hand positions are in body space
  this.arms.forEach((a,i)=>{const S=SH[i],H=this.hand[i];const {E}=ik(S,H,UA,FA,1);
   const up=`M${S[0]} ${S[1]} L${E[0].toFixed(1)} ${E[1].toFixed(1)}`,fo=`M${E[0].toFixed(1)} ${E[1].toFixed(1)} L${H[0].toFixed(1)} ${H[1].toFixed(1)}`;
   a.up.setAttribute('d',up);a.upi.setAttribute('d',up);a.fo.setAttribute('d',fo);a.foi.setAttribute('d',fo);
   a.cuff.setAttribute('cx',(E[0]+(H[0]-E[0])*.8).toFixed(1));a.cuff.setAttribute('cy',(E[1]+(H[1]-E[1])*.8).toFixed(1));
   a.hand.setAttribute('transform',`translate(${H[0].toFixed(1)} ${H[1].toFixed(1)})`);a.cup.setAttribute('opacity',i===1&&sipping?1:0)});
  this.deskCup.style.opacity=sipping?0:1;
  // eyes: saccades + blink
  if(now>this.nb){this.blink=1;this.nb=now+(Math.random()<.2?260:2400+Math.random()*2800)}
  const bl=this.blink>0?Math.sin(this.blink*Math.PI):0;this.blink=Math.max(0,this.blink-.14);
  this.browUp=Math.max(0,this.browUp-.01);const closed=(st==='sleep'||(st==='yawn'&&mouth==='yawn'))?1:bl;const happyAll=laughing||st==='success';
  this.eyes.forEach(E=>{const happy=happyAll||wink===E.i;const lx=Math.max(-6,Math.min(6,look[0])),ly=Math.max(-4,Math.min(4,look[1]));
   E.ir.setAttribute('transform',`translate(${lx} ${ly})`);E.ir.style.opacity=happy?0:1;E.w.style.opacity=happy?0:1;
   E.w.setAttribute('ry',(10-3*squint).toFixed(1));E.g.setAttribute('transform',`translate(0 ${(-2*squint).toFixed(1)})`);
   const top=E.y-10,lidY=top+20*closed;
   E.lid.setAttribute('d',!happy&&closed>0.02?`M${E.x-16} ${top-2} L${E.x+16} ${top-2} L${E.x+16} ${lidY} Q ${E.x} ${lidY+4} ${E.x-16} ${lidY} Z`:'');
   E.lash.setAttribute('d',happy?`M${E.x-13} ${E.y+3} Q ${E.x} ${E.y-12} ${E.x+13} ${E.y+3}`:closed>0.02?`M${E.x-15} ${lidY} Q ${E.x} ${lidY+4+4*closed} ${E.x+15} ${lidY}`:'');
   const s=E.i?1:-1,b=brow+(st==='error'?(E.i?-4:-4):0)+(st==='thinking'&&E.i?-7:0)+(E.i?-9*this.browUp:0);
   E.brow.setAttribute('d',st==='error'?`M${E.x-14*s} ${E.y-20+b+4} Q ${E.x} ${E.y-26+b} ${E.x+14*s} ${E.y-28+b}`:`M${E.x-15} ${E.y-19+b} Q ${E.x} ${E.y-27+b} ${E.x+15} ${E.y-21+b}`)});
  // mouth
  const M={yawn:['M300 268 a 14 20 0 1 0 .1 0 Z',''],grin:['M278 274 Q 300 300 322 274 Q 300 282 278 274 Z','M282 276 Q 300 282 318 276 L 316 281 Q 300 286 284 281 Z'],laugh:['M274 272 Q 300 316 326 272 Q 300 280 274 272 Z','M278 274 Q 300 281 322 274 L 319 280 Q 300 286 281 280 Z'],smirk:['M284 282 Q 304 290 320 274',''],oops:['M284 284 Q 292 278 300 284 Q 308 290 316 282',''],closed:['M286 280 Q 300 284 314 280',''],flat:['M288 281 L 312 281',''],smile:['M282 278 Q 300 294 318 278',''],
   open:['M280 276 Q 300 306 320 276 Z','M284 278 Q 300 284 316 278 L 314 282 Q 300 286 286 282 Z'],
   worried:['M284 286 Q 300 276 316 286',''],hmm:['M290 282 Q 300 280 312 284',''],smallo:[`M300 ${276-this.lv*4} a 6 ${7+this.lv*6} 0 1 0 .1 0 Z`,'']};
  const m=M[sipping?'closed':mouth]||M.closed;this.mouth.setAttribute('d',m[0]);this.mouth.setAttribute('fill',m[0].endsWith('Z')?'#7A2E1C':'none');this.teeth.setAttribute('d',m[1]);const lg=(sipping?'closed':mouth)==='laugh'||mouth==='yawn';this.tongue.setAttribute('opacity',lg?1:0);this.tongue.setAttribute('cy',lg?298:290);
  this.haha.forEach((h,i)=>{if(!laughing){h.setAttribute('opacity',0);return}const u=((t*1.4+i/3)%1);h.setAttribute('x',(448+i*20+Math.sin(u*6)*6).toFixed(1));h.setAttribute('y',(250-u*80-i*10).toFixed(1));h.setAttribute('opacity',(Math.sin(u*Math.PI)).toFixed(2));h.setAttribute('font-size',(20+i*4))});
  // laptop logo waves (the sync mark)
  let ph=Math.sin(t*1.1)*.3,sp=t*1.6,col=C.ember,gap=1;
  if(st==='thinking'){ph=1.8+Math.sin(t*3)*1.2;sp=t*4}if(st==='typing'||st==='working'){sp=t*5;ph=Math.sin(t*5)*.6}
  if(st==='success'||st==='celebrate'){ph=0;col=C.gold}if(st==='error'){ph=Math.PI;gap=1.6}
  const WV='M22 70 C 44 70 42 138 64 138 C 86 138 84 86 100 86 C 116 86 114 138 136 138 C 158 138 156 70 178 70',off=Math.max(0,Math.min(1,st==='success'||st==='celebrate'?0:st==='error'?1:(st==='thinking'?.6+.4*Math.sin(t*3):(st==='typing'||st==='working'||st==='deadline')?.25+.25*Math.sin(t*5):.15+.1*Math.sin(t*1.2))));
  this.logo.forEach((p,i)=>{p.setAttribute('d',WV);p.setAttribute('stroke-width',20);p.setAttribute('transform',`translate(300 489) scale(.42) translate(-100 -104) translate(${(i?1:-1)*off*22} ${(i?1:-1)*off*10})`);p.setAttribute('stroke',col);p.style.opacity=i?(.35+.65*(1-off)):1});
  
  // outfit fx
  if(this.cap&&this.o.outfit==='grad'){let cy=0,cr=0;if(st==='celebrate'){const k=(el%2.4)/2.4;cy=-Math.sin(k*Math.PI)*90;cr=k*360}this.cap.setAttribute('transform',`translate(0 ${cy}) rotate(${cr} 300 84)`)}
  this.steam.forEach((p,i)=>{if(this.o.outfit!=='morning'||sipping){p.setAttribute('opacity',0);return}const u=(t*.6+i*.5)%1;p.setAttribute('d',`M${462+i*12} ${514-u*30} q 6 -8 0 -16 q -6 -8 0 -16`);p.setAttribute('opacity',(Math.sin(u*Math.PI)*.7).toFixed(2))});
  if(this.sweat){const u=(t*.7)%1;this.sweat.setAttribute('transform',`translate(0 ${u*40})`);this.sweat.setAttribute('opacity',(1-u).toFixed(2))}
  if(this.lglow)this.lglow.setAttribute('opacity',(.3+Math.sin(t*3)*.12).toFixed(2));
  this.conf.forEach((c,i)=>{if(st!=='celebrate'||!this.o.confetti){c.setAttribute('opacity',0);return}const u=((el*0.5+i*.055)%1),x=80+((i*97)%440),y=60+u*480;c.setAttribute('x',x+Math.sin(u*8+i)*16);c.setAttribute('y',y);c.setAttribute('transform',`rotate(${(u*720+i*40)%360} ${x} ${y})`);c.setAttribute('opacity',1)});
  // fx
  this.dots.forEach((d,i)=>d.setAttribute('opacity',st==='thinking'?(.25+.75*Math.max(0,Math.sin(t*4-i*.9))).toFixed(2):0));
  this.stars.forEach((s,i)=>s.setAttribute('opacity',(st==='success'||st==='celebrate')?Math.max(0,Math.sin(el*3-i*.5)).toFixed(2):0));
  this.z.setAttribute('opacity',st==='sleep'?(.4+.6*Math.abs(Math.sin(t*1.2))).toFixed(2):0);this.z.setAttribute('y',(150-((t*14)%30)).toFixed(1));
  const G='دراسةبحثمرجعنتائجعينة';this.chars.forEach((c,i)=>{if(st!=='typing'){c.setAttribute('opacity',0);return}const u=((t*1.2+i/4)%1);c.textContent=G[(Math.floor(t*1.2+i/4)*3+i)%G.length];
   c.setAttribute('x',(250+i*34+Math.sin(u*5+i)*8).toFixed(1));c.setAttribute('y',(420-u*70).toFixed(1));c.setAttribute('opacity',(Math.sin(u*Math.PI)*.9).toFixed(2))});
  if(this.o.settleAfter&&(st==='idle'||st==='wait')&&now-this.lastAct>this.o.settleAfter&&this.blink===0&&this.jump===0){this.paused=true;return}
  this.raf=requestAnimationFrame(this.tick.bind(this))}
 wake(){this.lastAct=performance.now();if(this.paused){this.paused=false;this.raf=requestAnimationFrame(this.tick.bind(this))}return this}
 excited(v){this.excite=v?1:0;return this}
 raise(){this.browUp=1;return this}
 destroy(){cancelAnimationFrame(this.raf);if(this._pm)removeEventListener('pointermove',this._pm);this.host.innerHTML=''}
}
window.WesyReal=WesyReal;
})();
