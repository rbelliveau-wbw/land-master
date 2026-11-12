import fs from 'node:fs';
const widgets=["budget-manager","proforma-manager","tax-center","manage-lots","land-master","settings-manager","lot-sales-explorer","forecast-manager","milestone-gantt","crew-locations"];
for(const widget of widgets)fs.copyFileSync('shared/modal-layout.css','widgets/'+widget+'/src/app/modal-layout.css');
console.log('Synced fixed modal layouts.');
