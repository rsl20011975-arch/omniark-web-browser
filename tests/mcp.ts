import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root} from '../src/config/index.ts';
const client=new Client({name:'workbench-acceptance',version:'1.0.0'});
const transport=new StdioClientTransport({command:process.execPath,
  args:[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'src/integrations/mcp.ts')],cwd:root});
await client.connect(transport);
try {
  const tools=await client.listTools();assert.equal(tools.tools.length,7);
  const list=await client.callTool({name:'files_list',arguments:{}});assert.ok(!list.isError);
  const filename='MCP-'+Date.now()+'.md';
  const written=await client.callTool({name:'file_write',arguments:{name:filename,value:'# MCP 실제 연결\n외부 클라이언트에서 저장했습니다.\n',expectedHash:''}});
  assert.ok(!written.isError,JSON.stringify(written));
  const content=fs.readFileSync(path.join(root,'artifacts/r2',filename),'utf8');assert.match(content,/외부 클라이언트/);
  const read=await client.callTool({name:'file_read',arguments:{name:filename}});assert.ok(!read.isError);
  const rejected=await client.callTool({name:'file_write',arguments:{name:filename,value:'wrong',expectedHash:''}});
  assert.equal(rejected.isError,true);
  fs.writeFileSync(path.join(root,'evidence/r2/mcp.json'),JSON.stringify({status:'PASS',tools:tools.tools.map(t=>t.name),
    file:filename,content,staleHashRejected:true},null,2));
  console.log('MCP PASS: 7 tools listed, actual file write/read, stale write rejected');
}finally{await client.close();}
