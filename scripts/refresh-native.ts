import fs from 'node:fs';
import path from 'node:path';
import {prepareExtension} from '../src/native/build.ts';
import {config,root} from '../src/config/index.ts';
const connection=JSON.parse(fs.readFileSync(path.join(config.nativeDirectory,'connection.json'),'utf8')) as {origin:string;token:string};
if(connection.origin!==`http://127.0.0.1:${config.port}`)throw Error('Current extension belongs to a different server port');
const prepared=prepareExtension(connection.token);
console.log(JSON.stringify({id:prepared.id,directory:prepared.directory}));
