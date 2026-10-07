# Verificación de entrega

Pruebas automatizadas: **50**.
<!-- test-count: 50 -->

Ejecuté npm ci, npm run typecheck, npm test, npm run build y npm run test:browser. La verificación final repetible está en npm run verify:delivery; ejecuta nuevamente las pruebas y comprueba el número declarado, la marca, ausencia de copias de fuentes, vigencia de artefactos, higiene de Git y exclusiones de .gitignore.

Añadí regresiones para consentimiento ES/EN, revocación, contradicción, reafirmación con nueva aprobación, lectura actual al aprobar/despachar, moneda como lista permitida, plurales sensibles, protección mínima no removible y falsos positivos. Las pruebas de las correcciones fallaron antes de arreglarlas. No cambié el contrato histórico de lang ausente equivalente a es.

El smoke prueba siete vistas, ES/EN, día/oscuro, persistencia, foco de teclado, contraste medido de texto y controles, y ancho de 390 px. No constituye certificación exhaustiva de accesibilidad.

npm run package:deliverables genera una nueva grabación y capturas, ejecuta la carga local y exporta el estado final. video-verification.json registra duración, casos comprobados, errores del navegador y huella de app/lib/config. load-test.json guarda la medición actual: no afirmo un tiempo fijo ni capacidad de infraestructura productiva.

Verifiqué localmente Windows y Node 24.16.0. No hice envíos reales, despliegue público ni certificación financiera. Un receptor puede haber recibido un envío que estaba en vuelo al retirarse consentimiento: cancelo lo pendiente y dejo auditoría; no puedo deshacer HTTP. Una carpeta nueva arranca con 48 leads; la grabación agrega sus propios ejemplos.
