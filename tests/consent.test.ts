import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../lib/db';
import { classify } from '../lib/classifier';
import { loadRules } from '../lib/rules';
import { ingest, processInbox, applyDisposition, reviewDraft, deliverJobs } from '../lib/operations';
import type { Audit, Job, Lead, MessageInput } from '../lib/types';
const rules = loadRules();
const negatives = [
 'no quiero que un Consejero me llame', 'no quiero que me llame un Consejero', 'no me llamen', 'no necesito un Consejero', 'ya no quiero', 'cancela lo del Consejero', 'no gracias, sin Consejero',
 "I don't want a counselor to call me", "don't have a counselor call me", 'I no longer want a counselor', 'no counselor please', 'I changed my mind'
];
const input = (message: string, n: number): MessageInput => ({eventId: 'CONSENT-'+n,leadId:'CONSENT',timestamp:new Date(Date.UTC(2026,8,20,n)).toISOString(),creator:'CR-ANA',channel:'CTWA',phone:'+12025550100',initialState:'Nuevo',message});
function event(db: Store, message: string, n: number) { ingest(db,input(message,n));processInbox(db,rules); }
function transfer(db: Store) { return applyDisposition(db,{leadId:'CONSENT',disposition:'Transferido',requestId:randomUUID()},rules); }
test('revocación ES/EN: cada variante anula consentimiento y audita transferencia rechazada', () => {
 for(const message of negatives) {
  const db=new Store(':memory:');
  event(db,message.includes('counselor')||message.startsWith('I ')||message.startsWith("don't")?'I owe 18000 USD on a credit card and want a counselor':'Debo 18000 USD en tarjeta y quiero Consejero',1);
  event(db,message,2);
  assert.equal(db.get<Lead>('leads','CONSENT')?.qualification?.wantsCounselor,false,message);
  assert.throws(()=>transfer(db),/consentimiento|transferencia/i,message);
  assert.ok(db.audit<Audit>().some(a=>a.action==='transfer_blocked'),message);
  assert.equal(db.all<Job>('jobs').length,0);db.close();
 }
});
test('consentimiento ambiguo o contradictorio escala sin heredar un sí', () => {
 const previous={amount:18000,debtType:'tarjeta' as const,wantsCounselor:true,eligible:true};
 for(const message of ['Sí, no quiero Consejero', 'Yes, no counselor please', 'quizás quiero Consejero','no sé si quiero Consejero','maybe I want a counselor','Quiero Consejero, pero no quiero que me llame','I want a counselor but no counselor please', 'No quiero Consejero, pero quiero Consejero', "I don't want a counselor but I want a counselor"]) {
  const r=classify(message,rules,previous);
  assert.equal(r.decision,'escalar_humano',message);assert.notEqual(r.qualification.wantsCounselor,true,message);
  assert.match(r.reason,/consentimiento/i,message);
 }
});
test('revocación cancela transferencia pendiente; reafirmación exige una nueva aprobación', async () => {
 for(const no of negatives) {
  const yes = no.includes('counselor') || no.startsWith('I ') || no.startsWith("don't") ? 'I owe 18000 USD on a credit card and want a counselor' : 'Debo 18000 USD en tarjeta y quiero Consejero';
  const db=new Store(':memory:');event(db,yes,1);const old=transfer(db);reviewDraft(db,old.draftId,true,rules);
  event(db,no,2);assert.ok(db.all<Job>('jobs').every(j=>j.status==='cancelled'));
  assert.ok(db.audit<Audit>().some(a=>a.action==='consent_revoked'));assert.throws(()=>transfer(db),/consentimiento/i);
  event(db,yes,3);const fresh=transfer(db);let sends=0;
  await deliverJobs(db,async()=>{sends++});assert.equal(sends,0);
  reviewDraft(db,fresh.draftId,true,rules);await deliverJobs(db,async()=>{sends++});
  assert.equal(sends,2);assert.equal(db.get<Lead>('leads','CONSENT')?.stage,'Transferido');db.close();
 }
});
test('crear y despachar handoff exige consentimiento actual aunque el borrador guarde un sí', async () => {
 const db=new Store(':memory:');event(db,'Debo 18000 USD en tarjeta y quiero Consejero',1);const command=transfer(db);
 const lead=db.get<Lead>('leads','CONSENT')!;
 db.put('leads',lead.leadId,{...lead,qualification:{...lead.qualification!,wantsCounselor:false}});
 assert.throws(()=>reviewDraft(db,command.draftId,true,rules),/transferencia|consentimiento/i);
 assert.ok(db.audit<Audit>().some(a=>a.action==='transfer_blocked'));
 db.put('leads',lead.leadId,lead);reviewDraft(db,command.draftId,true,rules);
 db.put('leads',lead.leadId,{...lead,qualification:{...lead.qualification!,wantsCounselor:null}});
 let handoffs=0;await deliverJobs(db,async j=>{if(j.kind==='handoff')handoffs++});
 assert.equal(handoffs,0);assert.notEqual(db.get<Lead>('leads','CONSENT')?.stage,'Transferido');db.close();
});
test('lead histórico español mantiene precalificación y consentimiento explícito', () => {
 const r=classify('Debo 18000 USD en tarjeta y quiero Consejero',rules);
 assert.equal(r.decision,'responder');assert.deepEqual(r.qualification,{amount:18000,debtType:'tarjeta',wantsCounselor:true,eligible:true});
});

test('negación ajena al contacto conserva previous y no usa declined en ES/EN', () => {
 const messages=['No quiero seguir pagando 18000 por mi tarjeta, necesito ayuda','No necesito más información, debo 9000 en tarjeta',"I don't have a mortgage, I owe 8000 on a credit card"];
 for(const message of messages)for(const value of [true,null] as const){
  const r=classify(message,rules,{amount:18000,debtType:'tarjeta',wantsCounselor:value,eligible:true});
  assert.equal(r.qualification.wantsCounselor,value,message);
  assert.ok(!r.text.includes('No solicitaremos contacto')&&!r.text.includes('We will not request contact'),message);
 }
 for(const message of ['No quiero seguir pagando, necesito Consejero',"I don't want more information; I want a counselor",'Quiero un Consejero, no quiero que me llamen de noche']){
  const r=classify(message,rules,{amount:18000,debtType:'tarjeta',wantsCounselor:true,eligible:true});
  if(message.includes('de noche')){assert.equal(r.decision,'escalar_humano');assert.equal(r.qualification.wantsCounselor,false);}
  else assert.equal(r.qualification.wantsCounselor,true,message);
 }
});
test('negación de pago conserva transferencia; negación de llamada sí la bloquea', async () => {
 for(const [message,allowed] of [['No quiero seguir pagando 18000',true],['No quiero que un Consejero me llame',false],["I don't want to keep paying 18000 on a credit card",true],["I don't want a counselor to call me",false]] as const){
  const db=new Store(':memory:');event(db,message.startsWith('I ')?'I owe 18000 USD on a credit card and want a counselor':'Debo 18000 USD en tarjeta y quiero Consejero',1);event(db,message,2);
  if(allowed){const draft=transfer(db);assert.equal(db.all<Job>('jobs').length,0);reviewDraft(db,draft.draftId,true,rules);await deliverJobs(db,async()=>{});assert.equal(db.get<Lead>('leads','CONSENT')?.stage,'Transferido');}
  else assert.throws(()=>transfer(db),/consentimiento/i);db.close();
 }
});
