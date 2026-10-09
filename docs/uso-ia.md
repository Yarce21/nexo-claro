# Nota de uso de IA

## Herramientas usadas

Usé Codex y Claude (chat) como asistentes de planificación, revisión y auditoría. Los utilicé durante el desarrollo de esta demo local con datos ficticios; no les di acceso a cuentas ni a información de Influgain.

## Qué le pedí a cada una

A Codex le pedí apoyo para implementar la consola, preparar pruebas de regresión, revisar errores y automatizar la generación de entregables. A Claude (chat) le pedí apoyo para planificar, revisar el planteamiento y auditar riesgos. Distingo esas propuestas de los hechos comprobados mediante comandos y pruebas ejecutadas.

## Qué revisé o cambié yo

Mi participación se concentró en el frontend, el diseño de la página y la experiencia de uso de Nexo Claro. Me encargué de cómo se presenta la información y de que las distintas pantallas mantuvieran una identidad visual consistente. Busqué que la aplicación se sintiera como una consola de operaciones profesional, con una navegación clara y una jerarquía que facilitara entender cada sección.
Para construir la interfaz reutilicé y adapté código de otros proyectos de software. Ese código me sirvió como punto de partida, pero lo ajusté al contexto de Nexo Claro y a las necesidades de sus pantallas. Mi trabajo consistió en integrar esas partes dentro de una misma experiencia, en lugar de presentar componentes aislados con estilos diferentes.
También me encargué de la parte visual del modo día y oscuro. Trabajé ambos temas para mantener la legibilidad y la consistencia de fondos, textos, botones y estados. La intención fue que el cambio de tema conservara la misma organización y permitiera utilizar la consola de forma cómoda.
Otra parte de mi aporte fue el soporte español e inglés de la interfaz. Trabajé la presentación de los textos y el selector de idioma para que el usuario pudiera recorrer la aplicación en ambos idiomas. Esta función de la consola es independiente del idioma utilizado en la conversación con cada lead.
Utilicé la IA como apoyo durante el desarrollo, pero mi aporte principal estuvo en el diseño, la adaptación del código reutilizado y la construcción del frontend. Distingo ese trabajo de la lógica de negocio, las reglas de clasificación y los controles de transferencia: no presento mi participación en la interfaz como una revisión completa de esas partes del sistema.

## Controles humanos y límites del sistema

Mi aplicación no usa IA en ejecución. El clasificador y la detección de idioma son deterministas. Todo envío y transferencia requiere aprobación humana vigente; los casos ambiguos o sensibles se escalan. No considero estas herramientas una certificación legal o financiera.

## Lo que aprendí o haría distinto

Este proceso me mostró la necesidad de separar sugerencias, evidencia automatizada y decisiones personales. Mantendría las pruebas que reproducen fallos antes de corregirlos y documentaría los límites junto a cada resultado.
