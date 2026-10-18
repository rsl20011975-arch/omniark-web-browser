import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {config,root} from '../config/index.ts';
import {Engine} from '../engine/index.ts';
import {chatSchema} from '../contracts/index.ts';
import {json,body} from './http.ts';
import {fixture} from './fixture.ts';
const engine=new Engine(),token=randomBytes(32).toString('hex');
const origin=`http://127.0.0.1:${config.port}`;
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try {
    if(req.headers.host!==`127.0.0.1:${config.port}`) return json(res,{error:'Host rejected'},403);
    const url=new URL(req.url??'/',origin);
    if(url.pathname==='/fixture') {res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture);}
    if(url.pathname.startsWith('/api/')) {
      if(req.headers['x-workbench-token']!==token) return json(res,{error:'Unauthorized'},401);
      if(req.method==='POST'&&req.headers.origin!==origin) return json(res,{error:'Origin rejected'},403);
      if(url.pathname==='/api/state') return json(res,engine.state(url.searchParams.get('conversation')??''));
      if(url.pathname==='/api/screenshot') {
        res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store');
        return engine.browser.screenshot?res.end(engine.browser.screenshot):json(res,{error:'No browser observation'},404);
      }
      if(url.pathname==='/api/chat'&&req.method==='POST') {
        const input=chatSchema.parse(await body(req));return json(res,{runId:engine.submit(input.conversationId,input.message)},202);
      }
      if(url.pathname==='/api/stop'&&req.method==='POST') {engine.stopped=true;return json(res,{ok:true});}
      return json(res,{error:'Unknown API'},404);
    }
    const dist=path.join(root,'dist');
    const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    const file=path.resolve(dist,requested);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)) return json(res,{error:'Not found'},404);
    res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; style-src 'self'; frame-ancestors 'none'");
    let bytes=fs.readFileSync(file);
    if(requested==='index.html') bytes=Buffer.from(bytes.toString().replace('__SESSION_TOKEN__',token));
    res.end(bytes);
  } catch(error) {json(res,{error:error instanceof Error?error.message:String(error)},400);}
});
server.listen(config.port,'127.0.0.1',()=>console.log(`Workbench ready: ${origin}`));
