import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MessageInput, ContentSource, Script } from '../lib/types';
export function createFixtures() {
  const messages = [
    'Debo 18000 USD en tarjeta y quiero hablar con un Consejero.',
    'Tengo una demanda por mi deuda y necesito ayuda urgente.',
    'Hola, necesito información sobre mis deudas.',
    'Debo 9000 USD en préstamo personal y quiero Consejero.',
    '¿Me garantizan ahorro y un mejor puntaje?',
    'Publicidad: gana dinero desde casa.',
    'Debo 2500 USD en tarjeta, quiero Consejero.',
    'Debo 25.000 en tarjeta, ¿qué puedo hacer?',
    'No me contacten, quiero la baja.',
    'Debo 12000 USD en tarjeta, no quiero Consejero.',
    'Debo 42000 USD de hipoteca.',
    'No entiendo qué sigue después de pedir información.'
  ];
  const leads: MessageInput[] = Array.from({ length: 48 }, (_, index) => ({
    eventId: `EV-${String(index + 1).padStart(3, '0')}`, leadId: `LN-${String(index + 1).padStart(3, '0')}`,
    timestamp: new Date(Date.UTC(2026, 8, 20, 10, index)).toISOString(),
    creator: (['CR-ANA', 'CR-LUIS', 'CR-MARIA'] as const)[index % 3],
    channel: index % 3 ? 'orgánico' : 'CTWA', message: messages[index % messages.length],
    phone: index === 15 ? '' : `+120255501${String(index).padStart(2, '0')}`, initialState: 'Nuevo'
  }));
  const partner = Array.from({ length: 30 }, (_, i) => ({
    enrollment_id: `EN-${String(i + 1).padStart(3, '0')}`,
    phone: i % 2 ? `(202) 555-01${String(i).padStart(2, '0')}` : `+1 202 555 01${String(i).padStart(2, '0')}`,
    creator_id: String(leads[i].creator), enrolled_at: '2026-09-25T14:00:00Z', status: 'enrolled'
  }));
  partner[3].phone = '+12025550199';
  partner[5].creator_id = '';
  partner[7].enrolled_at = '09/10/26';
  partner[9].enrolled_at = '2026-02-30';
  partner[11].creator_id = 'CR-DESCONOCIDO' as typeof partner[number]['creator_id'];
  partner[13].phone = 'sin teléfono';
  partner[15].enrolled_at = '2099-01-01';
  partner[17].enrolled_at = '2020-01-01';
  partner[19].status = 'pending';
  partner[21].creator_id = '';
  partner[25] = { ...partner[0] };
  partner[26] = { ...partner[2], creator_id: 'CR-ANA' };
  partner[27] = { ...partner[4], enrollment_id: 'EN-028' };
  const sources: ContentSource[] = [
    { id: 'F-01', kind: 'Pregunta ficticia', text: 'LN-003: ¿Qué datos necesito para empezar?' },
    { id: 'F-02', kind: 'Objeción ficticia', text: 'LN-010: No quiero hablar con nadie todavía.' },
    { id: 'F-03', kind: 'Pregunta ficticia', text: 'LN-012: No entiendo qué pasa después de pedir información.' },
    { id: 'F-04', kind: 'Objeción ficticia', text: '¿Podrían prometerme cuánto voy a ahorrar?' },
    { id: 'F-05', kind: 'Tendencia inventada', text: 'Personas que organizan sus pagos en una libreta antes de consultar.' },
    { id: 'F-06', kind: 'Pregunta ficticia', text: '¿Mi hipoteca entra en este proceso?' },
    { id: 'F-07', kind: 'Objeción ficticia', text: 'Me preocupa compartir mis datos bancarios por chat.' },
    { id: 'F-08', kind: 'Pregunta ficticia', text: '¿Puedo elegir cuándo me contactan?' },
    { id: 'F-09', kind: 'Tendencia inventada', text: 'Comparar opciones sin cifras de ahorro inventadas.' },
    { id: 'F-10', kind: 'Pregunta ficticia', text: '¿Cómo pido que dejen de escribirme?' }
  ];
  const scripts: Script[] = [
    { id: 'G-01', priority: 1, sourceId: 'F-01', title: 'El primer paso cabe en una libreta', rationale: 'Reduce la fricción al iniciar; CTA concreto sin pedir información sensible.', text: 'Lucía llevaba semanas dejando los sobres en un cajón. Un domingo decidió abrir su libreta y anotar dos cosas: cuánto debía aproximadamente y qué tipo de deuda tenía. No resolvió todo esa tarde, pero llegó con preguntas más claras. Si te pasa algo parecido, puedes empezar por ahí. En Alivio Norte te pedimos solo lo necesario para orientar la conversación, sin datos bancarios ni documentos por chat. Si tú quieres, un Consejero de Consejería Clara podría evaluar opciones según tu situación. Escribe información para conocer el proceso. Cada caso es diferente; no se garantiza ahorro ni aceptación.' },
    { id: 'G-02', priority: 2, sourceId: 'F-03', title: 'Pedir información no es comprometerte', rationale: 'Aclara el handoff y evita interpretar una consulta como consentimiento.', text: 'Andrés escribió una pregunta y después pensó: ¿ya me inscribieron en algo? No. En esta historia, pedir información fue solo abrir una conversación. Primero pudo explicar el monto aproximado y el tipo de deuda. Después decidió si quería hablar con un Consejero de Consejería Clara. Un agente revisó su solicitud antes de coordinar el siguiente paso. Tú también puedes hacer preguntas, pedir tiempo o decir que no deseas continuar. Conocer el proceso ayuda a decidir con calma. Escribe pasos si quieres saber cómo funciona. La evaluación depende de cada situación y no garantiza ahorro ni aceptación.' },
    { id: 'G-03', priority: 3, sourceId: 'F-02', title: 'También puedes decir: todavía no', rationale: 'Responde una objeción frecuente y refuerza el control del lead.', text: 'María vio un video sobre organizar deudas, pero no quería recibir una llamada ese día. Contestó: todavía no quiero hablar con un Consejero. Su decisión se respetó. A veces, el primer paso es entender tus preguntas y elegir cuándo conversar. En Alivio Norte puedes pedir información general sin autorizar una transferencia automática. Si más adelante lo decides, un Consejero de Consejería Clara podría revisar opciones contigo. Y si no quieres más contacto, puedes solicitar la baja. Escribe proceso para conocer los pasos a tu ritmo. No hay promesas de ahorro; las opciones dependen de una evaluación individual.' }
  ];
  const dir = path.join(process.cwd(), 'data'); mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'leads.json'), JSON.stringify(leads, null, 2) + '\n');
  const columns = ['enrollment_id', 'phone', 'creator_id', 'enrolled_at', 'status'] as const;
  writeFileSync(path.join(dir, 'partner-dirty.csv'), [columns.join(','), ...partner.map(r => columns.map(k => `"${r[k].replace(/"/g, '""')}"`).join(','))].join('\n') + '\n');
  writeFileSync(path.join(dir, 'content.json'), JSON.stringify({ sources, scripts }, null, 2) + '\n');
  return leads;
}
