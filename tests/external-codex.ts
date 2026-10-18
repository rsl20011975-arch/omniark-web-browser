import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
const destination=path.join(root,'evidence/r2/external-codex.jsonl');
const output=path.join(root,'evidence/r2/external-codex-answer.txt');
const filename='외부-Codex-'+Date.now()+'.md';
const argumentsList=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--approve-for-me',
  '-c','features.shell_tool=false','-c','web_search="disabled"','-c','model_reasoning_effort="low"',
  '-c',`mcp_servers.workbench.command=${JSON.stringify(process.execPath)}`,
  '-c',`mcp_servers.workbench.args=${JSON.stringify([path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'src/integrations/mcp.ts')])}`,
  '-c',`mcp_servers.workbench.env.WORKBENCH_NATIVE_DIR=${JSON.stringify(config.nativeDirectory)}`,
  '--json','-o',output,'-'];
await new Promise<void>((resolve,reject)=>{
  const child=spawn(config.codex,argumentsList,{cwd:path.join(root,'data/r2-current'),windowsHide:true,stdio:['pipe','pipe','pipe']});
  const log=fs.createWriteStream(destination);let errors='';
  child.stdout.pipe(log);child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-4000);});
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`Codex ${code}: ${errors}`)));
  child.stdin.end(`This is an integration acceptance test. Use ONLY the workbench MCP tools. First call files_list, then read 네이티브.csv using file_read. Count the actual data rows. Also call browser_navigate for https://example.com and read its actual title and first sentence. Write ${filename} using file_write with expectedHash empty, containing the CSV source filename, row count, a concise Korean description of the 검토 column, and the actual website title, first sentence and source URL. Do not use shell, delegate or pretend a write. Finally report the actual filename.`);
});
const content=fs.readFileSync(path.join(config.artifacts,filename),'utf8');
assert.match(content,/10/);assert.match(content,/네이티브/);assert.match(content,/완료/);
assert.match(content,/Example Domain/);assert.match(content,/documentation/);
const events=fs.readFileSync(destination,'utf8');assert.match(events,/mcp_tool_call/);
fs.writeFileSync(path.join(root,'evidence/r2/external-codex.json'),JSON.stringify({status:'PASS',
  provider:'actual official Codex CLI with MCP browser and file tools',browserNavigation:true,filename,content},null,2));
console.log('EXTERNAL CODEX PASS: actual MCP list/read/write, verified artifact');
