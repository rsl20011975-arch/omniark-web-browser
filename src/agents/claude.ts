import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {config} from '../config/index.ts';
import {actionSchema,type Action} from '../contracts/index.ts';
export async function claudeDecision(instructions:string,context:unknown):Promise<Action> {
  const exe=process.env.CLAUDE_BIN??path.join(process.env.APPDATA??'','npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
  if(!fs.existsSync(exe))throw Error('공식 Claude Code가 설치되지 않았습니다. CLAUDE_BIN 경로를 확인하세요.');
  const env={...process.env};delete env.ANTHROPIC_API_KEY;
  const auth=spawnSync(exe,['auth','status'],{env,encoding:'utf8',windowsHide:true,timeout:15000});
  if(auth.status!==0)throw Error('Claude 구독 로그인 상태를 확인할 수 없습니다.');
  const status=JSON.parse(auth.stdout);
  if(!status.loggedIn||status.authMethod!=='claude.ai'||!status.subscriptionType)
    throw Error('Claude Code에서 구독 계정으로 로그인하세요. 유료 API로 자동 전환하지 않습니다.');
  const directory=path.join(config.data,'planner');fs.mkdirSync(directory,{recursive:true});
  const args=['--print','--no-session-persistence','--no-chrome','--disable-slash-commands',
    '--setting-sources','','--settings',JSON.stringify({disableAllHooks:true}),
    '--tools','','--strict-mcp-config','--mcp-config',JSON.stringify({mcpServers:{}}),
    '--json-schema',JSON.stringify(z.toJSONSchema(actionSchema,{target:'draft-7'})),'--output-format','json',
    '--system-prompt',instructions];
  const output=await new Promise<string>((resolve,reject)=>{
    const child=spawn(exe,args,{env,cwd:directory,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',diagnostic='';
    child.stdout.on('data',chunk=>{output+=chunk.toString();});
    child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk.toString()).slice(-3000);});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(output):reject(Error(`Claude exit ${code}: ${diagnostic}`)));
    child.stdin.end('CONTEXT DATA:\n'+JSON.stringify(context));
  });
  const result=JSON.parse(output);
  if(result.is_error)throw Error(String(result.result??'Claude returned an error'));
  return actionSchema.parse(result.structured_output);
}
