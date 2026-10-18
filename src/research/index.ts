import path from 'node:path';
import fs from 'node:fs';
import {FileStore,hash} from '../files/index.ts';
import type {Observation} from '../contracts/index.ts';
export type DocumentEvidence={name:string;hash:string;text:string;units:number;warnings:string[];truncated:boolean};
export class ResearchStore {
  store:FileStore;
  constructor(artifacts:string){this.store=new FileStore(path.join(artifacts,'.sources'));}
  record(name:string,observations:Observation[],runId:string,documents:DocumentEvidence[]=[]) {
    const sourceName=name+'.json',target=this.store.resolve(sourceName);
    const expected=fs.existsSync(target)?this.store.read(sourceName).hash:'';
    const web=observations.map(observation=>({kind:'web',url:observation.url,title:observation.title,
      publisherHost:new URL(observation.url).hostname,observedTextHash:hash(observation.text),
      excerpt:observation.text.slice(0,500),truncated:observation.truncated,observationId:observation.id}));
    const local=documents.map(document=>({kind:'document',title:document.name,documentHash:document.hash,
      observedTextHash:hash(document.text),excerpt:document.text.slice(0,500),units:document.units,
      warnings:document.warnings,truncated:document.truncated}));
    const unique=new Map([...web,...local].map(source=>[JSON.stringify(source),source]));
    return this.store.save(sourceName,JSON.stringify({artifact:name,runId,capturedAt:new Date().toISOString(),
      reviewStatus:'unreviewed',scope:'materials-read-during-run; claim-level attribution not verified',sources:[...unique.values()]},null,2),expected);
  }
  read(name:string) {
    const sourceName=name+'.json';
    return fs.existsSync(this.store.resolve(sourceName))?JSON.parse(this.store.read(sourceName).content):null;
  }
}
