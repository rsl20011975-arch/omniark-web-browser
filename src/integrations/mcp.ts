import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {invoke} from './client.ts';
const server=new McpServer({name:'local-workbench',version:'0.2.0'});
const response=(result:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(result)}]});
const action=(kind:string,target='',value='',observationId='')=>({tool:'browser',action:{kind,target,value,observationId,expectedHash:'',explanation:'외부 MCP 클라이언트 요청'}});
server.registerTool('browser_observe',{description:'Read the actual attached browser tab and observed controls.',inputSchema:{}},
  async()=>response(await invoke(action('observe'))));
server.registerTool('browser_navigate',{description:'Navigate the attached browser tab to an HTTP(S) URL.',inputSchema:{url:z.string().url()}},
  async({url})=>response(await invoke(action('navigate',url))));
server.registerTool('browser_click',{description:'Click a control from the latest observation. Requires observationId.',inputSchema:{ref:z.string(),observationId:z.string()}},
  async({ref,observationId})=>response(await invoke(action('click',ref,'',observationId))));
server.registerTool('browser_fill',{description:'Fill an observed non-password field.',inputSchema:{ref:z.string(),observationId:z.string(),text:z.string()}},
  async({ref,observationId,text})=>response(await invoke(action('fill',ref,text,observationId))));
server.registerTool('files_list',{description:'List actual workspace artifacts and hashes.',inputSchema:{}},
  async()=>response(await invoke({tool:'files_list'})));
server.registerTool('file_read',{description:'Read a workspace artifact and current SHA256.',inputSchema:{name:z.string()}},
  async({name})=>response(await invoke({tool:'file_read',name})));
server.registerTool('file_write',{description:'Create or atomically replace a workspace artifact, retaining old version. Empty expectedHash only for new file.',
  inputSchema:{name:z.string(),value:z.string(),expectedHash:z.string()}},
  async(input)=>response(await invoke({tool:'file_write',...input})));
await server.connect(new StdioServerTransport());
