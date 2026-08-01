'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization, useUpdateOrganization, useExcludedDomains, useCreateExcludedDomain, useDeleteExcludedDomain } from '@/hooks/use-api';
import { Save, Trash2, Plus, ChevronDown, CheckCircle, RefreshCw, Info, Lock } from 'lucide-react';
import { authApi, userApi } from '@/lib/api-client';
import IntegrationsList from '@/components/integrations/IntegrationsList';
import UsersPage from '@/components/dashboard/users-view';

const labelClass = 'block text-[13px] text-[#A5AEB7] font-semibold mb-[6px]';
const inputClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF]';
const selectClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer';

export default function SettingsPage() {
    const { user, login } = useAuth();
    const { data: org, isLoading } = useOrganization();
    const updateOrgMutation = useUpdateOrganization();

    // Whitelist Hooks
    const { data: excludedDomains, isLoading: isLoadingDomains } = useExcludedDomains();
    const createDomainMutation = useCreateExcludedDomain();
    const deleteDomainMutation = useDeleteExcludedDomain();

    const isAdmin = user?.role === 'ADMIN';

    // Save state
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [isSendingReset, setIsSendingReset] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'SECURITY' | 'WHITELIST' | 'INTEGRATIONS' | 'USERS'>(isAdmin ? 'ORGANIZATION' : 'SECURITY');

    // Organization Form
    const [formData, setFormData] = useState({
        name: '',
        auditLogRetentionDays: 90,
        eventRetentionDays: 30,
        enforceMfa: false,
        interventionMode: 'BLOCKING',
        saveEvidence: false,
        aiContextPrompt: '',
        approvedAiName: '',
        approvedAiUrl: '',
    });

    useEffect(() => {
        if (org) {
            // Read approvedAi from organizationSettings first, fallback to settings JSON
            const aiName = org.organizationSettings?.approvedAiName || (org.settings as any)?.approvedAiName || '';
            const aiUrl = org.organizationSettings?.approvedAiUrl || (org.settings as any)?.approvedAiUrl || '';
            setFormData({
                name: org.name || '',
                auditLogRetentionDays: org.auditLogRetentionDays || 90,
                eventRetentionDays: org.eventRetentionDays || 30,
                enforceMfa: org.enforceMfa || false,
                interventionMode: org.organizationSettings?.interventionMode || 'BLOCKING',
                saveEvidence: org.organizationSettings?.saveEvidence || false,
                aiContextPrompt: org.organizationSettings?.aiContextPrompt || '',
                approvedAiName: aiName,
                approvedAiUrl: aiUrl,
            });
        }
    }, [org]);

    // MFA Setup State
    const [isMfaSetupOpen, setIsMfaSetupOpen] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [setupError, setSetupError] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);

    // Whitelist Form
    const [whitelistForm, setWhitelistForm] = useState({ domain: '', reason: '' });

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createDomainMutation.mutateAsync(whitelistForm);
            setWhitelistForm({ domain: '', reason: '' });
        } catch (err: any) {
            alert(err.message || 'Failed to add domain');
        }
    };

    const handleDeleteDomain = async (id: string) => {
        if (!confirm('Are you sure you want to remove this domain from the whitelist?')) return;
        try {
            await deleteDomainMutation.mutateAsync(id);
        } catch (err: any) {
            alert(err.message || 'Failed to delete domain');
        }
    };

    const handleSaveOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveSuccess(false);
        setSaveError('');
        try {
            // Merge approvedAi values into the settings JSON for backwards compatibility
            const currentSettings = (org?.settings as Record<string, any>) || {};
            const mergedSettings = {
                ...currentSettings,
                approvedAiName: formData.approvedAiName || undefined,
                approvedAiUrl: formData.approvedAiUrl || undefined,
            };

            await updateOrgMutation.mutateAsync({
                name: formData.name,
                auditLogRetentionDays: Number(formData.auditLogRetentionDays),
                eventRetentionDays: Number(formData.eventRetentionDays),
                enforceMfa: formData.enforceMfa,
                interventionMode: formData.interventionMode as any,
                saveEvidence: formData.saveEvidence,
                aiContextPrompt: formData.aiContextPrompt,
                approvedAiName: formData.approvedAiName,
                approvedAiUrl: formData.approvedAiUrl,
                settings: mergedSettings,
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 8000);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save settings');
        }
    };

    const handleStartMfaSetup = async () => {
        try {
            setSetupLoading(true);
            setSetupError('');
            const data = await authApi.generateMfaSecret();
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setIsMfaSetupOpen(true);
        } catch (err: any) {
            alert('Failed to start MFA setup: ' + err.message);
        } finally {
            setSetupLoading(false);
        }
    };

    const handleCompleteMfaSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSetupLoading(true);
            await authApi.enableMfa({ code: mfaCode });
            setIsMfaSetupOpen(false);
            setMfaCode('');
            alert('MFA Enabled Successfully! Please re-login to update your session.');
            window.location.reload();
        } catch (err: any) {
            setSetupError(err.response?.data?.message || 'Invalid code');
        } finally {
            setSetupLoading(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
        try {
            await authApi.disableMfa();
            alert('MFA Disabled.');
            window.location.reload();
        } catch (err) {
            alert('Failed to disable MFA');
        }
    };

    const handlePasswordResetEmail = async () => {
        if (!user?.email) return;
        if (!confirm('This will send a secure password reset link to your email. Proceed?')) return;
        
        setIsSendingReset(true);
        try {
            await authApi.forgotPassword({ email: user.email });
            alert('✅ Success! A secure password reset link has been sent to your email. Please check your inbox to configure your new password.');
        } catch (err: any) {
            alert('Failed to send reset email: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSendingReset(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-[#A5AEB7]">Loading settings...</div>;
    }

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">
                {/* Header */}
                <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Settings</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Manage organization and security settings.</p>
                    </div>
                </div>

                {/* Tabs with Figma icons */}
                <div className="flex space-x-3 border-b border-[#D4C8FF]/50">
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('ORGANIZATION')}
                            className={`pb-3 px-1 text-[15px] font-medium transition-colors cursor-pointer flex items-center gap-[4px] ${activeTab === 'ORGANIZATION'
                                ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                                : 'text-[#A5AEB7] hover:text-[#1E1B39] border-b-2 border-transparent'
                                }`}
                        >
                            <span className="w-[18px] h-[18px] inline-block flex-shrink-0" style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url(/icons/settings-tab-organization.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-organization.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                            Organization
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('SECURITY')}
                        className={`pb-3 px-1 text-[15px] font-medium transition-colors cursor-pointer flex items-center gap-[4px] ${activeTab === 'SECURITY'
                            ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                            : 'text-[#A5AEB7] hover:text-[#1E1B39] border-b-2 border-transparent'
                            }`}
                    >
                        <span className="w-[18px] h-[18px] inline-block flex-shrink-0" style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url(/icons/settings-tab-security.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-security.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                        Security
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('USERS')}
                            className={`pb-3 px-1 text-[15px] font-medium transition-colors cursor-pointer flex items-center gap-[4px] ${activeTab === 'USERS'
                                ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                                : 'text-[#A5AEB7] hover:text-[#1E1B39] border-b-2 border-transparent'
                                }`}
                        >
                            <span className="w-[18px] h-[18px] inline-block flex-shrink-0" style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url(/icons/settings-tab-users.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-users.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                            Users
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('WHITELIST')}
                            className={`pb-3 px-1 text-[15px] font-medium transition-colors cursor-pointer flex items-center gap-[4px] ${activeTab === 'WHITELIST'
                                ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                                : 'text-[#A5AEB7] hover:text-[#1E1B39] border-b-2 border-transparent'
                                }`}
                        >
                            <span className="w-[18px] h-[18px] inline-block flex-shrink-0" style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url(/icons/settings-tab-whitelisting.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-whitelisting.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                            Whitelisting
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('INTEGRATIONS')}
                            className={`pb-3 px-1 text-[15px] font-medium transition-colors cursor-pointer flex items-center gap-[4px] ${activeTab === 'INTEGRATIONS'
                                ? 'text-[#6466FF] border-b-2 border-[#6466FF]'
                                : 'text-[#A5AEB7] hover:text-[#1E1B39] border-b-2 border-transparent'
                                }`}
                        >
                            <span className="w-[18px] h-[18px] inline-block flex-shrink-0" style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url(/icons/settings-tab-integrations.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-integrations.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                            Integrations
                        </button>
                    )}
                </div>

                {/* ═══ ORGANIZATION TAB ═══ */}
                {activeTab === 'ORGANIZATION' && (
                    isAdmin ? (
                        <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                            <form onSubmit={handleSaveOrg} className="space-y-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-[16px]">
                                        <h2 className="text-[16px] font-semibold text-[#1E1B39]">General Information</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                                        <div>
                                            <label className={labelClass}>Organization Name</label>
                                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instance ID</label>
                                            <input type="text" value={org?.id} disabled className="w-full h-[36px] px-[12px] bg-[#F6F0FF] border border-[#D4C8FF]/50 text-[14px] text-[#A5AEB7] font-mono cursor-not-allowed" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#D4C8FF]/50 pt-8">
                                    <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[16px]">Data Retention Policies</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                                        <div>
                                            <label className={labelClass}>Audit Logs (Days)</label>
                                                <input
                                                    type="number"
                                                    value={formData.auditLogRetentionDays}
                                                    onChange={(e) => setFormData({ ...formData, auditLogRetentionDays: parseInt(e.target.value) })}
                                                    className={inputClass}
                                                />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Events (Days)</label>
                                                <input
                                                    type="number"
                                                    value={formData.eventRetentionDays}
                                                    onChange={(e) => setFormData({ ...formData, eventRetentionDays: parseInt(e.target.value) })}
                                                    className={inputClass}
                                                />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#D4C8FF]/50 pt-8">
                                    <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[16px]">Security Policies</h2>
                                    <div className="flex items-start space-x-3">
                                        <input type="checkbox" id="enforceMfa" checked={formData.enforceMfa} onChange={(e) => setFormData({ ...formData, enforceMfa: e.target.checked })} className="mt-1 h-4 w-4 accent-[#6466FF]" />
                                        <div>
                                            <label htmlFor="enforceMfa" className="text-[14px] font-medium text-[#1E1B39]">Enforce Multi-Factor Authentication</label>
                                            <p className="text-[13px] text-[#A5AEB7] mt-0.5">Require all users in this organization to set up and use MFA.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#D4C8FF]/50 pt-8">
                                    <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[16px]">DLP & AI Intelligence</h2>
                                    <div className="space-y-[20px]">
                                        {/* Intervention Mode — SMALLER cards */}
                                        <div>
                                            <label className={labelClass}>Intervention Mode</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mt-[8px] max-w-[600px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, interventionMode: 'BLOCKING' })}
                                                    className={`p-[14px] border text-left transition-all cursor-pointer ${formData.interventionMode === 'BLOCKING'
                                                        ? 'border-[#6466FF] bg-[#6466FF]/5 ring-1 ring-[#6466FF]'
                                                        : 'border-[#D4C8FF]/50 bg-white hover:border-[#6466FF]/50'
                                                        }`}
                                                >
                                                    <div className="font-semibold text-[#1E1B39] text-[13px] mb-[2px]">Blocking (Synchronous)</div>
                                                    <div className="text-[12px] text-[#A5AEB7] leading-[16px]">Wait for analysis before allowing content.</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, interventionMode: 'OBSERVATION' })}
                                                    className={`p-[14px] border text-left transition-all cursor-pointer ${formData.interventionMode === 'OBSERVATION'
                                                        ? 'border-[#6466FF] bg-[#6466FF]/5 ring-1 ring-[#6466FF]'
                                                        : 'border-[#D4C8FF]/50 bg-white hover:border-[#6466FF]/50'
                                                        }`}
                                                >
                                                    <div className="font-semibold text-[#1E1B39] text-[13px] mb-[2px]">Observation (Async)</div>
                                                    <div className="text-[12px] text-[#A5AEB7] leading-[16px]">Analyze in background. Alert post-action.</div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <input type="checkbox" id="saveEvidence" checked={formData.saveEvidence} onChange={(e) => setFormData({ ...formData, saveEvidence: e.target.checked })} className="mt-1 h-4 w-4 accent-[#6466FF]" />
                                            <div>
                                                <label htmlFor="saveEvidence" className="text-[14px] font-medium text-[#1E1B39]">Save Redacted Evidence</label>
                                                <p className="text-[13px] text-[#A5AEB7] mt-0.5">Store a redacted snippet of the sensitive data for audit purposes.</p>
                                            </div>
                                        </div>

                                        <div className="pt-[16px] border-t border-[#D4C8FF]/50">
                                            <label className={labelClass}>AI Organization Context Prompt</label>
                                            <p className="text-[13px] text-[#A5AEB7] mb-[12px] leading-relaxed">Provide specific context about your organization to guide the AI&apos;s analysis.</p>
                                            <textarea
                                                value={formData.aiContextPrompt}
                                                onChange={(e) => setFormData({ ...formData, aiContextPrompt: e.target.value })}
                                                className="w-full px-[12px] py-[12px] bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] min-h-[120px] resize-y"
                                                placeholder="Enter specific context or guidance for the AI..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#D4C8FF]/50 pt-8">
                                    <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[4px]">Organization&apos;s Standard AI Tool</h2>
                                    <p className="text-[13px] text-[#A5AEB7] mb-[20px] leading-relaxed">
                                        Configure the AI tool officially approved for use in your organization. This information will be shown on access-blocked screens to help users find the right alternative.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                                        <div>
                                            <label className={labelClass}>AI Tool Name</label>
                                            <input
                                                type="text"
                                                value={formData.approvedAiName}
                                                onChange={(e) => setFormData({ ...formData, approvedAiName: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. Google Gemini, Claude, ChatGPT"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>AI Tool URL</label>
                                            <input
                                                type="url"
                                                value={formData.approvedAiUrl}
                                                onChange={(e) => setFormData({ ...formData, approvedAiUrl: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. https://gemini.google.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#D4C8FF]/50 pt-8 space-y-4">
                                    {/* Error Banner */}
                                    {saveError && (
                                        <div className="flex items-start gap-3 p-4 bg-[#E22D54]/5 border border-[#E22D54]/20 border-l-[3px] border-l-[#E22D54]">
                                            <Info size={16} className="text-[#E22D54] mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-[13px] font-700 text-[#E22D54] mb-1">Failed to save settings</p>
                                                <p className="text-[12px] text-[#E22D54]/80">{saveError}</p>
                                            </div>
                                            <button onClick={() => setSaveError('')} className="ml-auto text-[#E22D54]/60 hover:text-[#E22D54] cursor-pointer text-lg leading-none">×</button>
                                        </div>
                                    )}
                                    {/* Success Banner */}
                                    {saveSuccess && (
                                        <div className="flex items-start gap-3 p-4 bg-[#25C688]/5 border border-[#25C688]/25 border-l-[3px] border-l-[#25C688]">
                                            <CheckCircle size={16} className="text-[#25C688] mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-[#1E1B39] mb-1">Settings saved successfully</p>
                                                <p className="text-[12px] text-[#A5AEB7] leading-relaxed">
                                                    Changes have been saved to the database. For the <strong className="text-[#1E1B39]">Standard AI Tool</strong> to appear on block screens, the Onefend extension must re-sync its configuration.
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-[#FAF7FF] border border-[#D4C8FF]/50">
                                                    <RefreshCw size={12} className="text-[#6466FF] flex-shrink-0" />
                                                    <p className="text-[11px] text-[#6466FF] font-medium">
                                                        Click the <strong>Onefend extension icon</strong> in your browser toolbar → <strong>Sync Now</strong> to apply immediately. Otherwise the extension auto-syncs every 15 minutes.
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => setSaveSuccess(false)} className="ml-auto text-[#A5AEB7] hover:text-[#1E1B39] cursor-pointer text-lg leading-none">×</button>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={updateOrgMutation.isPending} className="flex items-center h-[48px] px-[24px] bg-[#6466FF] hover:bg-[#5557E0] text-white font-medium transition-colors disabled:opacity-50 cursor-pointer text-[14px]">
                                            <Save size={18} className="mr-2" />
                                            {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-red-400">Only administrators can manage organization settings.</div>
                    )

                )}

                {/* ═══ SECURITY TAB ═══ */}
                {activeTab === 'SECURITY' && (
                    <div className="space-y-[20px]">
                        <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-[12px]">
                                    <span className="w-[24px] h-[24px] mt-[2px] inline-block flex-shrink-0" style={{ backgroundColor: '#6466FF', WebkitMaskImage: 'url(/icons/settings-tab-security.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-security.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                                    <div>
                                        <h2 className="text-[16px] font-semibold text-[#1E1B39]">Data Export (GDPR)</h2>
                                        <p className="mt-2 text-[14px] text-[#A5AEB7]">Download a copy of all your personal data, audit logs, and conversation history stored in our platform.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <button
                                    onClick={async () => {
                                        if (!user?.id) return;
                                        try {
                                            const data = await userApi.exportData(user.id);
                                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `onefend-export-${user.id}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        } catch (err) {
                                            alert('Failed to export data');
                                        }
                                    }}
                                    className="h-[48px] px-[24px] bg-transparent hover:bg-[#6466FF]/5 text-[#6466FF] border border-[#6466FF] transition-colors text-[14px] font-medium cursor-pointer"
                                >
                                    Export My Data
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-[12px]">
                                    <span className="w-[24px] h-[24px] mt-[2px] inline-block flex-shrink-0" style={{ backgroundColor: '#6466FF', WebkitMaskImage: 'url(/icons/settings-tab-security.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/icons/settings-tab-security.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
                                    <div>
                                        <h2 className="text-[16px] font-semibold text-[#1E1B39]">Two-Factor Authentication (MFA)</h2>
                                        <p className="mt-2 text-[14px] text-[#A5AEB7]">Add an extra layer of security to your account by requiring a code from your authenticator app.</p>
                                    </div>
                                </div>
                                <div>
                                    {user?.isMfaEnabled ? (
                                        <span className="flex items-center gap-[4px] px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)', color: '#25C688', borderRadius: '45px', lineHeight: '13px' }}>
                                            Enabled
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-[4px] px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(165, 174, 183, 0.2)', color: '#A5AEB7', borderRadius: '45px', lineHeight: '13px' }}>
                                            Disabled
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8">
                                {user?.isMfaEnabled ? (
                                    <button onClick={handleDisableMfa} className="h-[48px] px-[24px] bg-transparent hover:bg-[#E22D54]/5 text-[#E22D54] border border-[#E22D54] transition-colors text-[14px] font-medium cursor-pointer">
                                        Disable MFA
                                    </button>
                                ) : (
                                    <button onClick={handleStartMfaSetup} disabled={isMfaSetupOpen} className="h-[48px] px-[24px] bg-[#6466FF] hover:bg-[#5557E0] text-white transition-colors text-[14px] font-medium cursor-pointer">
                                        Enable MFA
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* PASSWORD RESET BLOCK */}
                        <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-[12px]">
                                    {/* Using Lock Icon (similar to security) */}
                                    <span className="w-[24px] h-[24px] mt-[2px] inline-block flex-shrink-0 text-[#6466FF]">
                                        <Lock size={24} strokeWidth={2} />
                                    </span>
                                    <div>
                                        <h2 className="text-[16px] font-semibold text-[#1E1B39]">Change Password (Secure Link)</h2>
                                        <p className="mt-2 text-[14px] text-[#A5AEB7]">
                                            Request a secure magic link to change your password. The link will be sent directly to your registered email address ({user?.email}) for identity verification.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <button 
                                    onClick={handlePasswordResetEmail} 
                                    disabled={isSendingReset}
                                    className="h-[48px] px-[24px] bg-transparent hover:bg-[#6466FF]/5 text-[#6466FF] border border-[#6466FF] transition-colors text-[14px] font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSendingReset ? 'Sending Email...' : 'Send Password Change Link'}
                                </button>
                            </div>
                        </div>

                        {isMfaSetupOpen && !user?.isMfaEnabled && (
                            <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                                <h3 className="text-[18px] font-semibold text-[#1E1B39]">Setup Authenticator</h3>
                                <div className="space-y-8">
                                    <div className="flex justify-center p-[24px] bg-white border border-[#D4C8FF]/50 w-fit mx-auto">
                                        {qrCode ? <img src={qrCode} alt="QR Code" className="w-48 h-48" /> : <div className="w-48 h-48 flex items-center justify-center text-[#A5AEB7]">Loading...</div>}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[14px] text-[#A5AEB7] mb-3">Scan with Google Authenticator or use this key:</p>
                                        <code className="bg-[#F6F0FF] px-4 py-2 text-[#6466FF] font-mono text-[14px] select-all border border-[#D4C8FF]/50">{secret}</code>
                                    </div>
                                    <form onSubmit={handleCompleteMfaSetup} className="border-t border-[#D4C8FF]/50 pt-8 mt-8">
                                        <label className="block text-[14px] font-medium text-[#1E1B39] mb-3 text-center">Enter 6-digit Code</label>
                                        <div className="flex gap-3 justify-center max-w-sm mx-auto">
                                            <input type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="flex-1 h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[#1E1B39] tracking-widest text-center text-lg focus:ring-1 focus:ring-[#6466FF] focus:outline-none" placeholder="000000" maxLength={6} />
                                            <button type="submit" disabled={setupLoading || mfaCode.length !== 6} className="h-[36px] px-[24px] bg-[#6466FF] hover:bg-[#5557E0] text-white font-medium disabled:opacity-50 cursor-pointer text-[14px]">{setupLoading ? 'Verifying...' : 'Activate'}</button>
                                        </div>
                                        {setupError && <p className="mt-3 text-[14px] text-center text-[#E22D54]">{setupError}</p>}
                                    </form>
                                    <button onClick={() => setIsMfaSetupOpen(false)} className="w-full text-center text-[14px] text-[#A5AEB7] hover:text-[#1E1B39] mt-6 cursor-pointer">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ USERS TAB ═══ */}
                {activeTab === 'USERS' && (
                    <UsersPage />
                )}

                {/* ═══ WHITELIST TAB ═══ */}
                {activeTab === 'WHITELIST' && (
                    <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                        <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[12px]">Corporate Whitelist</h2>
                        <p className="text-[14px] text-[#A5AEB7] mb-[24px] leading-relaxed">
                            Domains listed here will be completely ignored by the Onefend agent.
                            Use this for internal tools, intranets, or sensitive portals where no monitoring should occur.
                        </p>

                        <form onSubmit={handleAddDomain} className="flex flex-col md:flex-row gap-[16px] items-end mb-[24px]">
                            <div className="flex-1 w-full">
                                <label className={labelClass}>Domain</label>
                                <input type="text" placeholder="e.g. intranet.corp.com" value={whitelistForm.domain} onChange={(e) => setWhitelistForm({ ...whitelistForm, domain: e.target.value })} className={inputClass} required />
                            </div>
                            <div className="flex-1 w-full">
                                <label className={labelClass}>Reason (Optional)</label>
                                <input type="text" placeholder="Internal Dashboard" value={whitelistForm.reason} onChange={(e) => setWhitelistForm({ ...whitelistForm, reason: e.target.value })} className={inputClass} />
                            </div>
                            <button type="submit" disabled={createDomainMutation.isPending} className="h-[36px] px-[16px] bg-[#6466FF] hover:bg-[#5557E0] text-white font-medium transition-colors flex items-center justify-center w-full md:w-auto cursor-pointer disabled:opacity-50 text-[14px]">
                                <Plus size={18} className="mr-2" />
                                Add Domain
                            </button>
                        </form>

                        <div className="border border-[#D4C8FF]/50 overflow-hidden">
                            <table className="w-full text-left text-[14px]">
                                <thead style={{ backgroundColor: 'rgba(212, 200, 255, 0.3)' }}>
                                    <tr>
                                        <th className="px-6 py-4 font-medium text-[#1E1B39]">Domain</th>
                                        <th className="px-6 py-4 font-medium text-[#1E1B39]">Reason</th>
                                        <th className="px-6 py-4 font-medium text-[#1E1B39]">Added On</th>
                                        <th className="px-6 py-4 font-medium text-[#1E1B39] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D4C8FF]/30 bg-white">
                                    {isLoadingDomains ? (
                                        <tr><td colSpan={4} className="p-6 text-center text-[#A5AEB7]">Loading...</td></tr>
                                    ) : excludedDomains?.length === 0 ? (
                                        <tr><td colSpan={4} className="p-12 text-center text-[#A5AEB7]">No domains whitelisted yet.</td></tr>
                                    ) : (
                                        excludedDomains?.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-[#F6F0FF] transition-colors">
                                                <td className="px-6 py-4 font-medium text-[#1E1B39]">{item.domain}</td>
                                                <td className="px-6 py-4 text-[#A5AEB7]">{item.reason || '-'}</td>
                                                <td className="px-6 py-4 text-[#A5AEB7]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDeleteDomain(item.id)} className="text-[#E22D54] hover:text-[#E22D54]/80 transition-colors p-2 hover:bg-[#E22D54]/10 cursor-pointer flex items-center justify-center ml-auto" title="Remove">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ INTEGRATIONS TAB ═══ */}
                {activeTab === 'INTEGRATIONS' && (
                    <IntegrationsList />
                )}
            </div>
        </ProtectedRoute>
    );
}
