// Local-only desktop previews. Actual widget modules, isolated in-memory data.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const port=Number(process.argv[2]||32194),repo=process.cwd();
const previewOutput=path.resolve(process.argv[3]||'tmp/po-outcome-email-preview');
const settingsRoot=path.join(repo,'widgets/settings-manager/src/app');
const existingFixture=fs.readFileSync('scripts/test-settings-workspace.mjs','utf8');
const start=existingFixture.indexOf('function installFixture(){'),end=existingFixture.indexOf('\nconst source=',start);
assert.ok(start>=0&&end>start,'The existing isolated Settings fixture remains available');
const installFixture=existingFixture.slice(start,end);
const contactSetup=`
window.fixture.record.PO_Approved_Recipients=[{ID:'32',zc_display_value:'Morgan Ellis'},{ID:'35',zc_display_value:'Sokha Sim'},{ID:'36',zc_display_value:'Kimberly M. Singer'},{ID:'37',zc_display_value:'Michael Wilson'}];
window.fixture.record.PO_Rejected_Recipients=[{ID:'32',zc_display_value:'Morgan Ellis'}];
window.fixture.reports.User_Access_Report.push(
 {ID:'35',Full_Name:'Sokha Sim',Approver_Email:'ssim@wbdevelopment.com',User:''},
 {ID:'36',Full_Name:'Kimberly M. Singer',Approver_Email:'kim.singer@wbdevelopment.com',User:''},
 {ID:'37',Full_Name:'Michael Wilson',Approver_Email:'mwilson@wbdevelopment.com',User:''}
);
document.addEventListener('DOMContentLoaded',()=>{const timer=setInterval(()=>{if(window.__settingsWorkspace?.state.ready){const button=document.querySelector('[data-jump="purchase-orders"]');if(button){clearInterval(timer);button.click();}}},50);setTimeout(()=>clearInterval(timer),10000);});
`;
const settingsSource=fs.readFileSync(path.join(settingsRoot,'widget.html'),'utf8');
assert.ok(settingsSource.includes('\nboot();'));
const settingsDocument=settingsSource.replace(/<script src="https:\/\/static\.zohocdn\.com\/creator\/widgets\/version\/2\.0\/widgetsdk-min\.js"><\/script>/,'<script>('+installFixture+')();\n'+contactSetup+'</script>').replace('\nboot();','\nwindow.__settingsWorkspace={state:S,controller:Controller,render:render};\nboot();');
assert.ok(!settingsDocument.includes('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js'),'Native SDK is never loaded by the fixture');
const type=file=>file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript';
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname==='/settings/'||url.pathname==='/settings/index.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(settingsDocument);return;}
  let filename;
  if(url.pathname==='/activity.html')filename=path.join(repo,'scripts/fixtures/po-email-activity.html');
  else if(url.pathname==='/approved-email.html')filename=path.join(previewOutput,'approved-email.html');
  else if(/^\/settings\/[a-z][a-z0-9.-]*\.(js|css)$/.test(url.pathname))filename=path.join(settingsRoot,path.basename(url.pathname));
  else if(/^\/widgets\/budget-manager\/src\/app\/[a-z][a-z0-9.-]*\.(js|css)$/.test(url.pathname))filename=path.join(repo,url.pathname.slice(1));
  if(!filename||!fs.existsSync(filename)){response.writeHead(404);response.end('Not Found');return;}
  response.writeHead(200,{'Content-Type':type(filename),'Cache-Control':'no-store'});response.end(fs.readFileSync(filename));
});
server.listen(port,'127.0.0.1',()=>console.log('Local-only previews:\nhttp://127.0.0.1:'+port+'/approved-email.html\nhttp://127.0.0.1:'+port+'/activity.html\nhttp://127.0.0.1:'+port+'/settings/'));
