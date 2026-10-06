# Evidencia de verificación — 6 de octubre de 2026

- `npm run typecheck`: correcto con TypeScript estricto.
- `npm test`: **27 pruebas aprobadas**, sin fallos.
- `npm run build`: compilación de producción correcta.
- `npm run test:browser`: siete vistas, viewport móvil de 390 px sin desbordamiento horizontal, cero errores React, entradas inválidas HTTP 400 y origen externo HTTP 403.
- `npm run demo:record`: recorrido real aprobado por Playwright: ingesta, borrador, aprobación, escalamiento, cambio/restauración de regla, disposición, handoff confirmado, HTTP 503, fallo terminal y recuperación.
- Video H.264, 1440×1000, 12 fps, **2 min 6 s**, sin audio y con subtítulos en español. Se inspeccionaron capturas del video y de escritorio/móvil.
- Ráfaga local de 200 eventos en SQLite en disco: **462 ms**, 200 borradores, cero envíos sin autorización. Alcance y límites en `escala.md`.
- Dependencias: se detectó y corrigió una vulnerabilidad moderada en `csv-parse`, actualizando a 7.0.3. La instalación auditada terminó con **0 vulnerabilidades reportadas**; no constituye garantía de ausencia de vulnerabilidades.

## Casos críticos cubiertos

Eventos idempotentes y payloads contradictorios; reglas externas y versión de borrador; conversación con contexto; bajas y consentimiento retirado; eventos atrasados; escalamiento obligatorio; etapas de transferencia y confirmación; disposiciones inválidas; Call Back con fecha; reintentos y fallos permanentes; recuperación de lease; transacciones; identidad incompatible; fecha de adquisición estable; atribución conservadora; duplicados contradictorios; fechas ambiguas y CSV con comillas.

## Límites verificados y declarados

Las pruebas se hicieron localmente en Windows/Node 24.16.0. No se realizó un despliegue público, ni prueba de infraestructura distribuida, ni envío por WhatsApp real. La grabación prueba el simulador HTTP local. La vista móvil permite scroll horizontal dentro de tablas y navegación, sin desbordar la página. El runtime conserva los ejemplos de la grabación; un `setup` sobre una carpeta nueva inicia con los 48 leads originales.
