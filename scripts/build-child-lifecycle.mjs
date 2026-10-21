// Scoped native parent-delete actions. No detached-record sweeps or schedules.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const directory='creator/workflows/child-lifecycle';
export const rules=[
  {parent:'Add_Pro_Forma',groups:[
    {form:'Land_Installments',owners:['Pro_Forma','Pro_Forma2','Pro_Forma_PID_MUD'],grids:['Land_Purchase_Installments','Land_Sale_Installments','PID_MUD']},
    {form:'Proforma_Item',owners:['Pro_Forma_Const','Pro_Forma_Dev'],grids:['Additional_Costs_Construction','Additional_Costs_Development'],flags:['Template_Item']},
    {form:'Construction_Curve',owners:['Pro_Forma'],grids:['Construction_Curve'],other:['Settings'],flags:['Template_Item']},
    {form:'Proforma_Phase',owners:['Pro_Forma'],grids:['Phases1']},
    {form:'Proforma_Months',owners:['Proforma'],grids:['Months']},
    {form:'Lot_Mix_Row',owners:['Pro_Forma'],grids:[]},
    {form:'Attachment',owners:['Pro_Forma'],grids:[],other:['Contract1','Budget','Payment_Request','Budget_Modification']},
    {form:'Comment_Log',owners:['Pro_Forma'],grids:[],other:['Contract1','Budget','Project']}
  ]},
  {parent:'Contract',groups:[
    {form:'Contract_Pricing',owners:['Contract1'],grids:['Pricing']},
    {form:'Contract_Actions',owners:['Contract1'],grids:['Contract_Actions'],other:['Type_field'],flags:['Template_Action'],constructionTypeIsClassification:true},
    {form:'Contract_Approvals',owners:['Contract1'],grids:['Approvals1'],other:['Contract_Template']},
    {form:'Redline_Review',owners:['Contract1'],grids:['Redlines']},
    {form:'Attachment',owners:['Contract1'],grids:['Contract_Versions'],other:['Budget','Pro_Forma','Payment_Request','Budget_Modification']},
    {form:'Comment_Log',owners:['Contract1'],grids:[],other:['Budget','Pro_Forma','Project']}
  ]},
  ...[
    ['Subdivision','Subdivision1',['Builder_Takedown1','Takedown_Template1']],
    ['Builder_Takedown','Builder_Takedown1',['Subdivision1','Takedown_Template1']],
    ['Takedown_Template','Takedown_Template1',['Subdivision1','Builder_Takedown1']]
  ].map(([parent,owner,other])=>({parent,groups:[{form:'Additional_Items',owners:[owner],grids:['Additional_Items'],other}]}))
];

function sharedGuards(group,owner,alias,indent){
  return [indent+'sharedChild = false;',
    ...group.owners.filter(x=>x!==owner).map(x=>indent+`if(${alias}.${x} != null && ${alias}.${x} != input.ID) { sharedChild = true; }`),
    ...(group.other||[]).map(x=>group.constructionTypeIsClassification&&x==='Type_field'
      ?indent+`if(${alias}.${x} != null) { if(input.Work_Module != "Construction" || ${alias}.Work_Module != "Construction") { sharedChild = true; } }`
      :indent+`if(${alias}.${x} != null) { sharedChild = true; }`),
    ...(group.flags||[]).map(x=>indent+`if(${alias}.${x} != false) { sharedChild = true; }`)];
}
export function action(rule){
  const lines=[`// ${rule.parent} / Deleted / Validations on record deletion.`,
    '// No global orphan sweep. Only this parent\'s saved children are eligible.'];
  if(rule.parent==='Add_Pro_Forma')lines.push('if(input.ID != null && LOI_Worksheet[Proforma == input.ID].count() > 0)', '{', '\talert "This Pro Forma has LOI records. Archive it instead.";', '\tcancel delete;', '}');
  lines.push('if(input.ID != null)', '{');
  let i=0;
  for(const group of rule.groups){
    i++;
    for(const owner of group.owners){
      const row='storedRow'+i;
      lines.push(`\tfor each ${row} in ${group.form}[${owner} == input.ID]`, '\t{');
      const indent='\t\t';
      lines.push(...sharedGuards(group,owner,row,indent),`${indent}if(!sharedChild)`,`${indent}{`,`${indent}\tdelete from ${group.form}[ID == ${row}.ID && ${owner} == input.ID];`,`${indent}}`);
      lines.push('\t}');
    }
  }
  lines.push('}','');
  return lines.join('\n');
}
export function generate(){
  fs.mkdirSync(directory,{recursive:true});
  for(const rule of rules)fs.writeFileSync(path.join(directory,`${rule.parent}.delete.dg`),action(rule));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generate();
