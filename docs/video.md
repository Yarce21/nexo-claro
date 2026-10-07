# Video de entrega

Grabo la aplicación real con npm run demo:record, Chrome y ffmpeg opcional. Genero simultáneamente las capturas; no uso pantallas simuladas para los casos de negocio. Los subtítulos explican la secuencia, sin narración. El video debe durar menos de seis minutos.

Muestro Nexo Claro, un lead en inglés, ES/EN, modo oscuro, borrador sin envío automático, aprobación humana, escalamiento sensible, moneda CHF no admitida y revocación de consentimiento con intento de transferencia rechazado. También muestro cambio/restauración de umbral, disposición y handoff confirmado, y conciliación/contenido.

Para grabar uso una instancia exclusiva y una base nueva mediante DATA_DIR, con puertos 3000/4010 libres. No hay otros operadores durante la pasada. El script restaura reglas y partner incluso ante fallo; solo codifica el video si pasan las verificaciones. video-verification.json y screenshots/manifest.json vinculan los artefactos con la huella de las fuentes.

npm run package:deliverables ejecuta esa pasada, la prueba de carga y el export final; elimina copias antiguas únicamente dentro de deliverables. No publica nada.
