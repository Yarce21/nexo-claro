import {spawnSync,execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {deliveryIssues} from './delivery-integrity';
const root=process.cwd();
const tests=readdirSync('tests').filter(file=>file.endsWith('.test.ts')).sort().map(file=>path.join('tests',file));
const authorNotes=process.argv.includes('--author-notes');
const result=spawnSync(process.execPath,['--import','tsx','--test','--test-reporter=tap',...tests],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,env:{...process.env,VERIFY_AUTHOR_NOTES:authorNotes?'1':process.env.VERIFY_AUTHOR_NOTES}});
if(result.status!==0){process.stderr.write(result.stdout+result.stderr);throw new Error('Fallaron las pruebas de la entrega.')}
const count=Number(result.stdout.match(/^# tests (\d+)/m)?.[1]);
if(!count)throw new Error('No se pudo leer el número real de pruebas.');
const git=(args:string[])=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const lastSourceCommit=Number(git(['log','-1','--format=%ct','--','lib','app','config']))*1000;
const issues=deliveryIssues(root,count,lastSourceCommit);
if(git(['status','--porcelain','--untracked-files=all']))issues.push('Hay archivos sin commitear.');
const ignored=['probe.zip','probe.sqlite','probe.sqlite-wal','probe.sqlite-shm','probe.db','node_modules/probe.js','runtime/probe.sqlite'];
for(const file of ignored){const probe=spawnSync('git',['check-ignore','--no-index',file],{encoding:'utf8',windowsHide:true});if(probe.status!==0)issues.push('.gitignore deja pasar '+file);}
const tracked=git(['ls-files']).split('\n').filter(file=>/(?:^|\/)node_modules\/|\.(?:zip|sqlite|sqlite-wal|sqlite-shm|db)$/i.test(file));
if(tracked.length)issues.push('Artefactos privados versionados: '+tracked.join(', '));
const sourceCommit=git(['log','-1','--format=%H','--','lib','app','config']);
const videoCommit=git(['log','-1','--format=%H','--','deliverables/demo.mp4']);
if(!videoCommit||videoCommit===sourceCommit)issues.push('El commit de video debe ser posterior al último cambio de código.');
else{const ancestor=spawnSync('git',['merge-base','--is-ancestor',sourceCommit,videoCommit],{windowsHide:true});if(ancestor.status!==0)issues.push('El commit de video no contiene la versión final de código.');}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else {
 console.log('Entrega verificada: '+count+' casos, marca, fuentes, artefactos vigentes y Git limpio.');
 if(!authorNotes)console.log('Control personal de la nota IA omitido; usar --author-notes para bloquear marcadores sin completar.');
}
