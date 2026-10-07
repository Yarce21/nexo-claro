import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {deliveryIssues,sourceFingerprint} from '../scripts/delivery-integrity';
function fixture(){const root=mkdtempSync(path.join(tmpdir(),'nexo-delivery-test-'));for(const dir of ['lib','app','config','docs','deliverables/screenshots'])mkdirSync(path.join(root,dir),{recursive:true});writeFileSync(path.join(root,'lib/example.ts'),'export const value=1;');writeFileSync(path.join(root,'README.md'),'Pruebas automatizadas: **50**.\n<!-- test-count: 50 -->');writeFileSync(path.join(root,'deliverables/demo.mp4'),'test video');writeFileSync(path.join(root,'deliverables/screenshots/overview.png'),'test capture');const metadata={generatedAt:new Date().toISOString(),sourceFingerprint:sourceFingerprint(root),durationSeconds:120,captures:['overview.png']};writeFileSync(path.join(root,'deliverables/video-verification.json'),JSON.stringify(metadata));writeFileSync(path.join(root,'deliverables/screenshots/manifest.json'),JSON.stringify(metadata));return root;}
test('integridad de entrega detecta marca anterior y copias de fuentes',()=>{
 const root=fixture();try{writeFileSync(path.join(root,'docs/old.md'),['Alivio','Norte'].join(' '));mkdirSync(path.join(root,'deliverables/docs'));assert.ok(deliveryIssues(root,50).some(e=>e.includes('marca')));assert.ok(deliveryIssues(root,50).some(e=>e.includes('copias')));}finally{rmSync(root,{recursive:true,force:true});}
});
test('integridad de entrega detecta artefactos obsoletos y conteo documental incorrecto',()=>{
 const root=fixture();try{writeFileSync(path.join(root,'lib/example.ts'),'export const value=2;');writeFileSync(path.join(root,'docs/tests.md'),'27 pruebas aprobadas');const issues=deliveryIssues(root,50);assert.ok(issues.some(e=>e.includes('obsoleto')));assert.ok(issues.some(e=>e.includes('conteo')));}finally{rmSync(root,{recursive:true,force:true});}
});
test('integridad acepta artefactos vinculados a fuentes y conteo real',()=>{
 const root=fixture();try{assert.deepEqual(deliveryIssues(root,50),[]);}finally{rmSync(root,{recursive:true,force:true});}
});
