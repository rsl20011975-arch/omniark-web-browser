export {};
const stamp=Date.now();
process.env.WORKBENCH_NATIVE='1';
process.env.WORKBENCH_PORT='19376';
process.env.WORKBENCH_DATA=`data/system-${stamp}`;
process.env.WORKBENCH_ARTIFACTS=`artifacts/system-${stamp}`;
process.env.WORKBENCH_NATIVE_DIR=`data/system-extension-${stamp}`;
process.env.WORKBENCH_KEEP_BROWSER='1';
const server=await import('../../src/server/index.ts');
await server.ready;
let native:typeof import('../native.ts')|undefined;
try {
  native=await import('../native.ts');
  if(process.env.WORKBENCH_TEST_SCOPE!=='native') {
    await import('../documents/chat.ts');
    await import('../external-codex.ts');
    await import('../workflow-controls.ts');
  }
  console.log('SYSTEM PASS: '+(process.env.WORKBENCH_TEST_SCOPE??'native, documents, steering and approvals'));
}finally{await native?.context.close();await server.closeTestServer();}
