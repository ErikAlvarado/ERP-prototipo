import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startComprasTxtServer } from './compras-txt-api.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const angularCli = resolve(PROJECT_ROOT, 'node_modules/@angular/cli/bin/ng.js');

const dataServer = await startComprasTxtServer();
const angular = spawn(
  process.execPath,
  [angularCli, 'serve', ...process.argv.slice(2)],
  {
  cwd: PROJECT_ROOT,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
  },
);

let shuttingDown = false;
const close = signal => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!angular.killed) angular.kill(signal);
  dataServer.close(() => process.exit(0));
};

angular.once('error', error => {
  console.error('No fue posible iniciar Angular.', error);
  close('SIGTERM');
});
angular.once('exit', code => {
  dataServer.close(() => process.exit(code ?? 0));
});
process.once('SIGINT', () => close('SIGINT'));
process.once('SIGTERM', () => close('SIGTERM'));
