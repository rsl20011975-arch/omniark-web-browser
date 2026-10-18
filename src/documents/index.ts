import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {z} from 'zod';
import {config,root} from '../config/index.ts';
import {hash} from '../files/index.ts';
const extracted=z.strictObject({text:z.string().min(1).max(60000),units:z.number(),warnings:z.array(z.string()),truncated:z.boolean()});
export const uploadSchema=z.strictObject({name:z.string().max(180),base64:z.string().max(28000000)});
export class Documents {
  directory:string;
  constructor(data:string){this.directory=path.join(data,'documents');fs.mkdirSync(this.directory,{recursive:true});}
  resolve(name:string) {
    if(!/^[^<>:"/\\|?*\x00-\x1f]+\.(pdf|docx|xlsx)$/i.test(name)||name.startsWith('.')
      ||/^(con|prn|aux|nul|com\d|lpt\d)\./i.test(name))throw Error('Invalid document filename');
    const file=path.join(this.directory,name);
    if(fs.lstatSync(this.directory).isSymbolicLink()||(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink()))throw Error('Document links forbidden');
    return file;
  }
  list() {
    return fs.readdirSync(this.directory).filter(name=>/\.(pdf|docx|xlsx)$/i.test(name)).map(name=>({name,bytes:fs.statSync(this.resolve(name)).size}));
  }
  upload(input:unknown) {
    const {name,base64}=uploadSchema.parse(input),bytes=Buffer.from(base64,'base64');
    if(bytes.toString('base64')!==base64||bytes.length===0||bytes.length>20000000)throw Error('Invalid or oversized upload');
    fs.writeFileSync(this.resolve(name),bytes,{flag:'wx'});
    return {name,bytes:bytes.length,hash:hash(bytes)};
  }
  async read(name:string) {
    const file=this.resolve(name);
    const result=await new Promise<string>((resolve,reject)=>{
      const child=spawn('python',[path.join(root,'src/documents/extract.py'),file],
        {windowsHide:true,env:{...process.env,PYTHONUTF8:'1'},stdio:['ignore','pipe','pipe']});
      let output='',error='';
      child.stdout.on('data',chunk=>{output+=chunk.toString();});child.stderr.on('data',chunk=>{error+=chunk.toString();});
      child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(error)));
    });
    return {name,hash:hash(fs.readFileSync(file)),...extracted.parse(JSON.parse(result))};
  }
}
