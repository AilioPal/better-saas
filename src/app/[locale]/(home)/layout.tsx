import { Footer } from '@/components/blocks/footer/footer';
import { NavbarWrapper } from '@/components/blocks/navbar/navbar-wrapper';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function MarketingLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavbarWrapper />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
