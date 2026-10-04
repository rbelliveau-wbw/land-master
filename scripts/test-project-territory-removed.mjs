import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app='widgets/land-master/src/app/',html=fs.readFileSync(app+'widget.html','utf8');
assert.doesNotMatch(html,/LMProjectTerritory|projectTerritoryMigration|projectTerritoryActive|Fill Project territories|project-territory\.(js|css)/);
for(const file of ['project-territory.js','project-territory.css'])assert.equal(fs.existsSync(app+file),false);
function extract(name){const start=html.indexOf('function '+name+'('),brace=html.indexOf('{',start);assert.ok(start>=0);let depth=0;for(let i=brace;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;if(!depth)return html.slice(start,i+1);}throw Error(name);}
const S={coreRefreshing:false,demo:false,panelDirty:false,panelSaving:false};let ready=true,actions=0,confirm;
const c=vm.createContext({S,LandData:{coreReady:()=>ready},setStatus(){},showAppConfirm:(...args)=>{confirm=args.at(-1)}});
for(const name of ['allowTableEdit','withDiscardConfirm'])vm.runInContext(extract(name),c);
assert.equal(c.allowTableEdit(),true);ready=false;assert.equal(c.allowTableEdit(),false);S.demo=true;assert.equal(c.allowTableEdit(),true);S.coreRefreshing=true;assert.equal(c.allowTableEdit(),false);
S.coreRefreshing=false;S.panelDirty=true;assert.equal(c.withDiscardConfirm('Fixture',()=>actions++),false);assert.equal(actions,0);confirm();assert.equal(actions,1);S.panelDirty=false;S.panelSaving=true;assert.equal(c.withDiscardConfirm('Fixture',()=>actions++),false);assert.equal(actions,1);S.panelSaving=false;c.withDiscardConfirm('Fixture',()=>actions++);assert.equal(actions,2);
console.log('PASS Territory-fill removal: no button, loaded asset, mount or bulk write path; normal core/draft/save guards preserved.');
