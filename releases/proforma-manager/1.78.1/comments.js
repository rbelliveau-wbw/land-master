(function(root){
  'use strict';
  var DAY=86400000;
  function text(v){if(v&&typeof v==='object')return String(v.username||v.user_name||v.email||v.display_value||v.name||'');return String(v==null?'':v);}
  function identity(v){return text(v).trim().toLowerCase().split('@')[0];}
  function escape(s){return text(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function truth(v){return v===true||v==='true';}
  function id(v){return v&&typeof v==='object'?String(v.ID||v.id||''):String(v||'');}
  // Creator returns application-local dates without an offset. Resolve Chicago's
  // actual offset for the record date, including DST, rather than the viewer's zone.
  function timestamp(v){
    var s=text(v).trim();if(!s)return NaN;
    if(/(?:Z|[+-]\d\d:\d\d)$/.test(s))return Date.parse(s);
    var m=s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})[ T](\d{1,2}):(\d\d)(?::(\d\d))?(?:\s*(AM|PM))?$/i);
    if(!m)return NaN;
    var month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[2]);if(month<0)return NaN;
    var hour=+m[4],meridiem=(m[7]||'').toUpperCase();
    if(meridiem){hour=hour%12+(meridiem==='PM'?12:0);}
    var wall=Date.UTC(+m[3],month,+m[1],hour,+m[5],+(m[6]||0)),guess=wall;
    var fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    for(var n=0;n<3;n++){var p={};fmt.formatToParts(new Date(guess)).forEach(function(x){p[x.type]=x.value;});var shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=wall-shown;}
    return guess;
  }
  function author(row,users){
    var login=text(row.User||row.Added_User),key=identity(login);
    var match=(users||[]).find(function(u){return [u.user,u.username,u.email,u.label].some(function(v){return identity(v)===key&&key;});});
    return text(match&&(match.Full_Name||match.fullName)).trim()||text(row.Author_Name).trim()||login||'Unknown user';
  }
  function canChange(row,current,now){var age=(now==null?Date.now():now)-timestamp(row.Added_Time),me=identity(current),added=text(row.Added_User).trim(),owner=identity(added)===me&&me;if(!owner&&(!added||/\s/.test(added)))owner=identity(row.User)===me&&me;return !truth(row.Deleted)&&owner&&Number.isFinite(age)&&age>=0&&age<DAY;}
  function color(login){var hash=0;for(var c of identity(login))hash=(hash*31+c.charCodeAt(0))|0;return ['blue','violet','teal','amber','rose','indigo'][Math.abs(hash)%6];}
  function initials(name){return name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(function(s){return s[0].toUpperCase();}).join('')||'?';}
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
    var active='',rows=[],drafts={},edits={},loading=false,error='',busy=false,search='',request=0,editing='',preview=false;
    function currentRows(){return rows.filter(function(r){return id(r.Pro_Forma)===active;});}
    function status(message,bad){error=bad?(message||''):'';el.querySelector('.pc-status').textContent=message||'';el.querySelector('.pc-status').classList.toggle('error',!!bad);}
    function layout(){el.innerHTML='<section class="pc-thread"><header class="pc-header"><div><span class="pc-kicker">PRO FORMA DISCUSSION</span><h1>Comments <span class="pc-count"></span></h1></div><div class="pc-tools"><input type="search" class="pc-search" aria-label="Search comments" placeholder="Search comments"><button type="button" class="btn" data-pc="refresh" title="Refresh comments">↻ Refresh</button></div></header><div class="pc-status" role="status" aria-live="polite"></div><div class="pc-messages" aria-label="Comment thread"></div><div class="pc-compose"><div class="pc-composer-head"><span class="pc-compose-name"></span><span class="pc-edit-label"></span></div><div class="pc-toolbar" role="toolbar" aria-label="Comment formatting"><button type="button" data-format="bold" title="Bold" aria-label="Bold"><b>B</b></button><button type="button" data-format="italic" title="Italic" aria-label="Italic"><i>I</i></button><button type="button" data-format="strike" title="Strikethrough" aria-label="Strikethrough"><s>S</s></button><span></span><button type="button" data-format="bullet" title="Bulleted list" aria-label="Bulleted list">• List</button><button type="button" data-format="quote" title="Quote" aria-label="Quote">❝</button><button type="button" data-format="code" title="Inline code" aria-label="Inline code">&lt;/&gt;</button><button type="button" data-format="link" title="Link" aria-label="Insert link">↗</button><button type="button" data-pc="emoji" aria-label="Insert emoji">☺</button><button type="button" class="pc-preview-toggle" data-pc="preview">Preview</button></div><div class="pc-emoji" hidden>'+['😀','👍','🎉','✅','👀','💡','⚠️','🙏','🚀','❤️'].map(function(e){return '<button type="button" data-emoji="'+e+'">'+e+'</button>';}).join('')+'</div><textarea class="pc-input" aria-label="Comment" placeholder="Write a comment…" maxlength="60000"></textarea><div class="pc-preview" hidden></div><footer class="pc-compose-footer"><span>Ctrl / ⌘ + Enter to post</span><div><button type="button" class="btn" data-pc="cancel" hidden>Cancel edit</button><button type="button" class="btn primary" data-pc="send">Post comment ↗</button></div></footer></div></section>';}
    function input(){return el.querySelector('.pc-input');}
    function keepDraft(){if(editing)edits[editing]=input().value;else if(active)drafts[active]=input().value;}
    function composer(){var me=api.currentUser(),name=author({User:me},api.users());el.querySelector('.pc-compose-name').textContent=name;el.querySelector('.pc-edit-label').textContent=editing?'Editing comment':'';var draft=editing?(edits[editing]||''):(drafts[active]||'');if(input().value!==draft)input().value=draft;input().disabled=busy||!me;el.querySelector('[data-pc="send"]').disabled=busy||!me||loading;el.querySelector('[data-pc="send"]').textContent=busy?'Saving…':editing?'Save changes':'Post';input().hidden=preview;el.querySelector('.pc-preview').hidden=!preview;el.querySelector('.pc-preview').innerHTML=markdown(input().value);}
    function render(){
      var list=el.querySelector('.pc-messages'),all=currentRows(),filtered=all.filter(function(r){return (author(r,api.users())+' '+(truth(r.Deleted)?'Deleted by user':text(r.Comment))).toLowerCase().includes(search.toLowerCase());});
      el.querySelector('.pc-count').textContent=all.length;var html='',day='',previous=null;
      filtered.forEach(function(r){var name=author(r,api.users()),stamp=timestamp(r.Added_Time),d=Number.isFinite(stamp)?new Date(stamp):null,date=d?d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'Date unavailable';
        if(date!==day){html+='<div class="pc-day"><span>'+escape(date)+'</span></div>';day=date;previous=null;}
        var grouped=previous&&identity(previous.User||previous.Added_User)===identity(r.User||r.Added_User)&&stamp-timestamp(previous.Added_Time)<300000;
        var deleted=truth(r.Deleted),owned=canChange(r,api.currentUser()),tone=color(r.User||r.Added_User),time=d?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'';
        html+='<article class="pc-message pc-'+tone+(grouped?' grouped':'')+(deleted?' deleted':'')+'" id="comment-'+escape(r.ID)+'" data-comment-id="'+escape(r.ID)+'"><div class="pc-avatar" aria-hidden="true">'+escape(initials(name))+'</div><div class="pc-message-main"><div class="pc-meta"><b>'+escape(name)+'</b><time title="'+escape(d?d.toLocaleString():r.Added_Time)+'">'+escape(time)+'</time>'+(truth(r.Edited)&&!deleted?'<span class="pc-edited" title="Last modified: '+escape(r.Modified_Time)+'">(edited)</span>':'')+'</div><div class="pc-body">'+(deleted?'<em>Deleted by user</em>':markdown(r.Comment))+'</div></div><div class="pc-actions">'+(!deleted?'<button type="button" data-pc="reply" data-id="'+escape(r.ID)+'" title="Reply with quote">Reply</button>':'')+'<button type="button" data-pc="copy" data-id="'+escape(r.ID)+'" title="Copy comment">Copy</button>'+(owned?'<button type="button" data-pc="edit" data-id="'+escape(r.ID)+'">Edit</button><button type="button" data-pc="delete" data-id="'+escape(r.ID)+'">Delete</button>':'')+'</div></article>';previous=r;
      });list.innerHTML=loading&&!all.length?'<div class="pc-empty">Loading comments…</div>':html||'<div class="pc-empty">'+(error?'Comments unavailable':search?'No matching comments':'Start the conversation')+'</div>';composer();
    }
    function refresh(){var pf=active,seq=++request;loading=true;error='';render();return api.load(pf).then(function(result){if(seq!==request||pf!==active)return;rows=(result||[]).filter(function(r){return id(r.Pro_Forma)===pf;}).sort(function(a,b){var t=timestamp(a.Added_Time)-timestamp(b.Added_Time);return t||String(a.ID).localeCompare(String(b.ID),undefined,{numeric:true});});loading=false;status('');render();},function(err){if(seq!==request||pf!==active)return;loading=false;status(api.error(err)||'Could not load comments.',true);render();});}
    function save(deleting){
      var row=editing&&currentRows().find(function(r){return String(r.ID)===editing;}),value=input().value.trim(),pf=active,editId=editing;
      if(busy)return Promise.resolve();if(editing&&(!row||!canChange(row,api.currentUser()))){status('Only the author can change a comment within 24 hours of posting.',true);return Promise.resolve();}
      if(!deleting&&new TextEncoder().encode(value).length>60000){status('Comment is too long. Shorten it before posting.',true);return Promise.resolve();}
      if(!deleting&&!value){status('Write a comment first.',true);return Promise.resolve();}
      keepDraft();busy=true;error='';composer();
      var op=Promise.resolve().then(function(){return editId?api.update(editId,deleting?{Deleted:true,Comment:'Deleted by user'}:{Comment:value}):api.add({Pro_Forma:pf,Comment:value});});
      return op.then(function(){if(pf===active){if(editId)delete edits[editId];else delete drafts[pf];editing='';preview=false;}busy=false;if(pf===active)return refresh();},function(err){busy=false;status(api.error(err)||'Comment could not be saved. Your draft is still here.',true);composer();});
    }
    function insert(before,after){var box=input(),start=box.selectionStart,end=box.selectionEnd;box.setRangeText(before+box.value.slice(start,end)+(after||''),start,end,'end');keepDraft();box.focus();}
    layout();
    el.addEventListener('input',function(e){if(e.target===input()){keepDraft();if(error){status('');composer();input().focus();}}if(e.target.matches('.pc-search')){search=e.target.value;render();}});
    el.addEventListener('keydown',function(e){if(e.target===input()&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save(false);}});
    el.addEventListener('click',function(e){
      var button=e.target.closest('button');if(!button)return;var action=button.dataset.pc,key=button.dataset.id,row=key&&currentRows().find(function(r){return String(r.ID)===key;});
      if(button.dataset.format){var formats={bold:['**','**'],italic:['*','*'],strike:['~~','~~'],bullet:['\n- ',''],quote:['\n> ',''],code:['`','`'],link:['[','](https://)']};var f=formats[button.dataset.format];insert(f[0],f[1]);return;}
      if(button.dataset.emoji){insert(button.dataset.emoji,'');el.querySelector('.pc-emoji').hidden=true;return;}
      if(action==='emoji'){el.querySelector('.pc-emoji').hidden=!el.querySelector('.pc-emoji').hidden;return;}
      if(action==='preview'){keepDraft();preview=!preview;composer();return;}
      if(action==='refresh'){keepDraft();refresh();return;}
      if(action==='send'){save(false);return;}
      if(action==='cancel'){editing='';preview=false;status('');composer();return;}
      if(!row)return;
      if(action==='reply'){insert('\n> '+author(row,api.users())+': '+text(row.Comment).replace(/\r?\n/g,'\n> ')+'\n\n','');input().scrollIntoView({block:'center',behavior:'smooth'});return;}
      if(action==='copy'){var copy=truth(row.Deleted)?'Deleted by user':text(row.Comment);if(navigator.clipboard)navigator.clipboard.writeText(copy).then(function(){status('Copied.');},function(){status('Copy unavailable in this browser.',true);});else status('Copy unavailable in this browser.',true);return;}
      if(!canChange(row,api.currentUser())){status('The 24-hour editing window has ended.',true);render();return;}
      if(action==='edit'){keepDraft();editing=key;edits[key]=text(row.Comment);preview=false;status('');composer();input().focus();input().scrollIntoView({block:'center',behavior:'smooth'});}
      if(action==='delete'){var deleteParent=active;api.confirm().then(function(ok){if(!ok||active!==deleteParent)return;keepDraft();editing=key;edits[key]=text(row.Comment);save(true);});}
    });
    var timer=setInterval(function(){if(el.classList.contains('show')){keepDraft();render();}},30000);
    return {open:function(pf){keepDraft();active=String(pf);editing='';preview=false;rows=[];search='';el.querySelector('.pc-search').value='';composer();return refresh();},destroy:function(){clearInterval(timer);}};
  }
  root.PFComments={mount:mount,identity:identity,author:author,canChange:canChange,timestamp:timestamp,markdown:markdown,color:color};
})(typeof module==='object'?module.exports:window);
