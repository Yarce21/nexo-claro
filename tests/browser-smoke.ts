import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:3000');
await page.getByText('Cada conversación, un siguiente paso.').waitFor();
await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
mkdirSync('deliverables/screenshots', { recursive: true });
await page.screenshot({ path: 'deliverables/screenshots/overview.png', fullPage: true });
for (const label of ['Bandeja humana', 'Leads y seguimiento', 'Datos y atribución', 'Estudio de contenido', 'Reglas del agente', 'Registro de actividad']) {
  await page.getByRole('navigation').getByRole('button', { name: label }).click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('main h1').count(), 1);
}
await page.getByRole('navigation').getByRole('button', { name: 'Bandeja humana' }).click();
await page.screenshot({ path: 'deliverables/screenshots/inbox.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('navigation').getByRole('button', { name: 'Vista general' }).click();
await page.screenshot({ path: 'deliverables/screenshots/mobile.png', fullPage: true });
const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: Array.from(document.querySelectorAll('body *')).filter(el => el.getBoundingClientRect().right > innerWidth && getComputedStyle(el).position !== 'fixed').slice(0, 20).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })) }));
if (overflow.scrollWidth > overflow.width) { console.log(JSON.stringify(overflow)); await browser.close(); throw new Error('La vista móvil no debe desbordar horizontalmente'); }
assert.deepEqual(errors, [], 'Sin errores de ejecución en React');
const invalid = await page.request.post('http://127.0.0.1:3000/api/messages', { data: { bad: true } }); assert.equal(invalid.status(), 400);
const blocked = await page.request.post('http://127.0.0.1:3000/api/messages', { data: {}, headers: { origin: 'https://untrusted.example' } }); assert.equal(blocked.status(), 403);
console.log('Browser smoke OK: 7 vistas, móvil sin desbordamiento, 0 errores React, validación 400 y origen externo 403.');
await browser.close();
