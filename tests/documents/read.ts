import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Documents} from '../../src/documents/index.ts';
import {root} from '../../src/config/index.ts';
import {ResearchStore} from '../../src/research/index.ts';
import {hash} from '../../src/files/index.ts';
const store=new Documents(path.join(root,'data/document-test-'+Date.now()));
const research=new ResearchStore(path.join(store.directory,'verification'));
const results=[];
for(const name of ['dummy.pdf','projects.docx','projects.xlsx']) {
  store.upload({name,base64:fs.readFileSync(path.join(root,'data/document-fixtures',name)).toString('base64')});
  const document=await store.read(name);
  research.record(name+'.md',[],'document-verification',[document]);
  const source=research.read(name+'.md').sources[0];
  assert.equal(source.documentHash,hash(fs.readFileSync(path.join(root,'data/document-fixtures',name))));
  assert.deepEqual(source.warnings,document.warnings);
  assert.equal(document.truncated,false);assert.ok(document.hash.length===64);
  if(name.endsWith('.pdf'))assert.match(document.text,/Dummy PDF file/);
  else for(let index=1;index<=10;index++)assert.ok(document.text.includes(`Project ${index}\t${index*3}`));
  results.push({name,hash:document.hash,units:document.units,warnings:document.warnings,status:'PASS'});
}
assert.throws(()=>store.upload({name:'../escape.docx',base64:'YWJj'}),/Invalid/);
fs.writeFileSync(path.join(root,'evidence/r2/documents.json'),JSON.stringify(results,null,2));
console.log('DOCUMENTS PASS: PDF text, DOCX and XLSX ten rows, hashes, path escape rejection');
