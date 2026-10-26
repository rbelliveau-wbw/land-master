/* Shared presentation only. Real surfaces close immediately; never redraw detached exit copies. */
(function(global){
  'use strict';
  const ids=new WeakMap();let sequence=0;
  const identity=object=>{if(!object||typeof object!=='object')return String(object||'');if(object.ID||object.id)return String(object.ID||object.id);if(!ids.has(object))ids.set(object,'draft-'+(++sequence));return ids.get(object);};
  const key=(...parts)=>JSON.stringify(parts),media=global.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animations=new Map();
  function cancel(node){const animation=animations.get(node);if(animation){animation.cancel();animations.delete(node);}}
  function animate(node,frames,duration=180){
    if(!node?.isConnected||media?.matches||typeof node.animate!=='function')return;
    cancel(node);
    const animation=node.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.25,1)'});
    animations.set(node,animation);animation.finished.catch(()=>{}).finally(()=>{if(animations.get(node)===animation)animations.delete(node);});
    return animation;
  }
  function flash(node){animate(node,[{backgroundColor:'rgba(37,99,235,.12)'},{backgroundColor:'rgba(37,99,235,0)'}],650);}
  const gradientProperties=typeof global.CSS?.registerProperty==='function';
  if(gradientProperties)for(let index=0;index<12;index++)try{CSS.registerProperty({name:'--lm-meter-stop-'+index,syntax:'<percentage>',inherits:false,initialValue:'0%'});}catch(error){}
  function captureMeters(root){return new Map([...root.querySelectorAll('[data-lm-meter-key]')].map(node=>[node.dataset.lmMeterKey,{width:node.style.width,gradient:node.dataset.lmMeterGradient||node.style.background}]));}
  function applyMeters(root,previous=new Map()){
    for(const node of root.querySelectorAll('[data-lm-meter-key]')){
      const old=previous.get(node.dataset.lmMeterKey),width=node.style.width;
      if(width&&old?.width&&/^\d+(?:\.\d+)?%$/.test(width)&&/^\d+(?:\.\d+)?%$/.test(old.width)){if(width!==old.width)animate(node,[{width:old.width},{width}],260);continue;}
      const gradient=node.style.background,stops=[...gradient.matchAll(/(#[a-f\d]{6}|rgba?\([^)]+\))\s+(\d+(?:\.\d+)?%)/gi)];
      if(!gradientProperties||stops.length<3||stops.length>12)continue;
      const before=[...(old?.gradient||'').matchAll(/(#[a-f\d]{6}|rgba?\([^)]+\))\s+(\d+(?:\.\d+)?%)/gi)],from={},to={};let index=0;
      node.dataset.lmMeterGradient=gradient;
      node.style.background=gradient.replace(/(#[a-f\d]{6}|rgba?\([^)]+\))\s+(\d+(?:\.\d+)?%)/gi,(_,color,value)=>{const name='--lm-meter-stop-'+index;node.style.setProperty(name,value);from[name]=before[index]?.[2]||value;to[name]=value;index++;return color+' var('+name+')';});
      if(old&&before.length===stops.length&&before.every((stop,i)=>stop[1]===stops[i][1])&&before.some((stop,i)=>stop[2]!==stops[i][2]))animate(node,[from,to],260);
    }
  }
  const refreshing=new WeakMap();
  function refresh(host,action,options={}){
    if(!host||options.allowed?.()===false)return action();
    const token={},actor=key(global.LMRuntime?.current?.()||'');
    const entry=refreshing.get(host)||{prior:host.getAttribute('aria-busy'),tokens:new Set()};
    entry.tokens.add(token);entry.latest=token;refreshing.set(host,entry);host.setAttribute('aria-busy','true');
    let result;try{result=action();}catch(error){finish(false);throw error;}
    function finish(ok){if(refreshing.get(host)!==entry)return;entry.tokens.delete(token);if(!entry.tokens.size){refreshing.delete(host);if(entry.prior===null)host.removeAttribute('aria-busy');else host.setAttribute('aria-busy',entry.prior);}if(entry.latest===token&&ok&&options.completed?.()!==false&&host.isConnected&&options.allowed?.()!==false&&actor===key(global.LMRuntime?.current?.()||''))animate(host,[{opacity:.8},{opacity:1}],160);}
    return Promise.resolve(result).then(value=>{finish(true);return value;},error=>{finish(false);throw error;});
  }
  function visible(node){return !!node?.isConnected&&!node.hidden&&!node.closest('[hidden],[aria-hidden="true"],.hidden')&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden'&&!!node.getClientRects().length;}
  function start(options={}){
    if(typeof MutationObserver!=='function')return null;
    const root=options.root||document.body;
    let frame=0,stopped=false,actor='',primed=false,intent=0,structural=false;
    let previousLists=new Map(),previousPanels=new Map(),previousSurfaces=new Map(),previousFeedback=new Map();
    const rails=new Map(),scrollers=new Map(),previousTabs=new Map(),tracked=new Set();
    let seenTabs=new Set();
    const observer=new MutationObserver(records=>{
      const relevant=records.filter(record=>!record.target.closest?.('[data-lm-number-key],[data-pf-number-key],[data-number-key],.lm-motion-rail'));
      if(!relevant.length)return;
      if(relevant.some(record=>record.type==='childList'))structural=true;
      schedule();
    });
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
    const now=()=>performance.now();
    function watch(){if(!stopped)observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden','open','aria-hidden','aria-expanded','aria-selected','aria-pressed','aria-current','data-state']});}
    function reset(){for(const node of tracked)cancel(node);tracked.clear();previousLists.clear();previousPanels.clear();previousSurfaces.clear();previousFeedback.clear();previousTabs.clear();scrollers.clear();primed=false;}
    function run(node,frames,ms){tracked.add(node);animate(node,frames,ms);}
    function tabs(config,index){
      for(const [navIndex,nav] of [...root.querySelectorAll(config.selector)].entries()){
        const items=[...nav.querySelectorAll(config.items||'button,a')].filter(visible);
        const selected=items.find(node=>config.selected?config.selected(node):node.matches('.active,.on,.sel,[aria-selected="true"],[aria-pressed="true"],[aria-current="page"]'));
        if(!selected||items.length<2)continue;
        const id=key(index,config.scope?.()||'',nav.id||config.selector,navIndex),selection=config.key?config.key(selected):selected.dataset.pane||selected.dataset.tab||selected.dataset.view||selected.dataset.scope||selected.id||items.indexOf(selected);
        seenTabs.add(id);
        const old=previousTabs.get(id);
        if(old&&old.selection!==selection&&options.ready?.()!==false){
          if(config.panel){const panel=typeof config.panel==='function'?config.panel(selected):root.querySelector(config.panel);if(visible(panel))run(panel,[{opacity:.72},{opacity:1}],170);}
          for(const selector of config.scroll||[]){const node=root.querySelector(selector);if(!node)continue;scrollers.set(key(id,old.selection,selector),{left:node.scrollLeft,top:node.scrollTop});const saved=scrollers.get(key(id,selection,selector));if(saved){node.scrollLeft=saved.left;node.scrollTop=saved.top;}}
        }
        if(config.rail===false){previousTabs.set(id,{selection});continue;} // Preserve existing native moving sliders.
        let rail=rails.get(nav);
        if(!rail||!rail.node.isConnected){
          const style=getComputedStyle(selected),node=document.createElement('span');node.className='lm-motion-rail';node.setAttribute('aria-hidden','true');node.style.background=style.backgroundImage!=='none'?style.backgroundImage:style.backgroundColor;node.style.borderRadius=style.borderRadius;node.style.boxShadow=style.boxShadow;
          if(style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.backgroundImage==='none')continue;
          nav.classList.add('lm-motion-tabs');nav.prepend(node);rail={node,observed:selected};rails.set(nav,rail);resize?.observe(nav);resize?.observe(selected);
        }
        items.forEach(node=>{node.classList.add('lm-motion-tab-item');node.classList.toggle('lm-motion-selected',node===selected);});
        const bounds=selected.getBoundingClientRect(),base=nav.getBoundingClientRect();
        const left=bounds.left-base.left+nav.scrollLeft-nav.clientLeft,top=bounds.top-base.top+nav.scrollTop-nav.clientTop;
        const style=rail.node.style;style.left='0px';style.top='0px';style.width=bounds.width+'px';style.height=bounds.height+'px';style.transform='translate('+left+'px,'+top+'px)';
        if(old?.geometry&&old.selection!==selection)run(rail.node,[{transform:old.geometry.transform,width:old.geometry.width},{transform:style.transform,width:style.width}],190);
        previousTabs.set(id,{selection,geometry:{transform:style.transform,width:style.width}});
      }
    }
    function lists(config,index,next){
      for(const host of root.querySelectorAll(config.selector)){
        const scope=typeof config.scope==='function'?config.scope(host):config.scope||'',id=key(index,scope,config.hostKey?.(host)||host.id||config.selector);
        const rows=[...host.querySelectorAll(config.rows)].filter(node=>!config.accept||config.accept(node));
        // Large reports use a bounded surface fade, never thousands of layout reads.
        if(rows.length>(config.limit||100)){
          const count=rows.length,old=previousLists.get(id);next.set(id,{count,bulk:true});
          if(primed&&intent>now()&&structural&&old&&(old.count!==count||config.refresh))run(host,[{opacity:.82},{opacity:1}],140);
          continue;
        }
        const samples=new Map(),duplicates=new Set();
        for(const row of rows){
          const record=config.key(row);if(record===undefined||record===null||record==='')continue;
          const rowKey=String(record);if(samples.has(rowKey)){duplicates.add(rowKey);continue;}
          if(!visible(row))continue;
          const rect=row.getBoundingClientRect();
          // Snapshot layout, not our in-flight FLIP/reveal translation. Numeric
          // decoration and other observers can resample a moving row; retaining
          // that visual offset feeds it back into the next animation indefinitely.
          const moving=animations.get(row)?.effect?.getKeyframes().some(frame=>frame.transform);
          const transform=moving?getComputedStyle(row).transform:'none';
          const offset=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
          samples.set(rowKey,{node:row,top:rect.top-offset,left:rect.left,height:rect.height});
        }
        for(const duplicate of duplicates)samples.delete(duplicate);
        const old=previousLists.get(id),open=visible(host);
        const changed=!!old?.samples&&(old.samples.size!==samples.size||[...samples.keys()].some(rowKey=>!old.samples.has(rowKey)));
        // A bottom-row removal has no following row to FLIP. Animate the real
        // list boundary too, including first insertion and removal to empty.
        // The native model/DOM change and focus happen immediately; no editor
        // is cloned and no placeholder is inserted into the live collection.
        if(config.resize&&changed&&open)cancel(host);
        const height=config.resize&&open?host.getBoundingClientRect().height:null;
        // Only intentional navigation/structural edits move rows; typing calculations do not.
        if(primed&&intent>now()&&structural&&old?.samples){
          for(const [rowKey,sample] of samples){
            const before=old.samples.get(rowKey);
            if(before){const delta=before.top-sample.top;if(Math.abs(delta)>.5&&Math.abs(delta)<1200)run(sample.node,[{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],230);}
            else if(old.open){
              const from={opacity:.35,transform:'translateY(-6px)'},to={opacity:1,transform:'translateY(0)'};
              if(config.highlight!==false&&!sample.node.matches('tr')){from.backgroundColor='rgba(37,99,235,.16)';to.backgroundColor='rgba(37,99,235,0)';}
              run(sample.node,[from,to],230);
              if(config.highlight!==false){
                // PF table cells have opaque fills; a TR background is hidden
                // beneath them. Wash the actual cells without touching inputs.
                const cells=sample.node.matches('tr')?[...sample.node.children]:[];
                for(const cell of cells)run(cell,[{boxShadow:'inset 0 0 0 9999px rgba(37,99,235,.16)'},{boxShadow:'inset 0 0 0 9999px rgba(37,99,235,0)'}],650);
              }
            }
          }
          if(config.resize&&changed&&old.open&&height!==null&&Math.abs(old.height-height)>.5&&Math.abs(old.height-height)<1200){
            const overflowX=host.scrollWidth>host.clientWidth+1?'scroll':'hidden';
            run(host,[{height:old.height+'px',boxSizing:'border-box',overflowX,overflowY:'hidden'},{height:height+'px',boxSizing:'border-box',overflowX,overflowY:'hidden'}],230);
          }
        }
        next.set(id,{samples,open,height});
      }
    }
    function surfaces(config,index,next){
      for(const node of root.querySelectorAll(config.selector)){
        const id=key(index,node.id||identity(node)),open=visible(node),old=previousSurfaces.get(id);
        next.set(id,{open,node});
        if(node.tagName==='DIALOG'){node.classList.add('lm-motion-dialog');continue;}
        node.classList.add('lm-motion-surface');
        if(open&&(old?!old.open:primed)){
          // Fade the mounted surface, never change its anchored/fixed positioning.
          run(node,[{opacity:.25},{opacity:1}],config.duration||170);
        }
      }
    }
    function feedback(config,index,next){
      for(const node of root.querySelectorAll(config.selector)){
        const id=key(index,config.key?config.key(node):node.id||identity(node)),state=config.state?config.state(node):node.dataset.state||String(node.className).replace(/\blm-motion-\S+/g,'').trim();
        node.classList.add('lm-motion-feedback');next.set(id,state);
        if(primed&&previousFeedback.has(id)&&previousFeedback.get(id)!==state&&visible(node)){
          if(!node.matches('input,textarea,select,[contenteditable="true"]'))run(node,[{opacity:.55},{opacity:1}],150);
          if(config.verified?.(node)){const row=config.row&&node.closest(config.row);if(row){tracked.add(row);flash(row);}}
        }
      }
    }
    function panels(config,index,next){
      for(const node of root.querySelectorAll(config.selector)){
        const id=key(index,node.id||config.key?.(node)||identity(node)),open=visible(node),old=previousPanels.get(id);
        next.set(id,{open,node});
        if(primed&&open&&old&&!old.open)run(node,[{opacity:.7},{opacity:1}],170);
      }
    }
    function flush(){
      frame=0;if(stopped)return;observer.disconnect();
      try{
        const nextActor=key(global.LMRuntime?.current?.()||'',options.actor?.()||'');
        if(nextActor!==actor){reset();actor=nextActor;}
        if(options.ready?.()===false){reset();return;}
        const nextLists=new Map(),nextPanels=new Map(),nextSurfaces=new Map(),nextFeedback=new Map();
        seenTabs=new Set();
        (options.tabs||[]).forEach(tabs);
        (options.lists||[]).forEach((config,index)=>lists(config,index,nextLists));
        (options.panels||[]).forEach((config,index)=>panels(config,index,nextPanels));
        (options.surfaces||[]).forEach((config,index)=>surfaces(config,index,nextSurfaces));
        (options.feedback||[]).forEach((config,index)=>feedback(config,index,nextFeedback));
        for(const selector of options.meters||[])root.querySelectorAll(selector).forEach(node=>node.classList.add('lm-motion-meter'));
        root.querySelectorAll('details').forEach(node=>node.classList.add('lm-motion-disclosure'));
        previousLists=nextLists;previousPanels=nextPanels;previousSurfaces=nextSurfaces;previousFeedback=nextFeedback;primed=true;structural=false;
        for(const node of tracked)if(!node.isConnected||!animations.has(node))tracked.delete(node);
        for(const [nav,rail]of rails)if(!nav.isConnected){resize?.unobserve(nav);resize?.unobserve(rail.observed);rails.delete(nav);}
        for(const id of previousTabs.keys())if(!seenTabs.has(id)){previousTabs.delete(id);for(const saved of scrollers.keys())if(saved.includes(id))scrollers.delete(saved);}
      }catch(error){reset();console.warn('Interaction motion unavailable:',options.module||'widget');}finally{observer.takeRecords();watch();}
    }
    function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(flush);}
    function before(event){
      if(event.type==='input'){
        if(event.target.matches?.('textarea,[contenteditable="true"],input:not([type="checkbox"]):not([type="radio"]):not([type="range"])'))intent=0;
        return;
      }
      if(event.type==='keydown'&&!['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete'].includes(event.key))return;
      if(event.target.closest?.('textarea,[contenteditable="true"],input:not([type="checkbox"]):not([type="radio"]):not([type="range"])'))return;
      // Read before the original handler, without canceling or delaying it.
      intent=now()+15000;if(frame)cancelAnimationFrame(frame);flush();
    }
    const events=['pointerdown','click','change','drop','keydown','input'];events.forEach(type=>root.addEventListener(type,before,true));
    function reduced(){if(media.matches)for(const node of tracked)cancel(node);schedule();}
    media?.addEventListener?.('change',reduced);watch();schedule();
    return Object.freeze({flush,reset,stop(){stopped=true;reset();observer.disconnect();resize?.disconnect();cancelAnimationFrame(frame);events.forEach(type=>root.removeEventListener(type,before,true));media?.removeEventListener?.('change',reduced);for(const [nav,rail]of rails){rail.node.remove();nav.classList.remove('lm-motion-tabs');nav.querySelectorAll('.lm-motion-tab-item').forEach(node=>node.classList.remove('lm-motion-tab-item','lm-motion-selected'));}rails.clear();}});
  }
  global.LMMotion=Object.freeze({start,identity,key,flash,animate,visible,refresh,captureMeters,applyMeters});
})(window);
