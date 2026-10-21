// Local installation bundle, deliberately OUTSIDE public dist/ hosting output.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=process.cwd(),config=JSON.parse(fs.readFileSync('widgets/crew-locations/widget.config.json','utf8')),version=config.version;
const variant=process.argv[2]||'';if(variant&&!/^[a-z][a-z0-9-]{0,40}$/.test(variant))throw new Error('Bundle variant must be a short lowercase label.');
const outputRoot=path.resolve(root,'..','outputs'),directory=path.join(outputRoot,'crew-locations-'+version+(variant?'-'+variant:'')),zip=directory+'-install.zip';
if(path.dirname(directory)!==outputRoot||!directory.startsWith(path.dirname(root)+path.sep))throw new Error('Installation output must stay in the named workspace outputs directory.');
if(fs.existsSync(directory)||fs.existsSync(zip))throw new Error('Installation bundle already exists; preserve its snapshot and use a new version.');
const widgetZip=path.join(root,'dist','creator-packages','crew-locations.zip');if(!fs.existsSync(widgetZip))throw new Error('Run npm run package:creator -- crew-locations first.');
fs.mkdirSync(directory,{recursive:true});
function copy(relative){const destination=path.join(directory,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.cpSync(path.join(root,relative),destination,{recursive:true});}
for(const relative of ['creator/crew-locations','widgets/crew-locations','manifests/crew-locations.json','knowledge/modules/crew-locations.md','knowledge/design/crew-scheduling.md','scripts/test-crew-locations.mjs','scripts/fixtures/crew-locations.mjs','scripts/fixtures/crew-browser-checks.js','scripts/preview-crew-locations.mjs','scripts/prepare-crew-locations.mjs','scripts/sync-crew-locations-shared.mjs','scripts/package-crew-locations.mjs'])copy(relative);
for(const file of ['creator-data.js','success-feedback.js','interaction-motion.js','interaction-motion.css','interaction-surfaces.js','number-transitions.js','number-transitions.css','number-edit-commit.js'])copy('shared/'+file);
for(const file of ['runtime-context.js','critical-error-reporter.js'])copy('widgets/milestone-gantt/src/app/'+file);
for(const file of fs.readdirSync('creator/functions').filter(name=>/^crewLocations.*\.dg$/.test(name)))copy('creator/functions/'+file);
fs.copyFileSync(widgetZip,path.join(directory,'crew-locations-widget.zip'));
const preview=path.join(outputRoot,'crew-locations-review','crew-locations-testing-preview.png');if(fs.existsSync(preview))fs.copyFileSync(preview,path.join(directory,'isolated-preview.png'));
fs.writeFileSync(path.join(directory,'README.txt'),'Crew Locations '+version+(variant?' / '+variant:'')+' — Creator-only scheduling build\r\n\r\nStart with creator/crew-locations/INSTALL.md and native-install-progress.json.\r\nUpload crew-locations-widget.zip only after the schema, server functions,\r\nvalidation workflows, logged-in-user connection and environment-specific Custom API are installed.\r\nTesting mode is off; outbound Projects writes remain disabled. Creator support-component publication and\r\nservice activation status are recorded separately in native-install-progress.json.\r\nThis bundle does not enable Projects push or promote the frontend widget.\r\nNative compilation and integration status is recorded in verification.json.\r\nBrowser fixtures are outside the deployable widget source and ZIP.\r\n');
const checksums={};function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else checksums[path.relative(directory,file).replaceAll('\\','/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}walk(directory);fs.writeFileSync(path.join(directory,'checksums.json'),JSON.stringify(checksums,null,2)+'\n');
const entries=fs.readdirSync(directory);
if(process.platform==='win32')execFileSync('tar.exe',['-a','-c','-f',zip,...entries],{cwd:directory,stdio:'inherit'});
else execFileSync('zip',['-qr',zip,'.'],{cwd:directory,stdio:'inherit'});
console.log('Created local installation bundle: '+zip);
