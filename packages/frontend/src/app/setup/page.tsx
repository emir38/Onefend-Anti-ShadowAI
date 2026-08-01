'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Copy, Check, Chrome, Download } from 'lucide-react';

// Store URLs — replace these once published
const CHROME_STORE_URL = '#'; // TODO: Replace with Chrome Web Store unlisted URL
const FIREFOX_ADDON_URL = process.env.NEXT_PUBLIC_FIREFOX_ADDON_URL || '#';

function detectBrowser(): 'firefox' | 'chrome' {
    if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('firefox')) return 'firefox';
    }
    return 'chrome'; // Default: Chrome/Edge/Brave/Opera are all Chromium
}

function SetupContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    const [copied, setCopied] = useState(false);
    const browser = detectBrowser();

    const copyToken = () => {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            minHeight: '100vh', background: '#FAF7FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
            <div style={{
                maxWidth: '560px', width: '100%', background: '#FFFFFF',
                border: '1px solid #D4C8FF', borderRadius: '12px',
                overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}>
                {/* Accent bar */}
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #6466FF 0%, #25C688 100%)' }} />

                <div style={{ padding: '40px' }}>
                    {/* Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
                            <svg width="24" height="24" viewBox="0 0 33 54" fill="none">
                                <path d="M16.02 31.23V54L24.27 54V18.26L0.08 29.45V38.39L16.02 31.23Z" fill="#6466FF" />
                                <path d="M24.27 0L0 14.14V23.31L24.27 9.16V0Z" fill="#6466FF" />
                            </svg>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1E1B39', letterSpacing: '-0.3px' }}>Onefend</span>
                        </div>
                    </div>

                    <h1 style={{ color: '#1E1B39', fontSize: '22px', fontWeight: 600, textAlign: 'center', margin: '0 0 8px 0' }}>
                        Complete Your Setup
                    </h1>
                    <p style={{ color: '#A5AEB7', fontSize: '14px', textAlign: 'center', margin: '0 0 28px 0' }}>
                        {email ? `Setting up Onefend for ${email}` : 'Follow the steps below to install Onefend'}
                    </p>

                    {/* Steps */}
                    <div style={{
                        background: '#FAF7FF', border: '1px solid #D4C8FF', borderRadius: '8px',
                        padding: '20px', marginBottom: '24px',
                    }}>
                        {[
                            { n: 1, title: 'Install the browser extension', desc: 'Click the button below to install the Onefend extension for your browser.' },
                            { n: 2, title: 'Open the extension', desc: 'After installation, click the Onefend icon in your browser toolbar.' },
                            { n: 3, title: 'Enter your enrollment token', desc: 'Copy the token below and paste it in the extension setup screen.' },
                            { n: 4, title: 'You\'re protected', desc: 'Onefend will work silently in the background to protect sensitive data.' },
                        ].map(step => (
                            <div key={step.n} style={{
                                display: 'flex', gap: '12px', padding: '10px 0',
                                borderBottom: step.n < 4 ? '1px solid #EDE9FE' : 'none',
                            }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    background: '#6466FF', color: '#FFF', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', fontWeight: 700, flexShrink: 0,
                                }}>
                                    {step.n}
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1B39' }}>{step.title}</div>
                                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{step.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Install Buttons — Browser-aware */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        {browser === 'firefox' ? (
                            <>
                                <a
                                    href={FIREFOX_ADDON_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        background: '#6466FF', color: '#FFFFFF', textDecoration: 'none',
                                        padding: '12px 28px', borderRadius: '6px', fontSize: '15px',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Download size={18} />
                                    Install for Firefox
                                </a>
                                <p style={{ fontSize: '12px', color: '#A5AEB7', marginTop: '8px' }}>
                                    Firefox Add-on — Click to install directly
                                </p>
                                <a
                                    href={CHROME_STORE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '12px', color: '#6466FF', marginTop: '4px', display: 'inline-block' }}
                                >
                                    Using Chrome, Edge, or Brave? Install here
                                </a>
                            </>
                        ) : (
                            <>
                                <a
                                    href={CHROME_STORE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        background: '#6466FF', color: '#FFFFFF', textDecoration: 'none',
                                        padding: '12px 28px', borderRadius: '6px', fontSize: '15px',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Chrome size={18} />
                                    Install Extension
                                </a>
                                <p style={{ fontSize: '12px', color: '#A5AEB7', marginTop: '8px' }}>
                                    Compatible with Chrome, Edge, Brave, and other Chromium browsers
                                </p>
                                <a
                                    href={FIREFOX_ADDON_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '12px', color: '#6466FF', marginTop: '4px', display: 'inline-block' }}
                                >
                                    Using Firefox? Install here
                                </a>
                            </>
                        )}
                    </div>

                    {/* Token Display */}
                    {token && (
                        <div style={{
                            background: '#F8F9FA', border: '1px solid #E5E7EB', borderRadius: '6px',
                            padding: '14px', marginBottom: '16px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Your Enrollment Token</span>
                                <button
                                    onClick={copyToken}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        background: 'transparent', border: '1px solid #D4C8FF',
                                        borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
                                        fontSize: '11px', color: '#6466FF', fontWeight: 500,
                                    }}
                                >
                                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                </button>
                            </div>
                            <div style={{
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                fontSize: '13px', fontWeight: 600, color: '#1E1B39',
                                wordBreak: 'break-all', lineHeight: 1.5,
                            }}>
                                {token}
                            </div>
                        </div>
                    )}

                    {email && (
                        <div style={{
                            background: '#F8F9FA', border: '1px solid #E5E7EB', borderRadius: '6px',
                            padding: '14px',
                        }}>
                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Your Email (use as identifier)</span>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E1B39', marginTop: '4px' }}>{email}</div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        borderTop: '1px solid rgba(212, 200, 255, 0.5)',
                        marginTop: '28px', paddingTop: '20px', textAlign: 'center',
                    }}>
                        <p style={{ color: '#9199A1', fontSize: '12px', margin: 0 }}>
                            Need help? Contact your IT administrator.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SetupPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#A5AEB7' }}>Loading...</p>
            </div>
        }>
            <SetupContent />
        </Suspense>
    );
}
