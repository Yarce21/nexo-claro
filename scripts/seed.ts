import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Store} from '../lib/db';
import {createFixtures,loadLeadFixtures,materializePartnerCsv} from './fixtures';
import {ingest,processInbox,audit} from '../lib/operations';
import {loadRules} from '../lib/rules';
import type {Lead} from '../lib/types';

export function seedDemo(db:Store,now=new Date()) {
 if(!existsSync('data/leads.json'))createFixtures();
 const rules=loadRules();db.put('system','last-valid-rules',rules);
 if(db.all('inbox').length){console.log('La demo ya contiene datos; setup no los sobrescribe.');return;}
 const fixtures=loadLeadFixtures(now,rules.staleHours);
 fixtures.forEach(row=>ingest(db,row));processInbox(db,rules);
 // Freeze simulated partner history at setup; polling must not move enrollment dates.
 db.transaction(()=>{
  db.put('system','partner-csv',{text:materializePartnerCsv(now)});
  for(const lead of db.all<Lead>('leads'))db.put('leads',lead.leadId,{...lead,updatedAt:lead.timestamp});
  audit(db,'-','seed','48 leads con offsets relativos a setup: recientes y estancados; histórico del partner fijado al mismo corte.','setup');
 });
 console.log('Demo creada: 48 leads, 30 inscripciones sucias y 10 fuentes.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const db=new Store();try{seedDemo(db);}finally{db.close();}
}
