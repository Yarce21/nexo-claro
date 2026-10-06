# Video de entrega (máximo 6 minutos)

`deliverables/demo.mp4` muestra la aplicación real, sin audio y con subtítulos en español. `scripts/record-demo.ts` automatiza los clicks y verifica estados con Playwright; no es un mockup animado. Duración final: `deliverables/video-verification.json`.

Secuencia aproximada, dependiente de los reintentos:

1. Vista general y carácter ficticio del entorno.
2. Ingesta de deuda 18000; respuesta en borrador y aprobación humana.
3. Solicitud sensible con demanda; escalamiento sin envío.
4. Cambio de umbral a 20000; nuevo mensaje de 18000 se escala.
5. Disposición Transferido; etapa pendiente, borrador y confirmación del simulador.
6. HTTP 503, reintentos, fallo terminal, restauración y recuperación.
7. Conciliación del CSV y comisiones retenidas.
8. Guiones, fuentes y entregables.

Para repetir: iniciar la demo y ejecutar `npm run demo:record`. Usar una instancia sin operadores concurrentes: modifica temporalmente reglas y agrega ejemplos. El bloque de limpieza restaura reglas y partner aunque falle una aserción. Para presentación narrada por el candidato, seguir los mismos pasos y explicar decisiones sin leer todo el código en pantalla.
