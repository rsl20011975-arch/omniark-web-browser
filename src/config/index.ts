import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const config = {
  port: Number(process.env.WORKBENCH_PORT ?? 19371),
  data: path.resolve(root, process.env.WORKBENCH_DATA ?? 'data'),
  artifacts: path.resolve(root, process.env.WORKBENCH_ARTIFACTS ?? 'artifacts'),
  chrome: path.resolve(root, 'runtime/chrome-win/chrome.exe'),
  profile: path.resolve(root, process.env.WORKBENCH_PROFILE ?? 'profiles/r1'),
  headless: process.env.WORKBENCH_HEADLESS === '1',
  codex: process.env.CODEX_BIN ?? 'codex.exe',
  steps: 16, modelTimeout: 180000, pageTimeout: 30000,
  maxText: 24000, maxFile: 200000, maxBody: 300000,
};
