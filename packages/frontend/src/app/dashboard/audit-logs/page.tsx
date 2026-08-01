'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import { useAuditLogs, useAuditActions, useAuditResourceTypes, useUsers } from '@/hooks/use-api';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const labelClass = 'block text-[13px] text-[#A5AEB7] font-semibold mb-[6px]';
const selectClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer';
const inputClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] [color-scheme:light]';

export default function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const [action, setAction] = useState('ALL');
    const [resourceType, setResourceType] = useState('ALL');
    const [userId, setUserId] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Fetch data
    const { data, isLoading, error, refetch, isFetching } = useAuditLogs({
        page,
        limit: 20,
        action: action !== 'ALL' ? action : undefined,
        resourceType: resourceType !== 'ALL' ? resourceType : undefined,
        userId: userId !== 'ALL' ? userId : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    });

    const { data: actionsData } = useAuditActions();
    const { data: resourceTypesData } = useAuditResourceTypes();
    const { data: usersData } = useUsers({ limit: 100 });

    const logs = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
    const actions = ['ALL', ...(actionsData?.actions || [])];
    const resourceTypes = ['ALL', ...(resourceTypesData?.resourceTypes || [])];
    const users = usersData?.data || [];

    const clearFilters = () => {
        setAction('ALL');
        setResourceType('ALL');
        setUserId('ALL');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const getActionBadgeStyle = (action: string): { bg: string; color: string } => {
        if (action.includes('CREATION')) return { bg: 'rgba(100, 102, 255, 0.13)', color: '#6466FF' };
        if (action.includes('UPDATE')) return { bg: 'rgba(236, 182, 65, 0.2)', color: '#ECB641' };
        if (action.includes('DELETE')) return { bg: 'rgba(226, 45, 84, 0.13)', color: '#E22D54' };
        if (action.includes('EXPORT')) return { bg: 'rgba(139, 92, 246, 0.13)', color: '#8B5CF6' };
        if (action.includes('LOGIN') || action.includes('AUTH')) return { bg: 'rgba(37, 198, 136, 0.13)', color: '#25C688' };
        return { bg: 'rgba(165, 174, 183, 0.2)', color: '#A5AEB7' };
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">
                {/* Header */}
                <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">System Audit Logs</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Track administrative actions and system changes</p>
                    </div>
                    <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-[48px] px-[16px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer flex items-center gap-[6px] disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={clearFilters}
                        className="h-[48px] px-[16px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                    >
                        Clear Filters
                    </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-[#D4C8FF]/50 px-[24px] py-[27px]">
                    {/* Row 1: Action, Resource Type, User */}
                    <div className="grid grid-cols-3 gap-[24px]">
                        <div>
                            <label className={labelClass}>Action</label>
                            <div className="relative">
                                <select
                                    value={action}
                                    onChange={(e) => { setAction(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    {actions.map((a) => (
                                        <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : formatAction(a)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Resource Type</label>
                            <div className="relative">
                                <select
                                    value={resourceType}
                                    onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    {resourceTypes.map((rt) => (
                                        <option key={rt} value={rt}>{rt === 'ALL' ? 'All Types' : rt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>User</label>
                            <div className="relative">
                                <select
                                    value={userId}
                                    onChange={(e) => { setUserId(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    <option value="ALL">All Users</option>
                                    {users.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.identifier}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Start Date, End Date */}
                    <div className="grid grid-cols-3 gap-[24px] mt-[20px]">
                        <div>
                            <label className={labelClass}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                placeholder="mm/dd/yyyy"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                placeholder="mm/dd/yyyy"
                                className={inputClass}
                            />
                        </div>
                        <div>{/* Empty col to keep grid alignment */}</div>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white border border-[#D4C8FF]/50 min-h-[400px]">
                    {isLoading ? (
                        <div className="p-8 text-center text-[#A5AEB7]">Loading audit logs...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400">Error: {(error as Error).message}</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-[#A5AEB7]">No audit logs found matching your criteria</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead style={{ backgroundColor: 'rgba(212, 200, 255, 0.3)' }}>
                                        <tr>
                                            <th className="px-4 py-4 text-[14px] font-medium text-[#1E1B39] w-8"></th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Timestamp</th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Action</th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">User</th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Resource</th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D4C8FF]/30">
                                        {logs.map((log: any) => {
                                            const actionStyle = getActionBadgeStyle(log.action);
                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr
                                                        className="bg-white hover:bg-[#F6F0FF] transition-colors cursor-pointer border-x border-[#D4C8FF]/50"
                                                        onClick={() => toggleRow(log.id)}
                                                    >
                                                        <td className="pl-[15px] pr-[8px] py-4">
                                                            <div className="text-[#1E1B39] flex items-center justify-center">
                                                                {expandedRow === log.id ? (
                                                                    <ChevronDown className="w-[20px] h-[20px]" strokeWidth={2.5} />
                                                                ) : (
                                                                    <ChevronRight className="w-[20px] h-[20px]" strokeWidth={2.5} />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[14px] font-medium text-[#1E1B39]">
                                                                {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                                                            </div>
                                                            <div className="text-[13px] font-medium text-[#A5AEB7] leading-[22px]">
                                                                {format(new Date(log.timestamp), 'hh:mm:ss a')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className="px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide"
                                                                style={{
                                                                    backgroundColor: actionStyle.bg,
                                                                    color: actionStyle.color,
                                                                    borderRadius: '45px',
                                                                    lineHeight: '13px',
                                                                }}
                                                            >
                                                                {formatAction(log.action)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[14px] font-medium text-[#1E1B39]">{log.user?.identifier || 'System'}</div>
                                                            <div className="text-[13px] font-medium text-[#A5AEB7] leading-[22px]">{log.user?.role || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {log.resourceType ? (
                                                                <>
                                                                    <div className="text-[14px] font-medium text-[#1E1B39]">{log.resourceType}</div>
                                                                    <div className="text-[13px] font-medium text-[#A5AEB7] leading-[22px]">
                                                                        {log.resourceId?.slice(0, 12)}...
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-[14px] font-medium text-[#A5AEB7]">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[14px] font-medium text-[#A5AEB7]">
                                                                {log.ipAddress || '-'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedRow === log.id && (
                                                        <tr className="bg-white border-x border-b border-[#D4C8FF]/50">
                                                            <td colSpan={6} className="p-0">
                                                                <div className="border-t border-[#D4C8FF]/50" />
                                                                <div className="px-[20px] py-[24px]">
                                                                    <h4 className="text-[14px] font-semibold text-[#1E1B39] leading-[18px] mb-[16px]">Log Details</h4>

                                                                    <div className="grid grid-cols-3 gap-x-[80px] mb-[16px]">
                                                                        <div>
                                                                            <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">User Agent</span>
                                                                            <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{log.userAgent || 'N/A'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">IP Address</span>
                                                                            <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{log.ipAddress || 'N/A'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Resource ID</span>
                                                                            <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{log.resourceId || 'N/A'}</div>
                                                                        </div>
                                                                    </div>

                                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                                        <div className="mt-[20px] pt-[15px] border-t border-[#D4C8FF]/50">
                                                                            <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Additional Details</span>
                                                                            <pre className="mt-[10px] p-[16px] bg-[#F6F0FF] border border-[#D4C8FF]/50 text-[12px] text-[#1E1B39] overflow-x-auto font-mono leading-[18px]">
                                                                                {JSON.stringify(log.details, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-6 py-4 border-t border-[#D4C8FF]/30 flex items-center justify-between bg-white">
                                <div className="text-[13px] text-[#A5AEB7]">
                                    Showing page {meta.page} of {meta.totalPages} ({meta.total} results)
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] hover:bg-[#EDE8FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                        disabled={page === meta.totalPages}
                                        className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] hover:bg-[#EDE8FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
