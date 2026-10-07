# Decisiones de ingeniería

## Arquitectura

Elegí Next.js, React y TypeScript para reunir consola y API local con módulos de dominio comprobables sin navegador. SQLite WAL aporta persistencia sin servicios externos. Un worker separado consume inbox y outbox aunque se cierre la pestaña. Las transacciones son cortas; HTTP ocurre fuera de ellas, con lease y claves idempotentes. La garantía es entrega con deduplicación del receptor, no exactly once distribuido. No añadí ORM, Redis ni microservicios para una necesidad no medida.

## Clasificación y compliance

El clasificador determinista evita credenciales, costo y variabilidad de un LLM en ejecución. JSON valida umbrales y vocabulario; cada decisión registra su versión. SAFETY_FLOOR mantiene protecciones ES/EN no removibles. La moneda admite USD o ausencia de indicación; otras señales escalan sin conversión. Montos ambiguos, riesgos y falta de evidencia requieren humano. Las plantillas usan Consejero/Counselor, ahorro condicional y ninguna tasa, tarifa o puntaje inventado.

## Aprobación y consentimiento

La ingesta crea borradores, nunca envíos. Aprobar autoriza trabajos exclusivamente al simulador local. Transferido requiere consentimiento vigente, elegibilidad y recibo del partner. Las negativas de contacto revocan; las negativas ajenas al contacto conservan el contexto anterior. Ambigüedad y contradicción impiden reutilizar un sí. Releo las condiciones al crear, aprobar y despachar. Un mensaje nuevo invalida autorizaciones antiguas. Una baja cancela lo pendiente; HTTP ya en vuelo no puede deshacerse y deja evidencia.

## Conciliación

Normalizo teléfonos ficticios sin vincular por similitud ni rellenar creadores para cobrar. Duplicados contradictorios, identidad ambigua y fechas inválidas quedan retenidos. El CSV histórico es independiente de los handoffs: el cociente de inscripciones y leads es una referencia, no una cohorte. Mantengo defectos y filas originales; no invento coherencia ni importes de comisión.

## Idiomas y temas

Diccionarios explícitos traducen presentación, no valores internos ni datos históricos. El idioma de la consola es independiente del lead. La heurística ES/EN excluye palabras compartidas y escala mezcla, insuficiencia o contradicción; lang ausente sigue siendo español. CSS centraliza colores de ambos temas; la preferencia se aplica antes de pintar y persiste con tolerancia a fallos. Compruebo contraste y operación en escritorio y móvil.

## Límites y qué no construí

Todo es ficticio y local: sin integraciones reales, publicación, autenticación simulada, inscripción automática, atribución multi-touch ni cálculo financiero. Call Back registra fecha y borrador, no llama. La auditoría local no es inmutable. Lecturas completas y reglas por archivo sirven a esta demo; producción requiere roles, seguridad, retención, revisión legal, observabilidad y concurrencia controlada.
