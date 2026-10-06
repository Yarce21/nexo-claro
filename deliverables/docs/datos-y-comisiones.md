# Limpieza, métricas y riesgo de comisiones

## Limpieza documentada

`data/partner-dirty.csv` permanece inalterado. Cada resultado conserva la fila original. El parser entiende comillas, BOM, saltos de línea y espacios y exige cinco columnas.

| Problema | Tratamiento |
|---|---|
| Formatos de teléfono | Quitar espacios, paréntesis, puntos y guiones; agregar +1 a 10 dígitos; aceptar solo numeración ficticia reservada |
| Sin coincidencia | Cuarentena; nunca vincular por parecido o últimos dígitos |
| Teléfono compartido | Cuarentena por identidad ambigua |
| ID exacto repetido | Una fila canónica como máximo |
| ID con contenido contradictorio | Todas las variantes en cuarentena, incluida la primera |
| Dos inscripciones para un lead | Como máximo una aceptada |
| creator_id vacío o contradictorio | Retener atribución; mostrar candidato por teléfono sin adjudicar comisión |
| Fechas | Solo ISO UTC o YYYY-MM-DD válido; rechazar imposibles, ambiguas, futuras o anteriores al lead |
| Estado distinto de enrolled | No cuenta como inscripción |

No se imputan fechas, creadores ni teléfonos. Se muestran todos los defectos por fila. Los datos inventados no forman una trayectoria perfecta; la discrepancia se declara en el dashboard.

## Definiciones

- Recibidos: leads únicos procesados, incluidos spam y bajas; eventos pendientes no inflan leads.
- Precalificados: monto y tipo dentro de los umbrales al evaluar el último mensaje, sin bajas. No equivalen a aceptación ni consentimiento.
- Transferidos: handoff confirmado por recibo; una disposición pendiente no cuenta.
- Conciliadas: filas enrolled sin defectos, lead único y creador consistente.
- Conversión conciliada: inscripciones conciliadas / leads recibidos. No es un funnel secuencial de la sesión.
- Estancados: última actividad > `staleHours`, excluyendo Transferido y No le interesa; incluye casos sensibles pendientes.

## Qué rompería comisiones — media página

Un creator_id nulo deja una inscripción sin propietario verificable. Rellenarlo silenciosamente desde un lead puede generar un pago incorrecto si el teléfono se comparte, fue reciclado o existe otro toque de atribución. Se muestra el candidato pero se retiene la comisión hasta tener evidencia. Un teléfono incompatible no se corrige aproximándolo: una cifra puede adjudicar una inscripción a otra persona o creador. Se necesita una corrección trazable del partner, no forzar que cierre la métrica.

Duplicados exactos inflan pagos; duplicados contradictorios ocultan disputas si se elige arbitrariamente la primera fila. Se retienen todas las variantes contradictorias. Una fecha ambigua mueve ingresos entre períodos; una inscripción anterior al lead invalida la relación causal. El CSV original, la fila y cada razón de exclusión permanecen disponibles.

En producción agregaría resolución humana con evidencia, responsable, fecha y versión del corte, separando inscripción reportada, validada y comisionable. No se calcula dinero: no se proporcionó tarifa o contrato y no se inventa. Corregir el origen debe generar un nuevo reporte, sin borrar el historial del anterior.
