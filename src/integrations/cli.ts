import {invoke} from './client.ts';
const chunks:Buffer[]=[];
for await(const chunk of process.stdin)chunks.push(chunk);
try {console.log(JSON.stringify(await invoke(JSON.parse(Buffer.concat(chunks).toString())),null,2));}
catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
