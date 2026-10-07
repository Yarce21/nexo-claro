import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { sourceFingerprint } from './delivery-integrity';
import type { Snapshot } from '../lib/snapshot';

const root = process.cwd();
const framesDir = path.join(root, 'runtime', `recording-${Date.now()}`); mkdirSync(framesDir, { recursive: true });
mkdirSync('deliverables', { recursive: true });
mkdirSync('deliverables/screenshots', { recursive: true });
const fingerprint = sourceFingerprint(root);
const captures: string[] = [];
const checks: string[] = [];
const browser = await chromium.launch({ channel: process.env.DEMO_BROWSER || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const origin = 'http://127.0.0.1:3000';
await page.goto(origin); await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
const original = await (await page.request.get(`${origin}/api/state`)).json() as Snapshot;
const frames: { file: string; at: number }[] = [];
let recording = true;
const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
async function capture() {
  while (recording) {
    const file = path.join(framesDir, `frame-${String(frames.length).padStart(5, '0')}.png`);
    await page.screenshot({ path: file }); frames.push({ file, at: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 450));
  }
}
const capturing = capture();
async function caption(title: string, detail: string) {
  await page.evaluate(({ title, detail }) => {
    let el = document.getElementById('demo-caption');
    if (!el) { el = document.createElement('div'); el.id = 'demo-caption'; document.body.append(el); }
    Object.assign(el.style, { position: 'fixed', bottom: '18px', left: '275px', right: '28px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '17px 23px', borderRadius: '10px', zIndex: '1000', pointerEvents: 'none', fontFamily: 'inherit' });
    el.replaceChildren(); const heading = document.createElement('strong'); heading.textContent = title; heading.style.fontSize = '16px';
    const body = document.createElement('div'); body.textContent = detail; Object.assign(body.style, { fontSize: '13px', marginTop: '5px', color: 'var(--muted)' }); el.append(heading, body);
  }, { title, detail });
  console.log(title);
}
const pause = (ms = 6500) => page.waitForTimeout(ms);
const navigate = (label: string) => page.getByRole('navigation').getByRole('button', { name: label }).click();
async function state() { return await (await page.request.get(`${origin}/api/state`)).json() as Snapshot; }
async function screenshot(name: string) {
  // Captions belong to the video; they would obscure operational data in stills, especially on mobile.
  await page.locator('#demo-caption').evaluate(el => { el.style.visibility = 'hidden'; });
  try { await page.screenshot({ path: `deliverables/screenshots/${name}` }); captures.push(name); }
  finally { await page.locator('#demo-caption').evaluate(el => { el.style.visibility = 'visible'; }); }
}
async function simulate(message: string) {
  await page.getByRole('button', { name: 'Simular mensaje', exact: true }).click();
  await page.getByLabel('Mensaje del lead').fill(message);
  await page.getByRole('button', { name: 'Ingresar mensaje' }).click();
  await expect.poll(async () => (await state()).leads.filter(l => l.message === message && l.leadId.startsWith('DEMO-')).length).toBeGreaterThan(0);
  const lead = (await state()).leads.filter(l => l.message === message && l.leadId.startsWith('DEMO-')).at(-1)!;
  await page.locator('.conversation').filter({ hasText: lead.leadId }).click();
  return lead;
}
try {
  await expect(page.getByText('Nexo Claro', { exact: true }).first()).toBeVisible(); checks.push('brand');
  await caption('01 / Una operación ficticia, con límites claros', '48 leads, reglas externas, partner HTTP local y trazabilidad. Ningún envío sale sin aprobación humana.'); await pause(8000);
  await screenshot('overview-light-es.png');
  await page.locator('.theme-toggle').click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); checks.push('dark');
  await caption('02 / Inglés y modo oscuro', 'El idioma de la conversación es independiente de la consola. El mensaje en inglés genera un borrador con Counselor.');
  const englishLead = await simulate('I owe 18000 USD on a credit card and want to talk to a counselor.');
  await expect.poll(async () => (await state()).leads.find(l => l.leadId === englishLead.leadId)?.lang).toBe('en');
  await expect.poll(async () => (await state()).drafts.find(d => d.leadId === englishLead.leadId)?.text.includes('Counselor')).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Human inbox', exact: true })).toBeVisible();
  await screenshot('inbox-dark-en.png'); await pause(6500); checks.push('english');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await navigate('Leads y seguimiento'); await page.getByRole('textbox', { name: 'Buscar lead' }).fill(englishLead.leadId);
  await page.getByLabel(`Disposición ${englishLead.leadId}`).selectOption('Transferido'); await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect.poll(async () => (await state()).leads.find(l => l.leadId === englishLead.leadId)?.stage).toBe('Transferencia pendiente');
  const withdrawal = await page.request.post(`${origin}/api/messages`, { data: { eventId: `VIDEO-REVOKE-${randomUUID()}`, leadId: englishLead.leadId, timestamp: new Date().toISOString(), creator: englishLead.creator, channel: englishLead.channel, phone: englishLead.phone, initialState: 'Nuevo', message: "I don't want a counselor to call me" } });
  expect(withdrawal.status()).toBe(202);
  await expect.poll(async () => (await state()).leads.find(l => l.leadId === englishLead.leadId)?.qualification?.wantsCounselor).toBe(false);
  await caption('03 / Retirar consentimiento bloquea la transferencia', 'El lead cambia de opinión. La transferencia pendiente se cancela y el nuevo intento queda rechazado y auditado.');
  await page.getByLabel(`Disposición ${englishLead.leadId}`).selectOption('Transferido'); await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'consentimiento explícito actual' })).toBeVisible();
  expect((await state()).jobs.filter(j => j.leadId === englishLead.leadId)).toHaveLength(0); checks.push('consent-revoked-transfer-rejected');
  await screenshot('consent-revoked.png'); await pause(7000); await page.getByRole('button', { name: 'Cerrar error' }).click();
  await caption('04 / Monedas no USD requieren un humano', 'CHF no se convierte ni se asume USD: motivo explícito, monto sin validar y ningún envío.');
  const currencyLead = await simulate('I owe 18000 CHF on a credit card');
  await expect(page.locator('.reason').first()).toContainText('Moneda');
  expect((await state()).drafts.find(d => d.leadId === currencyLead.leadId)?.decision).toBe('escalar_humano');
  await expect(page.getByRole('button', { name: 'Aprobar envío ficticio' })).toHaveCount(0); checks.push('non-usd-escalated');
  await screenshot('currency-escalated.png'); await pause(6500);
  await page.locator('.theme-toggle').click();
  await caption('02 / El agente responde con un borrador', 'Ingresamos un mensaje nuevo. El worker lo consume aunque el navegador no esté abierto.');
  const lead = await simulate('Debo 18000 USD en tarjeta y quiero hablar con un Consejero.');
  await expect(page.getByRole('button', { name: 'Aprobar envío ficticio' })).toBeVisible(); await pause(9000);
  await page.getByRole('button', { name: 'Aprobar envío ficticio' }).click();
  await expect.poll(async () => (await state()).jobs.some(j => j.leadId === lead.leadId && j.status === 'delivered')).toBe(true);
  await caption('03 / Aprobación explícita y recibo del simulador', 'El humano aprueba. Solo entonces aparece el trabajo y el partner confirma el envío ficticio.'); await navigate('Registro de actividad'); await pause(7500);
  await caption('04 / Una solicitud sensible se escala', 'La palabra demanda activa revisión humana: motivo, contexto y resumen. No hay botón para enviar.');
  await simulate('Debo 18000 USD en tarjeta y tengo una demanda urgente.');
  await expect(page.getByRole('button', { name: 'Cerrar revisión sin envío' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprobar envío ficticio' })).toHaveCount(0); await pause(9000);
  await caption('05 / Cambiar el criterio sin tocar código', 'Subimos el monto mínimo de 5000 a 20000 USD en el JSON. La versión queda en la auditoría.');
  await navigate('Reglas del agente'); await page.getByLabel('config/rules.json').fill(JSON.stringify({ ...original.rules, minDebt: 20000 }, null, 2)); await pause(3500);
  await page.getByRole('button', { name: 'Guardar reglas' }).click(); await pause(4000);
  await caption('06 / El mismo monto, otra decisión', 'Con el nuevo mínimo, una deuda de 18000 USD queda fuera del criterio ficticio y se escala.');
  await simulate('Debo 18000 USD en tarjeta y deseo hablar con un Consejero.'); await expect(page.locator('.reason').first()).toContainText('Fuera'); await pause(8500);
  await navigate('Reglas del agente'); await page.getByLabel('config/rules.json').fill(JSON.stringify(original.rules, null, 2)); await page.getByRole('button', { name: 'Guardar reglas' }).click();
  await caption('07 / CRM: Transferido requiere revisión y confirmación', 'Aplicamos la disposición. Primero pasa a Transferencia pendiente y crea un borrador; todavía no hay handoff.');
  await navigate('Leads y seguimiento'); await page.getByRole('textbox', { name: 'Buscar lead' }).fill(lead.leadId);
  await page.getByLabel(`Disposición ${lead.leadId}`).selectOption('Transferido'); await page.getByRole('button', { name: 'Aplicar', exact: true }).click(); await pause(6500);
  await navigate('Bandeja humana'); await page.locator('.conversation').filter({ hasText: lead.leadId }).first().click(); await pause(4500); await page.getByRole('button', { name: 'Aprobar envío ficticio' }).click();
  await expect.poll(async () => (await state()).leads.find(l => l.leadId === lead.leadId)?.stage).toBe('Transferido');
  await navigate('Leads y seguimiento'); await page.getByRole('textbox', { name: 'Buscar lead' }).fill(lead.leadId); await pause(6500);
  await caption('08 / Errores visibles y recuperación', 'Activamos HTTP 503. Un envío aprobado se reintenta tres veces y queda en la cola de fallos, sin perderse.');
  await navigate('Registro de actividad'); await page.getByRole('button', { name: 'Simular partner caído' }).click();
  const retryLead = await simulate('Debo 16000 USD en tarjeta y quiero Consejero.'); await page.getByRole('button', { name: 'Aprobar envío ficticio' }).click();
  await navigate('Registro de actividad');
  await expect.poll(async () => (await state()).jobs.some(j => j.leadId === retryLead.leadId && j.status === 'failed'), { timeout: 30000 }).toBe(true); await pause(4000);
  await caption('09 / Restaurar y reintentar, con evidencia', 'El operador restaura el partner y autoriza el reintento. La clave idempotente evita duplicar el recibo.');
  await page.getByRole('button', { name: 'Restaurar partner' }).click(); await page.getByRole('button', { name: 'Reintentar', exact: true }).first().click();
  await expect.poll(async () => (await state()).jobs.some(j => j.leadId === retryLead.leadId && j.status === 'delivered')).toBe(true); await pause(6500);
  await caption('10 / No atribuir comisiones con evidencia dudosa', 'El CSV conserva sus errores. Teléfonos incompatibles, creadores ausentes y duplicados quedan en cuarentena.'); await navigate('Datos y atribución'); await pause(9500);
  await caption('11 / Contenido conectado con el negocio', 'Tres guiones priorizados, cada uno ligado a una fuente ficticia. Lenguaje condicional y Consejero como rol del partner.'); await navigate('Guiones de contenido'); await pause(9500);
  await caption('12 / Entrega reproducible', 'README, pruebas, export, notas de escala, decisiones y uso de IA. Todo local: sin cuentas ni servicios de Influgain.'); await navigate('Vista general'); await pause(8000);
  await screenshot('overview-final.png');
  await page.locator('#demo-caption').evaluate(el => { el.style.visibility = 'hidden'; });
  await page.setViewportSize({ width: 390, height: 844 }); await screenshot('mobile-light-es.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (errors.length) throw new Error(errors.join('; '));
} finally {
  await page.request.post(`${origin}/api/rules`, { data: original.rules });
  await page.request.post(`${origin}/api/partner`, { data: { mode: 'healthy' } });
  recording = false; await capturing; await browser.close();
}
const end = Date.now();
const concat = frames.map((frame, i) => `file '${frame.file.replace(/\\/g, '/')}'\nduration ${((frames[i + 1]?.at || end) - frame.at) / 1000}`).join('\n') + `\nfile '${frames.at(-1)!.file.replace(/\\/g, '/')}'\n`;
const list = path.join(framesDir, 'frames.txt'); writeFileSync(list, concat);
const ffmpeg = process.env.FFMPEG_PATH || path.join(root, 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
if (!existsSync(ffmpeg)) throw new Error('Defina FFMPEG_PATH con la ruta absoluta de ffmpeg.');
await new Promise<void>((resolve, reject) => {
  const child = spawn(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-r', '12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', path.join(root, 'deliverables', 'demo.mp4')], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  let stderr = ''; child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
});
const inspection = spawnSync(ffmpeg, ['-i', path.join(root, 'deliverables', 'demo.mp4')], { encoding: 'utf8', windowsHide: true });
const duration = inspection.stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
if (!duration) throw new Error('No se pudo verificar la duración del video codificado.');
const durationSeconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
if (durationSeconds >= 360 || sourceFingerprint(root) !== fingerprint) throw new Error('Video demasiado largo o fuentes modificadas durante la grabación.');
const metadata = { generatedAt: new Date().toISOString(), sourceFingerprint: fingerprint, captures, durationSeconds, frames: frames.length, browserErrors: errors, checks, actualUiRecording: true, captioned: true, narration: false };
writeFileSync('deliverables/video-verification.json', JSON.stringify(metadata, null, 2));
writeFileSync('deliverables/screenshots/manifest.json', JSON.stringify(metadata, null, 2));
if (path.dirname(framesDir) === path.join(root, 'runtime') && path.basename(framesDir).startsWith('recording-')) rmSync(framesDir, { recursive: true, force: true });
console.log('Video generado: deliverables/demo.mp4');
