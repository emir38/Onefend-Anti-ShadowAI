/* ========================================================
   DOCS LOGIN — packages/frontend
   Misma estética Figma que el admin login:
   gradient #18191A → #5038CF, panel blanco, Plus Jakarta Sans
   ======================================================== */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EyeIcon = () => (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 10C1 10 4.5 3 11 3C17.5 3 21 10 21 10C21 10 17.5 17 11 17C4.5 17 1 10 1 10Z" stroke="#6A6E72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="11" cy="10" r="3" stroke="#6A6E72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const EyeOffIcon = () => (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2L20 18M9.88 9.88A3 3 0 0 0 13.12 13.12M10.73 5.08A10.05 10.05 0 0 1 11 5C17.5 5 21 12 21 12C20.47 13.08 19.8 14.1 19 15M14.73 14.73C13.55 15.57 12.28 16 11 16C4.5 16 1 9 1 9C1.75 7.56 2.78 6.25 4 5.27" stroke="#6A6E72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, #18191A 45%, #5038CF 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    panel: {
        backgroundColor: '#FFFFFF',
        width: '383px',
        padding: '62px 35px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '24px',
    },
    logo: {
        width: '184px',
        height: '36px',
        objectFit: 'contain' as const,
    },
    subtext: {
        color: '#6A6E72',
        fontSize: '13px',
        lineHeight: '20px',
        margin: 0,
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
    },
    label: {
        color: '#1B1D1F',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '18px',
    },
    inputWrapper: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        height: '44px',
        border: '1px solid rgba(106, 110, 114, 0.2)',
        borderRadius: 0,
        padding: '0 17px',
        fontSize: '13px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1B1D1F',
        outline: 'none',
        boxSizing: 'border-box' as const,
        backgroundColor: '#FFFFFF',
        transition: 'border-color 150ms ease',
    },
    inputWithIcon: { paddingRight: '46px' },
    eyeBtn: {
        position: 'absolute' as const,
        right: '11px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 0,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rememberLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#6A6E72',
        cursor: 'pointer',
        lineHeight: '18px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    primaryBtn: {
        width: '100%',
        height: '48px',
        backgroundColor: '#6466FF',
        color: '#FFFFFF',
        fontSize: '16px',
        fontWeight: 500,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '20px',
    },
    primaryBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    forgotLink: {
        color: '#1B1D1F',
        fontSize: '13px',
        lineHeight: '22px',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 0,
    },
    errorBox: {
        backgroundColor: 'rgba(226, 45, 84, 0.08)',
        border: '1px solid rgba(226, 45, 84, 0.2)',
        color: '#E22D54',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '10px 14px',
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(106, 110, 114, 0.15)',
    },
    footerText: {
        color: '#6A6E72',
        fontSize: '12px',
        lineHeight: '18px',
        textAlign: 'center' as const,
        margin: 0,
    },
    footerLink: {
        color: '#6466FF',
        fontWeight: 600,
        textDecoration: 'none',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '12px',
        lineHeight: '18px',
        padding: 0,
    },
};

export default function DocsLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // API URL for docs login
            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // recibe la cookie SSO del backend
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Credenciales incorrectas. Intente nuevamente.');
                return;
            }

            if (data.requiresMfa) {
                setError('Su cuenta requiere autenticación de dos factores. Por favor inicie sesión desde el portal principal.');
                return;
            }

            // Cookie SSO seteada por el backend — esperar a que el browser
            // procese el Set-Cookie header antes de navegar
            await new Promise(resolve => setTimeout(resolve, 150));
            window.location.href = '/docs';
            return;
        } catch {
            setError('Error de conexión. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.panel}>

                {/* Logo */}
                <img
                    src="/logo-dark.svg"
                    alt="Onefend"
                    style={s.logo}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />

                {/* Subtitle */}
                <p style={s.subtext}>
                    Acceda a los manuales operativos de Onefend con sus credenciales de cliente.
                </p>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={s.errorBox}>{error}</div>}

                    {/* Email */}
                    <div style={s.formGroup}>
                        <label htmlFor="docs-email" style={s.label}>Correo electrónico</label>
                        <div style={s.inputWrapper}>
                            <input
                                id="docs-email"
                                type="email"
                                style={s.input}
                                placeholder="Ingresa el correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div style={s.formGroup}>
                        <label htmlFor="docs-password" style={s.label}>Contraseña</label>
                        <div style={s.inputWrapper}>
                            <input
                                id="docs-password"
                                type={showPassword ? 'text' : 'password'}
                                style={{ ...s.input, ...s.inputWithIcon }}
                                placeholder="Ingresa la contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                style={s.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    {/* Recordarme + ¿Olvidó? */}
                    <div style={s.row}>
                        <label style={s.rememberLabel}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ accentColor: '#6466FF', width: 15, height: 15, cursor: 'pointer' }}
                            />
                            Recordarme
                        </label>
                        <button
                            type="button"
                            style={s.forgotLink}
                            onClick={() => router.push('/forgot-password')}
                        >
                            ¿Olvidó su contraseña?
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        id="docs-login-submit"
                        type="submit"
                        disabled={loading}
                        style={{ ...s.primaryBtn, ...(loading ? s.primaryBtnDisabled : {}) }}
                        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                    >
                        {loading ? 'Verificando...' : 'Iniciar sesión'}
                    </button>
                </form>

                <div style={s.divider} />

                {/* Footer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <p style={s.footerText}>
                        ¿Aún no tiene acceso?{' '}
                        <a href="/demo" style={s.footerLink}>Solicitar Demo</a>
                    </p>
                </div>

            </div>
        </div>
    );
}
