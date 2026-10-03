import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'knowledge','design');
const index=path.join(directory,'README.md');
const agents=path.join(root,'AGENTS.md');
const decoder=new TextDecoder('utf-8',{fatal:true});
function readable(file){
  assert.ok(fs.statSync(file).isFile(),`${path.relative(root,file)} must be a file`);
  const text=decoder.decode(fs.readFileSync(file));
  assert.ok(text.trim(),`${path.relative(root,file)} must be readable nonempty UTF-8`);
  return text;
}
function contained(base,target){const relative=path.relative(base,target);return relative!== '..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
function resolveLocal(file,raw){
  let target=raw.trim();
  if(target.startsWith('<')&&target.endsWith('>'))target=target.slice(1,-1);
  assert.ok(!/\s+['"]/.test(target),'Design links must have a plain unambiguous target');
  target=decodeURIComponent(target.split('#')[0]);
  if(!target)return null;
  assert.ok(!/^[a-z][a-z\d+.-]*:/i.test(target)&&!/^[/\\~]/.test(target)&&!target.includes('\\'),'Design links must use repository-relative local paths');
  const absolute=path.resolve(path.dirname(file),target);
  assert.ok(contained(root,absolute),'Design links must remain inside the repository');
  return absolute;
}
function links(text){return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match=>match[1]);}
function discover(folder){
  return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(folder,entry.name);
    assert.ok(!entry.isSymbolicLink(),'Design discovery must not follow links outside the repository');
    return entry.isDirectory()?discover(file):entry.isFile()&&entry.name.toLowerCase().endsWith('.md')?[file]:[];
  }).sort();
}

const documents=discover(directory);
assert.ok(documents.includes(index),'The design directory needs a README index');
const indexed=new Set();
for(const raw of links(readable(index))){
  const target=resolveLocal(index,raw);if(!target)continue;readable(target);
  if(contained(directory,target)&&target.toLowerCase().endsWith('.md'))indexed.add(target);
}
for(const document of documents){
  const text=readable(document);
  if(document!==index)assert.ok(indexed.has(document),`${path.relative(root,document)} must be discoverable from the design index`);
  for(const raw of links(text)){
    // External reference sources may appear in a guide; component discovery is local.
    if(/^https?:\/\//i.test(raw))continue;
    const target=resolveLocal(document,raw);if(target)readable(target);
  }
}
const agentText=readable(agents),agentTargets=new Set();
for(const raw of links(agentText)){
  if(/^https?:\/\//i.test(raw))continue;
  const target=resolveLocal(agents,raw);if(target){readable(target);agentTargets.add(target);}
}
for(const name of ['README.md','attachments.md','comments.md'])assert.ok(agentTargets.has(path.join(directory,name)),`AGENTS.md must directly link the relevant ${name} guide`);

// Path guards reject unintended outside targets before touching those files.
for(const unsafe of ['../../../outside.md','C:/outside.md','/outside.md','\\\\server\\share\\outside.md','file:///outside.md','%2e%2e/%2e%2e/%2e%2e/outside.md'])assert.throws(()=>resolveLocal(index,unsafe),/repository|relative/);
assert.equal(resolveLocal(index,'attachments.md#appearance'),path.join(directory,'attachments.md'));
assert.equal(resolveLocal(index,'#updating-a-design'),null);
console.log(`PASS: ${documents.length-1} design guides discovered, indexed and readable; local guide/index/AGENTS links stay inside the repository. This is a documentation check, not visual verification.`);
