import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/db';
import { snapshot } from '@/lib/snapshot';
import { applyDisposition, audit, DomainError, ingest, reviewDraft, retryFailure } from '@/lib/operations';
import { loadRules, ruleVersion, saveRules } from '@/lib/rules';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function guard(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(host || '')) throw new DomainError('Demo solo local.', 403);
  const origin = req.headers.get('origin');
  if (origin && origin !== `http://${req.headers.get('host')}`) throw new DomainError('Origen no permitido.', 403);
  if (req.method !== 'GET' && !req.headers.get('content-type')?.startsWith('application/json')) throw new DomainError('Se requiere application/json.', 415);
}
function failure(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.', details: error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  console.error(error);
  return NextResponse.json({ error: 'Error interno. Revise la consola del servidor.' }, { status: 500 });
}
export async function GET(req: NextRequest) {
  try {
    guard(req);
    if (!req.nextUrl.pathname.endsWith('/state')) throw new DomainError('Ruta inexistente.', 404);
    return NextResponse.json(snapshot(store()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    guard(req);
    // Read a bounded stream rather than trusting Content-Length.
    const reader = req.body?.getReader();
    let size = 0; const chunks: Uint8Array[] = [];
    if (reader) while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 16000) { await reader.cancel(); throw new DomainError('Payload demasiado grande.', 413); } chunks.push(item.value); }
    const input: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const route = req.nextUrl.pathname.split('/').pop(); const db = store();
    switch (route) {
      case 'messages': return NextResponse.json(ingest(db, input), { status: 202 });
      case 'disposition': return NextResponse.json(applyDisposition(db, input, loadRules()));
      case 'review': {
        const v = z.object({ id: z.string(), approved: z.boolean() }).strict().parse(input);
        return NextResponse.json(reviewDraft(db, v.id, v.approved, loadRules()));
      }
      case 'rules': {
        let before = 'archivo inválido';
        try { before = ruleVersion(loadRules()); } catch { /* Valid replacement can repair an invalid external file. */ }
        const rules = saveRules(input);
        audit(db, '-', 'rules_updated', `${before} → ${ruleVersion(rules)}; afecta mensajes nuevos.`, 'operador-demo');
        return NextResponse.json({ rules });
      }
      case 'partner': {
        const v = z.object({ mode: z.enum(['healthy', 'down']) }).strict().parse(input);
        db.transaction(() => { db.put('system', 'partner', v); audit(db, '-', 'partner_mode', `Simulador: ${v.mode}`, 'operador-demo'); });
        return NextResponse.json(v);
      }
      case 'retry': {
        const v = z.object({ id: z.string() }).strict().parse(input); retryFailure(db, v.id, loadRules()); return NextResponse.json({ ok: true });
      }
      default: throw new DomainError('Ruta inexistente.', 404);
    }
  } catch (error) { return failure(error); }
}
