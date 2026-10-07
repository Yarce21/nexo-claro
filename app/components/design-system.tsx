'use client';
import { useTranslation } from './preferences';
import type { ReactNode } from 'react';

export type IconName = 'dashboard' | 'inbox' | 'users' | 'rules' | 'database' | 'file' | 'activity' | 'plus' | 'arrow-right' | 'arrow-up-right' | 'shield' | 'check' | 'check-circle' | 'warning' | 'clock' | 'search' | 'x' | 'info' | 'link' | 'send' | 'refresh' | 'code' | 'quote' | 'phone' | 'calendar' | 'chevron-down';

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  inbox: <><path d="m4 4-2 10v6h20v-6L20 4Z"/><path d="M2 14h6l2 3h4l2-3h6M8 8h8"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></>,
  rules: <><path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h9m4 0h3"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  activity: <path d="M2 12h4l3-8 6 16 3-8h4"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6"/>,
  'arrow-up-right': <path d="M7 17 17 7M7 7h10v10"/>,
  shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  'check-circle': <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v4m0 4h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/></>,
  link: <><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/></>,
  send: <><path d="m22 2-7 20-4-9L2 9Z"/><path d="m11 13 6-6"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 11-2l3 3M4 16l3 3a7 7 0 0 0 11-2"/></>,
  code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/></>,
  quote: <><path d="M4 4h16v13H8l-4 4Z"/><path d="M8 8h8M8 12h5"/></>,
  phone: <path d="M22 16.9V20a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
  'chevron-down': <path d="m6 9 6 6 6-6"/>
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export function BrandMark() {
  return <svg className="brand-mark" width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--logo-bg)"/><path d="M12 28V12l16 16V12" stroke="var(--logo-line)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" fill="var(--logo-node)"/><circle cx="28" cy="28" r="3" fill="var(--logo-node)"/></svg>;
}

export type BadgeTone = '' | 'green' | 'amber' | 'blue' | 'red';
export function Badge({ children, tone = '', icon }: { children: ReactNode; tone?: BadgeTone; icon?: IconName }) {
  const semanticIcon = icon || (tone === 'green' ? 'check-circle' : tone === 'amber' ? 'warning' : tone === 'red' ? 'x' : undefined);
  return <span className={`badge ${tone}`}>{semanticIcon && <Icon name={semanticIcon}/>}<span>{children}</span></span>;
}

export function presentationTone(status: string): BadgeTone {
  if (['Transferido', 'approved', 'delivered', 'Conciliada'].includes(status)) return 'green';
  if (['Revisión humana', 'Transferencia pendiente', 'escalar_humano', 'retry_scheduled'].includes(status)) return 'amber';
  if (['failed', 'delivery_failed', 'inbox_failed'].includes(status)) return 'red';
  if (['Info Sent', 'Call Back', 'processing', 'pending', 'responder'].includes(status)) return 'blue';
  return '';
}

export function EmptyState({ title, detail, icon = 'inbox', compact = false }: { title: string; detail?: string; icon?: IconName; compact?: boolean }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}><span className="empty-icon"><Icon name={icon}/></span><strong>{title}</strong>{detail && <p>{detail}</p>}</div>;
}

export function LoadingState() {
  const t = useTranslation();
  return <section className="loading-state" aria-busy="true" role="status"><div className="loading-message"><span className="spinner"/><span>{t("Cargando el centro de operaciones…")}</span></div><div className="metrics">{[0, 1, 2, 3].map(key => <div className="metric skeleton" key={key}><div/><strong/><p/></div>)}</div><div className="skeleton loading-panel"/><span className="sr-only">{t("Preparando datos y conversaciones.")}</span></section>;
}
