import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Store } from '../lib/db';
import { snapshot } from '../lib/snapshot';
import type { Audit } from '../lib/types';
const target = path.join(process.cwd(), 'deliverables'); mkdirSync(target, { recursive: true });
const db = new Store(); const state = snapshot(db);
writeFileSync(path.join(target, 'demo-export.json'), JSON.stringify({ exportedAt: new Date().toISOString(), fictional: true, ...state, audit: db.audit<Audit>() }, null, 2));
// Formula prefixes are escaped because reviewers may open the CSV in a spreadsheet.
const cell = (v: unknown) => { const s = String(v ?? ''); return `"${(/^[=+@\-]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
const headers = ['row', 'enrollment_id', 'normalizedPhone', 'leadId', 'attributedCreator', 'accepted', 'issues'] as const;
writeFileSync(path.join(target, 'reconciliation.csv'), '\ufeff' + [headers.join(','), ...state.report.map(r => headers.map(k => cell(Array.isArray(r[k]) ? r[k].join('; ') : r[k])).join(','))].join('\n'));
writeFileSync(path.join(target, 'metrics.json'), JSON.stringify({ ...state.metrics, stale: state.stale.map(l => l.leadId), definition: 'Inscripciones conciliadas / leads recibidos. CSV histórico independiente del handoff simulado.' }, null, 2));
writeFileSync(path.join(target, 'content-scripts.md'), '# Guiones de contenido ficticio\n\n' + state.content.scripts.map(s => `## ${s.priority}. ${s.title}\n\nFuente ${s.sourceId}: ${state.content.sources.find(f => f.id === s.sourceId)?.text}\n\n${s.text}\n\nPrioridad: ${s.rationale}\n\nDuración: ${s.text.split(/\s+/).length} palabras; 30–45 s a ritmo de 140–160 palabras/minuto.\n`).join('\n'));
console.log(`Export guardado en ${target}`); db.close();
