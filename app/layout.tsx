import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Alivio Norte · Centro de operaciones', description: 'Demostración ficticia de operaciones, precalificación y conciliación.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
