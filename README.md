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


## Dependencias y límites

Next.js/React: stack solicitado e interfaz/API en un proyecto. Zod: validación consistente. `csv-parse`: CSV con comillas, BOM y delimitadores. `node:sqlite`: persistencia nativa sin ORM ni servicio adicional. TypeScript/tsx: tipado y herramientas; Playwright: verificación de navegador; ffmpeg opcional: video local.

Motor de reglas conservador, sin orientación financiera ni LLM que comprenda lenguaje arbitrario. No hay tasas, tarifas, puntajes ni ahorro garantizado. Producción requiere autenticación/roles, consentimiento verificable, retención/cifrado, aprobación legal de textos y observabilidad; ver decisiones y escala. Referencias: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [SQLite de Node.js](https://nodejs.org/api/sqlite.html).

