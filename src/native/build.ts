import fs from 'node:fs';
import path from 'node:path';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {config,root} from '../config/index.ts';
export function prepareExtension(token:string) {
  const directory=path.join(root,'native-runtime');fs.mkdirSync(directory,{recursive:true});
  const keyPath=path.join(directory,'public-key.txt');
  if(!fs.existsSync(keyPath)) {
    const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
    fs.writeFileSync(keyPath,publicKey.export({format:'der',type:'spki'}).toString('base64'));
  }
  const key=fs.readFileSync(keyPath,'utf8');
  const id=createHash('sha256').update(Buffer.from(key,'base64')).digest('hex').slice(0,32)
    .split('').map(char=>String.fromCharCode(97+parseInt(char,16))).join('');
  for(const name of fs.readdirSync(path.join(root,'src/extension'))) {
    fs.copyFileSync(path.join(root,'src/extension',name),path.join(directory,name));
  }
  const origin=`http://127.0.0.1:${config.port}`;
  fs.cpSync(path.join(root,'dist/assets'),path.join(directory,'assets'),{recursive:true});
  const panel=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('__SESSION_TOKEN__',token)
    .replace('</head>',`<meta name="workbench-base" content="${origin}"></head>`);
  fs.writeFileSync(path.join(directory,'panel.html'),panel);
  fs.copyFileSync(path.join(root,'src/ui/study-noto.woff2'),path.join(directory,'study-noto.woff2'));
  const manifest={manifest_version:3,name:'Local Workbench',version:'0.2.0',key,
    permissions:['sidePanel','tabs','scripting','storage'],host_permissions:['http://*/*','https://*/*'],
    background:{service_worker:'worker.js',type:'module'},
    action:{default_title:'작업 대화 열기'},side_panel:{default_path:'panel.html'},
    content_security_policy:{extension_pages:`script-src 'self'; object-src 'self'; connect-src 'self' ${origin}; img-src 'self' blob:;`},
    commands:{'open-chat':{suggested_key:{default:'Alt+Shift+W'},description:'작업 대화 열기'}}};
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(directory,'connection.json'),JSON.stringify({origin,token}));
  return {id,directory,origin:`chrome-extension://${id}`};
}
