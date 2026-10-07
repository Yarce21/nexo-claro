import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { classify, SAFETY_FLOOR } from '../lib/classifier';
import { conversationTemplates, crmTemplate, detectLanguage } from '../lib/conversation';
import { loadRules } from '../lib/rules';
import { Store } from '../lib/db';
import { applyDisposition, ingest, processInbox, reviewDraft } from '../lib/operations';
import { dispositions, type Draft, type Job, type Lead, type MessageInput } from '../lib/types';
const rules = loadRules();
const message: MessageInput = { eventId: 'EN-1', leadId: 'EN-LEAD', timestamp: '2026-09-20T10:00:00.000Z', creator: 'CR-ANA', channel: 'CTWA', message: 'I owe 18000 USD on a credit card. I want to talk to a counselor.', phone: '+12025550101', initialState: 'Nuevo' };

test('todas las plantillas salientes ES/EN cumplen compliance, incluidas CRM y preguntas', () => {
  function collect(value: unknown): string[] { return typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(collect); }
  const forbidden = /\basesor(?:es)?\b|\badvisors?\b|\bgarantizamos\b|\bguarantee(?:d|s)?\b|%|por\s+ciento|percent|\btasas?\b|\brates?\b|\bfees?\b|[$€£]\s*\d|\d[\d.,]*\s*(?:USD|EUR|COP|dollars?|pesos)\b/i;
  for (const text of collect(conversationTemplates)) { assert.doesNotMatch(text, forbidden, text); assert.doesNotMatch(text, /\d/, 'Las plantillas base no incorporan cifras; fechas solo mediante contexto validado'); }
  for (const lang of ['es', 'en'] as const) for (const disposition of dispositions) assert.doesNotMatch(crmTemplate(lang, disposition, '2099-01-01T10:00:00.000Z'), forbidden);
  assert.match(conversationTemplates.en.complete, /could/);
  assert.match(conversationTemplates.en.consent, /Counselor/);
});
test('inglés: respuesta, tipos de deuda y consentimiento positivo/negativo', () => {
  const result = classify(message.message, rules);
  assert.equal(result.decision, 'responder');
  assert.deepEqual(result.qualification, { amount: 18000, debtType: 'tarjeta', wantsCounselor: true, eligible: true });
  assert.match(result.text, /Counselor/);
  assert.equal(classify('I owe 9000 USD on a personal loan', rules).qualification.debtType, 'prestamo_personal');
  assert.equal(classify("I owe 18000 USD on a credit card. I don't want to talk to a counselor", rules).qualification.wantsCounselor, false);
  assert.equal(classify('I do not want to speak with a counselor', rules).qualification.wantsCounselor, false);
  assert.equal(classify('I don’t want to talk to a counselor', rules).qualification.wantsCounselor, false);
});
test('inglés: ignorar publicidad, baja y escalamiento por seguridad o monto', () => {
  assert.equal(classify('Advertising: earn money', rules).decision, 'ignorar');
  for (const text of ['stop', 'unsubscribe', 'do not contact me']) { const result = classify(text, rules); assert.equal(result.decision, 'ignorar'); assert.equal(result.stop, true); }
  for (const text of ['I have a lawsuit', 'I owe 18000 USD on a mortgage', 'I owe 18,000 USD on a credit card', 'I owe -18000 USD on a credit card', 'I owe 18000 CAD on a credit card', 'I owe between 10000 and 20000 USD', 'I need a guaranteed rate', 'What is my credit score?']) assert.equal(classify(text, rules).decision, 'escalar_humano', text);
  for (const word of SAFETY_FLOOR.handoff) assert.equal(classify(word, { ...rules, handoffWords: [], handoffWordsEn: [] }).decision, 'escalar_humano', word);
});
test('un lead español histórico conserva decisión, calificación y texto originales', () => {
  const result = classify('Debo 18000 USD en tarjeta y quiero Consejero.', rules);
  assert.equal(result.decision, 'responder');
  assert.deepEqual(result.qualification, { amount: 18000, debtType: 'tarjeta', wantsCounselor: true, eligible: true });
  assert.equal(result.text, 'Gracias. Un agente revisará tus datos y tu solicitud de hablar con un Consejero de Consejería Clara. En muchos casos podría haber opciones para organizar los pagos; dependen de una evaluación y no se garantiza ahorro ni aceptación.');
  assert.equal(crmTemplate('es', 'No Answer'), 'Hola, somos Nexo Claro. No logramos conversar. Si quieres retomar, dinos un horario conveniente.');
  assert.equal(classify('Debo 9000 USD en préstamo personal', rules).decision, 'responder', 'Personal es una palabra compartida, no evidencia inglesa');
});
test('idioma ambiguo, mixto o contradictorio con lang requiere confirmación humana', () => {
  assert.equal(detectLanguage('18000 USD'), 'ambiguous');
  assert.equal(detectLanguage('Hola I owe 18000 USD'), 'mixed');
  for (const text of ['18000 USD', '???', 'Hola I owe 18000 USD on a credit card']) {
    const result = classify(text, rules); assert.equal(result.decision, 'escalar_humano'); assert.match(result.reason, /Idioma (ambiguo|mixto)/);
  }
  assert.equal(classify(message.message, rules, null, 'es').decision, 'escalar_humano');
  assert.equal(classify('Hola stop', rules).stop, true, 'La baja prevalece aun en idioma mixto');
});
test('eventos no se mutan al detectar idioma y CRM usa el idioma del lead', () => {
  const db = new Store(':memory:');
  ingest(db, message); processInbox(db, rules);
  assert.equal(db.get<Lead>('leads', message.leadId)?.lang, 'en');
  assert.equal(ingest(db, message).duplicate, true);
  assert.equal(ingest(db, { ...message, lang: 'es' }).duplicate, true, 'Campo ausente equivale a es en comparación heredada');
  assert.throws(() => ingest(db, { ...message, lang: 'en' }), /contenido diferente/);
  for (const disposition of ['No Answer', 'Info Sent', 'Call Back'] as const) {
    const result = applyDisposition(db, { leadId: message.leadId, disposition, requestId: randomUUID(), ...(disposition === 'Call Back' ? { callbackAt: '2099-01-01T10:00:00.000Z' } : {}) }, rules);
    assert.equal(db.get<Draft>('drafts', result.draftId)?.text, crmTemplate('en', disposition, disposition === 'Call Back' ? '2099-01-01T10:00:00.000Z' : ''));
  }
  db.close();
});
test('baja inglesa invalida envíos aprobados y bloquea contacto', () => {
  const db = new Store(':memory:'); ingest(db, message); processInbox(db, rules);
  reviewDraft(db, `draft-${message.eventId}`, true, rules);
  ingest(db, { ...message, eventId: 'EN-STOP', timestamp: '2026-09-20T11:00:00.000Z', message: 'Please do not contact me' }); processInbox(db, rules);
  assert.equal(db.get<Lead>('leads', message.leadId)?.optedOut, true);
  assert.ok(db.all<Job>('jobs').every(job => job.status === 'cancelled'));
  assert.throws(() => applyDisposition(db, { leadId: message.leadId, disposition: 'Info Sent', requestId: randomUUID() }, rules), /baja/);
  db.close();
});
test('CRM heredado sin lang usa español y una conversación nueva ambigua no inventa idioma', () => {
  const db = new Store(':memory:');
  ingest(db, { ...message, message: 'Debo 18000 USD en tarjeta y quiero Consejero' }); processInbox(db, rules);
  const lead = db.get<Lead>('leads', message.leadId)!;
  const { lang: _language, ...legacy } = lead;
  db.put('leads', message.leadId, legacy);
  const draft = applyDisposition(db, { leadId: message.leadId, disposition: 'Info Sent', requestId: randomUUID() }, rules);
  assert.equal(db.get<Draft>('drafts', draft.draftId)?.text, conversationTemplates.es.crm['Info Sent']);
  ingest(db, { ...message, eventId: 'UNKNOWN-1', leadId: 'UNKNOWN', message: '18000 USD' }); processInbox(db, rules);
  assert.equal(db.get<Lead>('leads', 'UNKNOWN')?.lang, undefined);
  assert.equal(db.get<Lead>('leads', 'UNKNOWN')?.needsReview, true);
  db.close();
});
