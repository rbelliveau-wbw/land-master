/* Repository Sliding push. Presentation only: original values, handlers and requests run immediately. */
(function(global){
  'use strict';
  const timers=new WeakMap(),identities=new WeakMap();let sequence=0;
  const key=(...parts)=>JSON.stringify(parts);
  const identity=value=>{if(!value||typeof value!=='object')return String(value||'');if(value.ID||value.id)return String(value.ID||value.id);if(!identities.has(value))identities.set(value,'draft-'+(++sequence));return identities.get(value);};
  const pattern=/\([−-]?\$\d[\d,]*(?:\.\d+)?(?:e[+\-]?\d+)?[KMB]?\)|[+\-−±]?\$?\d[\d,]*(?:\.\d+)?(?:e[+\-]?\d+)?(?:%|[KMB]|\+|\spts)?/gi;
  const unknown=text=>/^(?:|[—–-]|n\/?a|not (?:available|set))$/i.test(text.trim());
  function matches(text,mode){return [...text.matchAll(pattern)].filter(m=>mode==='money'?m[0].includes('$'):mode==='percent'?/%|pts/.test(m[0]):mode==='counts'?/^\s*(?:\/\s*\d|of\s+\d|lots?\b|records?\b|rows?\b|items?\b|budgets?\b|milestones?\b|ranges?\b|completed\b|confirmed\b|saved\b|created\b|not (?:created|sent)\b|failed\b|skipped\b|selected\b|verified\b)/i.test(text.slice(m.index+m[0].length)):true);}
  function decorate(host,id,mode,context){
    if(!host||!host.isConnected)return [];
    const signature=key(id,mode,context,host.textContent);
    const own=()=>[...host.querySelectorAll('[data-lm-number-key]')].filter(node=>node.dataset.lmNumberOwner===id);
    if(host.__lmNumberSignature===signature){const nodes=own();if(nodes.length||!matches(host.textContent,mode).length&&!unknown(host.textContent))return nodes;}
    own().forEach(node=>node.replaceWith(document.createTextNode(node.dataset.lmNumberText)));
    host.normalize();const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT),texts=[];
    while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('input,textarea,select,option,script,style,[contenteditable="true"],[data-lm-number-key]'))texts.push(node);}
    let ordinal=0;const nodes=[];
    // A scalar is one display slot even when a calculation becomes unknown.
    // Keep its full formatted text; tokenizing a dash would remove the held slot.
    const scalarText=host.textContent,scalarMatches=matches(scalarText,mode);
    const scalar=[...host.childNodes].every(node=>node.nodeType===Node.TEXT_NODE)&&(unknown(scalarText)||scalarMatches.length===1&&scalarMatches[0][0]===scalarText.trim());
    if(scalar){
      const shell=document.createElement('span'),value=document.createElement('span');shell.className='lm-number-push';value.className='lm-number-value';
      shell.dataset.lmNumberKey=key(id,0);shell.dataset.lmNumberOwner=id;shell.dataset.lmNumberText=scalarText;shell.dataset.lmNumberContext=context||'';shell.dataset.lmNumberKnown=String(!unknown(scalarText));value.textContent=scalarText;shell.appendChild(value);host.replaceChildren(shell);host.__lmNumberSignature=signature;return [shell];
    }
    for(const node of texts){
      const found=matches(node.data,mode);if(!found.length)continue;
      const fragment=document.createDocumentFragment();let end=0;
      for(const match of found){
        fragment.appendChild(document.createTextNode(node.data.slice(end,match.index)));
        const shell=document.createElement('span'),value=document.createElement('span');shell.className='lm-number-push';value.className='lm-number-value';
        shell.dataset.lmNumberKey=key(id,ordinal++);shell.dataset.lmNumberOwner=id;shell.dataset.lmNumberText=match[0];shell.dataset.lmNumberContext=context||'';value.textContent=match[0];shell.appendChild(value);fragment.appendChild(shell);nodes.push(shell);end=match.index+match[0].length;
      }
      fragment.appendChild(document.createTextNode(node.data.slice(end)));node.replaceWith(fragment);
    }
    host.__lmNumberSignature=signature;return nodes;
  }
  function apply(node,old,reduced){
    const text=node.dataset.lmNumberText,context=node.dataset.lmNumberContext,active=timers.get(node),now=performance.now();
    const equal=old?.text===text&&old.context===context;
    if(!reduced&&equal&&active)return active;
    clearTimeout(active?.timer);timers.delete(node);node.classList.remove('lm-number-changing');node.style.minWidth='';
    if(!old||old.known===false||node.dataset.lmNumberKnown==='false'||reduced||equal&&!(old.until>now))return null;
    // Input + change, or a saved refresh, may rebuild the same final text mid-push.
    // Resume the remaining visual time instead of cancelling or restarting it.
    const start=equal?old.start:now,until=start+420,from=equal?old.from:old.text,fromColor=equal?old.fromColor||old.color:old.color;
    node.dataset.lmNumberFrom=from;node.style.setProperty('--lm-number-delay',Math.min(0,start-now)+'ms');
    if(fromColor)node.style.setProperty('--lm-number-from-color',fromColor);else node.style.removeProperty('--lm-number-from-color');
    // CSS overlays real formatted text without estimated widths or per-cell layout reads.
    node.classList.add('lm-number-changing');
    const job={start,until,from,fromColor};job.timer=setTimeout(()=>{node.classList.remove('lm-number-changing');node.style.minWidth='';timers.delete(node);},Math.max(0,until-now));timers.set(node,job);return job;
  }
  function start(options){
    if(typeof MutationObserver!=='function')return null;
    let previous=new Map(),actor='',frame=0,stopped=false;const observer=new MutationObserver(schedule);
    const read=node=>({text:node.dataset.lmNumberText,context:node.dataset.lmNumberContext,known:node.dataset.lmNumberKnown!=='false',color:getComputedStyle(node).color});
    const gate=global.NumberEditCommit?.create({key:node=>node.dataset.lmNumberKey,selector:'[data-lm-number-key]',read,text:old=>old?.text,changing:'lm-number-changing',holdVisual:(node,old)=>{if(old?.color)node.style.setProperty('--lm-number-edit-color',old.color);},releaseVisual:node=>node.style.removeProperty('--lm-number-edit-color')});
    const root=options.root||document.body,media=global.matchMedia?.('(prefers-reduced-motion: reduce)');
    function watch(){if(!stopped)observer.observe(root,{subtree:true,childList:true,characterData:true});}
    function flush(){
      frame=0;if(stopped)return;observer.disconnect();
      try{
        const currentActor=key(global.LMRuntime?.current?.()||'',options.actor?.()||'');
        if(actor!==currentActor){previous.clear();gate?.reset();actor=currentActor;}
        // A complete refresh can replace the same authorized snapshot. Retain its
        // old presentation while loading; actor/permission changes above discard it.
        if(options.ready&&!options.ready())return;
        const hosts=new Map(),counts=new Map(),next=new Map(),nodes=[];
        const api={key,identity,text(host,id,mode='all',context=''){if(host&&host.isConnected)hosts.set(host,{id:key(options.module,id),mode,context});},each(selector,fn,parent=root){parent?.querySelectorAll(selector).forEach(fn);},id(id,scope,mode,context){api.text(document.getElementById(id),[scope,id],mode,context);},readonly(input,id){
          if(!input?.readOnly)return;
          let shell=input.parentElement;
          if(!shell.classList.contains('lm-number-input')){const color=getComputedStyle(input).color;shell=document.createElement('span');shell.className='lm-number-input';input.before(shell);shell.appendChild(input);shell.style.setProperty('--lm-number-input-color',color);const display=document.createElement('span');display.className='lm-number-input-display';display.setAttribute('aria-hidden','true');shell.appendChild(display);}
          const display=shell.querySelector('.lm-number-input-display'),style=getComputedStyle(input);display.style.font=style.font;display.style.textAlign=style.textAlign;display.style.padding=style.padding;if(display.textContent!==input.value)display.textContent=input.value;api.text(display,id);
        }};
        options.collect(api);
        const depths=new WeakMap();function depth(node){if(!node)return 0;if(!depths.has(node))depths.set(node,depth(node.parentElement)+1);return depths.get(node);}
        for(const [host,entry] of [...hosts].sort((a,b)=>depth(b[0])-depth(a[0])))nodes.push(...decorate(host,entry.id,entry.mode,entry.context));
        for(const node of nodes)if(node.isConnected)counts.set(node.dataset.lmNumberKey,(counts.get(node.dataset.lmNumberKey)||0)+1);
        for(const node of nodes){
          if(!node.isConnected)continue;const id=node.dataset.lmNumberKey;
          // Ambiguous legacy markup stays readable/static; never borrow another slot's old value.
          if(counts.get(id)>1){apply(node,null,!!media?.matches);continue;}
          const old=previous.get(id),job=gate?.hold(node,old,(target,before)=>apply(target,before,!!media?.matches))?null:apply(node,old,!!media?.matches);
          next.set(id,{...read(node),from:job?.from,fromColor:job?.fromColor,start:job?.start,until:job?.until});
        }
        previous=next;
      }catch(error){previous.clear();console.warn('Number transitions:',options.module,error);}
      finally{observer.takeRecords();watch();}
    }
    function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(flush);}
    const events=['input','change','click'];events.forEach(type=>root.addEventListener(type,schedule));media?.addEventListener?.('change',schedule);watch();schedule();
    return Object.freeze({flush,stop(){gate?.stop();stopped=true;observer.disconnect();cancelAnimationFrame(frame);events.forEach(type=>root.removeEventListener(type,schedule));media?.removeEventListener?.('change',schedule);previous.clear();}});
  }
  global.LMNumbers=Object.freeze({start,key,identity});
})(window);
