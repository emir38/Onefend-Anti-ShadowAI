'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api-client';

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
        marginBottom: '4px',
    },
    heading: {
        color: '#1B1D1F',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: '22px',
        margin: 0,
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
    },
    primaryBtn: {
        width: '153px',
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
    primaryBtnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    backLink: {
        color: '#1B1D1F',
        fontSize: '13px',
        lineHeight: '22px',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 0,
        textAlign: 'left' as const,
    },
    successBox: {
        backgroundColor: 'rgba(52, 211, 153, 0.08)',
        border: '1px solid rgba(52, 211, 153, 0.3)',
        color: '#059669',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '12px 14px',
    },
    errorBox: {
        backgroundColor: 'rgba(226, 45, 84, 0.08)',
        border: '1px solid rgba(226, 45, 84, 0.2)',
        color: '#E22D54',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '10px 14px',
    },
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);
        try {
            await authApi.forgotPassword({ email });
            setMessage('If the account exists, you will receive an email with instructions to reset your password.');
        } catch {
            setIsError(true);
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.panel}>
                {/* Logo */}
                <img
                    src="/images/logo-dark.svg"
                    alt="Onefend"
                    style={s.logo}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/onefend_logo.svg'; }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={s.heading}>Reset Password</p>
                    <p style={s.subtext}>Enter your email address and we will send you instructions to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {message && (
                        <div style={isError ? s.errorBox : s.successBox}>
                            {message}
                        </div>
                    )}

                    <div style={s.formGroup}>
                        <label htmlFor="forgot-email" style={s.label}>Email</label>
                        <input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            style={s.input}
                            autoComplete="email"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            type="submit"
                            disabled={loading || !email}
                            style={{ ...s.primaryBtn, ...(loading || !email ? s.primaryBtnDisabled : {}) }}
                            onMouseEnter={(e) => { if (!loading && email) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                        >
                            {loading ? 'Sending...' : 'Send reset link'}
                        </button>

                        <button
                            type="button"
                            style={s.backLink}
                            onClick={() => router.push('/login')}
                        >
                            ← Back to sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
