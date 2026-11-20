(function(root){
  'use strict';
  function text(value){return String(value==null?'':value).trim();}
  function email(value){
    var s=text(value),parts=s.split('@');
    if(!s)return true;
    if(parts.length!==2||parts[0].length>64||!parts[0]||/^\.|\.$|\.\./.test(parts[0]))return false;
    if(!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(parts[0]))return false;
    var labels=parts[1].split('.');
    return labels.length>1&&labels.every(function(label){return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label);});
  }
  function phone(value){
    var s=text(value);if(!s)return true;
    if(!/^\+?[\d\s().-]+$/.test(s))return false;
    var digits=s.replace(/\D/g,'');
    return /^\d{10}$/.test(digits)||/^1\d{10}$/.test(digits);
  }
  function date(value){
    var s=text(value);if(!s)return true;
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m){var us=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(us)m=[s,us[3],us[1],us[2]];}
    if(!m||+m[1]<1000)return false;
    var d=new Date(+m[1],+m[2]-1,+m[3]);
    return d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3];
  }
  function record(form,row,keys,normalizeNumber,choiceOverrides){
    var rules=root.LMPFInputRules[form],out=[];
    (keys||Object.keys(row||{})).forEach(function(key){
      var rule=rules[key],raw=row&&row[key],s=text(raw);if(!rule)return;
      if(rule.type==='text'&&rule.max&&String(raw==null?'':raw).length>rule.max){out.push(rule.label+': must be '+rule.max+' characters or fewer.');return;}
      if(!s)return;
      var message='',numeric=/^(number|decimal|USD|percentage)$/.test(rule.type);
      if(numeric){
        var n=normalizeNumber?normalizeNumber(raw):s;
        if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(n)||!Number.isFinite(Number(n)))message='enter a valid number.';
        else if(rule.type==='number'&&!Number.isInteger(Number(n)))message='must be a whole number.';
        else if(rule.type==='number'&&!Number.isSafeInteger(Number(n)))message='is too large to save accurately.';
        else if(n.replace(/^\+/,'').replace(/^(-?)0+(?=\d)/,'$1').replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'').length>rule.max)message='exceeds the '+rule.max+'-character numeric limit.';
      } else if(rule.max&&s.length>rule.max)message='must be '+rule.max+' characters or fewer.';
      if(!message&&rule.type==='email'&&!email(s))message='enter one valid email address (name@example.com).';
      if(!message&&rule.type==='phonenumber'&&!phone(s))message='enter a 10-digit US phone number, optionally with country code 1.';
      if(!message&&rule.type==='date'&&!date(s))message='enter a valid calendar date.';
      if(!message&&rule.type==='url'){
        try{var u=new URL(s);if(!/^https?:$/.test(u.protocol)||!u.hostname||/\s/.test(s))message='enter a complete http:// or https:// URL.';}catch(e){message='enter a complete http:// or https:// URL.';}
      }
      if(!message&&rule.type==='textarea'&&new TextEncoder().encode(s).length>65535)message='exceeds the 64 KB text limit.';
      var choices=choiceOverrides&&Object.prototype.hasOwnProperty.call(choiceOverrides,key)?choiceOverrides[key]:rule.choices;
      if(!message&&choices&&choices.indexOf(s)<0)message='choose a supported value.';
      if(message)out.push(rule.label+': '+message);
    });
    return out;
  }
  root.LMPFInputValidation={record:record,email:email,phone:phone,date:date};
})(window);
