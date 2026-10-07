import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors: string[] = [];
const recordError = (error: Error) => errors.push(error.message);
page.on('pageerror', recordError);
await page.goto('http://127.0.0.1:3000');
await page.getByRole('heading', { name: 'Vista general', exact: true }).waitFor();
await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
const theme = page.locator('.theme-toggle');
await theme.focus(); await page.keyboard.press('Enter');
assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
assert.equal(await page.evaluate(() => localStorage.getItem('nexo-theme')), 'dark');
await page.reload(); await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
await theme.focus(); await page.keyboard.press('Space');
assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'La elección guardada prevalece sobre el sistema');
await page.evaluate(() => localStorage.removeItem('nexo-theme')); await page.reload();
await page.getByText('Leads recibidos', { exact: true }).first().waitFor();
assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Sin elección guardada se usa prefers-color-scheme');
await page.getByRole('button', { name: 'English', exact: true }).click();
await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
assert.equal(await page.locator('html').getAttribute('lang'), 'en');
await page.reload(); await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
assert.equal(await page.evaluate(() => localStorage.getItem('nexo-language')), 'en');
await page.getByRole('button', { name: 'Español', exact: true }).click();
await page.getByRole('heading', { name: 'Vista general', exact: true }).waitFor();
for (const label of ['Bandeja humana', 'Leads y seguimiento', 'Datos y atribución', 'Guiones de contenido', 'Reglas del agente', 'Registro de actividad']) {
  await page.getByRole('navigation').getByRole('button', { name: label }).click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('main h1').count(), 1);
}
await page.getByRole('navigation').getByRole('button', { name: 'Bandeja humana' }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('navigation').getByRole('button', { name: 'Vista general' }).click();
const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: Array.from(document.querySelectorAll('body *')).filter(el => el.getBoundingClientRect().right > innerWidth && getComputedStyle(el).position !== 'fixed').slice(0, 20).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })) }));
if (overflow.scrollWidth > overflow.width) { console.log(JSON.stringify(overflow)); await browser.close(); throw new Error('La vista móvil no debe desbordar horizontalmente'); }
assert.deepEqual(errors, [], 'Sin errores de ejecución en React');
// Test rendered text, not just palette tokens: table rows, badges, errors,
// placeholder copy and disabled controls at both desktop and mobile sizes.
async function checkContrast() {
  await page.waitForTimeout(200);
  const failures = await page.evaluate(String.raw`(() => {
    function color(value) { const c = value.match(/[\d.]+/g)?.map(Number) || []; return [c[0] || 0, c[1] || 0, c[2] || 0, c[3] ?? 1]; }
    function luminance(rgb) { return rgb.slice(0, 3).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, b, i) => a + b * [.2126, .7152, .0722][i], 0); }
    function background(el) {
      if (!el) return [255, 255, 255];
      const c = color(getComputedStyle(el).backgroundColor);
      if (c[3] === 1) return c;
      const parent = background(el.parentElement);
      return c.slice(0, 3).map((v, i) => v * c[3] + parent[i] * (1 - c[3]));
    }
    const failures = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg,script,.sr-only') || !el.getBoundingClientRect().width || getComputedStyle(el).visibility === 'hidden') continue;
      const style = getComputedStyle(el);
      const direct = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      if (!direct && !el.matches('input,textarea,select')) continue;
      const bg = luminance(background(el)); const fg = luminance(color(style.color));
      const ratio = (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
      if (ratio < 4.5) failures.push(el.tagName + '.' + el.className + ': ' + el.textContent?.trim().slice(0, 55) + ' ' + ratio.toFixed(2));
      if (el.matches('input[placeholder],textarea[placeholder]')) {
        const placeholder = luminance(color(getComputedStyle(el, '::placeholder').color));
        const ratio = (Math.max(placeholder, bg) + .05) / (Math.min(placeholder, bg) + .05);
        if (ratio < 4.5) failures.push('placeholder ' + ratio.toFixed(2));
      }
    }
    return failures;
  })()`);
  assert.deepEqual(failures, [], 'Texto con contraste mínimo 4.5:1');
}
for (const mode of ['light', 'dark']) {
  await page.evaluate(mode => { document.documentElement.dataset.theme = mode; }, mode);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const label of ['Vista general', 'Bandeja humana', 'Leads y seguimiento', 'Datos y atribución', 'Guiones de contenido', 'Reglas del agente', 'Registro de actividad']) {
      await page.getByRole('navigation').getByRole('button', { name: label }).click();
      await checkContrast();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${label} en ${mode}, ${width}px`);
    }
    await page.getByRole('navigation').getByRole('button', { name: 'Reglas del agente' }).click();
    await page.locator('#rules').fill('{'); await page.getByRole('button', { name: 'Guardar reglas' }).click();
    await page.locator('main [role="alert"]').waitFor(); await checkContrast();
    await page.getByRole('button', { name: 'Cerrar error' }).click();
    await page.getByRole('button', { name: 'Simular mensaje', exact: true }).click(); await checkContrast();
    await page.getByRole('button', { name: 'Simular mensaje', exact: true }).click();
    // Exercise actual disabled style through a pending, intercepted request.
    const stateResponse = await page.request.get('http://127.0.0.1:3000/api/state');
    assert.equal(stateResponse.ok(), true);
    await page.locator('#rules').fill(JSON.stringify((await stateResponse.json()).rules));
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/rules', async route => { await pending; await route.fulfill({ status: 400, json: { error: 'Datos inválidos.' } }); });
    await page.getByRole('button', { name: 'Guardar reglas' }).click();
    await page.getByRole('button', { name: 'Guardar reglas' }).isDisabled().then(value => assert.equal(value, true));
    await checkContrast(); release();
    await page.locator('main [role="alert"]').waitFor(); await page.unroute('**/api/rules');
    await page.getByRole('button', { name: 'Cerrar error' }).click();
  }
}
await page.getByRole('button', { name: 'English', exact: true }).click();
for (const label of ['Overview', 'Human inbox', 'Leads and follow-up', 'Data and attribution', 'Content scripts', 'Agent rules', 'Activity log']) {
  await page.getByRole('navigation').getByRole('button', { name: label }).click();
  assert.equal(await page.locator('main h1').textContent(), label);
  await checkContrast();
}
await page.getByRole('navigation').getByRole('button', { name: 'Leads and follow-up' }).click();
assert.equal(await page.locator('.disposition-form select').first().inputValue(), 'Info Sent', 'Traducir no cambia los valores internos');
const dispositionRequest = page.waitForRequest(req => req.url().endsWith('/api/disposition') && req.method() === 'POST');
await page.route('**/api/disposition', route => route.fulfill({ status: 400, json: { error: 'Datos inválidos.' } }));
await page.locator('.disposition-form').first().getByRole('button', { name: 'Apply', exact: true }).click();
const dispositionPayload = (await dispositionRequest).postDataJSON();
assert.equal(dispositionPayload.disposition, 'Info Sent');
assert.match(dispositionPayload.requestId, /^[a-f0-9-]{36}$/);
await page.locator('main [role="alert"]').waitFor();
assert.match(await page.locator('main [role="alert"]').innerText(), /Invalid data/);
await page.unroute('**/api/disposition');
await page.getByRole('button', { name: 'Español', exact: true }).click();
assert.match(await page.locator('main [role="alert"]').innerText(), /Datos inválidos/);
const privateContext = await browser.newContext({ colorScheme: 'dark' });
await privateContext.addInitScript("Storage.prototype.getItem=function(){throw new Error('blocked')};Storage.prototype.setItem=function(){throw new Error('blocked')};");
const privatePage = await privateContext.newPage();
privatePage.on('pageerror', recordError);
await privatePage.goto('http://127.0.0.1:3000');
await privatePage.getByRole('heading', { name: 'Vista general', exact: true }).waitFor();
assert.equal(await privatePage.locator('html').getAttribute('data-theme'), 'dark');
await privatePage.locator('.theme-toggle').click();
assert.equal(await privatePage.locator('html').getAttribute('data-theme'), 'light');
await privatePage.getByRole('button', { name: 'English', exact: true }).click();
await privatePage.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
assert.equal(await privatePage.locator('html').getAttribute('lang'), 'en');
await privateContext.close();
assert.deepEqual(errors, [], 'Sin errores React después de alternar tema e idioma');
const invalid = await page.request.post('http://127.0.0.1:3000/api/messages', { data: { bad: true } }); assert.equal(invalid.status(), 400);
const blocked = await page.request.post('http://127.0.0.1:3000/api/messages', { data: {}, headers: { origin: 'https://untrusted.example' } }); assert.equal(blocked.status(), 403);
console.log('Browser smoke OK: 7 vistas, ES/EN y temas persistentes, contraste AA en día/oscuro a 1440/390px, móvil sin desbordamiento, 0 errores React, validación 400 y origen externo 403. Sin capturas.');
await browser.close();
