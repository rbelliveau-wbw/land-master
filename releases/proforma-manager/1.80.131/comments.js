(function(root){
  'use strict';
  var DAY=86400000;
  // One create + notification call. Hosts retain their existing pending/unknown guards.
  function create(data,invoke,fallback){
    var fields=['Contract1','Pro_Forma','Budget','Project'].filter(function(k){return data[k]!=null;}),field=fields[0],parent=field&&id(data[field]);
    if(fields.length!==1||!/^\d+$/.test(parent))return Promise.reject(new Error('A valid comment parent is required.'));
    return invoke({api_name:'Post_Record_Comment',http_method:'POST',content_type:'application/json',payload:{parentField:field,parentId:parent,commentText:String(data.Comment||'')}}).then(function(raw){
      var value=raw;
      for(var i=0;i<5;i++){if(typeof value==='string'){try{value=JSON.parse(value);}catch(ignore){break;}}else if(value&&value.details&&Object.prototype.hasOwnProperty.call(value.details,'output'))value=value.details.output;else if(value&&Object.prototype.hasOwnProperty.call(value,'output'))value=value.output;else if(value&&Object.prototype.hasOwnProperty.call(value,'result')&&!Array.isArray(value.result))value=value.result;else break;}
      if(!raw||root.LMData&&root.LMData.responseFailed(raw)||raw.code!=null&&String(raw.code)!=='3000'||!value||value.contract!=='record-comments-v1'||value.ok!==true||typeof value.id!=='string'||!/^\d+$/.test(value.id)||value.parentField!==field||value.parentId!==parent){var error=new Error(value&&value.message||'Comment outcome unverified. Review the thread before posting again.');error.raw=raw;if(value&&value.contract==='record-comments-v1'&&value.writeState==='not-started'){error.code='2894';error.definite=true;error.apiResponse=raw;error.raw={code:2894,message:error.message};}else error.noReplay=true;throw error;}
      return {code:3000,data:{ID:value.id},notificationState:value.notificationState,notificationReason:value.notificationReason};
    }).catch(function(error){
      // During the separate Creator promotion, only a definite missing endpoint may
      // retain the existing native create. Never fall back after a possible write.
      var raw=error&&error.raw||error,code=String(raw&&raw.code||'');
      if(typeof fallback==='function'&&['9350','9360'].indexOf(code)>=0)return fallback().then(function(result){return Object.assign({},result,{notificationState:'unavailable'});});
      throw error;
    });
  }
  function text(v){if(v&&typeof v==='object')return String(v.username||v.user_name||v.email||v.display_value||v.name||'');return String(v==null?'':v);}
  function identity(v){return text(v).trim().toLowerCase().split('@')[0];}
  function escape(s){return text(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function truth(v){return v===true||v==='true';}
  function id(v){
    if(Array.isArray(v))v=v[0];
    return v&&typeof v==='object'?String(v.ID||v.Id||v.id||v.value||v.Value||v.record_id||v.Record_ID||''):String(v||'');
  }
  // Creator returns application-local dates without an offset. Resolve Chicago's
  // actual offset for the record date, including DST, rather than the viewer's zone.
  function chicagoTime(year,month,day,hour,minute,second){
    var wall=Date.UTC(year,month,day,hour,minute,second),guess=wall;
    var fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    for(var n=0;n<3;n++){var p={};fmt.formatToParts(new Date(guess)).forEach(function(x){p[x.type]=x.value;});var shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=wall-shown;}
    return guess;
  }
  function timestamp(v){
    var s=text(v).trim();if(!s)return NaN;
    if(/(?:Z|[+-]\d\d:\d\d)$/.test(s))return Date.parse(s);
    var m=s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})[ T](\d{1,2}):(\d\d)(?::(\d\d))?(?:\s*(AM|PM))?$/i),year,month,day,hour,minute,second,meridiem;
    if(m){year=+m[3];month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[2]);day=+m[1];hour=+m[4];minute=+m[5];second=+(m[6]||0);meridiem=(m[7]||'').toUpperCase();}
    else {m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d\d)(?::(\d\d))?(?:\s*(AM|PM))?$/i);if(!m){var loose=Date.parse(s);return Number.isFinite(loose)?loose:NaN;}month=+m[1]-1;day=+m[2];year=+m[3];hour=+m[4];minute=+m[5];second=+(m[6]||0);meridiem=(m[7]||'').toUpperCase();}
    if(month<0)return NaN;
    if(meridiem){hour=hour%12+(meridiem==='PM'?12:0);}
    return chicagoTime(year,month,day,hour,minute,second);
  }
  function author(row,users){
    var login=text(row.User||row.Added_User),key=identity(login);
    var match=(users||[]).find(function(u){return [u.user,u.username,u.email,u.label].some(function(v){return identity(v)===key&&key;});});
    return text(match&&(match.Full_Name||match.fullName)).trim()||text(row.Author_Name).trim()||login||'Unknown user';
  }
  function canChange(row,current,now,aliases){var age=(now==null?Date.now():now)-timestamp(row.Added_Time),identities=[current].concat(aliases||[]).map(identity).filter(Boolean),added=text(row.Added_User).trim(),owner=identities.some(function(me){return identity(added)===me;});if(!owner&&(!added||/\s/.test(added)))owner=identities.some(function(me){return identity(row.User)===me;});return !truth(row.Deleted)&&owner&&Number.isFinite(age)&&age>=0&&age<DAY;}
  // Creator stores this existing administrator's posts as the app owner. Keep
  // the same exact actor exception in every host; native validation still owns
  // authorization and no other administrator inherits this alias.
  function creatorOwnerAliases(current){return text(current).trim().toLowerCase()==='rbelliveau@wbdevelopment.com'?['wbdevelopment']:[];}
  var PALETTE=['blue','violet','teal','amber','rose','indigo','cyan','orange'];
  function color(login){var hash=0;for(var c of identity(login))hash=(hash*31+c.charCodeAt(0))|0;return PALETTE[Math.abs(hash)%PALETTE.length];}
  function initials(name){return name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(function(s){return s[0].toUpperCase();}).join('')||'?';}
  function actionIcon(name){var paths={reply:'<path d="M9 10H4l5-5M4 10h9a6 6 0 0 1 6 6v3"/>',edit:'<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14Z"/>',delete:'<path d="M5 5l14 14M19 5 5 19"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',bold:'<path d="M6 12h8a4 4 0 0 1 0 8H6V4h7a4 4 0 0 1 0 8"/>',italic:'<path d="M19 4h-9m4 16H5M15 4 9 20"/>',strike:'<path d="M16 5c-1-1-2-1-4-1-3 0-5 1-5 4 0 2 2 3 5 4m-9 0h18m-4 3c1 3-1 5-5 5-2 0-4-1-5-2"/>',bullet:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',quote:'<path d="M4 5h6v7H4zm10 0h6v7h-6zM10 12c0 4-2 6-5 7m15-7c0 4-2 6-5 7"/>',code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',link:'<path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',emoji:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01"/>',preview:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',send:'<path d="m22 2-7 20-4-9L2 9Zm0 0L11 13"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';}
  function inline(raw){
    // Tokenize only supported syntax; all user-controlled text and URL attributes
    // are escaped, and only explicit http(s) links may become anchors.
    var pattern=/(`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;
    var out='',last=0;raw.replace(pattern,function(token,unused,offset){
      out+=escape(raw.slice(last,offset));last=offset+token.length;
      if(token[0]==='`')out+='<code>'+escape(token.slice(1,-1))+'</code>';
      else if(token.slice(0,2)==='**')out+='<strong>'+escape(token.slice(2,-2))+'</strong>';
      else if(token.slice(0,2)==='~~')out+='<s>'+escape(token.slice(2,-2))+'</s>';
      else if(token[0]==='*')out+='<em>'+escape(token.slice(1,-1))+'</em>';
      else {var link=token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/),url=link?link[2]:token;out+='<a target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">'+escape(link?link[1]:url)+'</a>';}
      return token;
    });return out+escape(raw.slice(last));
  }
  function markdown(raw){
    var out=[],fence=false,code=[];text(raw).split(/\r?\n/).forEach(function(line){
      if(/^```/.test(line)){if(fence){out.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>');code=[];}fence=!fence;return;}
      if(fence){code.push(line);return;}
      if(/^>\s?/.test(line))out.push('<blockquote>'+inline(line.replace(/^>\s?/,''))+'</blockquote>');
      else if(/^[-*] /.test(line))out.push('<div class="pc-listline"><span>•</span><span>'+inline(line.slice(2))+'</span></div>');
      else if(/^\d+\. /.test(line)){var m=line.match(/^(\d+\.) (.*)$/);out.push('<div class="pc-listline"><span>'+m[1]+'</span><span>'+inline(m[2])+'</span></div>');}
      else out.push('<div>'+ (line?inline(line):'<br>')+'</div>');
    });if(fence)out.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>');return out.join('');
  }
  function mount(el,api){
    var active='',rows=[],drafts={},edits={},loading=false,error='',busy=false,confirming=false,request=0,editing='',preview=false,disposed=false,operation=null,feedback=null,feedbackTimer=null,holdTimer=null,releaseHold=null,reviews={};
    function parentField(){return typeof api.parentField==='function'?api.parentField():(api.parentField||'Pro_Forma');}
    function scope(){return JSON.stringify([parentField(),active,text(api.currentUser()).trim().toLowerCase()]);}
    function clearFeedback(){if(feedbackTimer!=null&&typeof clearTimeout==='function')clearTimeout(feedbackTimer);feedbackTimer=null;feedback=null;}
    function readablePending(op){var reduced=typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches,remaining=reduced?0:650-(Date.now()-op.started);if(remaining<=0||disposed||typeof setTimeout!=='function')return Promise.resolve();return new Promise(function(resolve){releaseHold=resolve;holdTimer=setTimeout(function(){holdTimer=null;releaseHold=null;resolve();},remaining);});}
    function ownerAliases(){return api.currentUser()&&typeof api.ownerAliases==='function'?api.ownerAliases():[];}
    function currentRows(){var field=parentField();return rows.filter(function(r){return id(r[field])===active;});}
    function status(message,bad){if(disposed)return;if(bad&&root.LMSuccess)root.LMSuccess.clear();error=bad?(message||''):'';var node=el.querySelector('.pc-status');node.textContent=message||'';node.classList.toggle('error',!!bad);if(node.dataset)node.dataset.state=message?(bad?'warning':'verified'):'idle';}
    function layout(){el.innerHTML='<section class="pc-thread"><div class="pc-status" data-lm-motion="feedback" data-state="idle" role="status" aria-live="polite"></div><div class="pc-messages" aria-label="Comment thread"></div><div class="pc-compose">'+
      '<div class="pc-notify-note">'+actionIcon('mail')+'<span>Posting also emails the other record owners.</span></div>'+
      '<div class="pc-composer-head"><div class="pc-compose-identity" tabindex="0"><span class="pc-compose-avatar" aria-hidden="true"></span><div><span class="pc-compose-name"></span><span class="pc-compose-you">You</span><span class="pc-compose-caption">Add a comment</span></div></div></div>'+
      '<div class="pc-editor-shell"><div class="pc-toolbar" role="toolbar" aria-label="Comment formatting">'+
      ['bold','italic','strike','bullet','quote','code','link'].map(function(key,index){var label={bold:'Bold',italic:'Italic',strike:'Strikethrough',bullet:'Bulleted list',quote:'Quote',code:'Inline code',link:'Insert link'}[key];return (index===3||index===5?'<span aria-hidden="true"></span>':'')+'<button type="button" data-format="'+key+'" title="'+label+'" aria-label="'+label+'">'+actionIcon(key)+'</button>';}).join('')+
      '<button type="button" data-pc="emoji" title="Insert emoji" aria-label="Insert emoji">'+actionIcon('emoji')+'</button><button type="button" class="pc-preview-toggle" data-pc="preview" aria-pressed="false">'+actionIcon('preview')+'<span>Preview</span></button></div><div class="pc-emoji" hidden>'+['😀','👍','🎉','✅','👀','💡','⚠️','🙏','🚀','❤️'].map(function(e){return '<button type="button" data-emoji="'+e+'">'+e+'</button>';}).join('')+'</div><textarea class="pc-input" aria-label="New comment" placeholder="Write a comment…" maxlength="60000"></textarea><div class="pc-preview" hidden></div></div><footer class="pc-compose-footer"><span>Ctrl / ⌘ + Enter to post</span><div><button type="button" class="btn primary" data-pc="send" data-lm-motion="feedback">Post</button></div></footer></div></section>';}
    function input(){return el.querySelector('.pc-input');}
    function keepDraft(){if(active)drafts[active]=input().value;}
    function composer(){
      if(disposed)return;var me=api.currentUser(),name=author({User:me},api.users()),draft=drafts[active]||'',key=scope(),pending=busy&&operation&&operation.scope===key,finished=feedback&&feedback.scope===key,review=reviews[key],send=el.querySelector('[data-pc="send"]'),state=pending?'pending':finished?feedback.state:'idle',label=pending?(operation.kind==='post'?'Posting…':operation.kind==='delete'?'Deleting…':'Saving…'):finished?(feedback.kind==='post'?'Posted':feedback.kind==='delete'?'Deleted':'Saved'):'Post';
      el.querySelector('.pc-compose-name').textContent=me?name:'Read-only';el.querySelector('.pc-compose-avatar').textContent=me?initials(name):'—';el.querySelector('.pc-compose-you').hidden=!me;var actor=el.querySelector('.pc-compose-identity');actor.title=text(me);actor.tabIndex=me?0:-1;if(input().value!==draft)input().value=draft;input().disabled=busy||confirming||!me;send.disabled=busy||confirming||!me||loading||!!review||!!finished;send.ariaBusy=pending?'true':'false';
      if(send.dataset.state!==state||send.dataset.label!==label){send.dataset.state=state;send.dataset.label=label;send.innerHTML=(state==='pending'?'<svg class="pc-send-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>':finished?'<svg class="pc-send-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>':actionIcon('send'))+'<span>'+label+'</span>';}
      input().hidden=preview;el.querySelector('.pc-preview').hidden=!preview;el.querySelector('.pc-preview').innerHTML=markdown(input().value);el.querySelector('[data-pc="preview"]').ariaPressed=preview?'true':'false';el.querySelectorAll('.pc-actions button,.pc-inline-actions button,.pc-toolbar button,.pc-emoji button,[data-pc-edit-input]').forEach(function(button){button.disabled=busy||confirming||!me||loading||!!review;});
    }
    function render(){
      var list=el.querySelector('.pc-messages'),all=currentRows(),html='',day='',previous=null,tones={};
      all.forEach(function(row){var key=identity(row.User||row.Added_User)||String(row.ID);if(!tones[key])tones[key]=PALETTE[Object.keys(tones).length%PALETTE.length];});
      all.forEach(function(r){var name=author(r,api.users()),stamp=timestamp(r.Added_Time),d=Number.isFinite(stamp)?new Date(stamp):null,date=d?d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'Date unavailable';
        if(date!==day){html+='<div class="pc-day"><span>'+escape(date)+'</span></div>';day=date;previous=null;}
        var grouped=previous&&identity(previous.User||previous.Added_User)===identity(r.User||r.Added_User)&&stamp-timestamp(previous.Added_Time)<300000;
        var deleted=truth(r.Deleted),owned=canChange(r,api.currentUser(),null,ownerAliases()),tone=tones[identity(r.User||r.Added_User)||String(r.ID)]||color(r.User||r.Added_User),time=d?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'',isEditing=editing===String(r.ID),body=isEditing?'<div class="pc-inline-editor"><textarea data-pc-edit-input="'+escape(r.ID)+'" aria-label="Edit comment" maxlength="60000">'+escape(edits[editing]||'')+'</textarea><div class="pc-inline-actions"><button type="button" data-pc="inline-cancel" data-id="'+escape(r.ID)+'">Cancel</button><button type="button" data-pc="inline-save" data-id="'+escape(r.ID)+'">Save</button></div></div>':(deleted?'<em>Deleted by user</em>':markdown(r.Comment));
        html+='<article class="pc-message pc-'+tone+(grouped?' grouped':'')+(deleted?' deleted':'')+(isEditing?' editing':'')+'" id="comment-'+escape(r.ID)+'" data-comment-id="'+escape(r.ID)+'"><div class="pc-avatar" aria-hidden="true">'+escape(initials(name))+'</div><div class="pc-message-main"><div class="pc-meta"><b>'+escape(name)+'</b><time title="'+escape(d?d.toLocaleString():r.Added_Time)+'">'+escape(time)+'</time>'+(truth(r.Edited)&&!deleted?'<span class="pc-edited" title="Last modified: '+escape(r.Modified_Time)+'">(edited)</span>':'')+'</div><div class="pc-body">'+body+'</div></div><div class="pc-actions">'+(!deleted&&!isEditing?'<button type="button" data-pc="reply" data-id="'+escape(r.ID)+'" title="Reply with quote">'+actionIcon('reply')+'Reply</button>':'')+(owned&&!isEditing?'<button type="button" data-pc="edit" data-id="'+escape(r.ID)+'">'+actionIcon('edit')+'Edit</button><button type="button" data-pc="delete" data-id="'+escape(r.ID)+'">'+actionIcon('delete')+'Delete</button>':'')+'</div></article>';previous=r;
      });list.innerHTML=loading&&!all.length?'<div class="pc-empty">Loading comments…</div>':html||'<div class="pc-empty">'+(error?'Comments unavailable':'Start the conversation')+'</div>';composer();
    }
    function refresh(){var pf=active,field=parentField(),key=scope(),seq=++request;loading=true;error='';render();return Promise.resolve().then(function(){return api.load(pf);}).then(function(result){if(disposed||seq!==request||key!==scope())return {stale:true};rows=(result||[]).filter(function(r){return id(r[field])===pf;}).sort(function(a,b){var t=timestamp(a.Added_Time)-timestamp(b.Added_Time);return t||String(a.ID).localeCompare(String(b.ID),undefined,{numeric:true});});if(typeof api.onRows==='function')api.onRows(pf,rows.slice());loading=false;status(reviews[key]||'',!!reviews[key]);render();return {ok:true};}).catch(function(err){if(disposed||seq!==request||key!==scope())return {stale:true};loading=false;status(api.error(err)||'Could not load comments.',true);render();return {ok:false};});}
    function save(deleting,inlineValue){
      var row=editing&&currentRows().find(function(r){return String(r.ID)===editing;}),value=(inlineValue==null?input().value:inlineValue).trim(),pf=active,editId=editing;
      if(disposed||busy||confirming||reviews[scope()]||feedback&&feedback.scope===scope()&&!editing)return Promise.resolve();if(!api.currentUser()){status('Comments are read-only.',true);return Promise.resolve();}if(editing&&(!row||!canChange(row,api.currentUser(),null,ownerAliases()))){status('Only the author can change a comment within 24 hours of posting.',true);return Promise.resolve();}
      if(!deleting&&new TextEncoder().encode(value).length>60000){status('Comment is too long. Shorten it before posting.',true);return Promise.resolve();}
      if(!deleting&&!value){status('Write a comment first.',true);return Promise.resolve();}
      keepDraft();clearFeedback();var capturedDraft=drafts[pf],field=parentField(),op={scope:scope(),kind:deleting?'delete':editId?'edit':'post',started:Date.now()};operation=op;busy=true;error='';status('');composer();
      // Start the native request immediately. Only the visible pending state has
      // a minimum duration; it covers the acknowledgement and thread refresh.
      var write=Promise.resolve().then(function(){if(editId)return api.update(editId,deleting?{Deleted:true,Comment:'Deleted by user'}:{Comment:value});var data={Comment:value};data[field]=pf;return api.add(data);});
      return write.then(function(result){
        if(editId)delete edits[editId];else if(drafts[pf]===capturedDraft)delete drafts[pf];
        var current=!disposed&&op.scope===scope();if(current){editing='';preview=false;}
        var notice=deleting?'Comment deleted.':editId?'Comment updated.':result&&result.notificationState==='sent'?'Comment posted · Owners emailed.':result&&result.notificationState==='failed'?'Comment posted · Email failed.':result&&result.notificationState==='unavailable'?'Comment posted · Owner email unavailable.':result&&result.notificationState==='skipped'?'Comment posted · No other owners to email.':'Comment posted.';
        return (current?refresh():Promise.resolve({stale:true})).then(function(read){return readablePending(op).then(function(){
          if(disposed||operation!==op)return;busy=false;operation=null;
          if(op.scope===scope()){
            var warning=!!(result&&['failed','unavailable'].indexOf(result.notificationState)>=0)||read.ok===false;
            // A failed refresh cannot turn an acknowledged save into a failed
            // write or restore a draft that would duplicate the saved comment.
            if(read.ok===false)notice+=' Thread refresh failed. Reopen to refresh.';
            feedback={scope:op.scope,kind:op.kind,state:warning?'warning':'verified'};status(notice,warning);composer();
            if(typeof setTimeout==='function'){var terminal=feedback;feedbackTimer=setTimeout(function(){if(disposed||feedback!==terminal)return;feedbackTimer=null;feedback=null;composer();},1400);}
          }else composer();
        });});
      },function(err){return readablePending(op).then(function(){if(disposed||operation!==op)return;busy=false;operation=null;var message=api.error(err)||'Comment could not be saved. Your draft is still here.';if(err&&err.noReplay)reviews[op.scope]=message;if(op.scope===scope())status(message,true);composer();});});
    }
    function insert(before,after){var box=input(),start=box.selectionStart,end=box.selectionEnd;box.setRangeText(before+box.value.slice(start,end)+(after||''),start,end,'end');keepDraft();box.focus();}
    layout();
    el.addEventListener('input',function(e){if(e.target===input()){keepDraft();if(feedback)clearFeedback();if(error&&!reviews[scope()])status('');composer();input().focus();}if(e.target.matches('[data-pc-edit-input]'))edits[e.target.getAttribute('data-pc-edit-input')]=e.target.value;});
    el.addEventListener('keydown',function(e){if(e.target===input()&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save(false);}});
    el.addEventListener('click',function(e){
      var button=e.target.closest('button');if(!button||button.disabled||busy||confirming)return;var action=button.dataset.pc,key=button.dataset.id,row=key&&currentRows().find(function(r){return String(r.ID)===key;});
      if(button.dataset.format){var formats={bold:['**','**'],italic:['*','*'],strike:['~~','~~'],bullet:['\n- ',''],quote:['\n> ',''],code:['`','`'],link:['[','](https://)']};var f=formats[button.dataset.format];insert(f[0],f[1]);return;}
      if(button.dataset.emoji){insert(button.dataset.emoji,'');el.querySelector('.pc-emoji').hidden=true;return;}
      if(action==='emoji'){el.querySelector('.pc-emoji').hidden=!el.querySelector('.pc-emoji').hidden;return;}
      if(action==='preview'){keepDraft();preview=!preview;composer();return;}
      if(action==='send'){save(false);return;}
      if(action==='inline-cancel'){delete edits[key];editing='';status('');render();return;}
      if(action==='inline-save'){var inlineInput=el.querySelector('[data-pc-edit-input="'+key+'"]');save(false,inlineInput?inlineInput.value:'');return;}
      if(!row)return;
      if(action==='reply'){insert('\n> '+author(row,api.users())+': '+text(row.Comment).replace(/\r?\n/g,'\n> ')+'\n\n','');input().scrollIntoView({block:'center',behavior:'smooth'});return;}
      if(!canChange(row,api.currentUser(),null,ownerAliases())){status('The 24-hour editing window has ended.',true);render();return;}
      if(action==='edit'){editing=key;edits[key]=text(row.Comment);preview=false;status('');render();var editInput=el.querySelector('[data-pc-edit-input="'+key+'"]');if(editInput){editInput.focus();editInput.setSelectionRange(editInput.value.length,editInput.value.length);editInput.scrollIntoView({block:'center',behavior:'smooth'});}}
      if(action==='delete'){var deleteParent=active;confirming=true;composer();Promise.resolve().then(function(){return api.confirm();}).then(function(ok){confirming=false;composer();if(!ok||active!==deleteParent){if(button.isConnected!==false)button.focus();return;}keepDraft();editing=key;edits[key]=text(row.Comment);return save(true);},function(err){confirming=false;status(api.error(err)||'Could not confirm deletion.',true);composer();if(button.isConnected!==false)button.focus();});}
    });
    var timer=setInterval(function(){if(el.classList.contains('show')){keepDraft();render();}},30000);
    return {open:function(parentId){if(disposed)return Promise.resolve();keepDraft();clearFeedback();active=String(parentId);editing='';preview=false;rows=[];composer();return refresh();},destroy:function(){disposed=true;request++;clearInterval(timer);clearFeedback();if(holdTimer!=null&&typeof clearTimeout==='function')clearTimeout(holdTimer);if(releaseHold)releaseHold();holdTimer=null;releaseHold=null;}};
  }
  root.PFComments={mount:mount,create:create,identity:identity,author:author,canChange:canChange,ownerAliases:creatorOwnerAliases,timestamp:timestamp,markdown:markdown,color:color,id:id};
})(typeof module==='object'?module.exports:window);

