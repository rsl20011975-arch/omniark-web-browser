export {};
const stamp=Date.now();
process.env.WORKBENCH_NATIVE='1';
process.env.WORKBENCH_PORT='19376';
process.env.WORKBENCH_DATA=`data/system-${stamp}`;
process.env.WORKBENCH_ARTIFACTS=`artifacts/system-${stamp}`;
process.env.WORKBENCH_NATIVE_DIR=`data/system-extension-${stamp}`;
const server=await import('../../src/server/index.ts');
await server.ready;
try {
  await import('../native.ts');
  await import('../documents/chat.ts');
  await import('../workflow-controls.ts');
  console.log('SYSTEM PASS: native browser, document chat, steering and approvals');
}finally{await server.closeTestServer();}
