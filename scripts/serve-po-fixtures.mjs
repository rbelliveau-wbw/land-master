import http from 'node:http';
import fs from 'node:fs';
const paths=new Map([
 ['/purchase-orders.html','scripts/fixtures/purchase-orders.html'],['/approval-policies.html','scripts/fixtures/approval-policies.html'],
 ...['po-domain.js','po-controller.js','po-ui.js','purchase-orders.css'].map(f=>['/'+f,'widgets/budget-manager/src/app/'+f]),
 ...['approval-policy-domain.js','approval-admin.js','approval-admin.css'].map(f=>['/'+f,'widgets/settings-manager/src/app/'+f])
]);
http.createServer((req,res)=>{const file=paths.get(new URL(req.url,'http://127.0.0.1').pathname);if(!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}).listen(32189,'127.0.0.1',()=>console.log('Local PO fixtures: http://127.0.0.1:32189/purchase-orders.html'));
