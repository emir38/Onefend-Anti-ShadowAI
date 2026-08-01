'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api-client';

/* ── Eye icons inline (no external dependency) ── */
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

/* ── Inline styles (no Tailwind dependency) ── */
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
    },
    inputFocused: {
        border: '1px solid #6466FF',
    },
    inputWithIcon: {
        paddingRight: '46px',
    },
    eyeBtn: {
        position: 'absolute' as const,
        right: '11px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
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
    forgotLink: {
        color: '#1B1D1F',
        fontSize: '13px',
        lineHeight: '22px',
        textDecoration: 'none',
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
    warningBox: {
        backgroundColor: 'rgba(234, 179, 8, 0.08)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        color: '#A16207',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '10px 14px',
    },
    successBox: {
        backgroundColor: 'rgba(52, 211, 153, 0.08)',
        border: '1px solid rgba(52, 211, 153, 0.3)',
        color: '#059669',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '10px 14px',
        textAlign: 'center' as const,
    },
    sectionHeading: {
        color: '#1B1D1F',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: '22px',
        margin: 0,
    },
    sectionSubtext: {
        color: '#6A6E72',
        fontSize: '13px',
        lineHeight: '20px',
        margin: 0,
    },
    mfaCodeInput: {
        width: '100%',
        height: '56px',
        border: '1px solid rgba(106, 110, 114, 0.2)',
        borderRadius: 0,
        padding: '0 17px',
        fontSize: '22px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1B1D1F',
        outline: 'none',
        boxSizing: 'border-box' as const,
        letterSpacing: '8px',
        textAlign: 'center' as const,
        backgroundColor: '#FFFFFF',
    },
    qrWrapper: {
        backgroundColor: '#F8FAFC',
        border: '1px solid rgba(106, 110, 114, 0.15)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

function LoginContent() {
    const [step, setStep] = useState<'LOGIN' | 'MFA_VERIFY' | 'MFA_SETUP' | 'FORCE_CHANGE_PASSWORD'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [tempToken, setTempToken] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('return') || '/dashboard';
    const { login, verifyMfaLogin } = useAuth();

    /**
     * Navigate after successful authentication.
     * Verifies that the SSO cookie is active (retry with backoff)
     * before performing full navigation.
     */
    const navigateAfterAuth = async (destination: string) => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 200;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const res = await fetch('/api/v1/auth/validate-cookie', {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                });
                if (res.ok) {
                    window.location.href = destination;
                    return;
                }
            } catch { /* retry */ }
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }

        // Fallback: navigate anyway after max retries
        window.location.href = destination;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login({ email, password });
            if (response.mustChangePassword) {
                setStep('FORCE_CHANGE_PASSWORD');
            } else if (response.requiresMfa) {
                setTempToken(response.tempToken!);
                if (response.isSetupRequired) {
                    await startMfaSetup(response.tempToken!);
                } else {
                    setStep('MFA_VERIFY');
                }
            } else if (response.access_token) {
                // Wait for Set-Cookie to be processed before navigating
                await navigateAfterAuth(returnTo);
                return; // Don't reset loading -- we expect the page to change
            } else {
                // Unexpected backend response -- don't silently stay on login
                console.error('Unexpected login response:', JSON.stringify(response));
                setError('Unexpected error during sign in. Please contact your administrator.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const startMfaSetup = async (token: string) => {
        try {
            const { qrCode } = await authApi.generateMfaSecret(token);
            setQrCode(qrCode);
            setStep('MFA_SETUP');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error loading MFA configuration.');
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await verifyMfaLogin(tempToken, mfaCode);
            if (response?.access_token) {
                await navigateAfterAuth(returnTo);
                return;
            }
            setError('Unexpected error. The server did not respond with a valid token.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;
        if (!regex.test(newPassword)) {
            setError('Minimum 12 characters, one uppercase, one lowercase, and one number.');
            return;
        }
        setLoading(true);
        try {
            await authApi.changePassword({ oldPassword: password, newPassword });
            await navigateAfterAuth(returnTo);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating password.');
        } finally {
            setLoading(false);
        }
    };

    const handleMfaSetupAndVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Atomic operation: enable MFA + create session in a single request
            // Prevents the TOTP from expiring between two separate calls
            const response = await authApi.setupCompleteMfa({ tempToken, code: mfaCode });
            if (response?.access_token) {
                // Update AuthProvider state
                if (response.user) {
                    // Auth context will update with the session on navigation
                }
                await navigateAfterAuth(returnTo);
                return;
            }
            setError('MFA activated but session could not be completed. Please try signing in again.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid code or activation error.');
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

                {/* ══════════════ LOGIN ══════════════ */}
                {step === 'LOGIN' && (
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {error && <div style={s.errorBox}>{error}</div>}

                        {/* Email */}
                        <div style={s.formGroup}>
                            <label htmlFor="login-email" style={s.label}>Email</label>
                            <div style={s.inputWrapper}>
                                <input
                                    id="login-email"
                                    type="email"
                                    style={s.input}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={s.formGroup}>
                            <label htmlFor="login-password" style={s.label}>Password</label>
                            <div style={s.inputWrapper}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    style={{ ...s.input, ...s.inputWithIcon }}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        {/* Submit + Forgot */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <button
                                id="login-submit"
                                type="submit"
                                disabled={loading}
                                style={{ ...s.primaryBtn, ...(loading ? s.primaryBtnDisabled : {}) }}
                                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                            <button
                                type="button"
                                style={s.forgotLink}
                                onClick={() => router.push('/forgot-password')}
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </form>
                )}

                {/* ══════════════ MFA VERIFY ══════════════ */}
                {step === 'MFA_VERIFY' && (
                    <form onSubmit={handleMfaVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {error && <div style={s.errorBox}>{error}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={s.sectionHeading}>Two-Factor Verification</p>
                            <p style={s.sectionSubtext}>Enter the 6-digit code generated by your authenticator app (Google Authenticator, Authy, etc.).</p>
                        </div>

                        <div style={s.formGroup}>
                            <label htmlFor="mfa-code" style={s.label}>Authentication code</label>
                            <input
                                id="mfa-code"
                                type="text"
                                inputMode="numeric"
                                style={s.mfaCodeInput}
                                placeholder="000000"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <button
                                type="submit"
                                disabled={loading || mfaCode.length !== 6}
                                style={{ ...s.primaryBtn, ...(loading || mfaCode.length !== 6 ? s.primaryBtnDisabled : {}) }}
                                onMouseEnter={(e) => { if (!loading && mfaCode.length === 6) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                            <button type="button" style={s.forgotLink} onClick={() => { setStep('LOGIN'); setMfaCode(''); setError(''); }}>
                                ← Back to sign in
                            </button>
                        </div>
                    </form>
                )}

                {/* ══════════════ MFA SETUP ══════════════ */}
                {step === 'MFA_SETUP' && (
                    <form onSubmit={handleMfaSetupAndVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {error && <div style={s.errorBox}>{error}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={s.sectionHeading}>Set Up Two-Factor Authentication</p>
                            <p style={s.sectionSubtext}>Your organization requires MFA. Scan the QR code with your authenticator app and then enter the generated code to activate.</p>
                        </div>

                        <div style={s.qrWrapper}>
                            {qrCode
                                ? <img src={qrCode} alt="Scan QR Code" style={{ width: 160, height: 160 }} />
                                : <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6A6E72', fontSize: 13 }}>Loading QR...</div>
                            }
                        </div>

                        <div style={s.formGroup}>
                            <label htmlFor="setup-code" style={s.label}>Verification code</label>
                            <input
                                id="setup-code"
                                type="text"
                                inputMode="numeric"
                                style={s.mfaCodeInput}
                                placeholder="000000"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || mfaCode.length !== 6}
                            style={{ ...s.primaryBtn, width: '100%', ...(loading || mfaCode.length !== 6 ? s.primaryBtnDisabled : {}) }}
                            onMouseEnter={(e) => { if (!loading && mfaCode.length === 6) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                        >
                            {loading ? 'Activating...' : 'Activate and continue'}
                        </button>
                    </form>
                )}

                {/* ══════════════ FORCE CHANGE PASSWORD ══════════════ */}
                {step === 'FORCE_CHANGE_PASSWORD' && (
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {error && <div style={s.errorBox}>{error}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={s.sectionHeading}>Password Update Required</p>
                            <div style={s.warningBox}>
                                Your organization requires you to update your password before accessing the platform.
                            </div>
                        </div>

                        <div style={s.formGroup}>
                            <label htmlFor="new-password" style={s.label}>New Password</label>
                            <div style={s.inputWrapper}>
                                <input
                                    id="new-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    style={{ ...s.input, ...s.inputWithIcon }}
                                    placeholder="Enter your new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button type="button" style={s.eyeBtn} onClick={() => setShowNewPassword(!showNewPassword)} aria-label="Toggle">
                                    {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            <span style={{ color: '#6A6E72', fontSize: '12px', lineHeight: '18px' }}>Minimum 12 characters, 1 uppercase, 1 lowercase, and 1 number.</span>
                        </div>

                        <div style={s.formGroup}>
                            <label htmlFor="confirm-password" style={s.label}>Confirm Password</label>
                            <div style={s.inputWrapper}>
                                <input
                                    id="confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    style={{ ...s.input, ...s.inputWithIcon }}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button type="button" style={s.eyeBtn} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle">
                                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !newPassword || !confirmPassword}
                            style={{ ...s.primaryBtn, width: '100%', ...(loading || !newPassword || !confirmPassword ? s.primaryBtnDisabled : {}) }}
                            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5254E8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6466FF'; }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}
