import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const source=fs.readFileSync(path.join(root,'shared/creator-data.js'));
for(const widget of ['budget-manager','land-master','lot-sales-explorer','milestone-gantt','settings-manager','manage-lots','tax-center','proforma-manager','contract-management'])fs.writeFileSync(path.join(root,'widgets',widget,'src/app/creator-data.js'),source);
console.log('Synced canonical Creator data adapter for all nine widget sources.');
