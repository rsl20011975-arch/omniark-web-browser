import path from 'node:path';
import fs from 'node:fs';
import {FileStore,hash} from '../files/index.ts';
import type {Observation} from '../contracts/index.ts';
export class ResearchStore {
  store:FileStore;
  constructor(artifacts:string){this.store=new FileStore(path.join(artifacts,'.sources'));}
  record(name:string,observations:Observation[],runId:string) {
    const sourceName=name+'.json',target=this.store.resolve(sourceName);
    const expected=fs.existsSync(target)?this.store.read(sourceName).hash:'';
    const sources=observations.map(observation=>({url:observation.url,title:observation.title,
      publisherHost:new URL(observation.url).hostname,observedTextHash:hash(observation.text),
      excerpt:observation.text.slice(0,500),truncated:observation.truncated,observationId:observation.id}));
    return this.store.save(sourceName,JSON.stringify({artifact:name,runId,capturedAt:new Date().toISOString(),
      reviewStatus:'unreviewed',sources},null,2),expected);
  }
  read(name:string) {
    const sourceName=name+'.json';
    return fs.existsSync(this.store.resolve(sourceName))?JSON.parse(this.store.read(sourceName).content):null;
  }
}
