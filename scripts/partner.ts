import { createServer } from 'node:http';
import { Store } from '../lib/db';
import { phoneNumber } from '../lib/operations';
import type { Job } from '../lib/types';
const db = new Store();
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST' || req.url !== '/delivery') { res.writeHead(404).end('{}'); return; }
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 16000) { res.writeHead(413).end('{}'); return; } }
    const job = JSON.parse(body) as Job;
    if (!job.id || req.headers['idempotency-key'] !== job.id || !phoneNumber(job.payload?.phone || '')) { res.writeHead(400).end('{}'); return; }
    const config = db.get<{ mode: string }>('system', 'partner') || { mode: 'healthy' };
    const receipt = db.get('receipts', job.id);
    if (receipt) { res.end(JSON.stringify({ accepted: true, id: job.id, duplicate: true })); return; }
    if (config.mode === 'down') { res.writeHead(503).end(JSON.stringify({ error: 'Fallo ficticio activado por operador.' })); return; }
    db.put('receipts', job.id, { id: job.id, kind: job.kind, leadId: job.leadId, receivedAt: new Date().toISOString(), fictional: true });
    res.end(JSON.stringify({ accepted: true, id: job.id }));
  } catch { res.writeHead(400).end('{}'); }
});
server.listen(4010, '127.0.0.1', () => console.log('Consejería Clara: simulador local en 127.0.0.1:4010'));
server.on('error', error => { console.error(`No se pudo iniciar el partner local: ${error.message}. Verifique que el puerto 4010 esté libre.`); db.close(); process.exit(1); });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
