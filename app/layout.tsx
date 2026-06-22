import type { Metadata } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const sans = Manrope({ subsets: ['latin'], variable: '--font-sans' });
const display = Newsreader({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Portion Planning | Wafy Campus Kalikavu',
  description: 'A calm, collaborative academic portion planner for Wafy Campus Kalikavu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
