/* Wesync logo — W built from "sync". new WLogo(host,{variant,color,gold,bg,state,sw})
   variant: 'wave' (the two waves are a W) | 'link' (two chain links lock into a W) | 'loop' (W inside sync arrows) | 'team' (two students high-five)
   state: idle | sync | loading      .set(state) .play() (run the sync moment once) .destroy()
   static WLogo.svg({variant,color,bg,tile}) → static SVG string for icons / favicons */
(function(){
const NS='http://www.w3.org/2000/svg';
const WAVE='M22 70 C 44 70 42 138 64 138 C 86 138 84 86 100 86 C 116 86 114 138 136 138 C 158 138 156 70 178 70';
const LINK_L='M34 58 L 72 146 L 110 58',LINK_R='M90 58 L 128 146 L 166 58';
function staticBody(v,c,bg){
 if(v==='wave')return `<path d="${WAVE}" fill="none" stroke="${c}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
 if(v==='link')return `<path d="${LINK_L}" fill="none" stroke="${c}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="${LINK_L}" fill="none" stroke="${bg}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="${LINK_R}" fill="none" stroke="${c}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="${LINK_R}" fill="none" stroke="${bg}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
 if(v==='loop')return `<path d="M58 78 L 80 132 L 100 92 L 120 132 L 142 78" fill="none" stroke="${c}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 72 A 70 70 0 0 1 150 44" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round"/><path d="M150 44 l -4 -22 M150 44 l -22 4" stroke="${c}" stroke-width="13" stroke-linecap="round"/><path d="M162 128 A 70 70 0 0 1 50 156" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round"/><path d="M50 156 l 4 22 M50 156 l 22 -4" stroke="${c}" stroke-width="13" stroke-linecap="round"/>`;
 return `<g fill="none" stroke="${c}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"><path d="M30 34 L 56 84 L 92 44 M56 84 L 56 122 M42 158 L 56 122 L 70 158"/><path d="M170 34 L 144 84 L 108 44 M144 84 L 144 122 M130 158 L 144 122 L 158 158"/></g><circle cx="56" cy="58" r="12" fill="${c}"/><circle cx="144" cy="58" r="12" fill="${c}"/>`;
}
class WLogo{
 constructor(host,o={}){this.o=Object.assign({variant:'wave',color:'#1E0B05',gold:'#E39A2E',bg:'#F3E9DC',state:'idle'},o);this.host=host;this.t0=performance.now();this.k=0;this.pulse=0;this.build();this.set(this.o.state);this.raf=requestAnimationFrame(this.tick.bind(this))}
 el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);(p||this.svg).appendChild(e);return e}
 build(){const o=this.o,s=this.svg=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 200 200');s.style.width='100%';s.style.height='100%';s.style.overflow='visible';this.host.innerHTML='';this.host.appendChild(s);
  const R={fill:'none','stroke-linecap':'round','stroke-linejoin':'round'};this.R=R;const v=o.variant;
  if(v==='wave'){this.b=this.el('path',Object.assign({d:WAVE,stroke:o.color,'stroke-width':22},R));this.a=this.el('path',Object.assign({d:WAVE,stroke:o.color,'stroke-width':22},R))}
  else if(v==='link'){this.gl=this.el('g',{});this.gr=this.el('g',{});
   [[this.gl,LINK_L],[this.gr,LINK_R]].forEach(([g,d])=>{this.el('path',Object.assign({d,stroke:o.color,'stroke-width':30},R),g);this.el('path',Object.assign({d,stroke:o.bg,'stroke-width':10},R),g)});
   }
  else if(v==='loop'){this.w=this.el('path',Object.assign({d:'M58 78 L 80 132 L 100 92 L 120 132 L 142 78',stroke:o.color,'stroke-width':17},R));
   this.ring=this.el('g',{});this.el('path',Object.assign({d:'M38 72 A 70 70 0 0 1 150 44 M150 44 l -4 -22 M150 44 l -22 4',stroke:o.color,'stroke-width':13},R),this.ring);this.el('path',Object.assign({d:'M162 128 A 70 70 0 0 1 50 156 M50 156 l 4 22 M50 156 l 22 -4',stroke:o.color,'stroke-width':13},R),this.ring)}
  else {this.g=this.el('g',{});this.g.innerHTML=staticBody('team',o.color,o.bg);this.L=this.g.querySelectorAll('path')}
  this.spark=this.el('path',{fill:o.gold,opacity:0});
  s.addEventListener('pointerdown',()=>this.play())}
 set(st){this.o.state=st;this.s0=performance.now();return this}
 play(){this.set('idle');setTimeout(()=>this.set('sync'),60);return this}
 tick(now){const t=(now-this.t0)/1000,o=this.o,st=o.state,el=(now-this.s0)/1000,v=o.variant;
  const tg=st==='sync'?1:st==='loading'?(.5+.5*Math.sin(t*3.2)):0;const prev=this.k;this.k+=(tg-this.k)*(st==='sync'?.09:.06);
  if(st==='sync'&&prev<.97&&this.k>=.97)this.pulse=1;this.pulse=Math.max(0,this.pulse-.03);
  const off=1-this.k,col=this.pulse>.05?o.gold:o.color;
  if(v==='wave'){this.a.setAttribute('transform',`translate(${-off*22} ${-off*10})`);this.b.setAttribute('transform',`translate(${off*22} ${off*10})`);
   this.a.setAttribute('stroke',col);this.b.setAttribute('stroke',col);this.b.style.opacity=.35+.65*this.k}
  else if(v==='link'){this.gl.setAttribute('transform',`translate(${-off*30} 0)`);this.gr.setAttribute('transform',`translate(${off*30} 0)`);
   [...this.gl.children,...this.gr.children].forEach((p,i)=>{if(p.getAttribute('stroke')!==o.bg)p.setAttribute('stroke',col)})}
  else if(v==='loop'){const r=st==='loading'?t*240:(1-this.k)*-180;this.ring.setAttribute('transform',`rotate(${r} 100 100)`);this.w.setAttribute('stroke',col);[...this.ring.children].forEach(p=>p.setAttribute('stroke',col));
   this.w.setAttribute('transform',`translate(0 ${off*8}) scale(1)`);this.w.style.opacity=.4+.6*this.k}
  else {this.g.setAttribute('transform',`translate(0 ${Math.sin(t*2)*2*(1-this.k)})`);this.L.forEach(p=>p.setAttribute('stroke',col));this.g.querySelectorAll('circle').forEach(c=>c.setAttribute('fill',col));
   this.L[0].setAttribute('d',`M30 34 L 56 84 L ${92-off*16} ${44+off*10} M56 84 L 56 122 M42 158 L 56 122 L 70 158`);this.L[1].setAttribute('d',`M170 34 L 144 84 L ${108+off*16} ${44+off*10} M144 84 L 144 122 M130 158 L 144 122 L 158 158`)}
  const sp=this.pulse,r=6+sp*20,cx=100,cy=v==='wave'?72:v==='link'?40:v==='loop'?100:28;
  this.spark.setAttribute('d',`M${cx} ${cy-r}L${cx+r*.28} ${cy-r*.28}L${cx+r} ${cy}L${cx+r*.28} ${cy+r*.28}L${cx} ${cy+r}L${cx-r*.28} ${cy+r*.28}L${cx-r} ${cy}L${cx-r*.28} ${cy-r*.28}Z`);this.spark.setAttribute('opacity',(sp*.95).toFixed(2));
  this.raf=requestAnimationFrame(this.tick.bind(this))}
 destroy(){cancelAnimationFrame(this.raf);this.host.innerHTML=''}
 static svg({variant='wave',color='#1E0B05',bg='#F3E9DC',tile=false,size=512}={}){
  const body=staticBody(variant,color,bg);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${tile?`<rect width="200" height="200" rx="46" fill="${bg}"/><g transform="translate(20 20) scale(.8)">${body}</g>`:body}</svg>`}
}
window.WLogo=WLogo;
})();
