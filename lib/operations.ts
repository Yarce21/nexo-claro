import { crmTemplate, conversationTemplates, detectLanguage } from './conversation';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './db';
import { classify } from './classifier';
import { ruleVersion } from './rules';
import { dispositions, messageSchema, type Audit, type Draft, type Inbox, type Job, type Lead, type Rules } from './types';

export class DomainError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
function eligibleNow(lead: Lead, rules: Rules) {
  const q = lead.qualification;
  return !!q && q.amount !== null && q.amount >= rules.minDebt && q.amount <= rules.maxDebt && rules.eligibleTypes.some(type => type === q.debtType);
}
export function audit(db: Store, leadId: string, action: string, reason: string, actor = 'worker', draftId?: string) {
  const item: Audit = { id: randomUUID(), timestamp: new Date().toISOString(), leadId, action, reason, actor, draftLink: draftId ? `/?tab=inbox&draft=${draftId}` : null };
  db.append(item);
}
export function phoneNumber(phone: string): string | null {
  const digits = phone.replace(/[\s()+.-]/g, '');
  // Reserved fictional numbers only. This demo must never address real recipients.
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return /^120255501\d{2}$/.test(normalized) ? `+${normalized}` : null;
}
export function ingest(db: Store, value: unknown) {
  const input = messageSchema.parse(value);
  return db.transaction(() => {
    const previous = db.get<Inbox>('inbox', input.eventId);
    if (previous) {
      // Omitted lang and explicit es are equivalent for legacy events. Detection
      // never mutates the stored event used by this comparison.
      const canonical = (value: typeof input) => JSON.stringify(Object.fromEntries(Object.entries({ ...value, lang: value.lang || 'es' }).sort(([a], [b]) => a.localeCompare(b))));
      if (canonical(previous.input) !== canonical(input)) throw new DomainError('eventId reutilizado con contenido diferente.', 409);
      return { eventId: input.eventId, duplicate: true };
    }
    const lead = db.get<Lead>('leads', input.leadId);
    if (lead && (lead.creator !== input.creator || lead.phone !== input.phone || lead.channel !== input.channel)) throw new DomainError('La identidad del lead no coincide con el registro original.', 409);
    db.put<Inbox>('inbox', input.eventId, { input, status: 'pending' });
    audit(db, input.leadId, 'ingested', 'Mensaje recibido en cola durable.', 'webhook');
    return { eventId: input.eventId, duplicate: false };
  });
}
export function processInbox(db: Store, rules: Rules) {
  for (const candidate of db.all<Inbox>('inbox').filter(item => item.status === 'pending').slice(0, 50)) {
    try {
      db.transaction(() => {
        const item = db.get<Inbox>('inbox', candidate.input.eventId);
        if (!item || item.status !== 'pending') return;
        const input = item.input;
        const previous = db.get<Lead>('leads', input.leadId);
        if (previous && (previous.creator !== input.creator || previous.phone !== input.phone || previous.channel !== input.channel)) throw new DomainError('Identidad inconsistente entre eventos encolados.');
        const result = classify(input.message, rules, previous?.qualification, input.lang);
        if (previous?.needsReview && result.decision === 'responder') { result.decision = 'escalar_humano'; result.reason = 'Existe un caso sensible sin resolver; revisión humana obligatoria.'; result.text = conversationTemplates[input.lang || (detectLanguage(input.message) === 'en' ? 'en' : 'es')].history; }
        if (previous?.optedOut) { result.decision = 'ignorar'; result.reason = 'Lead con baja previa; contacto bloqueado.'; result.text = ''; }
        const now = new Date().toISOString();
        const draftId = `draft-${input.eventId}`;
        // Late events remain auditable but must not overwrite newer qualification.
        if (previous && input.timestamp < previous.timestamp && !result.stop) {
          audit(db, input.leadId, 'ignorar', 'Evento atrasado; no altera el estado actual.');
          db.put<Inbox>('inbox', input.eventId, { ...item, status: 'done' });
          return;
        }
        const detected = detectLanguage(input.message);
        const lead: Lead = { ...input, lang: detected === 'en' || detected === 'es' ? detected : previous?.lang || input.lang, acquiredAt: previous?.acquiredAt || previous?.timestamp || input.timestamp, stage: previous?.stage === 'Transferencia pendiente' ? 'Nuevo' : previous?.stage || 'Nuevo', updatedAt: now, optedOut: previous?.optedOut || result.stop, needsReview: previous?.needsReview || result.decision === 'escalar_humano', qualification: result.qualification };
        if (result.decision === 'escalar_humano') lead.stage = 'Revisión humana';
        if (lead.optedOut) lead.stage = 'No le interesa';
        db.put('leads', input.leadId, lead);
        if (previous?.qualification?.wantsCounselor === true && lead.qualification?.wantsCounselor !== true) audit(db, lead.leadId, 'consent_revoked', 'Consentimiento retirado o ambiguo; transferencia pendiente cancelada.');
        for (const job of db.all<Job>('jobs').filter(j => j.leadId === lead.leadId && (j.status === 'pending' || j.status === 'processing'))) {
          db.put('jobs', job.id, { ...job, status: 'cancelled', error: lead.optedOut ? 'Baja solicitada.' : 'Nuevo mensaje; la aprobación anterior perdió vigencia.' });
          audit(db, lead.leadId, 'delivery_cancelled', 'Nuevo contexto invalida el envío pendiente.', 'worker', job.draftId);
        }
        // A newer message invalidates pending replies; prevents sending stale advice.
        for (const old of db.all<Draft>('drafts').filter(d => d.leadId === lead.leadId && d.status === 'pending')) db.put('drafts', old.id, { ...old, status: 'rejected' });
        if (result.decision !== 'ignorar') {
          const draft: Draft = { id: draftId, leadId: input.leadId, eventId: input.eventId, decision: result.decision, reason: result.reason, text: result.text, status: 'pending', createdAt: now, ruleVersion: ruleVersion(rules), qualification: result.qualification, kind: 'chat', transfer: false };
          db.put('drafts', draftId, draft);
        }
        audit(db, input.leadId, result.decision, `${result.reason} Regla ${ruleVersion(rules)}.`, 'worker', result.decision === 'ignorar' ? undefined : draftId);
        db.put<Inbox>('inbox', input.eventId, { ...item, status: 'done' });
      });
    } catch (error) {
      db.transaction(() => {
        db.put<Inbox>('inbox', candidate.input.eventId, { ...candidate, status: 'failed', error: error instanceof Error ? error.message : 'Error desconocido' });
        audit(db, candidate.input.leadId, 'inbox_failed', 'Evento retenido en cola de fallos.');
      });
    }
  }
}
const dispositionSchema = z.object({ leadId: z.string().min(1), disposition: z.enum(dispositions), requestId: z.string().uuid(), callbackAt: z.iso.datetime().optional() }).strict();
export function applyDisposition(db: Store, input: unknown, rules: Rules) {
  const command = dispositionSchema.parse(input);
  if (command.disposition === 'Transferido') {
    const current = db.get<Lead>('leads', command.leadId);
    if (current && (current.optedOut || current.needsReview || !eligibleNow(current, rules) || current.qualification?.wantsCounselor !== true)) {
      // Persist the denied attempt outside the transaction that would roll back on error.
      audit(db, current.leadId, 'transfer_blocked', 'Transferencia rechazada: consentimiento explícito actual y precalificación vigente obligatorios.', 'operador-demo');
      throw new DomainError('Transferencia bloqueada: requiere consentimiento explícito actual, precalificación vigente y ninguna revisión sensible pendiente.', 409);
    }
  }
  return db.transaction(() => {
    const seen = db.get<{ command: unknown; draftId: string }>('commands', command.requestId);
    if (seen) {
      if (JSON.stringify(seen.command) !== JSON.stringify(command)) throw new DomainError('requestId reutilizado.', 409);
      return { draftId: seen.draftId, duplicate: true };
    }
    const lead = db.get<Lead>('leads', command.leadId);
    if (!lead) throw new DomainError('Lead no encontrado.', 404);
    if (lead.optedOut && command.disposition !== 'No le interesa') throw new DomainError('El lead solicitó baja; no puede contactarse.', 409);
    if (lead.needsReview && command.disposition !== 'No le interesa') throw new DomainError('Resuelva la revisión sensible desde la bandeja antes de aplicar una disposición.', 409);
    if (command.disposition === 'Transferido' && (!eligibleNow(lead, rules) || lead.qualification?.wantsCounselor !== true || lead.needsReview)) throw new DomainError('Transferencia bloqueada: requiere precalificación vigente, consentimiento explícito y ninguna revisión sensible pendiente.', 409);
    if (command.disposition === 'Call Back' && (!command.callbackAt || Date.parse(command.callbackAt) <= Date.now())) throw new DomainError('Call Back requiere fecha futura en UTC.');

    const id = `crm-${command.requestId}`;
    const draft: Draft = { id, leadId: lead.leadId, eventId: lead.eventId, decision: 'responder', reason: `Disposición ${command.disposition} aplicada por humano.`, text: crmTemplate(lead.lang || 'es', command.disposition, command.callbackAt), status: command.disposition === 'No le interesa' ? 'rejected' : 'pending', createdAt: new Date().toISOString(), ruleVersion: ruleVersion(rules), qualification: lead.qualification!, kind: 'crm', transfer: command.disposition === 'Transferido' };
    const stage = command.disposition === 'Transferido' ? 'Transferencia pendiente' : command.disposition;
    db.put('leads', lead.leadId, { ...lead, stage, updatedAt: new Date().toISOString(), optedOut: lead.optedOut || command.disposition === 'No le interesa' });
    if (command.disposition === 'No le interesa') {
      for (const old of db.all<Draft>('drafts').filter(d => d.leadId === lead.leadId && d.status === 'pending')) db.put('drafts', old.id, { ...old, status: 'rejected' });
      for (const job of db.all<Job>('jobs').filter(j => j.leadId === lead.leadId && ['pending', 'processing'].includes(j.status))) db.put('jobs', job.id, { ...job, status: 'cancelled' });
    }
    db.put('drafts', id, draft);
    db.put('commands', command.requestId, { command, draftId: id, callbackAt: command.callbackAt });
    audit(db, lead.leadId, 'disposition', `${command.disposition} → ${stage}${command.callbackAt ? `; llamada ${command.callbackAt}` : ''}`, 'operador-demo', id);
    return { draftId: id, duplicate: false };
  });
}
export function reviewDraft(db: Store, id: string, approved: boolean, rules: Rules) {
  const candidate = db.get<Draft>('drafts', id);
  if (approved && candidate?.transfer) {
    const current = db.get<Lead>('leads', candidate.leadId);
    if (!current || current.optedOut || current.needsReview || !eligibleNow(current, rules) || current.qualification?.wantsCounselor !== true) {
      audit(db, candidate.leadId, 'transfer_blocked', 'Aprobación de transferencia rechazada: falta consentimiento actual o precalificación vigente.', 'operador-demo', id);
      throw new DomainError('Transferencia bloqueada: falta consentimiento explícito actual o precalificación vigente.', 409);
    }
  }
  return db.transaction(() => {
    const draft = db.get<Draft>('drafts', id);
    if (!draft) throw new DomainError('Borrador no encontrado.', 404);
    if (draft.status !== 'pending') throw new DomainError('El borrador ya fue revisado.', 409);
    const lead = db.get<Lead>('leads', draft.leadId)!;
    if (approved && (lead.optedOut || draft.decision !== 'responder')) throw new DomainError('Escalamientos y bajas no se pueden enviar. Revise o descarte el caso.', 409);
    if (approved && (draft.eventId !== lead.eventId || draft.ruleVersion !== ruleVersion(rules))) throw new DomainError('Borrador desactualizado. Reingrese el mensaje con un eventId nuevo para evaluarlo con las reglas actuales.', 409);
    if (approved && draft.transfer && (!eligibleNow(lead, rules) || lead.qualification?.wantsCounselor !== true || lead.needsReview)) throw new DomainError('El lead ya no cumple las condiciones de transferencia.', 409);
    db.put('drafts', id, { ...draft, status: approved ? 'approved' : 'rejected' });
    if (!approved && draft.decision === 'escalar_humano' && draft.eventId === lead.eventId) {
      db.put('leads', lead.leadId, { ...lead, needsReview: false, stage: 'Revisado por humano', updatedAt: new Date().toISOString() });
    }
    if (approved) {
      for (const kind of (draft.transfer ? ['whatsapp', 'handoff'] : ['whatsapp']) as Job['kind'][]) {
        const job: Job = { id: `${id}-${kind}`, leadId: draft.leadId, draftId: id, kind, status: 'pending', attempts: 0, maxAttempts: rules.maxAttempts, retryBaseSeconds: rules.retryBaseSeconds, nextAt: new Date().toISOString(), payload: { phone: lead.phone, text: draft.text } };
        db.put('jobs', job.id, job);
      }
    }
    audit(db, draft.leadId, approved ? 'approved' : 'rejected', approved ? 'Humano autorizó envío al simulador local.' : 'Humano cerró el borrador sin envío.', 'operador-demo', id);
    return { id, approved };
  });
}
export function retryFailure(db: Store, id: string, rules: Rules) {
  db.transaction(() => {
    const job = db.get<Job>('jobs', id);
    if (!job || job.status !== 'failed') throw new DomainError('Solo se pueden reintentar fallos terminales.', 409);
    const lead = db.get<Lead>('leads', job.leadId)!;
    if (lead.optedOut || !phoneNumber(lead.phone)) throw new DomainError('Corrija el teléfono por un proceso humano o respete la baja; no es un error transitorio.');
    const draft = db.get<Draft>('drafts', job.draftId);
    if (!draft || draft.status !== 'approved' || draft.eventId !== lead.eventId || draft.ruleVersion !== ruleVersion(rules) || lead.needsReview) throw new DomainError('La autorización perdió vigencia; genere y revise un borrador nuevo.', 409);
    if (job.kind === 'handoff' && (!eligibleNow(lead, rules) || lead.qualification?.wantsCounselor !== true)) throw new DomainError('El consentimiento o la precalificación ya no permiten la transferencia.', 409);
    db.put('jobs', id, { ...job, status: 'pending', attempts: 0, nextAt: new Date().toISOString(), error: undefined });
    audit(db, job.leadId, 'manual_retry', 'Reintento manual autorizado.', 'operador-demo', job.draftId);
  });
}
export async function deliverJobs(db: Store, send: (job: Job) => Promise<void>, now = new Date()) {
  const candidates = db.all<Job>('jobs').filter(j => (j.status === 'pending' && j.nextAt <= now.toISOString()) || (j.status === 'processing' && (j.leaseUntil || '') <= now.toISOString())).slice(0, 20);
  for (const candidate of candidates) {
    const claimed = db.transaction(() => {
      const job = db.get<Job>('jobs', candidate.id)!;
      if (!((job.status === 'pending' && job.nextAt <= now.toISOString()) || (job.status === 'processing' && (job.leaseUntil || '') <= now.toISOString()))) return null;
      const lead = db.get<Lead>('leads', job.leadId)!;
      if (lead.optedOut) { db.put('jobs', job.id, { ...job, status: 'cancelled' }); return null; }
      if (job.kind === 'handoff' && (lead.needsReview || lead.qualification?.wantsCounselor !== true || db.get<Draft>('drafts', job.draftId)?.status !== 'approved')) {
        db.put('jobs', job.id, { ...job, status: 'cancelled', error: 'Transferencia bloqueada: consentimiento actual o aprobación humana ausentes.' });
        audit(db, lead.leadId, 'transfer_blocked', 'Handoff cancelado: consentimiento actual o aprobación humana ausentes.', 'worker', job.draftId);
        return null;
      }
      if (job.attempts >= job.maxAttempts) { db.put('jobs', job.id, { ...job, status: 'failed', error: 'Lease expirado tras agotar intentos; revisar recibo del partner.' }); audit(db, job.leadId, 'delivery_failed', 'Intentos agotados tras interrupción del worker.'); return null; }
      const next: Job = { ...job, status: 'processing', attempts: job.attempts + 1, leaseUntil: new Date(now.getTime() + 30000).toISOString() };
      db.put('jobs', job.id, next);
      return next;
    });
    if (!claimed) continue;
    try {
      if (!phoneNumber(claimed.payload.phone)) throw new DomainError('Sin teléfono ficticio válido; revisión manual necesaria.');
      await send(claimed);
      db.transaction(() => {
        const latest = db.get<Job>('jobs', claimed.id)!;
        if (latest.status === 'cancelled') { audit(db, claimed.leadId, 'delivery_race', 'El simulador recibió un envío que ya estaba en curso al solicitarse la baja.'); return; }
        db.put('jobs', claimed.id, { ...claimed, status: 'delivered', error: undefined, leaseUntil: undefined });
        if (claimed.kind === 'handoff') {
          const lead = db.get<Lead>('leads', claimed.leadId)!;
          db.put('leads', lead.leadId, { ...lead, stage: 'Transferido', updatedAt: new Date().toISOString() });
        }
        audit(db, claimed.leadId, 'delivered', `${claimed.kind}: recibo confirmado por simulador, intento ${claimed.attempts}.`, 'worker', claimed.draftId);
      });
    } catch (error) {
      db.transaction(() => {
        if (db.get<Job>('jobs', claimed.id)?.status === 'cancelled') return;
        const terminal = error instanceof DomainError || claimed.attempts >= claimed.maxAttempts;
        const reason = error instanceof Error ? error.message : 'Error desconocido';
        db.put('jobs', claimed.id, { ...claimed, status: terminal ? 'failed' : 'pending', leaseUntil: undefined, error: reason, nextAt: new Date(now.getTime() + claimed.retryBaseSeconds * 1000 * 2 ** (claimed.attempts - 1)).toISOString() });
        audit(db, claimed.leadId, terminal ? 'delivery_failed' : 'retry_scheduled', reason, 'worker', claimed.draftId);
      });
    }
  }
}
