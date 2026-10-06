import { parse } from 'csv-parse/sync';
import { phoneNumber } from './operations';
import type { CleanRow, Lead, PartnerRow } from './types';
export function readPartnerCsv(csv: string): PartnerRow[] {
  const rows = parse(csv, { columns: true, bom: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const expected = ['enrollment_id', 'phone', 'creator_id', 'enrolled_at', 'status'];
  if (!rows.length || expected.some(k => !(k in rows[0]))) throw new Error('CSV sin columnas obligatorias.');
  return rows.map((r, i) => ({ row: i + 2, enrollment_id: r.enrollment_id, phone: r.phone, creator_id: r.creator_id, enrolled_at: r.enrolled_at, status: r.status }));
}
function isoDate(value: string): string | null {
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(candidate)) return null;
  const stamp = Date.parse(candidate);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== candidate.slice(0, 10)) return null;
  return new Date(stamp).toISOString();
}
export function reconcile(rows: PartnerRow[], leads: Lead[], now = new Date()): CleanRow[] {
  const identities = new Map<string, PartnerRow[]>();
  for (const row of rows) identities.set(row.enrollment_id, [...(identities.get(row.enrollment_id) || []), row]);
  const acceptedLeads = new Set<string>();
  const seen = new Set<string>();
  return rows.map(row => {
    const issues: string[] = [];
    const normalizedPhone = phoneNumber(row.phone);
    const matches = leads.filter(l => phoneNumber(l.phone) && phoneNumber(l.phone) === normalizedPhone);
    const lead = matches.length === 1 ? matches[0] : null;
    const date = isoDate(row.enrolled_at);
    const group = identities.get(row.enrollment_id)!;
    const variants = new Set(group.map(r => JSON.stringify([phoneNumber(r.phone), r.creator_id, r.enrolled_at, r.status])));
    if (!row.enrollment_id) issues.push('enrollment_id vacío');
    if (variants.size > 1) issues.push('ID duplicado con datos contradictorios');
    if (seen.has(row.enrollment_id)) issues.push('duplicado');
    seen.add(row.enrollment_id);
    if (!normalizedPhone) issues.push('teléfono inválido');
    else if (!matches.length) issues.push('teléfono sin coincidencia');
    else if (matches.length > 1) issues.push('teléfono ambiguo');
    if (!date) issues.push('fecha inválida o ambigua');
    else if (date > now.toISOString()) issues.push('fecha futura');
    else if (lead && date < (lead.acquiredAt || lead.timestamp)) issues.push('inscripción anterior al lead');
    if (!row.creator_id) issues.push('creator_id vacío; sin comisión');
    else if (lead && row.creator_id !== lead.creator) issues.push('creator_id contradictorio');
    if (row.status !== 'enrolled') issues.push('estado no inscrito');
    if (lead && acceptedLeads.has(lead.leadId)) issues.push('lead ya inscrito; posible duplicado');
    const accepted = issues.length === 0 && lead !== null;
    if (accepted) acceptedLeads.add(lead.leadId);
    return { ...row, normalizedPhone, leadId: lead?.leadId || null, attributedCreator: accepted ? row.creator_id : null, enrolled_at: date || row.enrolled_at, issues, accepted };
  });
}
