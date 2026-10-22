// RitmDojo: весь клиентский скрипт. Классический script, глобальная область — тесты зовут B, opt, draw и другие напрямую.
const $=s=>document.getElementById(s);
const PF={R:['11110','10001','10001','11110','10100','10010','10001'],
 i:['0020','0000','0010','0010','0010','0010','0110'],
 t:['01000','11110','01000','01000','01000','01001','00110'],
 m:['00000','11011','10101','10101','10101','10101','10101'],
 D:['11110','10001','10001','10001','10001','10001','11110'],
 o:['00000','01110','10001','10001','10001','10001','01110'],
 j:['00020','00000','00010','00010','00010','10010','01100']};
const pxs=rows=>{let h='';rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c=='1')h+=`<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`;else if(c=='2')h+=`<rect x="${x}" y="${y}" width="1" height="1" fill="var(--need)"/>`}));return h};
const SHOE=[
 '.....RRRRR....................',
 '....RRWWWRR...................',
 '....RRRRRRRR..................',
 '....RRRRRRRRRR................',
 '....RRRRRRRWWRRRRR............',
 '....RRRRRRRRRRRWWRRRRR........',
 '....RRRRRRRRRRRRRRRWWRRRRRR...',
 '....RRRRRRRRRRRRRRRRRRWWWWW...',
 '...WWWWWWWWWWWWWWWWWWWWWWWWW..',
 '...WWWWWWWWWWWWWWWWWWWWWWWWW..',
 '...GGGGGGGGGGGGGGGGGGGGGGGGG..',
 '...RRRRRRRRRRRRRRRRRRRRRRRRR..'];
function logoArt(){
 const H=SHOE.length,W=SHOE[0].length,cell={},col={};
 SHOE.forEach((row,y)=>[...row].forEach((c,x)=>{if(c=='.')return;cell[x+','+y]=1;col[x+','+y]=c.toLowerCase()}));
 const at=(x,y)=>cell[x+','+y];
 for(const k in cell){const[x,y]=k.split(',').map(Number);if(!at(x-1,y)||!at(x+1,y)||!at(x,y-1)||!at(x,y+1))col[k]='#'}
 const fill={'#':'var(--fg)','r':'var(--need)','w':'var(--paper)','g':'var(--mut)'};
 const runs=(a,b)=>{let h='';for(let y=0;y<H;y++){let x=a;while(x<=b){const c=col[x+','+y];if(!c){x++;continue}let e=x;while(e+1<=b&&col[(e+1)+','+y]===c)e++;h+=`<rect x="${x}" y="${y}" width="${e-x+1}" height="1" fill="${fill[c]}"/>`;x=e+1}}return h};
 $('logo').innerHTML=`<title>RitmDojo</title><g id="lfoot"><g id="lback">${runs(0,13)}</g><g id="lmid">${runs(14,19)}</g><g id="ltoe">${runs(20,29)}</g></g><g id="ltap" fill="var(--need)"><rect x="23" y="12" width="2" height="1"/><rect x="27" y="12" width="1" height="1"/></g>`;
}
{let x=0,h='';for(const ch of 'RitmDojo'){const gl=PF[ch];h+=`<g transform="translate(${x} 0)">${pxs(gl)}</g>`;x+=gl[0].length+1}
 $('wm').setAttribute('viewBox',`0 0 ${x-1} 7`);$('wm').innerHTML=h;
 logoArt();
 $('cbar').innerHTML='<i></i>'.repeat(8)}
const g=(s,st)=>{const r=[];[...s.replace(/ /g,'')].forEach((c,i)=>{if(c!='.')r.push([i*st,c=='X',st])});return r};
const e=(a,off)=>a.map((s,i)=>[s,off?s%1!=0:s%1==0,(a[i+1]??4)-s]);
const H=.5,T=1/3,S=.25,X=1/6;
const EX=[
{t:'Четверти',l:[60,80,100],p:[['Все четверти',g('Xxxx',1)],['Только 1 и 3',g('X.x.',1)],['Только 2 и 4',g('.X.X',1)],['1 2 – 4, пауза на 3',g('Xx.x',1)],['Только 1',g('X...',1)]]},
{t:'Восьмые',l:[60,80,100],p:[['Сплошные восьмые',g('Xxxxxxxx',H)],['Только «и»',g('.X.X.X.X',H)],['Пауза на «и» 2 и 4',g('Xxx.xxx.',H)],['1 и 2 – 3 и 4 –',g('Xxx.Xxx.',H)],['Пауза на 3',g('Xxxx.xxx',H)]]},
{t:'Шестнадцатые',l:[50,65,80],p:[['Сплошные: 1 е и а',g('Xxxx xxxx xxxx xxxx',S)],['1 е и – (три и пауза)',g('Xxx. Xxx. Xxx. Xxx.',S)],['1 – и а',g('X.xx X.xx X.xx X.xx',S)],['Только «е» и «а»',g('.X.X .X.X .X.X .X.X',S)],['16-е на 1 и 3, 8-е на 2 и 4',g('Xxxx x.x. xxxx x.x.',S)]]},
{t:'Восьмые триоли',l:[50,65,80],p:[['Сплошные триоли',g('Xxx Xxx Xxx Xxx',T)],['Шаффл: 1 – а',g('X.x X.x X.x X.x',T)],['1 и – (две из трёх)',g('Xx. Xx. Xx. Xx.',T)],['– и а',g('.xx .xx .xx .xx',T)],['2 доли триолей, 2 доли шаффла',g('Xxx Xxx X.x X.x',T)]]},
{t:'Шестнадцатые триоли',l:[40,50,60],p:[['Шесть на долю',g('Xxxxxx Xxxxxx Xxxxxx Xxxxxx',X)],['3+3',g('XxxXxx XxxXxx XxxXxx XxxXxx',X)],['2+2+2',g('XxXxXx XxXxXx XxXxXx XxXxXx',X)],['Три и пауза',g('Xxx... Xxx... Xxx... Xxx...',X)],['Через одну (как 8-е триоли)',g('X.x.x. X.x.x. X.x.x. X.x.x.',X)]]},
{t:'Ноты с точкой',l:[60,75,90],p:[['Четверть с точкой + восьмая',e([0,1.5,2,3.5])],['3+3+2',e([0,1.5,3])],['Восьмая с точкой + 16-я',e([0,.75,1,1.75,2,2.75,3,3.75])],['Восьмая + четверть с точкой',e([0,.5,2,2.5])],['16-я + восьмая с точкой',e([0,.25,1,1.25,2,2.25,3,3.25])],['Половинная с точкой + четверть',e([0,3])]]},
{t:'Ноты с двумя точками',l:[50,60,70],p:[['Четверть с 2 точками + 16-я',e([0,1.75,2,3.75])],['16-я + четверть с 2 точками',e([0,.25,2,2.25])],['Восьмая с 2 точками + 32-я',e([0,.875,1,1.875,2,2.875,3,3.875])],['Половинная с 2 точками + восьмая',e([0,3.5])],['Четверть с 2 точками + 16-я, две четверти',e([0,1.75,2,3])]]},
{t:'Синкопа',l:[60,75,90],p:[['Только «и» всех долей',g('.X.X.X.X',H)],['1, 1и, 2и, 3, 4',e([0,.5,1.5,2,3],1)],['1, 2и, 3и, 4и',e([0,1.5,2.5,3.5],1)],['1, 2, 3и, 4и',e([0,1,2.5,3.5],1)],['3-3-3-3-4 шестнадцатыми',e([0,.75,1.5,2.25,3],1)]]}
];
const B=[];EX.forEach((x,xi)=>x.p.forEach((p,pi)=>x.l.forEach((v,ti)=>B.push({xi,pi,ti,bpm:v}))));
let cur=0,sc=0,k=0,shift=0,playing=false,ctx,out,nextT=0,timer,q=[],opt={loop:false,count:true,CB:2,L:2,P:4,V:true,D:150,G:130,N:true,NP:false,NG:100,GM:false,S:60,CAL:0,CALD:false,OUT:'',MIC:'',HI:0,ret:true,best:{},rec:{},O:{c:0,t:0,n:0,v:0}};
try{const s=JSON.parse(localStorage.getItem('rt2')||'{}');if(s.opt)Object.assign(opt,s.opt);if(Number.isInteger(s.cur)&&B[s.cur])cur=s.cur;shift=Number(s.shift)||0}catch(_){}
const save=()=>{try{localStorage.setItem('rt2',JSON.stringify({cur,shift,opt}))}catch(_){}};
const bpmOf=i=>Math.max(30,Math.min(240,B[i].bpm+shift));
const find=(xi,pi,ti)=>B.findIndex(b=>b.xi==xi&&b.pi==pi&&b.ti==ti);

function click(t,f,v){const o=ctx.createOscillator(),a=ctx.createGain();o.type='triangle';o.frequency.value=f;a.gain.setValueAtTime(v,t);a.gain.exponentialRampToValueAtTime(.001,t+.035);o.connect(a);a.connect(cb);o.start(t);o.stop(t+.045)}
function note(t,acc){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),a=ctx.createGain();o.type='sawtooth';o.frequency.value=164.81;f.type='lowpass';f.frequency.setValueAtTime(1800,t);f.frequency.exponentialRampToValueAtTime(250,t+.15);a.gain.setValueAtTime(acc?.42:.25,t);a.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(f);f.connect(a);a.connect(nb);o.start(t);o.stop(t+.25)}

let nb,bq=[],vt=[],vox=null,cb,cp,np;const SS=window.speechSynthesis,VW=['раз','два','три','четыре'];
function pickVoice(){if(!SS){$('vst').textContent='Голос недоступен в этом браузере';return}
 const v=SS.getVoices().filter(x=>/^ru/i.test(x.lang));vox=v.find(x=>/Milena|Yuri|Katya/i.test(x.name))||v[0]||null;
 $('vst').textContent=vox?'Голос: '+vox.name:'Русский голос не найден, добавьте его в настройках macOS'}
if(SS)SS.onvoiceschanged=pickVoice;
const VB={};let vs=null;const full=()=>Object.keys(VB).length==5;
const ac=()=>ctx||(ctx=new (window.AudioContext||window.webkitAudioContext)());
const PC={};
function pcenter(b){const d=b.getChannelData(0),sr=b.sampleRate,n=Math.round(.02*sr),h=Math.round(.005*sr),T=[];
 for(let f=250;f<1000;f+=50){const om=2*Math.PI*f/sr,c=new Float32Array(n),s=new Float32Array(n);for(let i=0;i<n;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(n-1));c[i]=w*Math.cos(om*i);s[i]=w*Math.sin(om*i)}T.push([c,s])}
 const E=[];for(let o=0;o+n<=d.length;o+=h){let p=0;for(const [c,s] of T){let re=0,im=0;for(let i=0;i<n;i++){const x=d[o+i];re+=x*c[i];im+=x*s[i]}p+=re*re+im*im}E.push(10*Math.log10(p+1e-12))}
 const th=Math.max(...E)-3;let best=-1,bl=0,i=0;while(i<E.length){if(E[i]>=th){let j=i;while(j<E.length&&E[j]>=th)j++;if(j-i>bl){bl=j-i;best=i}i=j}else i++}
 return best<0?0:Math.round((best*h+n/2)/sr*1000)}
async function decodeV(k,buf,auto){try{const b=await ac().decodeAudioData(buf.slice(0)),d=b.getChannelData(0);let i=0;while(i<d.length&&Math.abs(d[i])<.02)i++;i=Math.max(0,i-Math.round(b.sampleRate*.003));const o=ac().createBuffer(1,Math.max(1,b.length-i),b.sampleRate);o.copyToChannel(d.slice(i),0);VB[k]=o;PC[k]=pcenter(o);if(auto||opt.O[k]===undefined)opt.O[k]=-PC[k]}catch(_){}}
function vstat(){const n=Object.keys(VB).length;$('vst2').textContent=full()?'Точный голос загружен':n?'Загружено слов: '+n+' из 5':'Сейчас голос браузера, он неточный по времени. Как подключить точный голос — ниже.';$('vst').style.display=full()?'none':'';[...VW,'и'].forEach(w=>{const r=$('tw'+w);if(r)r.style.display=VB[w]?'contents':'none'});syncTune()}
function say(t,txt){if(!opt.V)return;
 if(full()){const s=ctx.createBufferSource(),g=ctx.createGain();if(vs){vs.g.gain.setValueAtTime(vs.v,Math.max(ctx.currentTime,t-.02));vs.g.gain.linearRampToValueAtTime(0,t)}const gv=opt.G/100*.85;g.gain.value=gv;s.buffer=VB[txt];s.connect(g);g.connect(out);s.start(t);vs={g,v:gv};return}
 if(!SS)return;if(vt.length>64)vt=vt.slice(-32);
 vt.push(setTimeout(()=>{const u=new SpeechSynthesisUtterance(txt);u.lang='ru-RU';if(vox)u.voice=vox;u.rate=1.5;SS.cancel();SS.speak(u)},Math.max(0,(t-ctx.currentTime)*1000-opt.D)))}
function killVoice(){vt.forEach(clearTimeout);vt=[];vs=null;if(SS)SS.cancel()}
let nv=[],pv=[],bh=[],det=null,mode='',tbs=0,fbs=0,trkLat=0,xq=[],gs=null,R=null,score=0,combo=0,mic=null,proc=null,lv=0,lastOn=0,hist=[0,0,0,0,0,0],cal=null,inPlay=false,calTimer=null,micGen=0,fails=0,forced=null;
const calOff=()=>{const on=!!calTimer||!!cal;if(calTimer)clearTimeout(calTimer);calTimer=null;cal=null;return on};
const thr=()=>.002*Math.pow(50,(100-opt.S)/100);
const acc=s=>s?Math.max(0,(s.p+.6*s.g-.3*s.x)/Math.max(1,s.n)*100):0;
const flash=(t,c)=>{const e=$('fb');e.className='';void e.offsetWidth;e.className=c;e.textContent=t};
const mult=()=>1+Math.min(3,combo>>3);
const fmt=t=>{t=Math.max(0,Math.round(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
const bdur=i=>(opt.L+opt.P+(opt.GM?1:0))*240/bpmOf(i);
const compact=(a,keep)=>{let j=0;for(let i=0;i<a.length;i++)if(keep(a[i]))a[j++]=a[i];a.length=j;return a};
let pfx=null,pfxKey='',pgTxt='';
const progData=()=>{const key=shift+'|'+opt.L+'|'+opt.P+'|'+(opt.GM?1:0);
 if(key!=pfxKey){const a=[];let s=0;for(let i=0;i<B.length;i++){a.push(s);s+=bdur(i)}pfx={a,tot:s};pfxKey=key}return pfx};
function prog(it,f){const P=progData();let el=P.a[cur]||0;if(it&&it.bi==cur&&it.k>=0)el+=(it.k+f)*4*it.spb;
 $('pgf').style.width=(P.tot?el/P.tot*100:0)+'%';
 const t1='Прошло '+fmt(el),t2='Осталось '+fmt(P.tot-el),t3='Всего '+fmt(P.tot),t4='Урок '+(cur+1)+' из '+B.length;
 if(pgTxt!=t1+t2+t3+t4){pgTxt=t1+t2+t3+t4;$('pgt1').textContent=t1;$('pgt2').textContent=t2;$('pgt3').textContent=t3;$('pgt4').textContent=t4}}
function onset(t){
 if(cal){cal.on.push(t);return}
 if(!opt.GM||!playing)return;
 const ot=t-lat()/1000;let b=null,dd=.13;
 for(const e of xq)if(!e.d){const d=Math.abs(e.t-ot);if(d<dd){dd=d;b=e}}
 if(!b){if(inPlay&&gs)gs.x++;pv.push({t:ot,r:inPlay?'x':'o'});return}
 b.d=1;const dv=(ot-b.t)*1000;b.s.d.push({d:dv,u:b.u});
 const dms=Math.round(dd*1000);
 if(dms>90){b.r=ot<b.t?'e':'l';pv.push({t:ot,r:b.r,e:b,d:dv});b.s.m++;combo=0;flash(ot<b.t?'Рано':'Поздно','bad');return}
 const pf=dms<=45;b.r=pf?'p':'g';pv.push({t:ot,r:b.r,e:b,d:dv});if(pf)b.s.p++;else b.s.g++;combo++;score+=(pf?100:50)*mult();flash(pf?'Идеально':'Хорошо','ok')}
function result(bi){if(R&&R.gs===gs)return R;const a=acc(gs),st=a>=90?3:a>=75?2:a>=60?1:0;R={gs,a,st};
 if(st){score+=Math.round(a*st*5);if(st>(opt.best[bi]||0))opt.best[bi]=st}
 if(gs&&gs.n){const r=opt.rec[bi];if(!r||a>r.a)opt.rec[bi]={a:Math.round(a),st:Math.max(st,r?r.st:0),bpm:bpmOf(bi)}}
 opt.HI=Math.max(opt.HI||0,score);save();recUpd();return R}
function recUpd(){const rows=Object.entries(opt.rec||{}).map(([bi,r])=>({bi:+bi,...r})).filter(r=>B[r.bi]).sort((a,b)=>b.st-a.st||b.a-a.a||b.bpm-a.bpm),top=rows.slice(0,12);
 $('rt').tBodies[0].innerHTML=top.map(r=>{const b=B[r.bi],x=EX[b.xi];return `<tr><td>${r.bi+1}<span class="nm">${x.t}. ${x.p[b.pi][0]}</span></td><td class="n">${r.bpm}</td><td class="n">${r.a}%</td><td class="st">${'<b>★</b>'.repeat(r.st)}${'★'.repeat(Math.max(0,3-r.st))}</td></tr>`}).join('');
 $('rte').textContent=rows.length?`Лучшие ${top.length} из ${rows.length}. Рекорд обновляется по точности, звёзды не сбрасываются.`:'Рекордов пока нет: сыграйте уровень в тактах «Играй».';
 $('hst').textContent=Object.values(opt.best||{}).reduce((a,b)=>a+b,0)+' из '+B.length*3}
function unforce(){if(forced===null)return;opt.L=forced;forced=null;const o=$('oL');if(o)o.value=opt.L;save()}
function forceL(){if(forced===null&&opt.L<1){forced=opt.L;opt.L=1;save()}}
function endBlock(bi){if(!gs||!gs.n)return'next';
 const r=result(bi);
 if(r.st){fails=0;unforce();return'next'}
 if(++fails>=3&&opt.ret!==false)forceL();
 return'again'}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
function stats(d){const n=d.length;if(!n)return null;const m=avg(d);let s2=0,s3=0,s4=0;for(const x of d){const e=x-m;s2+=e*e;s3+=e*e*e;s4+=e*e*e*e}const v=s2/n,sd=Math.sqrt(v);return{n,m,sd,sk:sd?s3/n/(sd*v):0,ku:sd?s4/n/(v*v)-3:0}}
let tmG=null,tmN=-1;
function tmUpd(){const g=gs,n=g?g.d.length:0;if(g===tmG&&n===tmN)return;tmG=g;tmN=n;
 const d=g?g.d.map(x=>x.d):[],st=stats(d),bins=new Array(21).fill(0);
 d.forEach(x=>{const j=Math.round(x/10)+10;if(j>=0&&j<21)bins[j]++});const mx=Math.max(1,...bins);
 document.querySelectorAll('#hg i').forEach((e,j)=>e.style.height=bins[j]/mx*100+'%');
 $('hg').style.display=$('hgl').style.display=st?'':'none';
 if(!st){$('tm').textContent='Тайминг: пока нет данных';return}
 const f1=x=>(x>0?'+':'')+x.toFixed(0);
 let t=`Нот: ${st.n}<br>Сдвиг μ: ${f1(st.m)} мс, ${Math.abs(st.m)<5?'ровно':st.m<0?'торопитесь':'отстаёте'}<br>Разброс σ: ${st.sd.toFixed(0)} мс, ${st.sd<10?'очень кучно':st.sd<20?'нормально':'хаотично'}`;
 if(st.n>=12){t+=`<br>Эксцесс: ${st.ku.toFixed(1)}, ${st.ku>1?'собранно':st.ku>-.5?'обычно':'размазано'}`;if(st.n>=16)t+=`<br>Форма: ${(st.sk*st.sk+1)/(st.ku+3)>.555?'два горба':'один горб'}`}
 const dn=g.d.filter(x=>!x.u).map(x=>x.d),up=g.d.filter(x=>x.u).map(x=>x.d);
 if(dn.length>=4&&up.length>=4){const a=avg(dn),b=avg(up);t+=`<br>На долю ${f1(a)} мс, на «и» ${f1(b)} мс${Math.abs(a-b)>15?', штрихи звучат неодинаково':''}`}
 $('tm').innerHTML=t}
let hudS='',hudC=-1,hudSc=-1,hudT=0;
function hudUpd(){const s=gs||{p:0,g:0,m:0,x:0},j=s.p+s.g+s.m,a=j?Math.max(0,(s.p+.6*s.g-.3*s.x)/j*100):null;
 const mc='x'+mult()+', серия '+combo,av=a==null?'-':Math.round(a)+'%',cls=a==null?'':a>=75?'hi':a<60?'lo':'';
 const key=score+mc+av+cls;
 if(key!=hudS){hudS=key;$('hs').textContent=score;$('hc').textContent=mc;const A=$('ha');A.textContent=av;A.className=cls}
 const cn=combo%8||(combo?8:0);if(cn!=hudC){hudC=cn;[...$('cbar').children].forEach((e,i)=>e.classList.toggle('on',i<cn))}
 if(score!=hudSc){hudSc=score;$('hh').textContent=Math.max(opt.HI||0,score)}
 tmUpd()}
function gameTick(it,now){
 compact(xq,e=>{if(!e.d&&e.t<now-.2){e.d=1;e.r='m';e.s.m++;combo=0;flash('Мимо','bad')}return e.t>now-1});
 if(gs&&gs.n&&it.k==opt.L+opt.P&&now-it.t>.25){const r=result(it.bi);if(!r.shown){r.shown=1;flash(r.st?'Успех! '+Math.round(r.a)+'%':'Неудача '+Math.round(r.a)+'%',(r.st?'ok':'bad')+' res')}}
 if(now-hudT>.1){hudT=now;hudUpd()}
 draw(now,it.spb)}
class Det{constructor(sr,post){this.sr=sr;this.post=post;this.n=Math.round(sr*.06);this.buf=new Float32Array(this.n);this.env=0;this.rel=Math.exp(-1/(sr*.012));this.k=Math.round(sr*.012);this.pk=0;this.pf=0;this.w=-1;this.rf=0;this.last=-1e9;this.thr=.01}
 feed(x,f0){const T=this.thr,n=this.n;for(let j=0;j<x.length;j++){const F=f0+j,a=x[j]<0?-x[j]:x[j];this.env=a>this.env?a:this.env*this.rel;this.buf[F%n]=this.env;
  if(this.w<0){const r=this.buf[(F-this.k+n)%n]||0;if(this.env>T&&this.env>r*1.8&&F-this.last>this.sr*.07){this.w=F+Math.round(this.sr*.006);this.pk=this.env;this.pf=F;this.rf=r}}
  else{if(this.env>this.pk){this.pk=this.env;this.pf=F}
   if(F>=this.w){const lim=Math.max(this.pk*.15,T*.3,this.rf*1.15),km=n-2-(F-this.pf);let g=this.pf,k=0;while(k<km&&this.buf[g%n]>=lim){g--;k++}if(k>=km)g=this.pf-Math.round(this.sr*.002);this.last=this.pf;this.post(g,this.pk);this.w=-1}}}}}
const WK=Det.toString()+`registerProcessor('od',class extends AudioWorkletProcessor{constructor(){super();this.d=new Det(sampleRate,(f,p)=>this.port.postMessage({f,p}));this.c=0;this.port.onmessage=e=>{this.d.thr=e.data.thr}}process(i){const x=i[0][0];if(x){this.d.feed(x,currentFrame);if(++this.c%20==0)this.port.postMessage({l:this.d.env})}return true}});`;
const sendThr=()=>{if(proc&&proc.port)proc.port.postMessage({thr:thr()});if(det)det.thr=thr()};
function lat(){if(opt.CALD)return opt.CAL;return Math.round(((ctx&&(ctx.outputLatency||ctx.baseLatency))||0)*1000+trkLat)}
// время, которое слушатель слышит прямо сейчас: минус задержка вывода, плюс половина кадра, чтобы кед не отставал
const visT=t=>t-(((ctx&&(ctx.outputLatency||ctx.baseLatency))||0)-.008);
function latUpd(){$('lst').textContent='Задержка выход+вход: '+lat()+' мс ('+(opt.CALD?'по калибровке':'оценка браузера, лучше откалибровать')+'). Детектор: '+(mode=='worklet'?'AudioWorklet, ожидаемая точность 1–2 мс':mode=='script'?'ScriptProcessor, точность около 6 мс':'выключен')}
async function micOn(){micOff();const gen=micGen;try{
 const st=await navigator.mediaDevices.getUserMedia({audio:{deviceId:opt.MIC?{exact:opt.MIC}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1,latency:0}});
 if(gen!==micGen){st.getTracks().forEach(t=>t.stop());return}
 const c=ac();await c.resume();if(gen!==micGen){st.getTracks().forEach(t=>t.stop());return}
 mic=c.createMediaStreamSource(st);mic.st=st;trkLat=(st.getAudioTracks()[0].getSettings().latency||0)*1000;const z=c.createGain();z.gain.value=0;
 try{const u=URL.createObjectURL(new Blob([WK],{type:'application/javascript'}));await c.audioWorklet.addModule(u);if(gen!==micGen){micOff();return}proc=new AudioWorkletNode(c,'od');
  proc.port.onmessage=e=>{const m=e.data;if(m.f!=null)onset(m.f/c.sampleRate,m.p);if(m.l!=null)lv=m.l};mode='worklet'}
 catch(_){det=new Det(c.sampleRate,g=>onset(tbs+(g-fbs)/c.sampleRate));let fc=0;proc=c.createScriptProcessor(256,1,1);
  proc.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);tbs=e.playbackTime-d.length/c.sampleRate;fbs=fc;det.thr=thr();det.feed(d,fc);fc+=d.length;lv=det.env};mode='script'}
 mic.connect(proc);proc.connect(z);z.connect(c.destination);sendThr();
 const dv=await navigator.mediaDevices.enumerateDevices();if(gen!==micGen){micOff();return}const outs=dv.filter(x=>x.kind=='audiooutput');
 $('min').innerHTML=dv.filter(x=>x.kind=='audioinput').map(x=>`<option value="${x.deviceId}">${x.label||'Вход'}</option>`).join('');if(opt.MIC)$('min').value=opt.MIC;
 if(c.setSinkId&&outs.length){$('lout').style.display='flex';$('mout').innerHTML=outs.map(x=>`<option value="${x.deviceId}">${x.label||'Выход'}</option>`).join('');if(opt.OUT){$('mout').value=opt.OUT;c.setSinkId(opt.OUT).catch(()=>{})}}
 $('mst').textContent='Вход включён. Сыграйте ноту: полоска справа должна заходить за метку.';latUpd()}
 catch(e){if(gen!==micGen)return;micOff();opt.GM=false;$('ogm').checked=false;$('mst').textContent='Вход недоступен ('+(e.name||e)+'). Разрешите микрофон в настройках браузера и откройте страницу по https или на localhost.';save()}}
const CH=96;
function sizeCv(rw){const c=$('cv'),dp=Math.min(2,devicePixelRatio||1);c.dataset.w=rw;c.width=Math.round(rw*dp);c.height=Math.round(CH*dp);c.getContext('2d').setTransform(dp,0,0,dp,0,0)}
let CC=null,cvW=0,barr=[];
const colors=()=>{if(CC)return CC;const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
 return CC={fg:g('--fg'),mut:g('--mut'),need:g('--need'),ok:g('--ok'),lis:g('--lis')}};
const themeOff=()=>{CC=null};
new MutationObserver(themeOff).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',themeOff);
const cvRO=new ResizeObserver(es=>{const w=Math.round(es[0].contentRect.width);if(w==cvW)return;cvW=w;if(w){sizeCv(w);if(!$('vplay').hidden)draw(ctx?ctx.currentTime:0,60/bpmOf(cur))}});
function draw(now,spb){const c=$('cv'),g=c.getContext('2d');let W=cvW;
 if(!W){W=cvW=Math.round(c.getBoundingClientRect().width);if(!W)return}
 const H=CH;if(c.dataset.w!=W)sizeCv(W);
 const C=colors();g.clearRect(0,0,W,H);
 now-=((ctx&&(ctx.outputLatency||ctx.baseLatency))||0)-.008;
 const span=6*spb,nx=.28*W,pps=W/span,X=t=>nx+(t-now)*pps,y1=26,y2=66;
 compact(nv,n=>n.t>now-6);compact(pv,p=>p.t>now-6);compact(bh,b=>b.t+4*b.spb>now-6);
 const bars=barr;bars.length=0;for(const b of bh)bars.push(b);if(bars.length){const l=bars[bars.length-1];for(let t=l.t+4*l.spb;t<now+span;t+=4*l.spb)bars.push({t,spb:l.spb})}
 for(const b of bars)for(let i=0;i<8;i++){const x=X(b.t+i*b.spb/2);if(x<0||x>W)continue;g.globalAlpha=i==0?.7:i%2==0?.4:.25;g.fillStyle=i==0?C.fg:C.mut;g.fillRect(x-(i==0?1:.5),0,i==0?2:1,H)}
 g.globalAlpha=1;
 for(const n of nv){const x=X(n.t);if(x<-20||x>W+20)continue;
  if(n.e){g.globalAlpha=.16;g.fillStyle=C.lis;g.fillRect(X(n.t-.09),y1-18,.18*pps,36);g.fillStyle=C.ok;g.fillRect(X(n.t-.045),y1-18,.09*pps,36)}
  const rc=n.e?n.e.r:'';g.globalAlpha=n.e?1:.35;g.lineWidth=2;g.strokeStyle=rc=='m'?C.need:rc=='p'||rc=='g'?C.ok:rc=='e'||rc=='l'?C.lis:C.fg;g.fillStyle=g.strokeStyle;
  g.beginPath();g.arc(x,y1,n.a?11:8,0,7);if(n.a||rc)g.fill();else g.stroke()}
 g.globalAlpha=1;
 for(const p of pv){const x=X(p.t),cc=p.r=='p'||p.r=='g'?C.ok:p.r=='x'?C.need:p.r=='o'?C.mut:C.lis;
  if(p.e){g.strokeStyle=cc;g.lineWidth=2;g.beginPath();g.moveTo(X(p.e.t),y1+12);g.lineTo(x,y2-12);g.stroke()}
  g.fillStyle=cc;g.beginPath();g.moveTo(x,y2-11);g.lineTo(x+9,y2);g.lineTo(x,y2+11);g.lineTo(x-9,y2);g.fill();
  if(p.d!=null){g.fillStyle=C.fg;g.font='11px system-ui';g.textAlign='center';g.fillText((p.d>0?'+':'')+Math.round(p.d),x,y2+22)}}
 g.fillStyle=C.need;g.fillRect(nx-1,0,2,H)}
function micOff(){micGen++;const on=calOff();if(on)$('mst').textContent='Калибровка отменена';try{if(mic)mic.st.getTracks().forEach(t=>t.stop());if(proc)proc.disconnect()}catch(_){}mic=proc=null;det=null;mode='';latUpd();return on}
function calib(){if(!mic){$('mst').textContent='Сначала включите игру';return}
 calOff();stop();kill();const t0=ctx.currentTime+1.2,cl=[];for(let i=0;i<12;i++){const t=t0+i*.75;cl.push(t);click(t,i%4?2000:2400,.8)}
 const c=cal={on:[]};$('mst').textContent='Играйте любую ноту ровно на каждый щелчок (12 щелчков) или замкните выход интерфейса на вход кабелем';
 calTimer=setTimeout(()=>{calTimer=null;const dl=[];for(const o of c.on){let b=9;for(const x of cl)if(Math.abs(o-x)<Math.abs(b))b=o-x;if(Math.abs(b)<.4)dl.push(b)}cal=null;
  if(dl.length<5){$('mst').textContent='Поймано мало нот ('+dl.length+' из 12), повторите';return}
  dl.sort((a,b)=>a-b);const md=dl[dl.length>>1],mad=dl.map(x=>Math.abs(x-md)).sort((a,b)=>a-b)[dl.length>>1];
  opt.CAL=Math.round(md*1000);opt.CALD=true;save();$('mst').textContent='Калибровка: '+opt.CAL+' мс, разброс '+Math.round(mad*1000)+' мс';latUpd()},11500)}
const VF={раз:'voice/raz.mp3',два:'voice/dva.mp3',три:'voice/tri.mp3',четыре:'voice/chetyre.mp3',и:'voice/i.mp3'};
async function loadE(){for(const k in VF){try{const r=await fetch(VF[k]);if(r.ok)await decodeV(k,await r.arrayBuffer())}catch(_){}}vstat()}
const lvl=pl=>opt.N&&(!pl||opt.NP)?opt.NG/100:0;
function applyBus(){if(!ctx||!nb)return;const now=ctx.currentTime,c=bq.find(x=>x.t0<=now&&now<x.t1);nb.gain.cancelScheduledValues(now);nb.gain.setValueAtTime(lvl(c?c.play:false),now);bq.filter(x=>x.t0>now).forEach(x=>nb.gain.setValueAtTime(lvl(x.play),x.t0))}
function sched(){
 let TOT=opt.L+opt.P+(opt.GM?1:0);
 if(k>=TOT){
  if(opt.GM){if(endBlock(sc)=='next'){if(sc<B.length-1)sc++;else{stop();return}}k=0}
  else if(opt.loop)k=0;else if(sc<B.length-1){sc++;k=0}else{stop();return}
  TOT=opt.L+opt.P+(opt.GM?1:0);
 }
 const b=B[sc],spb=60/bpmOf(sc),O=opt.O,half=k<0&&opt.CB>1&&k==-opt.CB;
 q.push({t:nextT,bi:sc,k,spb,tot:TOT});if(opt.GM)bh.push({t:nextT,spb});
 for(let i=0;i<4;i++){click(nextT+i*spb,i?2000:2400,i?.52:.6);
  if(half){if(i==0||i==2){const w=i?'два':'раз';say(nextT+i*spb+(O[w]||0)/1000,w)}}
  else{click(nextT+(i+.5)*spb,1500,.16);say(nextT+i*spb+(O[VW[i]]||0)/1000,VW[i]);if(k>=0)say(nextT+(i+.5)*spb+(O['и']||0)/1000,'и')}}
 if(k>=0&&k<opt.L+opt.P){const pl=k>=opt.L,ev=EX[b.xi].p[b.pi][1];bq=bq.filter(x=>x.t1>ctx.currentTime-1);bq.push({t0:nextT,t1:nextT+4*spb,play:pl});nb.gain.setValueAtTime(lvl(pl),nextT);
  if(opt.GM&&pl&&(k==opt.L||!gs))gs={n:0,p:0,g:0,x:0,m:0,d:[]};
  ev.forEach(([s,a])=>{const t=nextT+s*spb,e=opt.GM&&pl?{t,s:gs,u:Math.abs(s-Math.round(s))>.01}:null;if(e){gs.n++;xq.push(e)}if(opt.GM)nv.push({t,a,e});note(t,a)})}
 nextT+=4*spb;k++;
}
function tick(){if(!playing)return;const t=ctx.currentTime,la=Math.max(.4,360/bpmOf(sc));
 if(nextT<t-.5){nextT=t+.05;q=q.filter(x=>x.t>t);bh=bh.filter(x=>x.t+4*x.spb>t)}
 while(playing&&nextT<t+la)sched()}
function kill(){killVoice();if(out){out.gain.value=0;out.disconnect()}
 out=ctx.createGain();out.gain.value=.85;const cm=ctx.createDynamicsCompressor();cm.threshold.value=-6;cm.knee.value=6;cm.ratio.value=4;cm.attack.value=.003;cm.release.value=.25;out.connect(cm);cm.connect(ctx.destination);
 nb=ctx.createGain();np=ctx.createStereoPanner();np.pan.value=.18;nb.connect(np);np.connect(out);
 cb=ctx.createGain();cp=ctx.createStereoPanner();cp.pan.value=-.45;cb.connect(cp);cp.connect(out);bq=[]}
function start(c){
 if(calOff())$('mst').textContent='Калибровка отменена';
 fails=0;unforce();
 if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume();
 if(opt.GM&&!mic)micOn();kill();xq=[];nv=[];pv=[];bh=[];gs=null;R=null;combo=0;sc=cur;k=(c&&opt.count)?-opt.CB:0;nextT=ctx.currentTime+.1+(opt.V&&!full()?opt.D/1000:0)+Math.max(0,-Math.min(0,...[...VW,'и'].map(w=>opt.O[w]||0)))/1000;q=[];playing=true;
 clearInterval(timer);timer=setInterval(tick,40);tick();playUI(1);
}
function playUI(on){$('bplay').classList.toggle('on',!!on);$('bplaytx').textContent=on?'Пауза (пробел)':'Старт (пробел)'}
function stop(){playing=false;clearInterval(timer);if(ctx)kill();q=[];fails=0;unforce();playUI(0);$('phase').textContent='Стоп';$('phase').className='';$('bars').textContent='';$('ph')&&($('ph').style.left='0%');
 if(gsp.length)gsp.forEach(s=>s.classList.remove('now'));nowIdx=-1;lastK=-9;lastPh='';lastPct=-1;$('strip').classList.remove('mute');foot(0);$('fb').textContent='';$('fb').className=''}

function drawStrip(p){
 const ev=p[1],u=[.5,1/3,.25,1/6,.125].find(u=>ev.every(([s,a,d])=>[s,d].every(v=>Math.abs(v/u-Math.round(v/u))<1e-6)))||.125,N=Math.round(4/u),tri=Math.abs(u-1/3)<1e-6;
 const lab=pos=>{const f=pos-Math.floor(pos+1e-6),n=Math.floor(pos+1e-6)+1;if(f<1e-6)return n;if(tri)return f<.5?'и':'';if(u===.25||u===.125){const q=Math.round(f*4)/4;return Math.abs(q-.25)<1e-6?'е':Math.abs(q-.5)<1e-6?'и':Math.abs(q-.75)<1e-6?'а':''}return Math.abs(f-.5)<1e-6?'и':''};
 let h=`<div class="gr" style="grid-template-columns:repeat(${N},1fr)">`;
 for(let i=0;i<N;i++){const pos=i*u;h+=`<span class="${Math.abs(pos-Math.round(pos))<1e-6?'bt':''}${tri?' tc':''}">${lab(pos)}</span>`}
 h+='</div><div class="nt">';
 for(let i=0;i<8;i++)h+=`<i class="${i%2?'':'b'}" style="left:${i*12.5}%"></i>`;
 ev.forEach(([s,a,d])=>h+=`<b class="${a?'a':''}" style="left:${s/4*100}%;width:calc(${d/4*100}% - 3px)"></b>`);
 h+='</div><div class="ft">';
 for(let i=0;i<4;i++)h+=`<span class="d" style="left:${i*25}%">↓</span><span class="${tri?'c':''}" style="left:${i*25+12.5}%">↑</span>`;
 $('strip').innerHTML=h+'</div><u id="ph" style="left:0%"></u>';
 gsp=[...$('strip').querySelectorAll('.gr span')];nowIdx=-1;lastPct=-1;
}
function showBlock(){
 const b=B[cur],x=EX[b.xi];
 $('sx').value=b.xi;
 $('sp').innerHTML=x.p.map((p,i)=>`<option value="${i}">${i+1}. ${p[0]}</option>`).join('');$('sp').value=b.pi;
 $('tempos').innerHTML=x.l.map((v,i)=>`<button class="chip${i==b.ti?' on':''}" data-t="${i}">${Math.max(30,v+shift)}</button>`).join('');
 $('bpm').textContent=bpmOf(cur);
 
 
 drawStrip(x.p[b.pi]);$('pname').textContent=x.t+'. '+x.p[b.pi][0];prog();save();lastK=-9;lastPh='';
}
let gsp=[],nowIdx=-1,lastK=-9,lastPh='',lastPct=-1;
function frame(){
 requestAnimationFrame(frame);if(!playing||!ctx)return;
 const now=ctx.currentTime,vis=visT(now);while(q.length>1&&q[1].t<=vis)q.shift();
 const it=q[0];if(!it||it.t>vis)return;
 if(it.bi!=cur){cur=it.bi;showBlock()}
 const f=Math.min(1,Math.max(0,(vis-it.t)/(4*it.spb)));prog(it,f);foot(f);inPlay=it.k>=opt.L&&it.k<opt.L+opt.P;if(opt.GM)gameTick(it,now);
 const ph=$('ph');if(ph){const pc=Math.round(f*100);if(pc!=lastPct){lastPct=pc;ph.style.left=pc+'%'}}
 const lis=it.k>=0&&it.k<opt.L,rs=it.k>=opt.L+opt.P;
 const pt=it.k<0?'Счёт':rs?'Итог':lis?'Слушай':'Играй';
 if(pt!=lastPh){lastPh=pt;const P=$('phase');P.textContent=pt;P.className=it.k<0||rs?'cnt':lis?'lis':'pl'}
 if(it.k!=lastK){lastK=it.k;$('bars').textContent=it.k<0?(opt.CB>1?`счёт ${opt.CB+it.k+1} из ${opt.CB}`:'такт счёта'):`такт ${it.k+1} из ${it.tot}`;$('strip').classList.toggle('mute',!lis&&it.k>=0)}
 const idx=gsp.length?Math.floor(f*gsp.length):-1;
 if(idx!=nowIdx){if(gsp[nowIdx])gsp[nowIdx].classList.remove('now');if(gsp[idx])gsp[idx].classList.add('now');nowIdx=idx}
}
function go(i){cur=(i+B.length)%B.length;showBlock();if(playing)start(true)}
const jump=(xi,pi,ti)=>{const i=find(xi,pi,ti);if(i>=0)go(i)};
function pat(d){const F=B.map((b,i)=>b.ti==0?i:-1).filter(i=>i>=0);const j=F.indexOf(cur-B[cur].ti);go(F[(j+d+F.length)%F.length])}
function setShift(d){shift=Math.max(-30,Math.min(60,shift+d));showBlock();if(playing)start(true)}
const toggle=()=>playing?stop():start(true);

$('sx').innerHTML=EX.map((x,i)=>`<option value="${i}">${i+1}. ${x.t}</option>`).join('');
$('sx').onchange=ev=>{jump(+ev.target.value,0,0);ev.target.blur()};
$('sp').onchange=ev=>{jump(B[cur].xi,+ev.target.value,0);ev.target.blur()};
$('tempos').onclick=ev=>{const t=ev.target.dataset.t;if(t!==undefined)jump(B[cur].xi,B[cur].pi,+t)};
const ic=(body,cls,fill)=>`<svg${cls?` class="${cls}"`:''} viewBox="0 0 24 24" ${fill?'fill="currentColor" stroke="none"':'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${body}</svg>`;
$('bprev').insertAdjacentHTML('afterbegin',ic('<polygon points="19 20 9 12 19 4"/><line x1="5" y1="19" x2="5" y2="5"/>'));
$('brst').insertAdjacentHTML('afterbegin',ic('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'));
$('bplay').insertAdjacentHTML('afterbegin',ic('<polygon points="6 3 20 12 6 21"/>','i-play',1)+ic('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>','i-pause',1));
$('bnext').insertAdjacentHTML('afterbegin',ic('<polygon points="5 4 15 12 5 20"/><line x1="19" y1="5" x2="19" y2="19"/>'));
$('bprev').onclick=()=>go(cur-1);$('bnext').onclick=()=>go(cur+1);$('brst').onclick=()=>{playing?start(true):start(true)};
$('bplay').onclick=toggle;$('m5').onclick=()=>setShift(-5);$('p5').onclick=()=>setShift(5);
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('button');if(b)b.blur()});
$('oloop').checked=opt.loop;$('ocnt').checked=opt.count;$('oret').checked=opt.ret!==false;$('ocb').value=opt.CB;$('ocb').disabled=!opt.count;$('oL').value=opt.L;$('oP').value=opt.P;
$('oloop').onchange=ev=>{opt.loop=ev.target.checked;save()};$('oret').onchange=ev=>{opt.ret=ev.target.checked;save()};$('ocnt').onchange=ev=>{opt.count=ev.target.checked;$('ocb').disabled=!opt.count;save()};
$('ocb').onchange=ev=>{opt.CB=Math.max(1,Math.min(2,+ev.target.value||1));ev.target.value=opt.CB;save()};
$('oL').onchange=ev=>{opt.L=Math.max(0,Math.min(8,+ev.target.value||0));ev.target.value=opt.L;save()};
$('oP').onchange=ev=>{opt.P=Math.max(1,Math.min(16,+ev.target.value||1));ev.target.value=opt.P;save()};
$('ovoc').checked=opt.V;$('ovol').value=opt.G;$('ovolv').textContent=opt.G+'%';$('ovol').oninput=ev=>{opt.G=+ev.target.value;$('ovolv').textContent=opt.G+'%';save()};$('ovol').onchange=ev=>ev.target.blur();
$('onote').checked=opt.N;$('onp').checked=opt.NP;$('onv').value=opt.NG;$('onvv').textContent=opt.NG+'%';
$('onote').onchange=ev=>{opt.N=ev.target.checked;applyBus();save()};
$('onp').onchange=ev=>{opt.NP=ev.target.checked;applyBus();save()};
$('onv').oninput=ev=>{opt.NG=+ev.target.value;$('onvv').textContent=opt.NG+'%';applyBus();save()};$('onv').onchange=ev=>ev.target.blur();
document.addEventListener('change',ev=>{if(ev.target.type=='checkbox')ev.target.blur()});
$('ovoc').onchange=ev=>{opt.V=ev.target.checked;if(!opt.V)killVoice();save()};

pickVoice();
const TN=[...VW,'и'].map(w=>[w,'Голос «'+w+'»']);
$('tune').innerHTML=TN.map(([k,n])=>`<div id="tw${k}" style="display:contents"><span style="color:var(--fg)">${n}</span><input type="range" id="r${k}" min="-300" max="100" step="5" value="${opt.O[k]||0}"><span id="rv${k}" style="min-width:64px;text-align:right;font-variant-numeric:tabular-nums"></span></div>`).join('');
const fo=k=>{const v=opt.O[k]||0;$('rv'+k).textContent=(v>0?'+':'')+v+' мс'};
TN.forEach(([k])=>{fo(k);const r=$('r'+k);r.oninput=ev=>{opt.O[k]=+ev.target.value;fo(k);save()};r.onchange=()=>r.blur();r.ondblclick=()=>{opt.O[k]=-(PC[k]||0);r.value=opt.O[k];fo(k);save()}});
function syncTune(){[...VW,'и'].forEach(w=>{const r=$('r'+w);if(r){r.value=opt.O[w]||0;fo(w)}});save()}
$('ta').onclick=()=>{[...VW,'и'].forEach(w=>{if(PC[w]!=null)opt.O[w]=-PC[w]});syncTune()};
$('tz').onclick=()=>{TN.forEach(([k])=>{opt.O[k]=0});syncTune()};
$('ogm').checked=opt.GM;$('osn').value=opt.S;hudUpd();if(opt.GM)$('mst').textContent='Нажмите Старт, чтобы включить вход';
$('ogm').onchange=ev=>{opt.GM=ev.target.checked;hudUpd();if(opt.GM)micOn();else{const c=micOff();if(!c)$('mst').textContent=''}save()};
$('osn').oninput=ev=>{opt.S=+ev.target.value;sendThr();save()};$('osn').onchange=ev=>ev.target.blur();
$('min').onchange=ev=>{opt.MIC=ev.target.value;save();micOn()};$('bcal').onclick=calib;
$('pgb').onclick=ev=>{const r=ev.currentTarget.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width,d=B.map((_,i)=>bdur(i)),tot=d.reduce((a,b)=>a+b);let a=0,i=0;for(;i<B.length-1;i++){if(a+d[i]>x*tot)break;a+=d[i]}go(i)};
setInterval(()=>{if(mic)$('lvf').style.width=Math.min(100,lv/(thr()*4)*100)+'%'},60);
$('hg').innerHTML=Array.from({length:21},(_,j)=>{const c=Math.abs((j-10)*10);return `<i style="background:var(--${c<=45?'ok':c<=90?'lis':'need'})"></i>`}).join('');
let footS='';
function foot(f){const p=(f*4)%1,h=.5-.5*Math.cos(2*Math.PI*p),r=Math.round(h),o=h>.5?'0':'1',s=r+o;if(s==footS)return;footS=s;
 const t=$('ltoe'),m=$('ltap'),d=$('lmid');if(!t)return;
 t.setAttribute('transform',`translate(0 ${-r*2})`);if(d)d.setAttribute('transform',`translate(0 ${-r})`);m.setAttribute('opacity',o)}
$('mout').onchange=ev=>{opt.OUT=ev.target.value;save();if(ctx&&ctx.setSinkId)ctx.setSinkId(opt.OUT).catch(()=>{})};
$('bauto').onclick=()=>{opt.CALD=false;save();latUpd()};latUpd();
foot(0);loadE();
addEventListener('keydown',ev=>{
 if(ev.target.tagName=='INPUT'&&(ev.target.type=='number'||ev.target.type=='range'))return;
 if(ev.metaKey||ev.ctrlKey||ev.altKey)return;
 if(ev.code=='Escape'&&!$('hb').hidden){hint(false);return}
 if(ev.target.tagName=='BUTTON'&&(ev.code=='Space'||ev.code=='Enter'||ev.code=='NumpadEnter'))return;
 const c=ev.code,m={Space:toggle,Enter:()=>start(true),NumpadEnter:()=>start(true),ArrowLeft:()=>go(cur-1),ArrowRight:()=>go(cur+1),ArrowUp:()=>pat(-1),ArrowDown:()=>pat(1),
 Minus:()=>setShift(-5),Equal:()=>setShift(5),NumpadSubtract:()=>setShift(-5),NumpadAdd:()=>setShift(5),
 KeyL:()=>{opt.loop=!opt.loop;$('oloop').checked=opt.loop;save()},KeyN:()=>{opt.NP=!opt.NP;$('onp').checked=opt.NP;applyBus();save()}};
 if(/^Digit[1-8]$/.test(c)){jump(+c.slice(5)-1,0,0);ev.preventDefault();return}
 if(m[c]){m[c]();ev.preventDefault()}
});
const VIEWS=['vplay','vscore','vset','vhelp'];
const hint=on=>{const h=$('hb'),b=$('bhud');if(!h)return;h.hidden=!on;b.setAttribute('aria-expanded',!!on);b.classList.toggle('on',!!on)};
function showView(v){
 if(!VIEWS.includes(v))v='vplay';
 VIEWS.forEach(x=>$(x).hidden=x!==v);
 const t=$('tscore');t.classList.toggle('on',v=='vscore');t.setAttribute('aria-pressed',v=='vscore');
 $('bset').setAttribute('aria-pressed',v=='vset');
 $('bhelp').setAttribute('aria-pressed',v=='vhelp');
 if(v!='vplay')hint(false);
 if(v=='vscore'){hudUpd();recUpd()}
 if(v=='vplay')draw(ctx?ctx.currentTime:0,60/bpmOf(cur));
}
$('tscore').onclick=()=>showView($('tscore').getAttribute('aria-pressed')=='true'?'vplay':'vscore');
$('bhud').onclick=()=>hint($('hb').hidden);
document.addEventListener('click',ev=>{if(!$('hb').hidden&&ev.target!==$('bhud')&&!$('hb').contains(ev.target))hint(false)});
$('bset').onclick=()=>showView($('bset').getAttribute('aria-pressed')=='true'?'vplay':'vset');
$('bhelp').onclick=()=>showView($('bhelp').getAttribute('aria-pressed')=='true'?'vplay':'vhelp');
showBlock();recUpd();hudUpd();cvRO.observe($('cv'));requestAnimationFrame(frame);

// регистрация service worker: только по http(s), чтобы офлайн-кеш не мешал file://
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol))addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))
