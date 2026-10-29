import { spawnSync } from 'node:child_process';
// Compatibility entry for existing commands; HD uses the locked Vite build.
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{stdio:'inherit',shell:process.platform==='win32'});
process.exitCode=result.status??1;
