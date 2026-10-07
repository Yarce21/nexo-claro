import { readFileSync } from 'node:fs';
import { Store } from './db';
import { loadRules, ruleVersion } from './rules';
import { readPartnerCsv, reconcile } from './reporting';
import type { Audit, ContentSource, Draft, Inbox, Job, Lead, Script, Rules } from './types';
export function snapshot(db: Store, now = new Date()) {
  let rules: Rules; let rulesError: string | null = null;
  try { rules = loadRules(); db.put('system', 'last-valid-rules', rules); }
  catch {
    const previous = db.get<Rules>('system', 'last-valid-rules');
    if (!previous) throw new Error('No hay una versión válida de reglas. Corrija config/rules.json y ejecute setup.');
    rules = previous;
    rulesError = 'El archivo de reglas es inválido. El worker está detenido; corrija el JSON. La pantalla muestra la última versión válida.';
  }
  const leads = db.all<Lead>('leads');
  const drafts = db.all<Draft>('drafts').reverse();
  const jobs = db.all<Job>('jobs').reverse();
  const report = reconcile(readPartnerCsv(db.get<{text:string}>('system','partner-csv')?.text || readFileSync('data/partner-dirty.csv', 'utf8')), leads, now);
  const content = JSON.parse(readFileSync('data/content.json', 'utf8')) as { sources: ContentSource[]; scripts: Script[] };
  const stale = leads.filter(l => !['No le interesa', 'Transferido'].includes(l.stage) && now.getTime() - Date.parse(l.updatedAt) > rules.staleHours * 3600000);
  const inbox = db.all<Inbox>('inbox');
  return {
    leads, drafts, jobs, report, content, stale, rules, rulesError, ruleVersion: ruleVersion(rules),
    audit: db.audit<Audit>().slice(0, 250), inbox,
    worker: db.get<{ timestamp: string; error: string | null }>('system', 'worker') || null,
    partner: db.get<{ mode: string }>('system', 'partner') || { mode: 'healthy' },
    metrics: {
      leads: leads.length, pending: drafts.filter(d => d.status === 'pending').length,
      escalated: drafts.filter(d => d.status === 'pending' && d.decision === 'escalar_humano').length,
      qualified: leads.filter(l => l.qualification?.eligible && !l.optedOut).length,
      transferred: leads.filter(l => l.stage === 'Transferido').length,
      enrolled: report.filter(r => r.accepted).length,
      quarantine: report.filter(r => !r.accepted).length,
      failed: jobs.filter(j => j.status === 'failed').length + inbox.filter(i => i.status === 'failed').length
    }
  };
}
export type Snapshot = ReturnType<typeof snapshot>;
