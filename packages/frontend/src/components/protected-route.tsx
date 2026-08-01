'use client';

import { useAuth } from '@/contexts/auth-context';

/**
 * ProtectedRoute — Guard de renderizado client-side.
 *
 * NOTA: La protección real ocurre en el middleware (server-side).
 * Este componente es una segunda capa: solo bloquea el renderizado
 * mientras el AuthProvider está verificando la sesión.
 * Ya NO hace redirect — eso es responsabilidad exclusiva del middleware.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();

    // Mientras carga, mostrar loader para evitar flash
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FAF7FF',
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{
                        width: '32px', height: '32px',
                        border: '3px solid rgba(100,102,255,0.15)',
                        borderTopColor: '#6466FF',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // Si no autenticado (no debería pasar porque el middleware ya redirigió),
    // mostrar nada como fallback de seguridad
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
