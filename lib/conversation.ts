import type { dispositions } from './types';

export type Language = 'es' | 'en';
export type Disposition = typeof dispositions[number];

export function detectLanguage(message: string): Language | 'ambiguous' | 'mixed' {
  const words = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]+/g) || [];
  // Shared words (no, personal, me), numbers and currency codes are not evidence.
  const es = new Set('hola debo deuda tarjeta prestamo hipoteca quiero deseo consejero informacion ayuda tengo demanda abogado urgente baja publicidad dinero contacten escribirme dejen llamen llame necesito cancela'.split(' '));
  const en = new Set('hello hi owe debt credit card loan mortgage want counselor information help have lawsuit attorney foreclosure guaranteed rate fee score fraud urgent suicide stop unsubscribe contact advertising earn money please thanks the my talk don do not changed mind call longer'.split(' '));
  const spanish = words.filter(w => es.has(w)).length;
  const english = words.filter(w => en.has(w)).length;
  if (spanish && english) return 'mixed';
  return spanish ? 'es' : english ? 'en' : 'ambiguous';
}

// All possible outgoing copy lives here so compliance can audit every template,
// including questions, CRM messages and summaries. Dates are context, never prices.
export const conversationTemplates = {
  es: {
    amount: '¿Cuál es el monto aproximado de tu deuda en USD, sin separadores?',
    debt: '¿Es deuda de tarjeta o préstamo personal?',
    consent: '¿Quieres hablar con un Consejero de Consejería Clara?',
    greeting: 'Gracias por escribir a Alivio Norte.',
    privacy: 'No compartas datos bancarios ni documentos.',
    declined: 'Gracias por aclararlo. No solicitaremos contacto con un Consejero. Un agente puede revisar tus preguntas.',
    complete: 'Gracias. Un agente revisará tus datos y tu solicitud de hablar con un Consejero de Consejería Clara. En muchos casos podría haber opciones para organizar los pagos; dependen de una evaluación y no se garantiza ahorro ni aceptación.',
    sensitive: 'Revisión humana requerida. No se generó una recomendación financiera.',
    amountReview: 'Un agente debe confirmar monto y moneda antes de continuar.',
    eligibility: 'Revisión de elegibilidad por un agente; no se promete aceptación.',
    clarify: 'Un agente debe aclarar la solicitud.',
    history: 'Revisar el historial y aclarar el caso antes de continuar.',
    language: 'Un agente bilingüe debe confirmar el idioma antes de continuar.',
    crm: {
      'No Answer': 'Hola, somos Alivio Norte. No logramos conversar. Si quieres retomar, dinos un horario conveniente.',
      'Info Sent': 'Compartimos información general de Alivio Norte. Un Consejero de Consejería Clara podría evaluar opciones según tu situación. No se garantiza ahorro ni aceptación.',
      Transferido: 'Registramos tu solicitud de conversar con un Consejero de Consejería Clara. La transferencia está pendiente de aprobación humana y confirmación del partner ficticio.',
      'Call Back': 'Registramos tu preferencia para retomar el contacto el {date}. Un agente revisará la solicitud.',
      'No le interesa': 'Registramos que no deseas continuar. No enviaremos más mensajes.'
    }
  },
  en: {
    amount: 'What is your approximate debt amount in USD, without separators?',
    debt: 'Is it credit card debt or a personal loan?',
    consent: 'Would you like to speak with a Counselor at Consejería Clara?',
    greeting: 'Thank you for contacting Alivio Norte.',
    privacy: 'Do not share banking information or documents.',
    declined: 'Thank you for clarifying. We will not request contact with a Counselor. A human agent can review your questions.',
    complete: 'Thank you. A human agent will review your information and your request to speak with a Counselor at Consejería Clara. In many cases there could be options to organize payments; they depend on an evaluation. Savings and acceptance are not promised.',
    sensitive: 'Human review required. No financial recommendation was generated.',
    amountReview: 'A human agent must confirm the amount and currency before continuing.',
    eligibility: 'A human agent must review eligibility; acceptance is not promised.',
    clarify: 'A human agent must clarify the request.',
    history: 'Review the history and clarify the case before continuing.',
    language: 'A bilingual human agent must confirm the language before continuing.',
    crm: {
      'No Answer': 'Hello, we are Alivio Norte. We could not connect. If you would like to resume, tell us a convenient time.',
      'Info Sent': 'We are sharing general information from Alivio Norte. A Counselor at Consejería Clara could evaluate options based on your situation. Savings and acceptance are not promised.',
      Transferido: 'We recorded your request to speak with a Counselor at Consejería Clara. The transfer awaits human approval and confirmation from the fictional partner.',
      'Call Back': 'We recorded your preference to resume contact on {date}. A human agent will review the request.',
      'No le interesa': 'We recorded that you do not wish to continue. We will not send further messages.'
    }
  }
} as const;

export function crmTemplate(lang: Language, disposition: Disposition, date = '') {
  return conversationTemplates[lang].crm[disposition].replace('{date}', date);
}
