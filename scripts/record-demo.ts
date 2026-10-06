import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { Snapshot } from '../lib/snapshot';

const root = process.cwd();
const framesDir = path.join(root, 'runtime', `recording-${Date.now()}`); mkdirSync(framesDir, { recursive: true });
mkdirSync('deliverables', { recursive: true });
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
    Object.assign(el.style, { position: 'fixed', bottom: '18px', left: '275px', right: '28px', background: '#153f35f5', color: 'white', padding: '17px 23px', borderRadius: '10px', zIndex: '1000', boxShadow: '0 5px 25px #0003', pointerEvents: 'none', fontFamily: 'Arial' });
    el.replaceChildren(); const heading = document.createElement('strong'); heading.textContent = title; heading.style.fontSize = '16px';
    const body = document.createElement('div'); body.textContent = detail; Object.assign(body.style, { fontSize: '13px', marginTop: '5px', color: '#d5e6ce' }); el.append(heading, body);
  }, { title, detail });
  console.log(title);
}
const pause = (ms = 6500) => page.waitForTimeout(ms);
const navigate = (label: string) => page.getByRole('navigation').getByRole('button', { name: label }).click();
async function state() { return await (await page.request.get(`${origin}/api/state`)).json() as Snapshot; }
async function simulate(message: string) {
  await page.getByRole('button', { name: '＋ Simular mensaje' }).click();
  await page.getByLabel('Mensaje del lead').fill(message);
  await page.getByRole('button', { name: 'Ingresar mensaje' }).click();
  await expect.poll(async () => (await state()).leads.filter(l => l.message === message && l.leadId.startsWith('DEMO-')).length).toBeGreaterThan(0);
  const lead = (await state()).leads.filter(l => l.message === message && l.leadId.startsWith('DEMO-')).at(-1)!;
  await page.locator('.conversation').filter({ hasText: lead.leadId }).click();
  return lead;
}
try {
  await caption('01 / Una operación ficticia, con límites claros', '48 leads, reglas externas, partner HTTP local y trazabilidad. Ningún envío sale sin aprobación humana.'); await pause(8000);
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
  await caption('11 / Contenido conectado con el negocio', 'Tres guiones priorizados, cada uno ligado a una fuente ficticia. Lenguaje condicional y Consejero como rol del partner.'); await navigate('Estudio de contenido'); await pause(9500);
  await caption('12 / Entrega reproducible', 'README, pruebas, export, notas de escala, decisiones y uso de IA. Todo local: sin cuentas ni servicios de Influgain.'); await navigate('Vista general'); await pause(8000);
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
writeFileSync('deliverables/video-verification.json', JSON.stringify({ durationSeconds: Math.round((end - frames[0].at) / 1000), frames: frames.length, browserErrors: errors, actualUiRecording: true, captioned: true, narration: false }, null, 2));
console.log('Video generado: deliverables/demo.mp4');
