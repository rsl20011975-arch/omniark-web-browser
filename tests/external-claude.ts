import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
const exe=path.join(process.env.APPDATA!,'npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
const env={...process.env};delete env.ANTHROPIC_API_KEY;
const auth=spawnSync(exe,['auth','status'],{env,encoding:'utf8',windowsHide:true});
const status=JSON.parse(auth.stdout);
assert.equal(status.loggedIn,true);assert.equal(status.authMethod,'claude.ai');
assert.ok(status.subscriptionType,'Subscription authentication required; never fall back to API key');
const filename='외부-Claude-'+Date.now()+'.md';
const mcp={mcpServers:{workbench:{command:process.execPath,args:[path.join(root,'node_modules/tsx/dist/cli.mjs'),
  path.join(root,'src/integrations/mcp.ts')],env:{WORKBENCH_NATIVE_DIR:config.nativeDirectory}}}};
const args=['--print','--no-session-persistence','--no-chrome','--disable-slash-commands',
  '--setting-sources','','--tools','','--strict-mcp-config','--mcp-config',JSON.stringify(mcp),
  '--allowedTools','mcp__workbench__browser_navigate,mcp__workbench__file_write,mcp__workbench__file_read,mcp__workbench__files_list',
  '--output-format','stream-json','--verbose',
  `Use only workbench MCP tools. Navigate to https://example.com and observe its actual title, first sentence and URL. Write these to ${filename} with file_write and empty expectedHash. Then read the file back using file_read and report the actual result. This is an authorized local acceptance test. Do not use shell or delegate.`];
const logPath=path.join(root,'evidence/r2/external-claude.jsonl');
await new Promise<void>((resolve,reject)=>{
  const child=spawn(exe,args,{env,cwd:config.data,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const log=fs.createWriteStream(logPath);let errors='';child.stdout.pipe(log);
  child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-3000);});
  child.on('error',reject);child.on('close',code=>log.end(()=>code===0?resolve():reject(Error(`Claude ${code}: ${errors}`))));
});
const content=fs.readFileSync(path.join(config.artifacts,filename),'utf8');
assert.match(content,/Example Domain/);assert.match(content,/documentation/);assert.match(content,/https:\/\/example.com/);
const events=fs.readFileSync(logPath,'utf8');assert.match(events,/mcp__workbench__browser_navigate/);
assert.match(events,/mcp__workbench__file_read/);
fs.writeFileSync(path.join(root,'evidence/r2/external-claude.json'),JSON.stringify({status:'PASS',
  authMethod:status.authMethod,subscriptionType:status.subscriptionType,apiKeyRemoved:true,filename,content},null,2));
console.log('EXTERNAL CLAUDE PASS: subscription -> actual browser -> file write/read');
