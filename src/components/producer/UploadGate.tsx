import { ReactNode } from 'react';

interface UploadGateProps {
  children: ReactNode;
}

export function UploadGate({ children }: UploadGateProps) {
  // Uploads ilimitados para produtores — sem verificação de plano/quota.
  return <>{children}</>;
}
