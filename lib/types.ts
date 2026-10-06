import { z } from 'zod';

export const dispositions = ['No Answer', 'Info Sent', 'Transferido', 'Call Back', 'No le interesa'] as const;
export const rulesSchema = z.object({
  minDebt: z.number().int().min(0).max(10000000),
  maxDebt: z.number().int().positive().max(10000000),
  staleHours: z.number().int().min(1).max(720),
  eligibleTypes: z.array(z.enum(['tarjeta', 'prestamo_personal'])).min(1),
  ignoreWords: z.array(z.string().trim().min(2).max(60)).max(50),
  stopWords: z.array(z.string().trim().min(2).max(60)).min(1).max(50),
  handoffWords: z.array(z.string().trim().min(2).max(60)).min(1).max(50),
  maxAttempts: z.number().int().min(1).max(5),
  retryBaseSeconds: z.number().int().min(1).max(300)
}).strict().refine(r => r.minDebt < r.maxDebt, { message: 'El mínimo debe ser menor que el máximo.' });
export type Rules = z.infer<typeof rulesSchema>;
export const messageSchema = z.object({
  eventId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  leadId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  timestamp: z.iso.datetime(),
  creator: z.enum(['CR-ANA', 'CR-LUIS', 'CR-MARIA']),
  channel: z.enum(['CTWA', 'orgánico']),
  message: z.string().trim().min(1).max(2000),
  phone: z.string().max(30),
  initialState: z.enum(['Nuevo', 'Pendiente']).default('Nuevo')
}).strict().refine(v => Date.parse(v.timestamp) <= Date.now() + 60000, { message: 'La fecha no puede estar en el futuro.' });
export type MessageInput = z.infer<typeof messageSchema>;
export type Decision = 'responder' | 'ignorar' | 'escalar_humano';
export interface Qualification { amount: number | null; debtType: string | null; wantsCounselor: boolean | null; eligible: boolean; }
export interface Lead extends MessageInput { acquiredAt: string; stage: string; updatedAt: string; optedOut: boolean; needsReview: boolean; qualification: Qualification | null; }
export interface Inbox { input: MessageInput; status: 'pending' | 'done' | 'failed'; error?: string; }
export interface Draft { id: string; leadId: string; eventId: string; decision: Decision; reason: string; text: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; ruleVersion: string; qualification: Qualification; kind: 'chat' | 'crm'; transfer: boolean; }
export interface Job { id: string; leadId: string; draftId: string; kind: 'whatsapp' | 'handoff'; status: 'pending' | 'processing' | 'delivered' | 'failed' | 'cancelled'; attempts: number; maxAttempts: number; retryBaseSeconds: number; nextAt: string; leaseUntil?: string; error?: string; payload: { phone: string; text: string }; }
export interface Audit { id: string; timestamp: string; leadId: string; action: string; reason: string; actor: string; draftLink: string | null; }
export interface PartnerRow { row: number; enrollment_id: string; phone: string; creator_id: string; enrolled_at: string; status: string; }
export interface CleanRow extends PartnerRow { normalizedPhone: string | null; leadId: string | null; attributedCreator: string | null; issues: string[]; accepted: boolean; }
export interface ContentSource { id: string; kind: string; text: string; }
export interface Script { id: string; priority: number; sourceId: string; title: string; rationale: string; text: string; }
