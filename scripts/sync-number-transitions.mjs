import fs from 'node:fs';
const widgets=['budget-manager','manage-lots','contract-management','tax-center','land-master','milestone-gantt','settings-manager'];
for(const widget of widgets)for(const file of ['number-transitions.js','number-transitions.css','number-surfaces.js'])fs.copyFileSync('shared/'+file,'widgets/'+widget+'/src/app/'+file);
console.log('Synced canonical number transitions to seven adopted widgets.');
