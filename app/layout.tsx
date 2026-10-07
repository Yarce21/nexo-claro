import type { Metadata } from 'next';
import './globals.css';
import { translate } from '@/lib/i18n';
export const metadata: Metadata = { title: translate('es', 'Nexo Claro · Centro de operaciones'), description: translate('es', 'Plataforma de operaciones para leads, precalificación, revisión humana y atribución. Entorno de demostración ficticio.'), icons: { icon: '/icon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){var theme;var lang='es';try{theme=localStorage.getItem('nexo-theme');var saved=localStorage.getItem('nexo-language');if(saved==='es'||saved==='en')lang=saved;}catch(e){}if(theme!=='light'&&theme!=='dark')theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.lang=lang;})();` }}/></head><body>{children}</body></html>;
}
