import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';

export function files(root:string, directory:string):string[] {
 const full=path.join(root,directory);
 if(!existsSync(full))return [];
 return readdirSync(full,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(root,path.join(directory,entry.name)):[path.join(directory,entry.name)]).sort();
}
export function sourceFingerprint(root:string):string {
 const hash=createHash('sha256');
 for(const file of ['app','lib','config'].flatMap(dir=>files(root,dir)).sort()) {
  // Normalize line endings so a Windows checkout and a clean clone have the same content identity.
  hash.update(file.replaceAll('\\','/')+'\0');hash.update(readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n'));hash.update('\0');
 }
 return hash.digest('hex');
}
export function deliveryIssues(root:string,testCount:number,lastSourceCommit=0):string[] {
 const issues:string[]=[];
 const previous=new RegExp(['alivio','norte'].join('[ -]?'),'i');
 const directories=['app','lib','config','data','docs','scripts','tests','public','deliverables'];
 const listed=[...directories.flatMap(dir=>files(root,dir)),...['README.md','package.json','package-lock.json','.gitignore','AGENTS.md','CLAUDE.md'].filter(f=>existsSync(path.join(root,f)))];
 for(const file of listed.filter(f=>/\.(tsx?|mjs|json|md|css|csv|svg|txt)$/.test(f)||f==='.gitignore'))if(previous.test(readFileSync(path.join(root,file),'utf8')))issues.push('marca anterior: '+file);
 for(const item of ['docs','data','config','README.md'])if(existsSync(path.join(root,'deliverables',item)))issues.push('copias de fuentes en deliverables: '+item);
 const sourceFiles=['docs','data','config'].flatMap(dir=>files(root,dir)).concat(existsSync(path.join(root,'README.md'))?['README.md']:[]);
 const sourceHashes=new Set(sourceFiles.map(f=>createHash('sha256').update(readFileSync(path.join(root,f))).digest('hex')));
 for(const file of files(root,'deliverables'))if(sourceHashes.has(createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex')))issues.push('copias idénticas de fuentes: '+file);
 for(const file of ['README.md',...files(root,'docs')].filter(f=>existsSync(path.join(root,f)))) {
  const text=readFileSync(path.join(root,file),'utf8');
  for(const match of text.replaceAll('*','').matchAll(/(?:test-count:\s*(\d+)|(\d+)\s+(?:pruebas|tests)(?:\s+aprobadas)?|Pruebas automatizadas:\s*(\d+))/gi)) {
   if(Number(match[1]||match[2]||match[3])!==testCount)issues.push('conteo documental incorrecto: '+file);
  }
 }
 const expectedFingerprint=sourceFingerprint(root);
 for(const metadata of ['deliverables/video-verification.json','deliverables/screenshots/manifest.json']) {
  try {
   const value=JSON.parse(readFileSync(path.join(root,metadata),'utf8')) as {generatedAt:string;sourceFingerprint:string;durationSeconds?:number;captures:string[]};
   if(value.sourceFingerprint!==expectedFingerprint||!Number.isFinite(Date.parse(value.generatedAt))||Date.parse(value.generatedAt)<lastSourceCommit)issues.push('artefacto obsoleto: '+metadata);
   if(metadata.includes('video-')&&(!Number.isFinite(value.durationSeconds)||value.durationSeconds!>=360||value.durationSeconds!<=0))issues.push('duración de video inválida');
   if(!Array.isArray(value.captures)||!value.captures.length)issues.push('capturas ausentes: '+metadata);
   else for(const file of value.captures)if(path.basename(file)!==file||!existsSync(path.join(root,'deliverables/screenshots',file)))issues.push('captura ausente o ruta inválida: '+file);
  }catch {issues.push('metadata ausente o inválida: '+metadata)}
 }
 if(!existsSync(path.join(root,'deliverables/demo.mp4')))issues.push('video ausente');
 return issues;
}
