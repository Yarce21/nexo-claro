import { conversationTemplates, detectLanguage, type Language } from './conversation';
import type { Decision, Qualification, Rules } from './types';
export function normalize(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase(); }
function contains(text: string, words: readonly string[]) {
  return words.some(word => {
    const variants = normalize(word).split(/\s+/).map(token => {
      const forms = [token, `${token}s`, `${token}es`];
      if (/[^aeiou]y$/.test(token)) forms.push(`${token.slice(0, -1)}ies`);
      return `(?:${forms.map(form => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
    }).join('\\s+');
    return new RegExp(`(?:^|\\W)${variants}(?:$|\\W)`, 'u').test(text);
  });
}
// Non-removable opt-out and safety terms protect leads even when editable rules change.
export const SAFETY_FLOOR = {
  stop: ['no me contacten', 'dejen de escribirme', 'baja', 'stop', 'unsubscribe', 'do not contact me'],
  handoff: ['demanda', 'demandar', 'embargo', 'suicidio', 'garantizado', 'garantía', 'garantizamos', 'tasa', 'tasa de interés', 'puntaje', 'tarifa', 'comisión', 'comisiones', 'cuota administrativa', 'abogado', 'fraude', 'estafa', 'lawsuit', 'sue', 'attorney', 'lawyer', 'foreclosure', 'guarantee', 'guaranteed', 'rate', 'interest rate', 'fee', 'score', 'credit score', 'fraud', 'scam', 'urgent', 'suicide']
} as const;
function consent(text: string, previous?: boolean | null) {
  const clauses = text.split(/[.!?;,]|\s+(?:pero|but)\s+/);
  const negative = /\b(?:no\s+(?:quiero|deseo|necesito)|(?:i\s+)?(?:don't|do not|dont)\s+(?:want|have|need)|cancela|sin|no)\b/;
  const contact = /\b(?:consejeros?|counselors?|llam\w*|call\w*|contact\w*|hablar|talk|speak)\b/;
  // Standalone withdrawal is explicit; unrelated payment negatives must preserve prior consent.
  const withdrawals = clauses.map(clause => /^(?:ya no quiero|i changed my mind)\s*$/.test(clause.trim()) ||
    (negative.test(clause) && contact.test(clause)) || /\bi no longer want\b.*\bcounselors?\b/.test(clause));
  const declined = withdrawals.some(Boolean);
  const remaining = clauses.filter((_, index) => !withdrawals[index]).join(' ');
  const affirmative = /\b(?:quiero|deseo) (?:hablar con )?(?:un )?consejero\b|\b(?:i\s+)?want (?:to (?:talk|speak) (?:to|with) )?(?:a )?counselor\b/.test(remaining) || (declined && /\b(?:si|yes)\b/.test(remaining));
  const uncertain = /\b(?:quizas|quiza|tal vez|no se|maybe|perhaps|not sure|don't know|do not know|sarcasmo|sarcasm)\b/.test(text);
  return { value: declined ? false : uncertain ? null : affirmative ? true : previous ?? null, ambiguous: uncertain || (declined && affirmative) };
}
function unsupportedCurrency(original: string): boolean {
  // Inspect Unicode currency symbols before normalization; only the plain dollar sign is allowed.
  if ([...original].some(character => /\p{Sc}/u.test(character) && character !== '$')) return true;
  if (/\b(?!US\$)[a-z]{1,3}\$/i.test(original)) return true;
  const text = normalize(original);
  if (/\b(?:euros?|libras?|pounds?|francos?|francs?|yenes|yen|pesos?|reales?|soles?)\b/.test(text)) return true;
  const common = new Set(['usd', 'can', 'mil', 'owe', 'the', 'and', 'for', 'all', 'you', 'not', 'con', 'una', 'por', 'del', 'las', 'los', 'sin', 'son', 'que', 'mis']);
  const codes = new Set(Intl.supportedValuesOf('currency').map(code => code.toLowerCase()));
  // Unknown three-letter codes next to a figure also require a human; grammatical words are not codes.
  const nearAmount = [...text.matchAll(/\b([a-z]{3})\s*\$?\s*\d|\d\s*([a-z]{3})\b/g)].map(match => match[1] || match[2]);
  if (nearAmount.some(code => !common.has(code))) return true;
  if ((text.match(/\b[a-z]{3}\b/g) || []).some(word => codes.has(word) && !common.has(word))) return true;
  const connectors = new Set(['en', 'de', 'y', 'para', 'por', 'on', 'in', 'and', 'for', 'of', 'to', 'i', 'owe', 'debo', 'my', 'the']);
  const before = text.match(/\b([a-z]+)\s+(?:dollars?|dolares?)\b/);
  const after = text.match(/\b(?:dollars?|dolares?)\s+([a-z]+)\b/);
  return !!((before && !connectors.has(before[1])) || (after && !connectors.has(after[1])));
}
export function classify(message: string, rules: Rules, previous?: Qualification | null, preferredLanguage?: Language): { decision: Decision; reason: string; text: string; qualification: Qualification; stop: boolean } {
  const text = normalize(message);
  const detected = detectLanguage(message);
  const lang: Language = detected === 'es' || detected === 'en' ? detected : preferredLanguage || 'es';
  const copy = conversationTemplates[lang];
  // Only unambiguous whole amounts are accepted; locale separators go to a human.
  const foreignCurrency = unsupportedCurrency(message);
  const amountMatch = text.match(/(?:debo|deuda de|monto de|i owe|owe|debt of|^)\s*(?:usd\s*|us\$\s*|\$\s*)?(\d{1,7})(?!\d)(?:\s*(mil|k)\b)?/);
  const amount = foreignCurrency ? null : amountMatch ? Number(amountMatch[1]) * (amountMatch[2] ? 1000 : 1) : previous?.amount ?? null;
  const debtType = /hipoteca|mortgage/.test(text) ? 'hipoteca' : /tarjeta|credit card/.test(text) ? 'tarjeta' : /prestamo personal|personal loan/.test(text) ? 'prestamo_personal' : previous?.debtType ?? null;
  const intention = consent(text, previous?.wantsCounselor);
  const wantsCounselor = intention.value;
  const qualification: Qualification = { amount, debtType, wantsCounselor, eligible: amount !== null && amount >= rules.minDebt && amount <= rules.maxDebt && rules.eligibleTypes.includes(debtType as 'tarjeta' | 'prestamo_personal') };
  const result = (decision: Decision, reason: string, response: string, stop = false) => ({ decision, reason, text: response, qualification, stop });
  if (contains(text, [...rules.stopWords, ...rules.stopWordsEn, ...SAFETY_FLOOR.stop])) return result('ignorar', 'Solicitud de baja: se bloquea todo contacto pendiente.', '', true);
  if (foreignCurrency) return result('escalar_humano', 'Moneda no admitida o calificada: solo USD o monto sin indicación de moneda; confirmar con humano.', copy.amountReview);
  if (intention.ambiguous) return result('escalar_humano', 'Consentimiento ambiguo o contradictorio; un humano debe confirmar la intención actual.', copy.clarify);
  if (contains(text, [...rules.handoffWords, ...rules.handoffWordsEn, ...SAFETY_FLOOR.handoff]) || /ignora.{0,30}(reglas|instrucciones)|ignore.{0,30}(rules|instructions)|system prompt|<script/i.test(text)) return result('escalar_humano', 'Lenguaje sensible, solicitud riesgosa o intento de alterar las reglas.', copy.sensitive);
  if (detected === 'mixed' || detected === 'ambiguous' || (preferredLanguage && detected !== preferredLanguage)) return result('escalar_humano', detected === 'mixed' ? 'Idioma mixto: un agente debe confirmar el idioma de la conversación.' : detected === 'ambiguous' ? 'Idioma ambiguo: evidencia insuficiente; no se adivina.' : 'El idioma declarado no coincide con el mensaje; requiere confirmación humana.', copy.language);
  if (contains(text, [...rules.ignoreWords, ...rules.ignoreWordsEn])) return result('ignorar', 'Mensaje no relacionado o publicidad según reglas.', '');
  if (/\d[.,]\d|\d+\s*[-–]\s*\d+|\b(?:entre|o|between|or)\s+\d+|(?:debo|deuda de|i owe|owe)\s*-\d/.test(text) || (text.match(/\d+/g)?.length || 0) > 1) return result('escalar_humano', 'Monto, moneda o rango ambiguo; no se infiere una cifra.', copy.amountReview);
  if ((amount !== null && !qualification.eligible && debtType !== null) || debtType === 'hipoteca') return result('escalar_humano', 'Fuera de los criterios ficticios de monto o tipo; requiere revisión.', copy.eligibility);
  if (!/deuda|debo|tarjeta|prestamo|consejero|informacion|hola|ayuda|pagando|debt|owe|credit card|personal loan|counselor|information|hello|help|paying/.test(text) && !amountMatch && wantsCounselor !== false) return result('escalar_humano', 'Intención ambigua; el sistema no inventa una respuesta.', copy.clarify);
  const questions = [amount === null ? copy.amount : '', debtType === null ? copy.debt : '', wantsCounselor === null ? copy.consent : ''].filter(Boolean);
  const response = wantsCounselor === false ? copy.declined : questions.length ? `${copy.greeting} ${questions.join(' ')} ${copy.privacy}` : copy.complete;
  return result('responder', questions.length ? 'Faltan datos de precalificación; solicitar solo lo necesario.' : 'Datos revisados con criterios ficticios; pendiente de revisión humana.', response);
}
