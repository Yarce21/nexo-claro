# Nota de escala — aproximadamente 200 leads/hora

200 eventos/hora equivalen a uno cada 18 segundos. El worker consulta cada segundo y procesa lotes de hasta 50 mensajes. SQLite WAL y transacciones cortas permiten demostrar ese volumen en una máquina, sin proveedor de IA. La capacidad de ingesta no equivale a capacidad humana de revisión.

## Medición reproducible

`npm run test:load` ingesta y clasifica 200 eventos sobre SQLite **en disco y aislado**. Guarda duraciones, borradores y cero envíos en `deliverables/load-test.json`. La ejecución inicial tardó 462 ms (181 ms ingesta, 281 ms clasificación). Es una medición local de dominio, no HTTP concurrente ni garantía de producción.

Con aprobación humana de 30–60 segundos por caso, 200 leads exigirían 100–200 minutos de trabajo humano por hora: aproximadamente 2–4 operadores, según complejidad, con casos sensibles potencialmente más largos. El cuello de botella no se resuelve quitando la aprobación.

## Paso a producción

1. Supervisar Next/worker con reinicio automático y health checks. La demo funciona mientras `npm run dev` o `npm start` permanezca abierto; no instala servicios del sistema.
2. Medir evento más antiguo, fallos, backlog humano y lag de outbox. Alertar si heartbeat falta por >10 s y definir SLA de revisión sensible.
3. Persistir reglas versionadas en DB; migrar a tablas e índices por estado/fecha. Paginar y archivar auditoría. Medir carga HTTP y varios días de retención.
4. Para varias máquinas: PostgreSQL con leases/`SKIP LOCKED` o cola durable. No compartir SQLite por red. Añadir jitter al backoff y circuit breaker ante fallos persistentes.
5. Autenticación, RBAC, consentimiento verificable, firma del webhook, rate limiting, cifrado y retención. Separar permisos de revisión, transferencia, reglas y comisiones.

## Recuperación

Interrupción antes del commit: sin cambio parcial. Trabajo en vuelo: recuperable al expirar el lease (30 s), salvo si agotó intentos. Timeout HTTP: 5 s; tres intentos con esperas de 3 y 6 s. `Idempotency-Key` y recibo durable permiten tolerar una respuesta perdida. Teléfono inválido: falla sin red. Reintento manual solo para fallos recuperables.

Respaldar SQLite con API de backup o procesos detenidos; no copiar solo el archivo principal con WAL activo. Export JSON es para evaluación, no reemplazo probado de backup/restore.
