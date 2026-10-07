import { test } from 'node:test';
import assert from 'node:assert/strict';
import {loadLeadFixtures,materializePartnerCsv} from '../scripts/fixtures';
import { readPartnerCsv, reconcile } from '../lib/reporting';
import { phoneNumber } from '../lib/operations';
import type { Lead, PartnerRow } from '../lib/types';
const now = new Date('2026-10-06T12:00:00Z');
const leads:Lead[] = loadLeadFixtures(now,48).map(row=>({...row,acquiredAt:row.timestamp,stage:'Nuevo',updatedAt:row.timestamp,optedOut:false,needsReview:false,qualification:null}));
const rows = readPartnerCsv(materializePartnerCsv(now));
test('fixtures cumplen volumen y tienen defectos explícitos', () => {
  assert.ok(leads.length >= 40); assert.ok(rows.length >= 25);
  const result = reconcile(rows, leads, now);
  assert.ok(result.some(r => r.accepted)); assert.ok(result.some(r => !r.accepted));
  assert.ok(result.filter(r => !r.accepted).every(r => r.attributedCreator === null));
  assert.equal(new Set(result.filter(r => r.accepted).map(r => r.leadId)).size, result.filter(r => r.accepted).length);
});
test('teléfonos normaliza únicamente la numeración ficticia reservada', () => {
  assert.equal(phoneNumber('(202) 555-0100'), '+12025550100');
  assert.equal(phoneNumber('+1 202 555 0199'), '+12025550199');
  assert.equal(phoneNumber('+573001234567'), null); assert.equal(phoneNumber(''), null);
});
test('todos los registros con ID contradictorio se retienen, incluido el primero', () => {
  const result = reconcile(rows, leads, now).filter(r => r.enrollment_id === 'EN-003');
  assert.equal(result.length, 2); assert.ok(result.every(r => !r.accepted && r.issues.includes('ID duplicado con datos contradictorios')));
});
test('no infiere fechas ambiguas ni corrige fechas imposibles', () => {
  for (const value of ['09/10/26', '2026-02-30', '2099-01-01', '2020-01-01']) {
    const row: PartnerRow = { ...rows[0], enrolled_at: value };
    assert.equal(reconcile([row], leads, now)[0].accepted, false, value);
  }
});
test('un mismo teléfono en dos leads impide atribución automática', () => {
  const ambiguous = [...leads, { ...leads[0], leadId: 'duplicate-phone' }];
  const result = reconcile([rows[0]], ambiguous, now)[0]; assert.equal(result.accepted, false); assert.ok(result.issues.includes('teléfono ambiguo'));
});
test('CSV entiende comillas y rechaza columnas incompletas', () => {
  const parsed = readPartnerCsv('enrollment_id,phone,creator_id,enrolled_at,status\n"A,1",+12025550100,CR-ANA,2026-09-25,enrolled\n');
  assert.equal(parsed[0].enrollment_id, 'A,1'); assert.throws(() => readPartnerCsv('id,phone\n1,2'));
});
