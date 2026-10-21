import fs from 'node:fs';
const target='widgets/crew-locations/src/app/';
for(const file of ['creator-data.js','success-feedback.js','interaction-motion.js','interaction-motion.css','interaction-surfaces.js','number-transitions.js','number-transitions.css','number-edit-commit.js'])fs.copyFileSync('shared/'+file,target+file);
for(const file of ['runtime-context.js','critical-error-reporter.js'])fs.copyFileSync('widgets/milestone-gantt/src/app/'+file,target+file);
console.log('Synced existing shared scheduling runtime into Crew Locations.');
