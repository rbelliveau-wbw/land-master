import fs from 'node:fs';
import path from 'node:path';
// Tests load the deployed-source candidate directly, never a source transform.
const argument=process.argv.find(value=>value.startsWith('--app-root='));
export const appRoot=argument?argument.slice('--app-root='.length):'widgets/tax-center/src/app';
export const source=fs.readFileSync(path.join(appRoot,'widget.html'),'utf8');
export const baseline=fs.readFileSync('releases/tax-center/19.17.4/index.html','utf8');
export const readTaxScript=name=>fs.readFileSync(path.join(appRoot,name),'utf8');
export function extract(text,name){
 const start=text.lastIndexOf('function '+name+'(');if(start<0)throw new Error('Missing effective '+name);
 let depth=0;const brace=text.indexOf('{',start);
 for(let i=brace;i<text.length;i++){if(text[i]==='{')depth++;if(text[i]==='}')depth--;if(!depth)return text.slice(start,i+1);}
 throw new Error('Unclosed '+name);
}
