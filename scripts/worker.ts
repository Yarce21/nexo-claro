import { Store } from '../lib/db';
import { deliverJobs, processInbox } from '../lib/operations';
import { loadRules } from '../lib/rules';
const db = new Store();
let running = true;
process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });
async function run() {
  while (running) {
    try {
      const rules = loadRules();
      db.put('system', 'last-valid-rules', rules);
      processInbox(db, rules);
      await deliverJobs(db, async job => {
        const response = await fetch('http://127.0.0.1:4010/delivery', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': job.id },
          body: JSON.stringify(job), signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error(`Partner ficticio respondió HTTP ${response.status}.`);
        const receipt = await response.json() as { accepted?: boolean; id?: string };
        if (receipt.accepted !== true || receipt.id !== job.id) throw new Error('Recibo inválido del simulador.');
      });
      db.put('system', 'worker', { timestamp: new Date().toISOString(), error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado';
      console.error('[worker]', message);
      db.put('system', 'worker', { timestamp: new Date().toISOString(), error: message });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  db.close();
}
void run();
