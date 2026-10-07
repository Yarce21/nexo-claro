import { conversationTemplates, detectLanguage, type Language } from './conversation';
import type { Decision, Qualification, Rules } from './types';
export function normalize(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase(); }
function contains(text: string, words: string[]) { return words.some(word => new RegExp(`(?:^|\\W)${normalize(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\W)`, 'u').test(text)); }
// Non-removable opt-out and safety terms protect leads even when editable rules change.
export const SAFETY_FLOOR = {
  stop: ['no me contacten', 'dejen de escribirme', 'baja', 'stop', 'unsubscribe', 'do not contact me'],
  handoff: ['demanda', 'embargo', 'suicidio', 'garantizado', 'tasa', 'puntaje', 'tarifa', 'abogado', 'fraude', 'lawsuit', 'attorney', 'foreclosure', 'guaranteed', 'rate', 'fee', 'credit score', 'fraud', 'urgent', 'suicide']
} as const;
function consent(text: string, previous?: boolean | null) {
  const negative = /\b(?:no\s+(?:quiero|deseo|necesito)\b|ya no quiero\b|no me llam(?:en|e)\b|cancela\b[^.!?;]*consejero\b|sin consejero\b|(?:i\s+)?(?:don't|do not|dont)\s+(?:want|have|need)\b|i no longer want\b|no counselor\b|i changed my mind\b)/g;
  const declined = negative.test(text);
  negative.lastIndex = 0;
  // Remove negative clauses before looking for a separate affirmation; “don't want” contains “want”.
  const remaining = text.replace(negative, '');
  const affirmative = /\b(?:quiero|deseo) (?:hablar con )?(?:un )?consejero\b|\b(?:i\s+)?want (?:to (?:talk|speak) (?:to|with) )?(?:a )?counselor\b/.test(remaining) || (declined && /\b(?:si|yes)\b/.test(remaining));
  const uncertain = /\b(?:quizas|quiza|tal vez|no se|maybe|perhaps|not sure|don't know|do not know|sarcasmo|sarcasm)\b/.test(text);
  return { value: declined ? false : uncertain ? null : affirmative ? true : previous ?? null, ambiguous: uncertain || (declined && affirmative) };
}
export function classify(message: string, rules: Rules, previous?: Qualification | null, preferredLanguage?: Language): { decision: Decision; reason: string; text: string; qualification: Qualification; stop: boolean } {
  const text = normalize(message);
  const detected = detectLanguage(message);
  const lang: Language = detected === 'es' || detected === 'en' ? detected : preferredLanguage || 'es';
  const copy = conversationTemplates[lang];
  // Only unambiguous whole amounts are accepted; locale separators go to a human.
  const amountMatch = text.match(/(?:debo|deuda de|monto de|i owe|owe|debt of|^)\s*\$?\s*(\d{1,7})(?!\d)(?:\s*(mil|k)\b)?/);
  const amount = amountMatch ? Number(amountMatch[1]) * (amountMatch[2] ? 1000 : 1) : previous?.amount ?? null;
  const debtType = /hipoteca|mortgage/.test(text) ? 'hipoteca' : /tarjeta|credit card/.test(text) ? 'tarjeta' : /prestamo personal|personal loan/.test(text) ? 'prestamo_personal' : previous?.debtType ?? null;
  const intention = consent(text, previous?.wantsCounselor);
  const wantsCounselor = intention.value;
  const qualification: Qualification = { amount, debtType, wantsCounselor, eligible: amount !== null && amount >= rules.minDebt && amount <= rules.maxDebt && rules.eligibleTypes.includes(debtType as 'tarjeta' | 'prestamo_personal') };
  const result = (decision: Decision, reason: string, response: string, stop = false) => ({ decision, reason, text: response, qualification, stop });
  if (contains(text, [...rules.stopWords, ...rules.stopWordsEn, ...SAFETY_FLOOR.stop])) return result('ignorar', 'Solicitud de baja: se bloquea todo contacto pendiente.', '', true);
  if (intention.ambiguous) return result('escalar_humano', 'Consentimiento ambiguo o contradictorio; un humano debe confirmar la intención actual.', copy.clarify);
  if (detected === 'mixed' || detected === 'ambiguous' || (preferredLanguage && detected !== preferredLanguage)) return result('escalar_humano', detected === 'mixed' ? 'Idioma mixto: un agente debe confirmar el idioma de la conversación.' : detected === 'ambiguous' ? 'Idioma ambiguo: evidencia insuficiente; no se adivina.' : 'El idioma declarado no coincide con el mensaje; requiere confirmación humana.', copy.language);
  if (contains(text, [...rules.handoffWords, ...rules.handoffWordsEn, ...SAFETY_FLOOR.handoff]) || /ignora.{0,30}(reglas|instrucciones)|ignore.{0,30}(rules|instructions)|system prompt|<script/i.test(text)) return result('escalar_humano', 'Lenguaje sensible, solicitud riesgosa o intento de alterar las reglas.', copy.sensitive);
  if (contains(text, [...rules.ignoreWords, ...rules.ignoreWordsEn])) return result('ignorar', 'Mensaje no relacionado o publicidad según reglas.', '');
  if (/\d[.,]\d|\d+\s*[-–]\s*\d+|\b(?:entre|o|between|or)\s+\d+|(?:debo|deuda de|i owe|owe)\s*-\d|\beur\b|\beuros\b|\bpesos\b|\bcop\b|\b(?:gbp|cad|mxn|aud|pounds|yen)\b/.test(text) || (text.match(/\d+/g)?.length || 0) > 1) return result('escalar_humano', 'Monto, moneda o rango ambiguo; no se infiere una cifra.', copy.amountReview);
  if ((amount !== null && !qualification.eligible && debtType !== null) || debtType === 'hipoteca') return result('escalar_humano', 'Fuera de los criterios ficticios de monto o tipo; requiere revisión.', copy.eligibility);
  if (!/deuda|debo|tarjeta|prestamo|consejero|informacion|hola|ayuda|debt|owe|credit card|personal loan|counselor|information|hello|help/.test(text) && !amountMatch && wantsCounselor !== false) return result('escalar_humano', 'Intención ambigua; el sistema no inventa una respuesta.', copy.clarify);
  const questions = [amount === null ? copy.amount : '', debtType === null ? copy.debt : '', wantsCounselor === null ? copy.consent : ''].filter(Boolean);
  const response = wantsCounselor === false ? copy.declined : questions.length ? `${copy.greeting} ${questions.join(' ')} ${copy.privacy}` : copy.complete;
  return result('responder', questions.length ? 'Faltan datos de precalificación; solicitar solo lo necesario.' : 'Datos revisados con criterios ficticios; pendiente de revisión humana.', response);
}
