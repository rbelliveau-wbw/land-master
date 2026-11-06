// Execute the actual initial scope/deadline block with native-shaped dates.
// This verifies clock-domain conversion and state preservation, not the compiler.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('creator/functions/budgetPlanImportRun.dg','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('\t\tif(state.get("budgetScopeCaptured") != true)');
const end=source.indexOf('\n\t\tif(state.get("actualDeadline") == null',start);
assert.ok(start>=0&&end>start,'The test must execute the shipped initial capture block');
const captureBlock=source.slice(start,end)
  .replace(/Add_Budget\[ID != 0\]\.distinct\(Subdivision_Code\)/g,'fixtureBudgetCodes')
  .replace(/for each\s+mapping in External_System_Mapping\[External_System == "HeavyJob"\]/g,'for (const mapping of fixtureMappings)')
  .replace('capturedMapping = {"id":mapping.ID.toString(),"subdivision":"","code":""};','capturedMapping = new NativeMap({"id":mapping.ID.toString(),"subdivision":"","code":""});');
assert.doesNotMatch(captureBlock,/expiry\s*[><=]+\s*(?:run\.Started_At|zoho\.currenttime)/,'An external epoch cannot be compared with a native date number');

const CAPTURED_START=Date.parse('2026-11-06T04:35:18.000Z');
const CAPTURED_CHECK=Date.parse('2026-11-06T04:44:19.739Z');
const CAPTURED_EXPIRY=1793943799694;
function run({now=CAPTURED_CHECK,started=CAPTURED_START,expiry=String(CAPTURED_EXPIRY),nativeOffset=7200000,state={}}={}){
  const context=vm.createContext({fixtureNow:now,fixtureStarted:started,fixtureExpiry:expiry,fixtureOffset:nativeOffset,fixtureState:JSON.stringify(state)});
  vm.runInContext(`
    var utcConversions=0;
    function ifnull(value,fallback){return value==null?fallback:value;}
    class NativeMap{
      constructor(values={}){this.values=values;}
      get(key){return this.values[key]??null;}
      put(key,value){this.values[key]=value;}
      toJSON(){return this.values;}
    }
    function Map(){return new NativeMap();}
    function native(value){
      if(Array.isArray(value))return value.map(native);
      if(value&&typeof value==='object')return new NativeMap(Object.fromEntries(Object.entries(value).map(([key,item])=>[key,native(item)])));
      return value;
    }
    Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=function(){return this.length;};
    String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};
    String.prototype.toLong=function(){if(!/^[0-9]+$/.test(this))throw Error('Invalid native number');return Number(this);};
    String.prototype.toDateTime=function(format){
      if(format!=='MM/dd/yyyy hh:mm:ss a'||!/^native-date:[0-9]+$/.test(this))throw Error('Unexpected native date parse contract');
      return new NativeDate(Number(String(this).slice('native-date:'.length)));
    };
    String.prototype.unixEpoch=function(zone){
      if(zone!=='UTC')throw Error('UTC must be explicit');
      const match=String(this).match(/^(\\d{2})-([A-Z][a-z]{2})-(\\d{4}) (\\d{2}):(\\d{2}):(\\d{2})$/);
      if(!match)throw Error('Unexpected UTC date representation');
      const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      utcConversions++;
      return Date.UTC(+match[3],months.indexOf(match[2]),+match[1],+match[4],+match[5],+match[6]);
    };
    Number.prototype.toLong=function(){return Math.trunc(this);};
    class NativeDate{
      constructor(utc){this.utc=utc;}
      toLong(){return this.utc+fixtureOffset;}
      addMinutes(minutes){return new NativeDate(this.utc+minutes*60000);}
      toString(format,zone){
        const date=new Date(this.utc),pad=(value,width=2)=>String(value).padStart(width,'0');
        if(format==='dd-MMM-yyyy HH:mm:ss'&&zone==='UTC'){
          const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()];
          return pad(date.getUTCDate())+'-'+month+'-'+date.getUTCFullYear()+' '+pad(date.getUTCHours())+':'+pad(date.getUTCMinutes())+':'+pad(date.getUTCSeconds());
        }
        if(format==='MM/dd/yyyy hh:mm:ss a'&&zone==null)return 'native-date:'+Math.floor(this.utc/1000)*1000;
        throw Error('Unexpected date formatting contract');
      }
    }
    var zoho={currenttime:new NativeDate(fixtureNow)};
    var run={Started_At:new NativeDate(fixtureStarted)};
    var state=native(JSON.parse(fixtureState));
    if(state.get('requests')==null)state.put('requests',native([{view:'2107789000023687048',code:'1004',job:'original-completed-job',expiryTime:fixtureExpiry}]));
    var fixtureBudgetCodes=['LOR01'];
    var fixtureMappings=[{ID:'90071992547409960',External_Code:'C_LOR1',Subdivision1:{ID:'90071992547409961',Subdivision_Code:'LOR01'}}];
  `+captureBlock,context);
  return {state:JSON.parse(vm.runInContext('JSON.stringify(state)',context)),utcConversions:vm.runInContext('utcConversions',context)};
}

// Captured Production values: native checkpoint is two hours above UTC while
// the Analytics export really expires about 59 minutes after the source check.
assert.equal(CAPTURED_CHECK+7200000,1793947459739);
assert.ok(CAPTURED_EXPIRY<CAPTURED_CHECK+7200000,'The old mixed-clock comparison rejects this still-valid expiry');
const CAPTURED_SECOND=Math.floor(CAPTURED_CHECK/1000)*1000;
const expectedUtc=CAPTURED_SECOND+(Math.trunc((CAPTURED_EXPIRY-CAPTURED_SECOND)/60000)-5)*60000;
for(const nativeOffset of [0,7200000,-18000000]){
  const result=run({nativeOffset});
  assert.equal(result.state.actualDeadline,expectedUtc+nativeOffset,'Only the native representation changes; source lifetime does not');
  assert.ok(CAPTURED_EXPIRY-(result.state.actualDeadline-nativeOffset)>=5*60000,'The source safety margin is at least five minutes');
  assert.equal(result.utcConversions,2);
  assert.equal(result.state.requests[0].job,'original-completed-job');
  assert.equal(result.state.budgetScopeCaptured,true);
  assert.equal(result.state.budgetMappings.C_LOR1.subdivision,'90071992547409961');
}
for(const expiry of [null,'','not-an-epoch','179394379969','17939437996940','0000000000000',String(CAPTURED_START),String(CAPTURED_START-1),String(CAPTURED_SECOND+65*60000+1)]){
  assert.equal(run({expiry}).state.actualDeadline,CAPTURED_START+55*60000+7200000,'Invalid or out-of-bound expiry retains the existing conservative fallback: '+expiry);
}
const boundary=run({expiry:String(CAPTURED_SECOND+65*60000)});
assert.equal(boundary.state.actualDeadline,CAPTURED_SECOND+60*60000+7200000,'The documented source-lifetime upper bound is inclusive');
for(const fraction of [0,1,739,999]){
  const result=run({now:CAPTURED_SECOND+fraction,expiry:String(CAPTURED_SECOND+60*60000)});
  assert.equal(result.state.actualDeadline,CAPTURED_SECOND+55*60000+7200000,'Whole-second UTC parsing and native translation share the same normalized base');
  assert.equal(CAPTURED_SECOND+60*60000-(result.state.actualDeadline-7200000),5*60000,'Fractional native time cannot consume any of the five-minute margin');
}
for(const expiry of [String(CAPTURED_CHECK),String(CAPTURED_CHECK-60000),String(CAPTURED_CHECK+4*60000)]){
  const result=run({expiry});
  assert.ok(result.state.actualDeadline<=CAPTURED_CHECK+7200000,'An expired or nearly expired source cannot receive a fresh fallback window');
}
const existing={budgetScopeCaptured:true,actualDeadline:1793954118000,actualDeadlineAt:'11/06/2026 12:35:18 AM',actualPhase:'preflight',actualIndex:1250,requests:[{job:'existing-owned-job'}]};
const inFlight=run({state:existing,expiry:'invalid'});
assert.deepEqual(inFlight.state,existing,'A captured in-flight deadline, cursor and source remain untouched');
assert.equal(inFlight.utcConversions,0,'In-flight runs never recalculate source deadlines');
console.log('PASS: HCSS budget UTC expiry conversion, captured two-hour native offset, source bounds/fallback, expired-source refusal and unchanged in-flight deadlines.');
