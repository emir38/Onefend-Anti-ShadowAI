'use client';

import { useState, useCallback } from 'react';
import ProtectedRoute from '@/components/protected-route';
import {
    useInvitations,
    useDeploymentStats,
    useCreateInvitations,
    useResendInvitation,
    useRevokeInvitation,
    useEnrollmentTokens,
    useCreateEnrollmentToken,
    useDeleteEnrollmentToken,
} from '@/hooks/use-api';
import ConfirmModal from '@/components/confirm-modal';
import { useAuth } from '@/contexts/auth-context';
import { Send, RefreshCw, XCircle, Search, X, Monitor, Globe, Users, Shield, AlertTriangle, CheckCircle, Copy, Check, Upload, Plus, Trash2, Key } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type DeviceHealth = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'UNRESPONSIVE' | 'REVOKED';

const healthConfig: Record<DeviceHealth, { color: string; bg: string; label: string }> = {
    PENDING: { color: '#A5AEB7', bg: 'rgba(165,174,183,0.13)', label: 'Pending' },
    ACTIVE: { color: '#25C688', bg: 'rgba(37,198,136,0.13)', label: 'Active' },
    INACTIVE: { color: '#D97706', bg: 'rgba(245,158,11,0.13)', label: 'Inactive' },
    UNRESPONSIVE: { color: '#E22D54', bg: 'rgba(226,45,84,0.13)', label: 'Unresponsive' },
    REVOKED: { color: '#6B7280', bg: 'rgba(107,114,128,0.13)', label: 'Revoked' },
};

function HealthBadge({ status }: { status: DeviceHealth }) {
    const config = healthConfig[status] || healthConfig.PENDING;
    return (
        <span
            className="inline-flex items-center gap-[5px] px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide"
            style={{ borderRadius: '45px', lineHeight: '13px', backgroundColor: config.bg, color: config.color }}
        >
            <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
        </span>
    );
}

type UnifiedRow = {
    id: string;
    type: 'email' | 'manual';
    identifier: string;
    token: string;
    extensionHealth: DeviceHealth;
    desktopHealth: DeviceHealth;
    extensionCount?: number;
    desktopAgentCount?: number;
    uses: number;
    usesMax: number | null;
    createdAt: string;
    status: string;
    canResend: boolean;
    canRevoke: boolean;
    canDelete: boolean;
};

export default function DeploymentPage() {
    const { user } = useAuth();
    const canModify = user?.role === 'ADMIN';
    const canViewTokens = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    // Email input state
    const [emailInput, setEmailInput] = useState('');
    const [emailTags, setEmailTags] = useState<string[]>([]);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteResults, setInviteResults] = useState<any[] | null>(null);

    // Table state
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Copy token
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Confirm modal
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [invToRevoke, setInvToRevoke] = useState<string | null>(null);

    // Manual enrollment tokens
    const [showTokenForm, setShowTokenForm] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [tokenMaxUses, setTokenMaxUses] = useState('');
    const [showDeleteTokenModal, setShowDeleteTokenModal] = useState(false);
    const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

    // API hooks
    const { data, isLoading } = useInvitations({ page, limit: 15, status: statusFilter || undefined, search: search || undefined });
    const { data: stats } = useDeploymentStats();
    const createMutation = useCreateInvitations();
    const resendMutation = useResendInvitation();
    const revokeMutation = useRevokeInvitation();

    // Enrollment token hooks
    const { data: tokensData, isLoading: tokensLoading } = useEnrollmentTokens({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
    const createTokenMutation = useCreateEnrollmentToken();
    const deleteTokenMutation = useDeleteEnrollmentToken();
    const enrollmentTokens = tokensData?.data || [];

    const invitations = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };

    // Build unified rows
    const unifiedRows: UnifiedRow[] = [
        ...invitations.map((inv: any) => ({
            id: inv.id,
            type: 'email' as const,
            identifier: inv.email,
            token: inv.enrollmentToken,
            extensionHealth: (inv.status === 'REVOKED' ? 'REVOKED' : inv.health?.extension || 'PENDING') as DeviceHealth,
            desktopHealth: (inv.status === 'REVOKED' ? 'REVOKED' : inv.health?.desktopAgent || 'PENDING') as DeviceHealth,
            extensionCount: inv.extensionCount,
            desktopAgentCount: inv.desktopAgentCount,
            uses: inv.deviceCount || 0,
            usesMax: null,
            createdAt: inv.sentAt || inv.createdAt,
            status: inv.status,
            canResend: inv.status !== 'REVOKED',
            canRevoke: inv.status !== 'REVOKED',
            canDelete: false,
        })),
        ...enrollmentTokens
            .filter((t: any) => !invitations.some((inv: any) => inv.enrollmentToken === t.token))
            .map((t: any) => ({
                id: t.id,
                type: 'manual' as const,
                identifier: t.name || 'Unnamed Token',
                token: t.token,
                extensionHealth: (t.usedCount > 0 ? 'ACTIVE' : 'PENDING') as DeviceHealth,
                desktopHealth: 'PENDING' as DeviceHealth,
                extensionCount: undefined,
                desktopAgentCount: undefined,
                uses: t.usedCount || 0,
                usesMax: t.maxUses,
                createdAt: t.createdAt,
                status: t.isActive ? 'ACTIVE' : 'INACTIVE',
                canResend: false,
                canRevoke: false,
                canDelete: true,
            })),
    ];

    // Email tag input handlers
    const addEmail = useCallback((raw: string) => {
        const email = raw.toLowerCase().trim();
        if (!email) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        if (emailTags.includes(email)) return;
        setEmailTags(prev => [...prev, email]);
        setEmailInput('');
    }, [emailTags]);

    const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addEmail(emailInput);
        }
        if (e.key === 'Backspace' && !emailInput && emailTags.length > 0) {
            setEmailTags(prev => prev.slice(0, -1));
        }
    };

    const handleEmailPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const emails = text.split(/[,;\n\r\s]+/).filter(Boolean);
        emails.forEach(addEmail);
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (!text) return;
            const lines = text.split(/\r?\n/).filter(Boolean);
            // Skip header row if it doesn't look like an email
            const start = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lines[0]?.trim().split(/[,;]/)[0]?.trim() || '') ? 0 : 1;
            for (let i = start; i < lines.length; i++) {
                const cells = lines[i].split(/[,;]/);
                for (const cell of cells) {
                    const cleaned = cell.trim().replace(/^["']|["']$/g, '');
                    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
                        addEmail(cleaned);
                    }
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const removeTag = (email: string) => {
        setEmailTags(prev => prev.filter(e => e !== email));
    };

    const handleSendInvitations = async () => {
        if (emailInput.trim()) addEmail(emailInput);
        const emails = [...emailTags];
        if (emails.length === 0) {
            setInviteError('Enter at least one email address');
            return;
        }
        setInviteError(null);
        setInviteResults(null);
        try {
            const results = await createMutation.mutateAsync(emails);
            setInviteResults(results);
            setEmailTags([]);
            setEmailInput('');
        } catch (err: any) {
            setInviteError(err.message || 'Failed to send invitations');
        }
    };

    const handleCopyToken = (id: string, token: string) => {
        navigator.clipboard.writeText(token);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleResend = async (id: string) => {
        try { await resendMutation.mutateAsync(id); }
        catch (err: any) { alert(err.message || 'Failed to resend'); }
    };

    const handleRevoke = (id: string) => { setInvToRevoke(id); setShowRevokeModal(true); };
    const confirmRevoke = async () => {
        if (!invToRevoke) return;
        try { await revokeMutation.mutateAsync(invToRevoke); setShowRevokeModal(false); setInvToRevoke(null); }
        catch (err: any) { alert(err.message || 'Failed to revoke'); }
    };

    const handleCreateToken = async () => {
        if (!tokenName.trim()) return;
        try {
            await createTokenMutation.mutateAsync({
                name: tokenName.trim(),
                maxUses: tokenMaxUses ? parseInt(tokenMaxUses) : undefined,
            });
            setTokenName('');
            setTokenMaxUses('');
            setShowTokenForm(false);
        } catch (err: any) {
            alert(err.message || 'Failed to create token');
        }
    };

    const handleDeleteToken = (id: string) => { setTokenToDelete(id); setShowDeleteTokenModal(true); };
    const confirmDeleteToken = async () => {
        if (!tokenToDelete) return;
        try { await deleteTokenMutation.mutateAsync(tokenToDelete); setShowDeleteTokenModal(false); setTokenToDelete(null); }
        catch (err: any) { alert(err.message || 'Failed to delete token'); }
    };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };

    const colCount = 6 + (canViewTokens ? 1 : 0) + (canModify ? 1 : 0);

    return (
        <ProtectedRoute>
            <div className="space-y-[20px]">
                {/* Header */}
                <div className="bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Deployment</h1>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">Invite collaborators and monitor extension installation status</p>
                        </div>
                    </div>
                </div>

                {/* Invite Section */}
                {canModify && (
                    <div className="bg-white border border-[#D4C8FF]/50 px-[25px] py-[24px]">
                        <h2 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px] mb-[14px]">Invite Collaborators</h2>

                        <div className="flex gap-[12px] items-start">
                            <div className="flex-1 flex flex-wrap gap-[6px] items-center min-h-[42px] px-[12px] py-[8px] bg-white border border-[#D4C8FF]/50 focus-within:ring-1 focus-within:ring-[#6466FF] focus-within:border-[#6466FF]">
                                {emailTags.map(email => (
                                    <span key={email} className="inline-flex items-center gap-[4px] px-[8px] py-[2px] bg-[#EDE8FF] text-[#6466FF] text-[12px] font-semibold rounded-[4px]">
                                        {email}
                                        <X size={11} className="cursor-pointer hover:opacity-70" onClick={() => removeTag(email)} />
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={handleEmailKeyDown}
                                    onPaste={handleEmailPaste}
                                    onBlur={() => { if (emailInput.trim()) addEmail(emailInput); }}
                                    placeholder={emailTags.length === 0 ? 'Enter email addresses (separate with comma or Enter)' : ''}
                                    className="flex-1 min-w-[200px] border-none outline-none bg-transparent text-[14px] text-[#1E1B39] font-medium placeholder:text-[#A5AEB7]"
                                />
                            </div>
                            <label
                                title="Upload CSV with emails"
                                className="h-[42px] px-[14px] bg-white border border-[#D4C8FF]/50 text-[#6466FF] hover:bg-[#FAF7FF] hover:border-[#6466FF] text-[14px] font-semibold cursor-pointer flex items-center gap-[6px] whitespace-nowrap transition-colors"
                            >
                                <Upload size={14} />
                                CSV
                                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                            </label>
                            <button
                                onClick={handleSendInvitations}
                                disabled={createMutation.isPending}
                                className="h-[42px] px-[20px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-semibold border-none cursor-pointer flex items-center gap-[6px] whitespace-nowrap disabled:opacity-60"
                            >
                                <Send size={14} />
                                {createMutation.isPending ? 'Sending...' : 'Send Invitations'}
                            </button>
                        </div>

                        {inviteError && (
                            <p className="text-[#E22D54] text-[13px] font-medium mt-[8px]">{inviteError}</p>
                        )}

                        {inviteResults && (
                            <div className="mt-[12px] space-y-[8px]">
                                {inviteResults.map((r: any, i: number) => (
                                    <div key={i} className="flex items-center gap-[8px] p-[10px] rounded-[8px]" style={{
                                        backgroundColor: r.status === 'CREATED' ? 'rgba(37,198,136,0.06)' : r.status === 'ALREADY_EXISTS' ? 'rgba(245,158,11,0.06)' : 'rgba(226,45,84,0.06)',
                                        border: `1px solid ${r.status === 'CREATED' ? 'rgba(37,198,136,0.2)' : r.status === 'ALREADY_EXISTS' ? 'rgba(245,158,11,0.2)' : 'rgba(226,45,84,0.2)'}`,
                                    }}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-[6px]">
                                                {r.status === 'CREATED' ? <CheckCircle size={13} color="#25C688" /> : r.status === 'ALREADY_EXISTS' ? <AlertTriangle size={13} color="#D97706" /> : <XCircle size={13} color="#E22D54" />}
                                                <span className="text-[13px] font-semibold text-[#1E1B39]">{r.email}</span>
                                                {r.status === 'CREATED' && !r.emailSent && (
                                                    <span className="text-[11px] text-[#D97706] font-medium">(email not sent - share token manually)</span>
                                                )}
                                            </div>
                                            {r.enrollmentToken && (
                                                <div className="flex items-center gap-[6px] mt-[4px]">
                                                    <code className="text-[11px] text-[#6466FF] bg-[#F5F3FF] px-[6px] py-[2px] rounded font-mono">{r.enrollmentToken}</code>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(r.enrollmentToken); setCopiedId(r.invitationId); setTimeout(() => setCopiedId(null), 2000); }}
                                                        className="text-[11px] text-[#6466FF] hover:text-[#5558EE] flex items-center gap-[2px] bg-transparent border-none cursor-pointer"
                                                    >
                                                        {copiedId === r.invitationId ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Tokens', value: stats.total + enrollmentTokens.filter((t: any) => !invitations.some((inv: any) => inv.enrollmentToken === t.token)).length, icon: Key, iconBg: 'bg-[#E0E0F6]', iconColor: 'text-[#6466FF]' },
                            { label: 'Installed', value: stats.installed, icon: Shield, iconBg: 'bg-[#25C688]/[0.13]', iconColor: 'text-[#25C688]' },
                            { label: 'Active Now', value: stats.active, icon: CheckCircle, iconBg: 'bg-[#31CAEC]/[0.13]', iconColor: 'text-[#31CAEC]' },
                            { label: 'Unresponsive', value: stats.unresponsive, icon: AlertTriangle, iconBg: 'bg-[#E22D54]/[0.13]', iconColor: 'text-[#E22D54]' },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white h-[107px] px-[22px] py-[26px] border border-[#D4C8FF]/50 shadow-sm hover:shadow-md transition-shadow flex items-center gap-[16px]">
                                <div className={`w-[53px] h-[53px] rounded-[13px] flex items-center justify-center ${stat.iconBg}`}>
                                    <stat.icon size={22} className={stat.iconColor} />
                                </div>
                                <div>
                                    <p className="text-[14px] font-semibold text-[#A5AEB7] leading-[18px]">{stat.label}</p>
                                    <p className="text-[24px] font-bold text-[#1E1B39] leading-[30px]">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters + Unified Table */}
                <div className="bg-white border border-[#D4C8FF]/50">
                    {/* Filters */}
                    <div className="px-[24px] py-[16px] border-b border-[#D4C8FF]/30 flex gap-[12px] items-center flex-wrap">
                        <div className="flex flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                                placeholder="Search by email or token name..."
                                className="flex-1 h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 border-r-0 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                            />
                            <button onClick={handleSearch} className="h-[36px] px-[12px] bg-[#6466FF] text-white border-none cursor-pointer hover:bg-[#5558EE]">
                                <Search size={14} />
                            </button>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF]"
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="INSTALLED">Installed</option>
                            <option value="REVOKED">Revoked</option>
                        </select>
                        {canModify && (
                            <button
                                onClick={() => setShowTokenForm(true)}
                                className="h-[36px] px-[14px] bg-white border border-[#D4C8FF]/50 text-[#6466FF] hover:bg-[#FAF7FF] hover:border-[#6466FF] text-[13px] font-semibold cursor-pointer flex items-center gap-[5px] whitespace-nowrap transition-colors"
                            >
                                <Key size={13} />
                                Create Manual Token
                            </button>
                        )}
                    </div>

                    {/* Inline create token form */}
                    {showTokenForm && canModify && (
                        <div className="px-[24px] py-[14px] border-b border-[#D4C8FF]/30 bg-[#FAF7FF]">
                            <div className="flex gap-[10px] items-end">
                                <div className="flex-1">
                                    <label className="block text-[12px] font-semibold text-[#A5AEB7] mb-[5px]">Token Name</label>
                                    <input
                                        type="text"
                                        value={tokenName}
                                        onChange={e => setTokenName(e.target.value)}
                                        placeholder="e.g. Q4 Rollout"
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                        onKeyDown={e => { if (e.key === 'Enter') handleCreateToken(); }}
                                    />
                                </div>
                                <div className="w-[140px]">
                                    <label className="block text-[12px] font-semibold text-[#A5AEB7] mb-[5px]">Max Uses <span className="font-normal">(optional)</span></label>
                                    <input
                                        type="number"
                                        value={tokenMaxUses}
                                        onChange={e => setTokenMaxUses(e.target.value)}
                                        placeholder="Unlimited"
                                        min="1"
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                    />
                                </div>
                                <button
                                    onClick={handleCreateToken}
                                    disabled={!tokenName.trim() || createTokenMutation.isPending}
                                    className="h-[36px] px-[14px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[13px] font-semibold border-none cursor-pointer flex items-center gap-[5px] whitespace-nowrap transition-colors disabled:opacity-60"
                                >
                                    {createTokenMutation.isPending ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                    onClick={() => { setShowTokenForm(false); setTokenName(''); setTokenMaxUses(''); }}
                                    className="h-[36px] px-[10px] bg-transparent border border-[#D4C8FF]/50 text-[#A5AEB7] hover:text-[#1E1B39] hover:border-[#A5AEB7] text-[13px] font-semibold cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Unified Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ backgroundColor: '#F6F0FF' }}>
                                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] w-[90px]">Type</th>
                                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Identifier</th>
                                    {canViewTokens && (
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Enrollment Token</th>
                                    )}
                                    <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[120px]">
                                        <div className="flex items-center justify-center gap-[4px]"><Globe size={13} /> Extension</div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[140px]">
                                        <div className="flex items-center justify-center gap-[4px]"><Monitor size={13} /> Desktop Agent</div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[90px]">Uses</th>
                                    <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Created</th>
                                    {canModify && <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] w-[130px]">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D4C8FF]/30">
                                {(isLoading || tokensLoading) ? (
                                    <tr><td colSpan={colCount} className="px-6 py-8 text-center text-[14px] text-[#A5AEB7]">Loading...</td></tr>
                                ) : unifiedRows.length === 0 ? (
                                    <tr><td colSpan={colCount} className="px-6 py-8 text-center text-[14px] text-[#A5AEB7]">No invitations or tokens yet. Invite collaborators above or create a manual token.</td></tr>
                                ) : unifiedRows.map((row) => (
                                    <tr key={`${row.type}-${row.id}`} className="hover:bg-[#FAF7FF] transition-colors">
                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            {row.type === 'email' ? (
                                                <span
                                                    className="inline-flex items-center px-[10px] py-[2px] text-[10px] font-semibold uppercase tracking-wide"
                                                    style={{ borderRadius: '45px', lineHeight: '13px', backgroundColor: 'rgba(100,102,255,0.1)', color: '#6466FF' }}
                                                >
                                                    Email
                                                </span>
                                            ) : (
                                                <span
                                                    className="inline-flex items-center px-[10px] py-[2px] text-[10px] font-semibold uppercase tracking-wide"
                                                    style={{ borderRadius: '45px', lineHeight: '13px', backgroundColor: 'rgba(37,198,136,0.1)', color: '#25C688' }}
                                                >
                                                    Manual
                                                </span>
                                            )}
                                        </td>
                                        {/* Identifier */}
                                        <td className="px-6 py-4">
                                            <span className="text-[14px] font-medium text-[#1E1B39]">{row.identifier}</span>
                                        </td>
                                        {/* Enrollment Token */}
                                        {canViewTokens && (
                                            <td className="px-6 py-4">
                                                {row.token ? (
                                                    <div className="flex items-center gap-[6px]">
                                                        <code className="text-[11px] text-[#6466FF] bg-[#F5F3FF] px-[6px] py-[2px] rounded font-mono truncate max-w-[160px]" title={row.token}>
                                                            {row.token.length > 20 ? row.token.slice(0, 20) + '...' : row.token}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopyToken(row.id, row.token)}
                                                            title="Copy token"
                                                            className="text-[11px] text-[#6466FF] hover:text-[#5558EE] flex items-center gap-[2px] bg-transparent border-none cursor-pointer flex-shrink-0"
                                                        >
                                                            {copiedId === row.id ? <Check size={11} /> : <Copy size={11} />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-[#A5AEB7]">-</span>
                                                )}
                                            </td>
                                        )}
                                        {/* Extension */}
                                        <td className="px-6 py-4 text-center">
                                            {row.extensionHealth ? (
                                                <div className="flex items-center justify-center gap-[6px]">
                                                    <HealthBadge status={row.extensionHealth} />
                                                    {(row.extensionCount ?? 0) > 1 && (
                                                        <span className="text-[10px] font-semibold text-[#6466FF] bg-[#EDE8FF] px-[5px] py-[1px] rounded-[4px]">{row.extensionCount}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[13px] text-[#A5AEB7]">-</span>
                                            )}
                                        </td>
                                        {/* Desktop Agent */}
                                        <td className="px-6 py-4 text-center">
                                            {row.desktopHealth ? (
                                                <div className="flex items-center justify-center gap-[6px]">
                                                    <HealthBadge status={row.desktopHealth} />
                                                    {(row.desktopAgentCount ?? 0) > 1 && (
                                                        <span className="text-[10px] font-semibold text-[#6466FF] bg-[#EDE8FF] px-[5px] py-[1px] rounded-[4px]">{row.desktopAgentCount}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[13px] text-[#A5AEB7]">-</span>
                                            )}
                                        </td>
                                        {/* Uses */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[14px] font-semibold ${row.uses > 0 ? 'text-[#1E1B39]' : 'text-[#A5AEB7]'}`}>
                                                {row.usesMax !== null ? `${row.uses} / ${row.usesMax || '\u221E'}` : row.uses}
                                            </span>
                                        </td>
                                        {/* Created */}
                                        <td className="px-6 py-4">
                                            <span className="text-[13px] font-medium text-[#A5AEB7]">
                                                {row.createdAt ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true }) : '-'}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        {canModify && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-[6px]">
                                                    {/* Copy token - only if not already in the token column or for non-token-viewers */}
                                                    {!canViewTokens && row.token && (
                                                        <button
                                                            onClick={() => handleCopyToken(row.id, row.token)}
                                                            title="Copy enrollment token"
                                                            className="p-[6px] border border-[#D4C8FF]/50 text-[#6466FF] hover:bg-[#FAF7FF] hover:border-[#6466FF] transition-colors cursor-pointer bg-transparent"
                                                        >
                                                            {copiedId === row.id ? <Check size={13} /> : <Copy size={13} />}
                                                        </button>
                                                    )}
                                                    {/* Resend - email only */}
                                                    {row.canResend && (
                                                        <button
                                                            onClick={() => handleResend(row.id)}
                                                            disabled={resendMutation.isPending}
                                                            title="Resend invitation"
                                                            className="p-[6px] border border-[#D4C8FF]/50 text-[#6466FF] hover:bg-[#FAF7FF] hover:border-[#6466FF] transition-colors cursor-pointer bg-transparent"
                                                        >
                                                            <RefreshCw size={13} />
                                                        </button>
                                                    )}
                                                    {/* Revoke - email only */}
                                                    {row.canRevoke && (
                                                        <button
                                                            onClick={() => handleRevoke(row.id)}
                                                            title="Revoke access"
                                                            className="p-[6px] border border-[#E22D54]/20 text-[#E22D54] hover:bg-[#E22D54]/5 hover:border-[#E22D54]/50 transition-colors cursor-pointer bg-transparent"
                                                        >
                                                            <XCircle size={13} />
                                                        </button>
                                                    )}
                                                    {/* Delete - manual tokens only */}
                                                    {row.canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteToken(row.id)}
                                                            title="Delete token"
                                                            className="p-[6px] border border-[#E22D54]/20 text-[#E22D54] hover:bg-[#E22D54]/5 hover:border-[#E22D54]/50 transition-colors cursor-pointer bg-transparent"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-[#D4C8FF]/30 flex items-center justify-between bg-white">
                            <span className="text-[13px] text-[#A5AEB7] font-medium">
                                Page {meta.page} of {meta.totalPages} ({meta.total} total)
                            </span>
                            <div className="flex gap-[8px]">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] font-medium hover:bg-[#EDE8FF] disabled:opacity-40 cursor-pointer border-none"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page >= meta.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] font-medium hover:bg-[#EDE8FF] disabled:opacity-40 cursor-pointer border-none"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Revoke Confirm Modal */}
                <ConfirmModal
                    isOpen={showRevokeModal}
                    title="Revoke Access"
                    message="This will deactivate the enrollment token and revoke all registered devices for this collaborator. This action cannot be undone."
                    confirmText="Revoke"
                    variant="danger"
                    onConfirm={confirmRevoke}
                    onCancel={() => { setShowRevokeModal(false); setInvToRevoke(null); }}
                    isLoading={revokeMutation.isPending}
                />

                {/* Delete Token Confirm Modal */}
                <ConfirmModal
                    isOpen={showDeleteTokenModal}
                    title="Delete Token"
                    message="Are you sure you want to delete this token? Existing devices will remain connected, but new registrations will fail."
                    confirmText="Delete"
                    variant="danger"
                    onConfirm={confirmDeleteToken}
                    onCancel={() => { setShowDeleteTokenModal(false); setTokenToDelete(null); }}
                    isLoading={deleteTokenMutation.isPending}
                />
            </div>
        </ProtectedRoute>
    );
}
