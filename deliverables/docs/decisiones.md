# Decisiones de ingeniería — una página

**Objetivo.** Demostrar una operación que ingesta, clasifica, deja trabajo humano y conserva evidencia sin depender de una pestaña abierta ni de cuentas de Influgain. Alivio Norte y Consejería Clara son ficticias.

**Next.js, React y TypeScript.** Stack solicitado. Una sola aplicación reúne UI y API; módulos de dominio independientes permiten probar reglas y transacciones sin navegador. CSS propio evita sumar una biblioteca de componentes para siete vistas sencillas.

**Reglas deterministas, sin LLM en ejecución.** Un modelo generativo sería más flexible ante variantes del lenguaje, pero introduce costo, credenciales y variabilidad innecesarios para esta prueba. El motor usa monto/tipo/consentimiento explícitos y escala lo ambiguo. Se editan umbrales y vocabulario en JSON, con validación y huella por decisión. Nunca se fuerza una clasificación cuando la intención no es clara. Las bajas y protecciones mínimas no se desactivan por configuración.

**SQLite + worker separado.** SQLite WAL elimina servicios de infraestructura. Un proceso consume inbox y outbox aunque el navegador se cierre. Las operaciones de negocio son transaccionales; el envío HTTP ocurre fuera de la transacción, con lease y claves idempotentes. Cola y recibos sobreviven al reinicio. No se construyó Redis, un orquestador ni microservicios: agregarían operación antes de existir una necesidad medida.

**Humano antes de comunicar.** La clasificación crea borradores, nunca trabajos de envío. Aprobar crea trabajos hacia un simulador HTTP fijo. Transferido exige voluntad explícita de hablar con un Consejero y confirmación del receptor. No le interesa bloquea contacto; un nuevo mensaje invalida envíos pendientes con contexto antiguo. Un envío en vuelo puede coincidir con una baja: se deja evidencia y se documenta la carrera; no se promete deshacer una petición HTTP.

**Atribución conservadora.** Un creator_id vacío no se rellena para cobrar. Se normalizan teléfonos, pero no se comparan por similitud. Duplicados contradictorios y fechas dudosas se retienen. Las inscripciones del CSV no se presentan como consecuencia de transferencias registradas en esta ejecución. No se inventaron tarifas de comisión ni cifras de ahorro.

**Qué no se construyó.** Integraciones reales; envío a números reales; inscripción automática; login ficticio que simule seguridad; despliegue público; atribución multi-touch; edición de identidad sin revisión; llamadas programadas reales; un sistema financiero o de comisiones monetarias. Call Back registra fecha y borrador. El actor local es operador-demo; la auditoría no es un sistema antifraude inmutable.

**Tradeoffs.** Documentos JSON en SQLite mantienen poco código, pero algunas lecturas recorren colecciones completas: adecuado para esta demo, no para millones de filas. La consola local no debe exponerse mediante un túnel. Las reglas por archivo son adecuadas para un operador; varios operadores necesitan versiones transaccionales y control de concurrencia. Son límites explícitos, no características prometidas.
