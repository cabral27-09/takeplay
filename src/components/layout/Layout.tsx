import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export const Layout = ({ children, hideHeader = false }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {!hideHeader && <Header />}
      <main className={!hideHeader ? "pt-16 md:pt-20" : ""}>{children}</main>
    </div>
  );
};
