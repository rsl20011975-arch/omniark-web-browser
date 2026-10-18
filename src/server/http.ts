import type {IncomingMessage,ServerResponse} from 'node:http';
import {config} from '../config/index.ts';
export function json(res:ServerResponse,value:unknown,status=200) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(value));
}
export async function body(req:IncomingMessage,limit=config.maxBody):Promise<unknown> {
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req) {size+=chunk.length;if(size>limit) throw Error('Request too large');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString());
}
