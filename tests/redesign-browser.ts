import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Snapshot } from '../lib/snapshot';

const origin = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const directory = 'deliverables/redesign';
mkdirSync(directory, { recursive: true });
const views = [
  ['Vista general', 'overview'], ['Bandeja humana', 'inbox'], ['Leads y seguimiento', 'crm'],
  ['Reglas del agente', 'rules'], ['Datos y atribución', 'report'],
  ['Guiones de contenido', 'content'], ['Registro de actividad', 'audit']
] as const;
const navigate = (name: string) => page.getByRole('navigation').getByRole('button', { name }).click();
const requests: { path: string; body: Record<string, unknown> }[] = [];

try {
  await page.goto(origin);
  await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
  await expect(page).toHaveTitle('Nexo Claro · Centro de operaciones');
  await expect(page.locator('.brand')).toContainText('Nexo Claro');
  await page.evaluate(() => document.fonts.ready);
  for (const [name, id] of views) {
    await navigate(name);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: sin desbordamiento desktop`);
    await page.screenshot({ path: `${directory}/${id}-desktop.png`, fullPage: id !== 'crm' && id !== 'audit' && id !== 'report' });
  }
  await navigate('Bandeja humana');
  await expect(page.getByRole('heading', { name: 'Mensaje original' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Información obtenida por el agente' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu decisión' })).toBeVisible();
  await page.getByRole('button', { name: 'Escalamientos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aprobar envío ficticio' })).toHaveCount(0);
  await expect(page.locator('.reason.sensitive')).toBeVisible();
  await page.screenshot({ path: `${directory}/inbox-sensitive.png`, fullPage: true });

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [name, id] of views) {
      await navigate(name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: sin desbordamiento a ${width}px`);
      if (['overview', 'inbox', 'rules', 'content'].includes(id)) await page.screenshot({ path: `${directory}/${id}-${width}.png`, fullPage: true });
    }
  }

  // Intercept only this browser's API calls: UI contract checks cannot alter the live database or rules.
  const state = await (await page.request.get(`${origin}/api/state`)).json() as Snapshot;
  await page.route('**/api/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') await route.fulfill({ json: state });
    else {
      requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() as Record<string, unknown> });
      await route.fulfill({ json: { ok: true, rules: state.rules } });
    }
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate('Bandeja humana');
  await page.getByRole('button', { name: 'Borradores', exact: true }).click();
  const reply = state.drafts.find(d => d.status === 'pending' && d.decision === 'responder')!;
  await page.locator('.conversation').filter({ hasText: reply.leadId }).first().click();
  await page.getByRole('button', { name: 'Aprobar envío ficticio' }).click();
  assert.deepEqual(requests.at(-1), { path: '/api/review', body: { id: reply.id, approved: true } });

  await navigate('Leads y seguimiento');
  const lead = state.leads[0];
  await page.getByRole('textbox', { name: 'Buscar lead' }).fill(lead.leadId);
  await page.getByLabel(`Disposición ${lead.leadId}`).selectOption('Call Back');
  await page.getByLabel('Fecha de llamada (UTC)').fill('2099-01-01T12:00');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  const disposition = requests.at(-1)!;
  assert.equal(disposition.path, '/api/disposition');
  assert.equal(disposition.body.disposition, 'Call Back');
  assert.equal(disposition.body.callbackAt, '2099-01-01T12:00:00.000Z');
  assert.equal(disposition.body.leadId, lead.leadId);
  assert.match(String(disposition.body.requestId), /^[a-f0-9-]{36}$/);

  await navigate('Reglas del agente');
  const updated = { ...state.rules, minDebt: state.rules.minDebt + 1 };
  await page.getByLabel('config/rules.json').fill(JSON.stringify(updated, null, 2));
  await page.getByRole('button', { name: 'Guardar reglas' }).click();
  assert.deepEqual(requests.at(-1), { path: '/api/rules', body: updated });
  await page.getByLabel('config/rules.json').fill('{ inválido');
  const count = requests.length;
  await page.getByRole('button', { name: 'Guardar reglas' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('JSON inválido');
  assert.equal(requests.length, count);

  await page.getByRole('button', { name: 'Simular mensaje', exact: true }).click();
  await page.getByLabel('Mensaje del lead').fill('Debo 18000 USD en tarjeta y quiero Consejero.');
  await page.getByRole('button', { name: 'Ingresar mensaje' }).click();
  const message = requests.at(-1)!;
  assert.equal(message.path, '/api/messages');
  assert.equal(message.body.message, 'Debo 18000 USD en tarjeta y quiero Consejero.');
  assert.equal(message.body.phone, '+12025550190');
  assert.equal(message.body.creator, 'CR-ANA');
  assert.equal(message.body.channel, 'CTWA');
  assert.equal(message.body.initialState, 'Nuevo');
  assert.deepEqual(errors, []);
  writeFileSync(`${directory}/verification.json`, JSON.stringify({ views: 7, widths: [1440, 1280, 390], browserErrors: errors, contractsVerified: ['review', 'disposition / Call Back', 'rules', 'invalid JSON', 'messages'], mutations: 'Interceptadas en navegador; sin modificaciones a datos o reglas reales.' }, null, 2));
  console.log('Rediseño verificado: 7 vistas / 3 tamaños / contratos de UI conservados / 0 errores React.');
} finally { await browser.close(); }
