'use strict';
// Pinned, same-origin renderer and embedded fonts. Budget data never goes to a
// conversion service. Worker errors reach the existing export error surface.
var replied=false;
function fail(error){if(replied)return;replied=true;self.postMessage({ok:false,error:error&&error.message||'The PDF could not be generated.'});}
self.addEventListener('unhandledrejection',function(event){event.preventDefault();fail(event.reason);});
self.onmessage=function(event){
  try{
    importScripts('vendor/pdfmake-0.2.20.min.js','vendor/pdfmake-0.2.20-fonts.js','full-budget-export.js'+self.location.search,'budget-snapshot-pdf.js'+self.location.search);
    var documentDefinition=BudgetSnapshotPdf.definition(event.data);
    pdfMake.createPdf(documentDefinition).getBuffer(function(buffer){
      if(replied)return;
      if(!buffer||buffer.length<5||String.fromCharCode.apply(null,buffer.slice(0,5))!=='%PDF-'){fail(new Error('The PDF generator returned an invalid file.'));return;}
      var bytes=new Uint8Array(buffer.length);bytes.set(buffer);replied=true;
      self.postMessage({ok:true,buffer:bytes.buffer},[bytes.buffer]);
    });
  }catch(error){fail(error);}
};
