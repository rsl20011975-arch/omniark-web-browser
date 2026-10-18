import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import type {Artifact} from '../contracts/index.ts';
import {config} from '../config/index.ts';
export const hash = (value:string|Buffer) => createHash('sha256').update(value).digest('hex');
export class FileStore {
  constructor(readonly directory:string) {
    fs.mkdirSync(directory,{recursive:true});
    if(fs.lstatSync(directory).isSymbolicLink()) throw Error('Artifact root cannot be a link');
  }
  resolve(name:string) {
    if(!/^[^<>:"/\\|?*\x00-\x1f]+\.(md|txt|csv|json)$/i.test(name)
      || name.startsWith('.') || /^(con|prn|aux|nul|com\d|lpt\d)\./i.test(name))
      throw Error('Use a plain .md, .txt, .csv or .json filename');
    const result=path.join(this.directory,name);
    if(fs.existsSync(result)&&fs.lstatSync(result).isSymbolicLink()) throw Error('File links forbidden');
    return result;
  }
  read(name:string):Artifact {
    const target=this.resolve(name);
    if(fs.statSync(target).size>config.maxFile) throw Error('File exceeds R1 context limit');
    const bytes=fs.readFileSync(target);
    return {name,hash:hash(bytes),bytes:bytes.length,content:bytes.toString('utf8')};
  }
  list():Artifact[] {
    return fs.readdirSync(this.directory).filter(n=>/\.(md|txt|csv|json)$/i.test(n)).map(n=>this.read(n));
  }
  save(name:string,content:string,expectedHash:string) {
    if(!content.trim()||Buffer.byteLength(content)>config.maxFile) throw Error('Empty or oversized artifact');
    const target=this.resolve(name), exists=fs.existsSync(target);
    const previous=exists?this.read(name):null;
    if((previous?.hash??'')!==expectedHash) throw Error('File changed: refresh before writing');
    const versions=path.join(this.directory,'.versions');
    fs.mkdirSync(versions,{recursive:true});
    if(fs.lstatSync(versions).isSymbolicLink()) throw Error('Version directory cannot be a link');
    if(previous) fs.writeFileSync(path.join(versions,previous.hash+'.txt'),previous.content,{flag:'w'});
    const temp=path.join(this.directory,randomUUID()+'.pending');
    fs.writeFileSync(temp,content,{flag:'wx'});
    fs.renameSync(temp,target);
    const saved=this.read(name);
    if(saved.hash!==hash(content)) throw Error('Written file hash mismatch');
    return {...saved,previousHash:previous?.hash??null,absolutePath:target};
  }
}
