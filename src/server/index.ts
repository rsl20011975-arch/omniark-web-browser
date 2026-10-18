import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {config,root} from '../config/index.ts';
import {Engine} from '../engine/index.ts';
import {chatSchema} from '../contracts/index.ts';
import {json,body} from './http.ts';
import {fixture} from './fixture.ts';
import {prepareExtension} from '../native/build.ts';
import {NativeBridge} from '../native/index.ts';
import {z} from 'zod';
const engine=new Engine(),token=randomBytes(32).toString('hex');
const origin=`http://127.0.0.1:${config.port}`;
const extension=config.native?prepareExtension(token):null;
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try {
    if(req.headers.host!==`127.0.0.1:${config.port}`) return json(res,{error:'Host rejected'},403);
    const url=new URL(req.url??'/',origin);
    if(extension&&req.headers.origin===extension.origin) {
      res.setHeader('Access-Control-Allow-Origin',extension.origin);
      res.setHeader('Access-Control-Allow-Headers','x-workbench-token,x-workbench-extension,x-workbench-client,content-type');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
      if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    }
    if(url.pathname.startsWith('/bridge/')&&engine.browser instanceof NativeBridge) {
      if(req.headers['x-workbench-token']!==token||req.headers['x-workbench-extension']!==extension?.id
        ||(req.headers.origin&&req.headers.origin!==extension?.origin))
        return json(res,{error:'Unpaired extension'},403);
      const clientId=z.string().uuid().parse(req.headers['x-workbench-client']);
      if(url.pathname==='/bridge/next')return json(res,engine.browser.next(clientId));
      if(url.pathname==='/bridge/result'&&req.method==='POST'){engine.browser.complete(await body(req),clientId);return json(res,{ok:true});}
      if(url.pathname==='/bridge/invalidate'&&req.method==='POST'){engine.browser.invalidate(clientId);return json(res,{ok:true});}
      return json(res,{error:'Unknown bridge route'},404);
    }
    if(url.pathname==='/fixture') {res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture);}
    if(url.pathname.startsWith('/api/')) {
      if(req.headers['x-workbench-token']!==token) return json(res,{error:'Unauthorized'},401);
      const pairedExtension=extension&&req.headers['x-workbench-extension']===extension.id
        &&(!req.headers.origin||req.headers.origin===extension.origin);
      if(req.method==='POST'&&req.headers.origin!==origin&&!pairedExtension) return json(res,{error:'Origin rejected'},403);
      if(url.pathname==='/api/state') return json(res,engine.state(url.searchParams.get('conversation')??''));
      if(url.pathname==='/api/search')return json(res,engine.store.search(url.searchParams.get('q')??''));
      if(url.pathname==='/api/provenance')return json(res,engine.research.read(url.searchParams.get('name')??''));
      if(url.pathname==='/api/documents'&&req.method==='POST')return json(res,engine.documents.upload(await body(req,29000000)));
      if(url.pathname==='/api/screenshot') {
        res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store');
        return engine.browser.screenshot?res.end(engine.browser.screenshot):json(res,{error:'No browser observation'},404);
      }
      if(url.pathname==='/api/chat'&&req.method==='POST') {
        const input=chatSchema.parse(await body(req));return json(res,{runId:engine.submit(input.conversationId,input.message,input.mode,input.provider)},202);
      }
      if(url.pathname==='/api/stop'&&req.method==='POST') {engine.stopped=true;engine.approval.cancel();return json(res,{ok:true});}
      if(url.pathname==='/api/queue/resume'&&req.method==='POST'){engine.resumeQueue();return json(res,{ok:true});}
      if(url.pathname==='/api/tool'&&req.method==='POST')return json(res,await engine.external(await body(req)));
      if(url.pathname==='/api/approval'&&req.method==='POST') {
        const input=z.strictObject({id:z.string().uuid(),approved:z.boolean()}).parse(await body(req));
        engine.approval.answer(input.id,input.approved);return json(res,{ok:true});
      }
      return json(res,{error:'Unknown API'},404);
    }
    const dist=path.join(root,'dist');
    const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    const file=path.resolve(dist,requested);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)) return json(res,{error:'Not found'},404);
    res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',`default-src 'self'; img-src 'self' blob:; style-src 'self'; frame-ancestors ${extension?.origin??"'none'"}`);
    let bytes=fs.readFileSync(file);
    if(requested==='index.html') bytes=Buffer.from(bytes.toString().replace('__SESSION_TOKEN__',token));
    res.end(bytes);
  } catch(error) {json(res,{error:error instanceof Error?error.message:String(error)},400);}
});
export const ready=new Promise<void>(resolve=>server.listen(config.port,'127.0.0.1',()=>{
  console.log(`Workbench ready: ${origin}`);resolve();
}));
export async function closeTestServer() {
  if(engine.active||engine.externalBusy)throw Error('Cannot close a server with active work');
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  engine.store.db.close();
}
