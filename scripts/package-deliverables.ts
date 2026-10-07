import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,rmSync,cpSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {files} from './delivery-integrity';
const root=process.cwd();const target=path.resolve(root,'deliverables');
// Delete only generated delivery artifacts, never a computed path outside the project.
if(path.dirname(target)!==path.resolve(root)||path.basename(target)!=='deliverables')throw new Error('Ruta de entrega inválida.');
if(existsSync(target)) {
 const backup=path.resolve(root,'runtime',`delivery-backup-${Date.now()}`);
 cpSync(target,backup,{recursive:true});
 const inventory=files(root,'deliverables').map(file=> {
  const relative=path.relative(target,path.resolve(root,file));
  const hash=(filename:string)=>createHash('sha256').update(readFileSync(filename)).digest('hex');
  const original=hash(path.resolve(root,file));
  if(original!==hash(path.join(backup,relative)))throw new Error('Respaldo de entrega inconsistente.');
  return {file:relative,sha256:original};
 });
 writeFileSync(path.join(backup,'inventory.json'),JSON.stringify(inventory,null,2));
 // Remove known stale sources/captures only, after verifying a recoverable backup.
 for(const item of ['docs','data','config','README.md','redesign','screenshots']) {
  const entry=path.resolve(target,item);
  if(path.dirname(entry)!==target)throw new Error('Ruta de limpieza inválida.');
  if(existsSync(entry))rmSync(entry,{recursive:true,force:true});
 }
}
mkdirSync(target,{recursive:true});
for(const file of ['scripts/record-demo.ts','tests/load.ts','scripts/export.ts']){
 const result=spawnSync(process.execPath,['--import','tsx',file],{stdio:'inherit',windowsHide:true});
 if(result.status!==0)throw new Error('Falló la generación: '+file);
}
console.log('Entrega generada desde fuentes; sin copias manuales.');
