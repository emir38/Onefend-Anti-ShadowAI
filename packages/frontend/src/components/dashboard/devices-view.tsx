'use client';

import { useState } from 'react';
import { useDevicesGrouped, useRevokeDevice } from '@/hooks/use-api';
import ConfirmModal from '@/components/confirm-modal';
import { useAuth } from '@/contexts/auth-context';
import { Search, ChevronDown, ChevronRight, Globe, Monitor, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type DeviceHealth = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'UNRESPONSIVE' | 'REVOKED';

const healthConfig: Record<string, { color: string; bg: string; label: string }> = {
    PENDING: { color: '#A5AEB7', bg: 'rgba(165,174,183,0.13)', label: 'Pending' },
    ACTIVE: { color: '#25C688', bg: 'rgba(37,198,136,0.13)', label: 'Active' },
    INACTIVE: { color: '#D97706', bg: 'rgba(245,158,11,0.13)', label: 'Inactive' },
    UNRESPONSIVE: { color: '#E22D54', bg: 'rgba(226,45,84,0.13)', label: 'Unresponsive' },
    REVOKED: { color: '#6B7280', bg: 'rgba(107,114,128,0.13)', label: 'Revoked' },
};

function HealthBadge({ status }: { status: string }) {
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

export default function DevicesView() {
    const { user } = useAuth();
    const canModify = user?.role === 'ADMIN';

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null);

    const { data, isLoading } = useDevicesGrouped({ page, limit: 15, search: search || undefined });
    const revokeMutation = useRevokeDevice();

    const users = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };

    const toggleExpand = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    const handleRevoke = (deviceId: string) => { setDeviceToRevoke(deviceId); setShowRevokeModal(true); };
    const confirmRevoke = async () => {
        if (!deviceToRevoke) return;
        try { await revokeMutation.mutateAsync(deviceToRevoke); setShowRevokeModal(false); setDeviceToRevoke(null); }
        catch (err: any) { alert(err.message || 'Failed to revoke device'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pt-2">
                <div>
                    <h2 className="text-[18px] font-semibold text-[#1E1B39] tracking-tight">Devices</h2>
                    <p className="text-[13px] text-[#A5AEB7] mt-0.5">Registered devices grouped by user</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 border border-[#D4C8FF]/50">
                <div className="flex gap-[12px]">
                    <div className="flex flex-1">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                            placeholder="Search by email..."
                            className="flex-1 h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 border-r-0 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                        />
                        <button onClick={handleSearch} className="h-[36px] px-[12px] bg-[#6466FF] text-white border-none cursor-pointer hover:bg-[#5558EE]">
                            <Search size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#D4C8FF]/50">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: '#F6F0FF' }}>
                                <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] w-[40px]"></th>
                                <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Email</th>
                                <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[120px]">
                                    <div className="flex items-center justify-center gap-[4px]"><Globe size={13} /> Extension</div>
                                </th>
                                <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[140px]">
                                    <div className="flex items-center justify-center gap-[4px]"><Monitor size={13} /> Desktop Agent</div>
                                </th>
                                <th className="px-6 py-3 text-center text-[13px] font-semibold text-[#1E1B39] w-[80px]">Devices</th>
                                <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Groups</th>
                                <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4C8FF]/30">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-[14px] text-[#A5AEB7]">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-[14px] text-[#A5AEB7]">No devices registered yet.</td></tr>
                            ) : users.map((u: any) => (
                                <>
                                    {/* User row */}
                                    <tr
                                        key={u.userId}
                                        className="hover:bg-[#FAF7FF] transition-colors cursor-pointer"
                                        onClick={() => toggleExpand(u.userId)}
                                    >
                                        <td className="px-6 py-4 text-[#A5AEB7]">
                                            {expandedUser === u.userId ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[14px] font-medium text-[#1E1B39]">{u.email}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-[6px]">
                                                <HealthBadge status={u.extensionHealth} />
                                                {u.extensionCount > 1 && (
                                                    <span className="text-[10px] font-semibold text-[#6466FF] bg-[#EDE8FF] px-[5px] py-[1px] rounded-[4px]">{u.extensionCount}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-[6px]">
                                                <HealthBadge status={u.agentHealth} />
                                                {u.agentCount > 1 && (
                                                    <span className="text-[10px] font-semibold text-[#6466FF] bg-[#EDE8FF] px-[5px] py-[1px] rounded-[4px]">{u.agentCount}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[14px] font-semibold text-[#1E1B39]">{u.deviceCount}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.groups.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {u.groups.map((g: any) => (
                                                        <span key={g.id} className="px-2 py-1 text-[11px] font-semibold bg-[#EDE8FF] text-[#6466FF] uppercase tracking-wide">
                                                            {g.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[14px] text-[#A5AEB7]">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[13px] font-medium text-[#A5AEB7]">
                                                {u.lastSeen ? formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true }) : 'Never'}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Expanded device rows */}
                                    {expandedUser === u.userId && u.devices.map((d: any) => (
                                        <tr key={d.id} className="bg-[#FAFAFE]">
                                            <td className="px-6 py-3"></td>
                                            <td className="px-6 py-3" colSpan={2}>
                                                <div className="flex items-center gap-[8px] pl-[12px] border-l-2 border-[#D4C8FF]">
                                                    <span className="text-[12px] font-semibold text-[#6466FF] bg-[#EDE8FF] px-[6px] py-[1px] rounded-[4px] uppercase">
                                                        {d.deviceType === 'EXTENSION' ? 'Extension' : 'Agent'}
                                                    </span>
                                                    <span className="text-[13px] text-[#1E1B39] font-medium">
                                                        {d.browser} · {d.os}
                                                    </span>
                                                    {d.extensionVersion && (
                                                        <span className="text-[11px] text-[#A5AEB7]">v{d.extensionVersion}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <HealthBadge status={d.health} />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="text-[11px] text-[#A5AEB7] font-mono">{d.id.substring(0, 8)}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-[12px] text-[#A5AEB7]">
                                                    {d.lastSyncAt ? formatDistanceToNow(new Date(d.lastSyncAt), { addSuffix: true }) : 'Never'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                {canModify && !d.revokedAt && d.isActive && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRevoke(d.id); }}
                                                        title="Revoke this device"
                                                        className="p-[5px] border border-[#E22D54]/20 text-[#E22D54] hover:bg-[#E22D54]/5 hover:border-[#E22D54]/50 transition-colors cursor-pointer bg-transparent"
                                                    >
                                                        <XCircle size={13} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-[#D4C8FF]/30 flex items-center justify-between bg-white">
                        <span className="text-[13px] text-[#A5AEB7] font-medium">
                            Page {meta.page} of {meta.totalPages} ({meta.total} users)
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

            {/* Revoke Modal */}
            <ConfirmModal
                isOpen={showRevokeModal}
                title="Revoke Device"
                message="This will revoke access for this specific device. The user can still use other registered devices."
                confirmText="Revoke"
                variant="danger"
                onConfirm={confirmRevoke}
                onCancel={() => { setShowRevokeModal(false); setDeviceToRevoke(null); }}
                isLoading={revokeMutation.isPending}
            />
        </div>
    );
}
