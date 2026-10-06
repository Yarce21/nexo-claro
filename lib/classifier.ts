import type { Decision, Qualification, Rules } from './types';
export function normalize(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function contains(text: string, words: string[]) { return words.some(word => new RegExp(`(?:^|\\W)${normalize(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\W)`, 'u').test(text)); }
export function classify(message: string, rules: Rules, previous?: Qualification | null): { decision: Decision; reason: string; text: string; qualification: Qualification; stop: boolean } {
  const text = normalize(message);
  // Only unambiguous whole amounts are accepted; locale separators go to a human.
  const amountMatch = text.match(/(?:debo|deuda de|monto de|^)\s*\$?\s*(\d{1,7})(?!\d)(?:\s*(mil|k)\b)?/);
  const amount = amountMatch ? Number(amountMatch[1]) * (amountMatch[2] ? 1000 : 1) : previous?.amount ?? null;
  const debtType = /hipoteca/.test(text) ? 'hipoteca' : /tarjeta/.test(text) ? 'tarjeta' : /prestamo personal/.test(text) ? 'prestamo_personal' : previous?.debtType ?? null;
  const wantsCounselor = /no (?:quiero|deseo) (?:hablar con )?(?:un )?consejero/.test(text) ? false : /(?:quiero|deseo) (?:hablar con )?(?:un )?consejero/.test(text) ? true : previous?.wantsCounselor ?? null;
  const qualification: Qualification = { amount, debtType, wantsCounselor, eligible: amount !== null && amount >= rules.minDebt && amount <= rules.maxDebt && rules.eligibleTypes.includes(debtType as 'tarjeta' | 'prestamo_personal') };
  const result = (decision: Decision, reason: string, response: string, stop = false) => ({ decision, reason, text: response, qualification, stop });
  if (contains(text, [...rules.stopWords, 'no me contacten', 'dejen de escribirme', 'baja'])) return result('ignorar', 'Solicitud de baja: se bloquea todo contacto pendiente.', '', true);
  if (contains(text, [...rules.handoffWords, 'demanda', 'embargo', 'suicidio', 'garantizado', 'tasa', 'puntaje', 'tarifa', 'abogado', 'fraude']) || /ignora.{0,30}(reglas|instrucciones)|system prompt|<script/i.test(text)) return result('escalar_humano', 'Lenguaje sensible, solicitud riesgosa o intento de alterar las reglas.', 'Revisión humana requerida. No se generó una recomendación financiera.');
  if (contains(text, rules.ignoreWords)) return result('ignorar', 'Mensaje no relacionado o publicidad según reglas.', '');
  if (/\d[.,]\d|\d+\s*[-–]\s*\d+|\b(?:entre|o)\s+\d+|(?:debo|deuda de)\s*-\d|\beur\b|\beuros\b|\bpesos\b|\bcop\b/.test(text) || (text.match(/\d+/g)?.length || 0) > 1) return result('escalar_humano', 'Monto, moneda o rango ambiguo; no se infiere una cifra.', 'Un agente debe confirmar monto y moneda antes de continuar.');
  if ((amount !== null && !qualification.eligible && debtType !== null) || debtType === 'hipoteca') return result('escalar_humano', 'Fuera de los criterios ficticios de monto o tipo; requiere revisión.', 'Revisión de elegibilidad por un agente; no se promete aceptación.');
  if (!/deuda|debo|tarjeta|prestamo|consejero|informacion|hola|ayuda/.test(text) && !amountMatch) return result('escalar_humano', 'Intención ambigua; el sistema no inventa una respuesta.', 'Un agente debe aclarar la solicitud.');
  const questions = [amount === null ? '¿Cuál es el monto aproximado de tu deuda en USD, sin separadores?' : '', debtType === null ? '¿Es deuda de tarjeta o préstamo personal?' : '', wantsCounselor === null ? '¿Quieres hablar con un Consejero de Consejería Clara?' : ''].filter(Boolean);
  const response = wantsCounselor === false ? 'Gracias por aclararlo. No solicitaremos contacto con un Consejero. Un agente puede revisar tus preguntas.' : questions.length ? `Gracias por escribir a Alivio Norte. ${questions.join(' ')} No compartas datos bancarios ni documentos.` : 'Gracias. Un agente revisará tus datos y tu solicitud de hablar con un Consejero de Consejería Clara. En muchos casos podría haber opciones para organizar los pagos; dependen de una evaluación y no se garantiza ahorro ni aceptación.';
  return result('responder', questions.length ? 'Faltan datos de precalificación; solicitar solo lo necesario.' : 'Datos revisados con criterios ficticios; pendiente de revisión humana.', response);
}
