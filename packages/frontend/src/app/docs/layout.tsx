import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Documentación — Onefend',
  description: 'Acceso a manuales operativos para clientes Onefend.',
};

/**
 * Layout aislado para /docs — sin AuthProvider ni QueryProvider del dashboard.
 * El acceso se controla únicamente por el middleware SSO (cookie onefend_session).
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh' }}>
      {children}
    </div>
  );
}
