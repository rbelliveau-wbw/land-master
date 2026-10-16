import fs from 'node:fs';
const widgets=['budget-manager','manage-lots','contract-management','tax-center','land-master','milestone-gantt','settings-manager','proforma-manager','lot-sales-explorer','forecast-manager'];
for(const slug of widgets)for(const file of ['interaction-motion.js','interaction-motion.css','interaction-surfaces.js'])fs.copyFileSync('shared/'+file,'widgets/'+slug+'/src/app/'+file);
console.log('Synced repository interaction motion to all ten widgets.');
