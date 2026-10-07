# Nexo Claro · Centro de operaciones

Prueba técnica Influgain. **Agencia, partner, personas, teléfonos, criterios y contenido completamente ficticios.** Next.js + React + TypeScript; no requiere GoHighLevel, Meta, WhatsApp, Supabase ni claves de IA.

La interfaz usa la identidad Nexo Claro y el [sistema de diseño documentado](docs/design-system.md). La actualización visual conserva el motor, las APIs, las reglas y los datos originales de la prueba; los textos operativos y las plantillas usan la misma marca.

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

## Temas e idiomas

La cabecera permite alternar **Día / Oscuro** y **ES / EN**, sin dependencias adicionales. El tema inicial sigue `prefers-color-scheme`; la elección guardada en `nexo-theme` tiene prioridad. Un script mínimo en el layout aplica `data-theme` a `<html>` antes de pintar. El idioma de interfaz es español por defecto, persiste en `nexo-language` y actualiza `html.lang`, título y descripción. Si el almacenamiento está bloqueado, los controles funcionan durante la sesión.

`lib/i18n.ts` contiene el mapa de presentación de etiquetas, botones, ayudas, estados y errores conocidos. No cambia los valores internos de etapas/disposiciones, las claves del JSON ni los datos de leads, CSV, guiones y fuentes históricas. Borradores, mensajes originales y evidencia histórica conservan su idioma y contenido; los diagnósticos técnicos desconocidos permanecen visibles.

El idioma de conversación es independiente del de la consola: `/api/messages` acepta opcionalmente `lang: "es" | "en"`. `lib/conversation.ts` detecta señales de palabras ES/EN y centraliza todas las plantillas salientes; el clasificador entiende deudas y consentimiento en ambos idiomas. Los leads históricos sin `lang` usan español. La detección no modifica el evento recibido; omitir `lang` y declarar `es` son equivalentes para la comparación de eventos heredados, mientras un cambio a `en` explícito sigue siendo conflicto.

Se escalan idiomas mixtos, sin evidencia suficiente o contradictorios con el idioma declarado, además de montos/monedas ambiguos, hipotecas, riesgos y solicitudes fuera de los umbrales. No se usa IA en ejecución ni traducción automática. Palabras compartidas como “personal”, cifras y códigos de moneda no cuentan como evidencia. Mensajes muy cortos, jerga o idiomas distintos pueden requerir un humano. La baja siempre prevalece y bloquea contacto, incluso si el idioma es mixto. Las listas inglesas editables están en `config/rules.json`; `SAFETY_FLOOR` mantiene protección mínima ES/EN no removible.

Todo envío mantiene aprobación humana. La plantilla inglesa usa **Counselor**, ahorro condicional y ningún importe, tasa o puntaje inventado. Ampliar las reglas cambia su versión: los borradores anteriores deben reevaluarse conforme al control de vigencia existente.

Verificación: `npm run typecheck`, `npm test`, `npm run test:browser` (demo levantada). El smoke test comprueba siete vistas, ambos temas y tamaños 1440/390, contraste de texto ≥4.5:1, controles deshabilitados, avisos de error, teclado y persistencia. No genera capturas ni video; las escrituras de su prueba de estados se interceptan en el navegador.

## Recorrido del evaluador

1. **Vista general:** métricas, pendientes y leads estancados (>48 h por defecto).
2. **Simular mensaje:** ingresar `Debo 18000 USD en tarjeta y quiero Consejero.`. En aproximadamente un segundo aparece en **Bandeja humana**. Ver monto, tipo, consentimiento, motivo y versión de regla. No existe envío hasta pulsar **Aprobar envío ficticio**.
3. Ingresar `Tengo una demanda urgente por mi deuda.`: aparece un escalamiento con resumen y sin botón de aprobación. **Cerrar revisión sin envío** registra revisión del operador, sin comunicación.
4. **Reglas del agente:** cambiar `minDebt` de 5000 a 20000 y guardar. Ingresar otra vez una deuda de 18000: se escala. Restaurar 5000. También se edita `config/rules.json` sin recompilar. Un JSON inválido detiene el procesamiento de forma segura y queda visible en el estado del worker.
5. **Leads y seguimiento:** buscar el lead precalificado y aplicar `Transferido`. Primero pasa a **Transferencia pendiente** y crea un borrador. Aprobarlo desde la bandeja autoriza WhatsApp + handoff ficticios; solo el recibo HTTP cambia la etapa a **Transferido**.
6. **Registro de actividad:** activar **Simular partner caído**, aprobar otro borrador y observar reintentos a 3 y 6 segundos. Tras 3 intentos queda en `failed`. Restaurar partner y pulsar **Reintentar**. Un teléfono vacío falla inmediatamente y requiere corrección humana, no reintentos ciegos.
7. **Datos y atribución:** inspeccionar cada fila del CSV, motivo de cuarentena y creador atribuible. **Guiones de contenido:** tres guiones con fuente y prioridad.

## Datos incluidos

- `data/leads.json`: 48 mensajes/leads históricos con todos los campos pedidos; CTWA y orgánico, tres creadores, bajas, spam, casos sensibles y un teléfono vacío. `leadId` identifica al lead; `eventId` identifica cada mensaje.
- `config/rules.json`: montos ficticios en USD, tipos elegibles, palabras, umbral de estancamiento y política de reintentos. Las protecciones mínimas de baja y lenguaje sensible no pueden eliminarse desde el editor.
- `data/partner-dirty.csv`: 30 filas, duplicados exactos y contradictorios, fechas imposibles/ambiguas/futuras, teléfonos sin coincidencia y creadores ausentes.
- `data/content.json`: 10 fuentes inventadas y 3 guiones de aproximadamente 100 palabras, unos 36–43 segundos a 140–160 palabras/minuto. No son testimonios reales.

La semilla guarda offsets, no fechas fijas: setup materializa 48 leads respecto a su hora de ejecución. Doce tienen edades superiores a staleHours (11 cuentan como estancados; una baja queda excluida) y los otros 36 son recientes. Repetir setup no sobrescribe eventos ni rejuvenece leads existentes; para una demo nueva uso otro DATA_DIR. Las fechas relativas del CSV se resuelven una sola vez y se conservan en SQLite; las fechas ambiguas/imposibles y los errores futuros/anteriores permanecen. Nuevos eventos usan la hora actual. Pantalla en Bogotá; persistencia y API en UTC. El CSV histórico es independiente de los handoffs de la demo: no se presenta como una cohorte secuencial perfecta.

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

### Seguridad y regresiones

Pruebas automatizadas: **56**.

Aprobadas: 55; omitida: 1 comprobación editorial condicional.
<!-- test-count: 56 -->

La moneda usa lista permitida: ninguna indicación, USD, US$, $, dólares/dolares o dollars sin calificativo. Códigos distintos y símbolos no USD escalan con motivo explícito, sin aceptar su monto ni convertirlo. Reviso símbolos antes de normalizar y mantengo límites de palabra.

Las negativas ES/EN de una cláusula sobre Consejero/contacto revocan consentimiento; las negativas sobre pagos o información conservan el valor previo. Las retiradas explícitas aisladas siguen revocando; la ambigüedad o contradicción no conserva un sí histórico. Cancelo la transferencia pendiente y audito el intento rechazado. Transferido, aprobación del borrador y despacho handoff consultan el consentimiento actual. Una reafirmación posterior exige una aprobación nueva. Un envío HTTP ya en vuelo no puede deshacerse: su carrera queda auditada.

SAFETY_FLOOR no es editable: mantiene bajas y términos mínimos de protección legales/sensibles, tasas, tarifas, puntajes y promesas en ES/EN. JSON permite añadir vocabulario y modificar umbrales/reintentos. Los términos generan plurales s/es/ies manteniendo palabras completas: feedback, rated, separate y stopover no activan términos por subcadena.

La detección de conversación no depende de ES/EN de la interfaz; jerga, idiomas mixtos, falta de evidencia y negaciones complejas pueden exigir un humano. No traduzco automáticamente mensajes históricos, CSV, fuentes ni guiones; la marca sí es Nexo Claro en todas las fuentes.

Con demo exclusiva corriendo: npm run package:deliverables genera video y capturas en una sola pasada, prueba de carga y export final. deliverables contiene únicamente artefactos generados. npm run verify:delivery vuelve a ejecutar las pruebas y falla ante marca vieja, copias de fuentes, artefactos obsoletos, conteos documentados incorrectos, cambios sin commit o exclusiones insuficientes. Requiere Git; test:browser requiere Chrome y la demo corriendo. La reproducción del video también necesita ffmpeg, sin nuevas dependencias.
El control editorial obligatorio para la entrega es npm run verify:delivery -- --author-notes: rechaza referencias impersonales prohibidas y marcadores personales sin completar. El modo normal omite ese caso y lo informa.

El smoke también comprueba ES/EN, persistencia, foco de teclado, contraste medido de texto y controles, y ancho de 390 px. No constituye una certificación exhaustiva de accesibilidad. Las regresiones cubren consentimiento ES/EN, contradicción, reafirmación, vigencia al aprobar/despachar, moneda permitida, plurales, protección mínima, etiquetas del histórico y setup idempotente hoy y dentro de un mes. El contrato histórico de lang ausente equivalente a es se conserva.

video-verification.json registra duración, casos, errores del navegador y huella de app/lib/config. load-test.json guarda la medición de cada generación: no implica capacidad de infraestructura productiva. La grabación agrega ejemplos a los 48 leads iniciales. Un receptor puede recibir un envío ya en vuelo al retirarse consentimiento; se cancela lo pendiente y queda auditoría, sin prometer deshacer HTTP.

## Entregables

- `deliverables/demo.mp4`: grabación real de la aplicación con subtítulos; <6 minutos.
- `deliverables/demo-export.json`: datos, estados, reglas, borradores, trabajos y auditoría completa.
- `deliverables/reconciliation.csv`, `metrics.json`, `content-scripts.md`.
- `deliverables/screenshots/`: escritorio y móvil.
- [Decisiones](docs/decisiones.md), [escala](docs/escala.md), [calidad y comisiones](docs/datos-y-comisiones.md), [uso de IA](docs/uso-ia.md), [guion de video](docs/video.md).

El export no incluye ejecutables ni secretos; los prefijos de fórmula se neutralizan en CSV. El repositorio contiene el código y el lockfile. No se han enviado correos ni publicado servicios externos.

El repositorio local no tiene remoto configurado. Localhost no es acceso remoto: la revisión utiliza repo reproducible, export y video. No se afirma un correo de inicio ni una fecha de comienzo del plazo; el enlace del proyecto de fidelización corresponde a otro proyecto. El historial identifica las correcciones y la etiqueta entrega-final identifica el corte aprobado de entrega. No hay envíos reales, despliegue público ni certificación financiera.

## Dependencias y límites

Next.js/React: stack solicitado e interfaz/API en un proyecto. Zod: validación consistente. `csv-parse`: CSV con comillas, BOM y delimitadores. `node:sqlite`: persistencia nativa sin ORM ni servicio adicional. TypeScript/tsx: tipado y herramientas; Playwright: verificación de navegador; ffmpeg opcional: video local.

Motor de reglas conservador, sin orientación financiera ni LLM que comprenda lenguaje arbitrario. No hay tasas, tarifas, puntajes ni ahorro garantizado. Producción requiere autenticación/roles, consentimiento verificable, retención/cifrado, aprobación legal de textos y observabilidad; ver decisiones y escala. Referencias: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [SQLite de Node.js](https://nodejs.org/api/sqlite.html).
