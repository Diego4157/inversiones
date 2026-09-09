import { spawn } from 'child_process';

console.log('\x1b[36m%s\x1b[0m', '>> Iniciando JD Inversiones (Backend Express :3001 + Frontend Vite :5173)...');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const backend = spawn('node', ['server/index.js'], { stdio: 'inherit' });
const frontend = spawn(npxCmd, ['vite'], { stdio: 'inherit' });

const shutdown = () => {
  console.log('\n\x1b[33m%s\x1b[0m', '>> Deteniendo servidores de JD Inversiones...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('error', (err) => console.error('\x1b[31m%s\x1b[0m', '!! Error en Backend:', err));
frontend.on('error', (err) => console.error('\x1b[31m%s\x1b[0m', '!! Error en Frontend:', err));
