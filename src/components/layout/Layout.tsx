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
      <main>{children}</main>
    </div>
  );
};
