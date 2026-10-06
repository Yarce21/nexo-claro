# Alivio Norte · Centro de operaciones

Prueba técnica Influgain. **Agencia, partner, personas, teléfonos, criterios y contenido completamente ficticios.** Next.js + React + TypeScript; no requiere GoHighLevel, Meta, WhatsApp, Supabase ni claves de IA.

## Arranque en menos de 15 minutos

Requisitos: Node.js **24 LTS**, npm y puertos locales 3000 y 4010 disponibles. Internet solo para instalar paquetes. Probado en Windows con Node 24.16.0. Linux/macOS usan los mismos comandos; la grabación tiene requisitos opcionales adicionales.

```sh
npm ci
npm run setup
npm run dev
```

Abrir **http://127.0.0.1:3000**. El último comando mantiene tres procesos: Next.js, worker y partner HTTP ficticio. `Ctrl+C` los detiene. El worker opera sin pestañas abiertas, mientras el comando siga ejecutándose. `setup` es idempotente: no pisa una base existente. SQLite queda en `runtime/operations.sqlite`; no se versiona. Para otra instancia vacía configurar `DATA_DIR` antes de setup y servidor (PowerShell: `$env:DATA_DIR = 'C:\Influgain\runtime\otra-demo'`). No ejecutar dos instancias sobre los mismos puertos.

Producción **local**:

```sh
npm run build
npm start
```

La interfaz es una consola local de confianza, sin autenticación. Escucha en loopback y rechaza Host/Origin externos. **No publicar tal cual en Internet.** No existe adaptador para envío real; el destino HTTP es fijo y local. Los teléfonos admitidos están limitados al rango ficticio +1 202 555 0100–0199. “Aprobar envío ficticio” es una acción humana explícita; la ingesta nunca publica ni transfiere.

## Recorrido del evaluador

1. **Vista general:** métricas, pendientes y leads estancados (>48 h por defecto).
2. **Simular mensaje:** ingresar `Debo 18000 USD en tarjeta y quiero Consejero.`. En aproximadamente un segundo aparece en **Bandeja humana**. Ver monto, tipo, consentimiento, motivo y versión de regla. No existe envío hasta pulsar **Aprobar envío ficticio**.
3. Ingresar `Tengo una demanda urgente por mi deuda.`: aparece un escalamiento con resumen y sin botón de aprobación. **Cerrar revisión sin envío** registra revisión del operador, sin comunicación.
4. **Reglas del agente:** cambiar `minDebt` de 5000 a 20000 y guardar. Ingresar otra vez una deuda de 18000: se escala. Restaurar 5000. También se edita `config/rules.json` sin recompilar. Un JSON inválido detiene el procesamiento de forma segura y queda visible en el estado del worker.
5. **Leads y seguimiento:** buscar el lead precalificado y aplicar `Transferido`. Primero pasa a **Transferencia pendiente** y crea un borrador. Aprobarlo desde la bandeja autoriza WhatsApp + handoff ficticios; solo el recibo HTTP cambia la etapa a **Transferido**.
6. **Registro de actividad:** activar **Simular partner caído**, aprobar otro borrador y observar reintentos a 3 y 6 segundos. Tras 3 intentos queda en `failed`. Restaurar partner y pulsar **Reintentar**. Un teléfono vacío falla inmediatamente y requiere corrección humana, no reintentos ciegos.
7. **Datos y atribución:** inspeccionar cada fila del CSV, motivo de cuarentena y creador atribuible. **Estudio de contenido:** tres guiones con fuente y prioridad.

## Datos incluidos

- `data/leads.json`: 48 mensajes/leads históricos con todos los campos pedidos; CTWA y orgánico, tres creadores, bajas, spam, casos sensibles y un teléfono vacío. `leadId` identifica al lead; `eventId` identifica cada mensaje.
- `config/rules.json`: montos ficticios en USD, tipos elegibles, palabras, umbral de estancamiento y política de reintentos. Las protecciones mínimas de baja y lenguaje sensible no pueden eliminarse desde el editor.
- `data/partner-dirty.csv`: 30 filas, duplicados exactos y contradictorios, fechas imposibles/ambiguas/futuras, teléfonos sin coincidencia y creadores ausentes.
- `data/content.json`: 10 fuentes inventadas y 3 guiones de aproximadamente 100 palabras, unos 36–43 segundos a 140–160 palabras/minuto. No son testimonios reales.

Los datos históricos conservan fechas de septiembre de 2026 para mostrar estancamiento. Nuevos eventos usan la hora actual. Pantalla en Bogotá; persistencia y API en UTC. El CSV histórico es independiente de los handoffs de la demo: no se presenta como una cohorte secuencial perfecta.

## Arquitectura y archivos

```text
app/page.tsx                 Consola React y formularios de operación
app/api/[...path]/route.ts   API local, validación y límites de payload
lib/classifier.ts           Motor determinista y contexto de conversación
lib/operations.ts           Ingesta, revisión, CRM y outbox con reintentos
lib/db.ts                   SQLite WAL y transacciones
lib/rules.ts                JSON externo y versión SHA-256
lib/reporting.ts            CSV y conciliación conservadora
lib/snapshot.ts             Estado de consola y métricas
scripts/worker.ts           Consumo continuo de inbox + outbox
scripts/partner.ts          HTTP ficticio con recibos idempotentes
scripts/seed.ts             Carga repetible de datos
scripts/export.ts           Export para revisión sin ejecutar la aplicación
tests/                     Dominio, navegador y ráfaga local
docs/                      Decisiones, escala, calidad y uso de IA
```

Flujo: `webhook → inbox durable → worker → decisión + borrador + auditoría → revisión humana → outbox → partner local → recibo`.

SQLite usa consultas parametrizadas, transacciones `BEGIN IMMEDIATE`, WAL y timeout de bloqueo. Una clave de evento repetida con el mismo payload no duplica resultados; con otro payload devuelve 409. Los trabajos tienen lease de 30 s y timeout HTTP de 5 s. El partner persiste recibos por clave idempotente. La garantía es **al menos una entrega con deduplicación del receptor**, no “exactly once” distribuido.

## API para demostrar ingesta automática

Todos los POST requieren `Content-Type: application/json`, payload ≤16 KB y acceso local. No requieren sesión porque la demo es exclusivamente local.

```powershell
$body = @{
  eventId = 'webhook-001'; leadId = 'lead-webhook-001'
  timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  creator = 'CR-ANA'; channel = 'CTWA'
  message = 'Debo 18000 USD en tarjeta y quiero Consejero.'
  phone = '+12025550191'; initialState = 'Nuevo'
} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3000/api/messages -Method Post -ContentType 'application/json' -Body $body
```

Para probar duplicados, conservar exactamente `$body` y reenviarlo. Para continuar la conversación, conservar `leadId`, creador, canal y teléfono, y cambiar `eventId`, timestamp y mensaje. Monto/tipo/consentimiento se acumulan cuando se identifican explícitamente. No se interpreta un “sí” aislado como consentimiento.

| Endpoint | Acción |
|---|---|
| GET `/api/state` | Snapshot, reglas, auditoría reciente y salud |
| POST `/api/messages` | `eventId, leadId, timestamp, creator, channel, message, phone, initialState` |
| POST `/api/review` | `{id: draftId, approved: boolean}` |
| POST `/api/disposition` | `{leadId, disposition, requestId: UUID, callbackAt?: ISO-UTC}` |
| POST `/api/rules` | Objeto completo de reglas, validado |
| POST `/api/partner` | `{mode: "healthy" | "down"}` |
| POST `/api/retry` | `{id: jobId}` para fallos recuperables |

`Call Back` exige fecha futura UTC y conserva la fecha en auditoría/comando; no programa una llamada automática. `No le interesa` registra texto de cierre **no enviable**, respeta la baja y cancela trabajos pendientes. Una disposición desconocida devuelve 400 sin cambios. Una condición sensible pendiente bloquea disposiciones de contacto.

## Verificación

```sh
npm run typecheck
npm test
npm run build
npm run test:load
```

Con servidor corriendo y Chrome instalado:

```sh
npm run test:browser
npm run demo:record
npm run export
```

`test:browser` revisa siete vistas, errores React, móvil de 390 px, validación 400 y origen externo 403. `demo:record` verifica por UI borrador, escalamiento, cambio de regla, disposición, handoff y recuperación HTTP 503. Agrega leads ficticios, restaura reglas originales y deja el partner sano. Produce `deliverables/demo.mp4` (sin voz, con subtítulos en español). No ejecutarlo mientras otro operador modifica reglas.

La grabación usa Chrome local y ffmpeg. En Windows el codificador es dependencia opcional; en Linux/macOS definir `FFMPEG_PATH` con un ffmpeg instalado. `DEMO_BROWSER=msedge` permite Edge. Estos requisitos **no son necesarios para levantar la demo**.

## Entregables

- `deliverables/demo.mp4`: grabación real de la aplicación con subtítulos; <6 minutos.
- `deliverables/demo-export.json`: datos, estados, reglas, borradores, trabajos y auditoría completa.
- `deliverables/reconciliation.csv`, `metrics.json`, `content-scripts.md`.
- `deliverables/screenshots/`: escritorio y móvil.
- [Decisiones](docs/decisiones.md), [escala](docs/escala.md), [calidad y comisiones](docs/datos-y-comisiones.md), [uso de IA](docs/uso-ia.md), [guion de video](docs/video.md).

El export no incluye ejecutables ni secretos; los prefijos de fórmula se neutralizan en CSV. El repositorio contiene el código y el lockfile. No se han enviado correos ni publicado servicios externos.

## Dependencias y límites

Next.js/React: stack solicitado e interfaz/API en un proyecto. Zod: validación consistente. `csv-parse`: CSV con comillas, BOM y delimitadores. `node:sqlite`: persistencia nativa sin ORM ni servicio adicional. TypeScript/tsx: tipado y herramientas; Playwright: verificación de navegador; ffmpeg opcional: video local.

Motor de reglas conservador, sin asesoramiento financiero ni LLM que comprenda lenguaje arbitrario. No hay tasas, tarifas, puntajes ni ahorro garantizado. Producción requiere autenticación/roles, consentimiento verificable, retención/cifrado, aprobación legal de textos y observabilidad; ver decisiones y escala. Referencias: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [SQLite de Node.js](https://nodejs.org/api/sqlite.html).
