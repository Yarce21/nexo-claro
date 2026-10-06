import { existsSync, readFileSync } from 'node:fs';
import { Store } from '../lib/db';
import { createFixtures } from './fixtures';
import { ingest, processInbox, audit } from '../lib/operations';
import { loadRules } from '../lib/rules';
import type { Lead, MessageInput } from '../lib/types';
const fixtures: MessageInput[] = existsSync('data/leads.json') ? JSON.parse(readFileSync('data/leads.json', 'utf8')) : createFixtures();
const db = new Store();
db.put('system', 'last-valid-rules', loadRules());
if (db.all('inbox').length) console.log('La demo ya contiene datos; setup no los sobrescribe.');
else {
  fixtures.forEach(row => ingest(db, row));
  processInbox(db, loadRules());
  // Historical fixtures explicitly simulate inactivity; live processing uses wall clock.
  db.transaction(() => {
    for (const lead of db.all<Lead>('leads')) db.put('leads', lead.leadId, { ...lead, updatedAt: lead.timestamp });
    audit(db, '-', 'seed', '48 leads ficticios históricos. updatedAt conserva la fecha ficticia para demostrar estancamiento.', 'setup');
  });
  console.log('Demo creada: 48 leads, 30 inscripciones sucias y 10 fuentes.');
}
db.close();
