import { records, fileLocation } from './data';
import { escapeHtml } from './html';
import './pnc-terminal.css';

/** All actions below are local UI. Links are the only way out of the showcase. */
export class FeatureTour {
  private route: number[] = [];
  private step = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private openTimer?: ReturnType<typeof setTimeout>;
  private playing = false;
  private root: HTMLElement;
  constructor(private actions: { select: (i:number)=>void; open:()=>void; archive:()=>void; reduced:()=>boolean }) {
    this.root = document.createElement('aside'); this.root.className = 'pnc-toolbar';
    this.root.setAttribute('aria-label','PNC 功能导览');
    this.root.innerHTML = `<div class="pnc-tour-links"><a class="pnc-back-home" href="/PTA-Neuron-Copilot/" aria-label="返回 PNC 原版主页">← 主页</a><button data-tour="pnc">PNC 流程 <span>↗</span></button><button data-tour="helper">Helper 流程 <span>↗</span></button><a href="https://github.com/NeuronCState/PTA-Neuron-Copilot#readme" target="_blank" rel="noopener">安装 / 文档 ↗</a></div><div class="pnc-tour-player" hidden><span class="pnc-tour-status" role="status" aria-live="polite"></span><div><button data-tour-control="prev" aria-label="上一步">←</button><button data-tour-control="play">播放</button><button data-tour-control="next" aria-label="下一步">→</button><button data-tour-control="close" aria-label="结束导览">×</button></div></div><p>PNC 2.1.0 / HELPER 1.0.0 <span>· 本地功能展示</span></p>`;
    document.querySelector('#stage')!.append(this.root);
    this.root.addEventListener('click', event => {
      const button=(event.target as Element).closest<HTMLButtonElement>('button'); if(!button)return;
      if(button.dataset.tour){
        this.stop(); this.route=button.dataset.tour==='pnc' ? [8,15,10,18,33] : [24,25,26,27,28,34]; this.step=0;
        this.root.querySelectorAll('[data-tour]').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));
        this.root.querySelector<HTMLElement>('.pnc-tour-player')!.hidden=false; this.visit();
      } else switch(button.dataset.tourControl) {
        case 'prev': this.stop();this.step=(this.step+this.route.length-1)%this.route.length;this.visit();break;
        case 'next': this.stop();this.step=(this.step+1)%this.route.length;this.visit();break;
        case 'play': if(this.playing)this.stop();else{this.playing=true;button.textContent='暂停';this.schedule();}break;
        case 'close':this.stop();clearTimeout(this.openTimer);this.route=[];this.root.querySelector<HTMLElement>('.pnc-tour-player')!.hidden=true;this.root.querySelectorAll('[data-tour]').forEach(n=>n.setAttribute('aria-pressed','false'));this.actions.archive();break;
      }
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')this.stop();});
    // Opening a dialog, manually selecting, or editing preferences must never be interrupted by a tour.
    document.addEventListener('click',event=>{if(!this.root.contains(event.target as Node))this.stop();},{capture:true});
  }
  private visit(){
    clearTimeout(this.openTimer); const i=this.route[this.step]; if(i===undefined)return;
    this.actions.select(i);
    this.root.querySelector<HTMLElement>('.pnc-tour-status')!.textContent=`${this.step+1} / ${this.route.length} · ${records[i].title}`;
    this.openTimer=setTimeout(()=>this.actions.open(), this.actions.reduced()?0:360);
  }
  private schedule(){
    clearTimeout(this.timer); if(!this.playing)return;
    this.timer=setTimeout(()=>{if(this.step===this.route.length-1){this.stop();return;}this.step++;this.visit();this.schedule();},8500);
  }
  stop(){this.playing=false;clearTimeout(this.timer);clearTimeout(this.openTimer);this.root.querySelector<HTMLButtonElement>('[data-tour-control="play"]')!.textContent='播放';}
  setMode(mode:string,modal:boolean){this.root.hidden=mode==='boot';this.root.inert=modal;}
}

/** CSS perspective fallback keeps content/search/navigation usable without WebGL. */
export class ArchiveFallback {
  private root: HTMLElement;
  constructor(host:HTMLElement){
    host.replaceChildren();this.root=document.createElement('div');this.root.className='pnc-fallback';
    this.root.setAttribute('aria-hidden','true');
    this.root.innerHTML=`<div class="pnc-fallback-world">${Array.from({length:35},(_,i)=>`<div class="pnc-fallback-card" data-card="${i}" style="--column:${i%5};--row:${Math.floor(i/5)}"><i></i><span>PNC / ${String(i+1).padStart(3,'0')}</span><b></b><em></em></div>`).join('')}</div><span class="pnc-fallback-label">兼容模式 · 3D 硬件加速不可用</span>`;
    host.append(this.root);document.querySelector('#stage')!.setAttribute('data-renderer','css-fallback');
  }
  update(index:number,mode:string,reduced:boolean){
    const lane=fileLocation(index).lane;
    this.root.dataset.mode=mode;this.root.classList.toggle('static',reduced);
    this.root.querySelectorAll<HTMLElement>('[data-card]').forEach((node,i)=>{
      const active=i===15+lane;node.classList.toggle('selected',active);
      if(active){node.querySelector('span')!.textContent=records[index].id;node.querySelector('b')!.textContent=records[index].title;}
    });
    this.root.style.setProperty('--selected-column',String(lane));
  }
}
