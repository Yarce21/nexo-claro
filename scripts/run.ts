import { spawn } from 'node:child_process';
import path from 'node:path';
const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'scripts/partner.ts'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['--import', 'tsx', 'scripts/worker.ts'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [path.join('node_modules', 'next', 'dist', 'bin', 'next'), mode, '--hostname', '127.0.0.1'], { stdio: 'inherit', windowsHide: true })
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(child => child.kill()); setTimeout(() => process.exit(code), 500); }
children.forEach(child => { child.on('exit', code => { if (!stopping) stop(code || 1); }); child.on('error', error => { console.error(error); stop(1); }); });
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
