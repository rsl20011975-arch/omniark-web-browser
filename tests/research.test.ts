import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ResearchStore} from '../src/research/index.ts';
test('research records actual document hash and extraction gaps without claiming citation verification',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-research-'));
  const research=new ResearchStore(directory);
  const document={name:'report.pdf',hash:'a'.repeat(64),text:'Page 1: 42 units',units:1,warnings:['image without OCR'],truncated:true};
  research.record('summary.md',[],'run1',[document,document]);
  const result=research.read('summary.md');
  assert.equal(result.sources.length,1);assert.equal(result.sources[0].documentHash,document.hash);
  assert.equal(result.sources[0].truncated,true);assert.deepEqual(result.sources[0].warnings,document.warnings);
  assert.equal(result.reviewStatus,'unreviewed');assert.match(result.scope,/not verified/);
});
