import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeNative} from './verify-workflow-quota-native.mjs';
import {task,routes,changed,added,read} from './prepare-resumable-daily-exports.mjs';
export function verifyDaily(directory,environment){
 if(!['development','stage','production'].includes(environment))throw Error('Expected a Creator environment');
 const specs=[...changed,...added].map(name=>({name,suffix:'.dg',expected:'creator/functions/'+name+'.dg'})).concat(routes.map(name=>({name,suffix:'.ds',expected:task+'/workflows/'+name+'.ds'})));
 const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
 const components=specs.map(spec=>{const actual=normalizeNative(read(path.join(directory,spec.name+spec.suffix))),expected=normalizeNative(read(spec.expected));return {name:spec.name,expected_file:spec.expected,normalized_sha256:sha(actual),expected_normalized_sha256:sha(expected),match:actual===expected};});
 const result={environment,captured_from:'Native Creator Application IDE',components,match:components.every(c=>c.match)};
 if(!result.match)throw Error('Native parity failed: '+components.filter(c=>!c.match).map(c=>c.name).join(', '));
 fs.mkdirSync(task+'/verification',{recursive:true});fs.writeFileSync(task+'/verification/'+environment+'.json',JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=verifyDaily(process.argv[2],process.argv[3]);console.log('PASS: '+r.environment+' all '+r.components.length+' native functions and schedules match reviewed candidates.');}
