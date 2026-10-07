# Nexo Claro — sistema de diseño

## Alcance y criterio

Rediseño de presentación sobre la aplicación existente. Se conservaron las siete vistas, filtros, formularios, acciones humanas y contratos de API. No se modificaron `lib/`, `app/api/`, `config/`, `data/`, el procesamiento del worker ni la base de datos. Los textos originales de mensajes, borradores y guiones se muestran sin alterar su contenido: cambiar una marca dentro de un borrador sin cambiar el mensaje que realmente se enviaría produciría una representación incorrecta.

El patrón que mejor funcionaba era la bandeja de dos columnas; se reutilizó. Se corrigió el contraste bajo de los textos pequeños, la tipografía editorial poco apropiada para datos, la iconografía desigual y el uso de verde tanto para marca como para estados.

## Marca

**Nexo Claro** es una sola marca tipográfica, en Inter, con un símbolo geométrico de conexión: un trazo N enlaza dos nodos sobre navy. No usa símbolos financieros. SVG propio, tanto en sidebar como favicon; sin dependencias de iconografía.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| Navy | `#172554` | Marca, títulos y números importantes |
| Acción | `#2563EB` | Botones principales, selección, navegación y enlaces |
| Hover | `#1D4ED8` | Acciones activas y texto de información |
| Azul suave | `#EFF6FF` | Selección e información, nunca un sidebar completo |
| Fondo | `#F8FAFC` | Lienzo de operación |
| Superficie | `#FFFFFF` | Cards, controles y sidebar |
| Texto | `#0F172A` | Texto principal |
| Secundario | `#64748B` | Metadatos y explicaciones |
| Bordes | `#E2E8F0` | Separación ligera |
| Éxito | `#16A34A` | Precalificación, conciliación y entrega completada |
| Revisión | `#F59E0B` | Advertencia y revisión sensible |
| Error | `#DC2626` | Fallos y acciones destructivas |
| Neutral | `#64748B` | No enviado, ignorado, cerrado y metadatos |

Para texto pequeño se usan variantes semánticas más oscuras: verde `#166534`, ámbar `#92400E` y rojo `#B91C1C`. Evitan depender de un amarillo brillante para leer sobre blanco. No hay verdes en navegación, logo, selección ni gráficos de marca.

**Tipografía:** Inter variable, alojada localmente en `public/fonts/`, con licencia OFL. Sin llamadas a servicios de fuentes. Fallback Segoe UI / Arial. Títulos 28 px; secciones 16–18 px; texto de operación 12–14 px; metadatos 10–12 px; KPIs 36 px, peso 700 y cifras tabulares. No se usan mayúsculas para párrafos ni fuentes serif.

**Espaciado:** escala 4, 8, 12, 16, 20, 24 y 32 px. Cards con 20–24 px de espacio interno, gaps de 16–24 px. Radios 8 px en controles y 12 px en cards; chips compactos de 6 px. Sombras limitadas al filtro seleccionado, sin elevación decorativa en todas las cards.

## Componentes

- **Buttons:** 40 px, variante compacta 36 px, iconos 16 px, texto 12 px/600. Primary azul; secondary blanco con borde; danger rojo; rechazo con borde rojo para que la aprobación conserve jerarquía. Hover, disabled y focus consistentes.
- **Inputs y selects:** 40 px, etiquetas persistentes, borde ligero y foco azul. Búsqueda con icono y nombre accesible. Select nativo conserva teclado y comportamiento del navegador.
- **Cards:** títulos y descripción con estructura común; radios de 12 px, bordes ligeros y superficies blancas. Sin bloque verde para destacar pendientes.
- **Tables:** encabezados discretos, filas legibles, cifras tabulares y líneas horizontales. El scroll horizontal pertenece al contenedor de tabla, no a toda la página. Datos originales quedan como línea secundaria junto al valor normalizado.
- **Badges:** texto explícito con iconos en éxito, revisión y fallo. Borrador listo es información azul; no se presenta como una tarea completada. Prioridad editorial se comunica con número y azul, no con verde.
- **Alerts:** título breve, detalle y pictograma. Error con `role=alert`; confirmación con `role=status`. Cierre con nombre accesible. El color acompaña al texto.
- **Navigation:** sidebar claro; estado activo azul sobre `#EFF6FF`, `aria-current` y contador de bandeja. CRM y actividad se conservaron para no eliminar funciones.
- **Empty states:** icono, título y orientación breve. Sin cifras o estados inventados.
- **Loading:** skeleton de KPIs y panel, estado anunciado a tecnologías de asistencia. Se respeta `prefers-reduced-motion`.
- **Tooltips:** información contextual adicional en versión de reglas y mensajes truncados mediante `title` nativo; las instrucciones esenciales permanecen visibles.
- **Modals:** la aplicación no los tenía; se conserva la ingesta en panel desplegable, con `aria-expanded` y `aria-controls`, sin agregar una capa modal innecesaria.

## Jerarquía por vista

**Vista general:** título operacional directo, cuatro KPIs existentes, prioridades con acciones claras, panorama de adquisición y últimas conversaciones. Conserva la advertencia de que el CSV histórico no es una cohorte secuencial.

**Bandeja:** identidad y origen → 01 mensaje original → 02 información obtenida → 03 criterio/motivo → resumen/borrador → 04 decisión humana. La selección siempre es azul; el ámbar solo marca el caso sensible. Las condiciones que permiten aprobar o cerrar son las existentes.

**CRM:** origen, etapa, actividad y disposición en una tabla. Los controles nativos y el formulario de Call Back conservan su payload y fecha UTC.

**Reglas:** editor JSON integrado con barra de archivo, versión, instrucciones, estado local sin guardar y botón consistente. Se conserva el textarea y la validación existente.

**Datos:** fuente original, normalización, lead vinculado, atribución y resultado claramente separados. Cuarentena en ámbar con razones grises legibles; el rojo se reserva para fallos, no para todas las imperfecciones del CSV.

**Guiones:** prioridad, duración, título, fuente, texto original, condición de borrador editorial y criterio. “Borrador editorial” describe el contenido existente; no agrega un flujo de publicación ni un estado de negocio nuevo.

## Verificación

La consola también incluye día/oscuro mediante `data-theme` y tokens en `app/globals.css`. En modo oscuro se usan superficies navy, textos claros y azules derivados de la identidad. Las acciones conservan azul eléctrico con texto blanco; los textos de estados usan variantes con contraste suficiente. El texto secundario del tema claro se ajustó a `#53647B` para conservar AA sobre superficies sutiles. El contador activo usa el fondo azul suave, evitando texto azul sobre un fondo demasiado saturado.

El selector ES/EN aplica el diccionario de presentación sin cambiar datos, etapas, disposiciones ni mensajes originales. Las preferencias están en `app/components/preferences.tsx`; la inicialización previa al pintado está en el layout. `tests/browser-smoke.ts` verifica ambas paletas y preferencias sin generar capturas.

```sh
npm run typecheck
npm test
npm run build
node --import tsx tests/redesign-browser.ts
```

El recorrido del rediseño comprueba siete vistas a 1440, 1280 y 390 px, captura pantallas, valida los pasos de la bandeja y verifica los payloads de ingesta, aprobación, reglas y Call Back. Las mutaciones de ese recorrido se interceptan en su propio navegador: no cambia datos ni reglas reales. Las evidencias quedan en `deliverables/redesign/`.
