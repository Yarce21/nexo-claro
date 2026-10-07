import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store} from '../lib/db';
import {snapshot} from '../lib/snapshot';
import {seedDemo} from '../scripts/seed';

test('setup conserva mezcla de recientes y estancados e idempotencia',()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'nexo-seed-test-'));
 let db:Store|undefined;
 try{
  const setup=()=>{const result=spawnSync(process.execPath,['--import','tsx','scripts/seed.ts'],{env:{...process.env,DATA_DIR:directory},encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stdout+result.stderr);};
  setup();db=new Store(path.join(directory,'operations.sqlite')); const store=db;
  const state=snapshot(store);assert.equal(state.leads.length,48);assert.ok(state.stale.length>0&&state.stale.length<state.leads.length);assert.ok(state.leads.some(lead=>!['No le interesa','Transferido'].includes(lead.stage)&&!state.stale.some(old=>old.leadId===lead.leadId)),'Debe haber leads operativos recientes');
  const initial=store.all('leads');setup();assert.deepEqual(db.all('leads'),initial);
 }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});

test('semilla relativa conserva offsets y defectos del partner hoy y dentro de un mes', t=>{
 const today=new Date();
 for(const now of [today,new Date(today.getTime()+31*24*3600000)]){
  t.mock.method(Date,'now',()=>now.getTime());
  const db=new Store(':memory:');
  try{
   seedDemo(db,now);const state=snapshot(db,now);
   assert.equal(state.leads.length,48);assert.equal(state.stale.length,11);
   assert.equal(state.report.filter(row=>row.accepted).length,16);
   assert.ok(state.report.some(row=>row.issues.includes('fecha futura')));
   assert.ok(state.report.some(row=>row.issues.includes('inscripción anterior al lead')));
   const before=db.all('leads');seedDemo(db,new Date(now.getTime()+3600000));assert.deepEqual(db.all('leads'),before);
  }finally{db.close();t.mock.restoreAll();}
 }
});

