'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { useEvents, useApplications, useUsers } from '@/hooks/use-api';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { API_CONFIG } from '@/lib/api-config';
import Image from 'next/image';

import {
    Search,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    CircleHelp,
    RefreshCw,
} from 'lucide-react';

const ACTIONS = ['ALL', 'BLOCK', 'WARN', 'LOG'];
const RISK_LEVELS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

function EventsContent() {
    const searchParams = useSearchParams();

    // Filtering & Pagination State
    const [page, setPage] = useState(1);
    const [userFilter, setUserFilter] = useState(searchParams.get('userId') || '');
    const [appFilter, setAppFilter] = useState(searchParams.get('applicationId') || '');
    const [actionFilter, setActionFilter] = useState(searchParams.get('action') || 'ALL');
    const [riskFilter, setRiskFilter] = useState(searchParams.get('riskLevel') || 'ALL');
    const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') || 'ALL');
    const [dataTypeFilter, setDataTypeFilter] = useState(searchParams.get('dataType') || '');
    const [sensitiveDataFilter, setSensitiveDataFilter] = useState<boolean | undefined>(
        searchParams.get('dataType') ? true : undefined
    );
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'csv' | 'pdf') => {
        setIsExporting(true);
        try {
            const baseUrl = API_CONFIG.baseURL;

            const queryParams = new URLSearchParams({
                format,
                userId: userFilter,
                applicationId: appFilter,
                action: actionFilter,
                riskLevel: riskFilter,
                platform: platformFilter,
            });

            if (dataTypeFilter) queryParams.append('dataType', dataTypeFilter);
            if (sensitiveDataFilter !== undefined) queryParams.append('sensitiveData', sensitiveDataFilter ? 'true' : 'false');
            if (startDate) queryParams.append('startDate', startDate);
            if (endDate) queryParams.append('endDate', endDate);

            const response = await fetch(`${baseUrl}/reports/export?${queryParams.toString()}`, {
                method: 'GET',
                credentials: 'include',   // cookie SSO
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shadow-events-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
            alert('Failed to export report');
        } finally {
            setIsExporting(false);
        }
    };

    // React Query hooks
    const { data, isLoading, error, refetch, isFetching } = useEvents({
        page,
        limit: 20,
        userId: userFilter,
        applicationId: appFilter,
        action: actionFilter,
        riskLevel: riskFilter,
        platform: platformFilter,
        dataType: dataTypeFilter,
        sensitiveData: sensitiveDataFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
    });

    // Fetch lists for dropdowns
    const { data: appsData } = useApplications({ limit: 100 });
    const { data: usersData } = useUsers({ limit: 100 });

    const applications = appsData?.data || [];
    const users = usersData?.data || [];
    const events = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    // Get unique platforms from events
    const platforms: string[] = Array.from(new Set(events.map((e: any) => e.platform).filter((p: any): p is string => Boolean(p))));

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'BLOCK': return { bg: 'rgba(226, 45, 84, 0.13)', color: '#E22D54' };
            case 'WARN':  return { bg: 'rgba(245, 158, 11, 0.13)', color: '#D97706' };
            case 'LOG':   return { bg: 'rgba(100, 102, 255, 0.13)', color: '#6466FF' };
            default:      return { bg: 'rgba(165, 174, 183, 0.13)', color: '#615E83' };
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'HIGH':   return '#E22D54';
            case 'MEDIUM': return '#D97706';
            case 'LOW':    return '#10B981';
            default:       return '#A5AEB7';
        }
    };

    const getEventDescription = (event: any) => {
        const {
            action,
            riskLevel,
            sensitiveDataDetected,
            dataTypes,
            aiRiskLevel,
            aiCategory
        } = event;

        let parsedDataTypes: string[] = [];
        try {
            parsedDataTypes = Array.isArray(dataTypes)
                ? dataTypes
                : typeof dataTypes === 'string'
                    ? JSON.parse(dataTypes)
                    : [];
        } catch (e) {
            parsedDataTypes = [];
        }

        const hasPII = sensitiveDataDetected && parsedDataTypes.length > 0 && !parsedDataTypes.includes('Unknown');
        const hasAI = aiRiskLevel && aiCategory && aiCategory !== 'General';

        let detectionPart = '';
        if (hasPII && hasAI) {
            detectionPart = `${aiRiskLevel} risk: PII (${parsedDataTypes.join(', ')}) + AI context (${aiCategory})`;
        } else if (hasPII) {
            detectionPart = `PII detected (${parsedDataTypes.join(', ')})`;
        } else if (hasAI) {
            detectionPart = `AI detected ${aiRiskLevel} risk (${aiCategory})`;
        } else {
            detectionPart = `No sensitive data detected`;
        }

        let actionPart = '';
        switch (action) {
            case 'REDACTED_SEND': actionPart = `User redacted and sent safely (Risk reduced to ${riskLevel})`; break;
            case 'USER_OVERRIDE': actionPart = `User overrode warning and sent anyway`; break;
            case 'USER_OVERRIDE_BLOCKED': actionPart = `User attempted override but was blocked by policy`; break;
            case 'CLEAR_TEXT': actionPart = `User cleared text (Risk neutralized)`; break;
            case 'EDIT': actionPart = `User edited message (Risk neutralized)`; break;
            case 'WARNED_PROCEED': actionPart = `User acknowledged warning and proceeded`; break;
            case 'ALLOWED': actionPart = `Message sent normally`; break;
            case 'BLOCK': actionPart = `Access blocked by policy`; break;
            case 'WARN': actionPart = `Warning issued to user`; break;
            case 'LOG': actionPart = `Activity logged`; break;
            default: actionPart = `Action: ${action}`;
        }

        return (
            <span className="text-[#1E1B39]">
                {detectionPart} → {actionPart}
            </span>
        );
    };

    const clearFilters = () => {
        setUserFilter('');
        setAppFilter('');
        setActionFilter('ALL');
        setRiskFilter('ALL');
        setPlatformFilter('ALL');
        setDataTypeFilter('');
        setSensitiveDataFilter(undefined);
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    // Shared styles
    const selectClass = "w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer";
    const labelClass = "block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]";

    return (
        <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[16px]">
            {/* Header */}
            <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Conversation Events</h1>
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Monitor AI usage, policy enforcement, and sensitive data detection</p>
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
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="h-[48px] px-[16px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium flex items-center gap-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isExporting ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Image src="/icons/export_csv_icon.svg" alt="Export" width={18} height={18} className="invert" />
                                <span>Export CSV</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={clearFilters}
                        className="h-[48px] px-[16px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Filters — NO dividing lines, grid layout matching Figma */}
            <div className="bg-white border border-[#D4C8FF]/50 px-[24px] py-[27px]">
                {/* Row 1: User, Application, Action, Risk Level */}
                <div className="grid gap-[20px]" style={{ gridTemplateColumns: '1fr 1fr 207px 207px' }}>
                    <div>
                        <label className={labelClass}>User</label>
                        <div className="relative">
                            <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} className={selectClass}>
                                <option value="">All users</option>
                                {users.map((user: any) => (
                                    <option key={user.id} value={user.id}>{user.identifier}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Application</label>
                        <div className="relative">
                            <select value={appFilter} onChange={(e) => { setAppFilter(e.target.value); setPage(1); }} className={selectClass}>
                                <option value="">All applications</option>
                                {applications.map((app: any) => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Action</label>
                        <div className="relative">
                            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className={selectClass}>
                                {ACTIONS.map((action) => <option key={action} value={action}>{action === 'ALL' ? 'All' : action}</option>)}
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Risk level</label>
                        <div className="relative">
                            <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className={selectClass}>
                                {RISK_LEVELS.map((risk) => <option key={risk} value={risk}>{risk === 'ALL' ? 'All' : risk}</option>)}
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Row 2: Platform, Sensitive Data, Data Type / Pattern — same dimensions as Row 3 */}
                <div className="grid gap-[24px] mt-[20px]" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div>
                        <label className={labelClass}>Platform</label>
                        <div className="relative">
                            <select value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }} className={selectClass}>
                                <option value="ALL">All platforms</option>
                                {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Sensitive data</label>
                        <div className="relative">
                            <select
                                value={sensitiveDataFilter === undefined ? 'ALL' : sensitiveDataFilter ? 'YES' : 'NO'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSensitiveDataFilter(val === 'ALL' ? undefined : val === 'YES');
                                    setPage(1);
                                }}
                                className={selectClass}
                            >
                                <option value="ALL">All events</option>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Data Type / Pattern</label>
                        <input
                            type="text"
                            value={dataTypeFilter}
                            onChange={(e) => { setDataTypeFilter(e.target.value); setPage(1); }}
                            placeholder="e.g. Credit Card"
                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                        />
                    </div>
                </div>

                {/* Row 3: Start Date, End Date, Sort by — same dimensions as Row 2 */}
                <div className="grid gap-[24px] mt-[20px]" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div>
                        <label className={labelClass}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            placeholder="mm/dd/yyyy"
                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] [color-scheme:light]"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            placeholder="mm/dd/yyyy"
                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] [color-scheme:light]"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Sort by</label>
                        <div className="relative">
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                                <option value="timestamp">Timestamp</option>
                                <option value="action">Action</option>
                                <option value="riskLevel">Risk Level</option>
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#D4C8FF]/50 min-h-[400px]">
                {isLoading ? (
                    <div className="p-4"><TableSkeleton rows={10} columns={8} /></div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400">Error: {(error as Error).message}</div>
                ) : events.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            title="No events found"
                            description="No conversation events match your current filters. Try adjusting dates or clearing filters."
                            actionLabel="Clear Filters"
                            onAction={clearFilters}
                            icon={<Search className="h-10 w-10 text-[#A5AEB7]" />}
                        />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead style={{ backgroundColor: 'rgba(212, 200, 255, 0.3)' }}>
                                    <tr>
                                        <th className="px-4 py-4 text-[14px] font-medium text-[#1E1B39] w-8"></th>
                                        <th
                                            className="px-6 py-4 text-[14px] font-medium text-[#1E1B39] cursor-pointer hover:text-[#6466FF]"
                                            onClick={() => handleSort('timestamp')}
                                        >
                                            Timestamp {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Description</th>
                                        <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">User</th>
                                        <th
                                            className="px-6 py-4 text-[14px] font-medium text-[#1E1B39] cursor-pointer hover:text-[#6466FF]"
                                            onClick={() => handleSort('action')}
                                        >
                                            Action {sortBy === 'action' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-6 py-4 text-[14px] font-medium text-[#1E1B39] cursor-pointer hover:text-[#6466FF]"
                                            onClick={() => handleSort('riskLevel')}
                                        >
                                            Risk {sortBy === 'riskLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Domain/<br/>Platform</th>
                                        <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Sensitive<br/>Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D4C8FF]/30">
                                    {events.map((event: any) => {
                                        const actionStyle = getActionBadge(event.action);
                                        const riskColor = getRiskColor(event.riskLevel);

                                        return (
                                            <React.Fragment key={event.id}>
                                                <tr className="bg-white hover:bg-[#F6F0FF] transition-colors cursor-pointer border-x border-[#D4C8FF]/50" onClick={() => toggleRow(event.id)}>
                                                    <td className="pl-[15px] pr-[8px] py-4">
                                                        <div className="text-[#1E1B39] flex items-center justify-center">
                                                            {expandedRow === event.id ? (
                                                                <ChevronDown className="w-[20px] h-[20px]" strokeWidth={2.5} />
                                                            ) : (
                                                                <ChevronRight className="w-[20px] h-[20px]" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] font-medium text-[#1E1B39] whitespace-nowrap">
                                                        {formatDate(event.timestamp)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[14px] font-medium text-[#1E1B39] leading-[18px]">
                                                            {getEventDescription(event)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[14px] font-medium text-[#1E1B39]">{event.user?.identifier || 'Unknown'}</div>
                                                        <div className="text-[13px] font-medium text-[#A5AEB7] leading-[22px]">{event.device?.id?.slice(0, 8) || 'N/A'}</div>
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
                                                            {event.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[14px] font-medium" style={{ color: riskColor }}>
                                                            {event.riskLevel}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">
                                                        {event.application?.domain || event.platform || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {event.sensitiveDataDetected ? (
                                                            <span className="inline-flex items-center gap-[2px] px-[8px] py-[2px] text-[10px] font-semibold text-white" style={{ backgroundColor: '#E22D54', borderRadius: '45px', lineHeight: '13px' }}>
                                                                <AlertTriangle className="w-[13px] h-[13px]" strokeWidth={2.5} />
                                                                YES
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-[8px] py-[2px] text-[10px] font-semibold text-[#A5AEB7]" style={{ backgroundColor: 'rgba(165, 174, 183, 0.13)', borderRadius: '45px', lineHeight: '13px' }}>
                                                                NO
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {expandedRow === event.id && (
                                                    <tr className="bg-white border-x border-b border-[#D4C8FF]/50">
                                                        <td colSpan={8} className="p-0">
                                                            {/* Divider line between row summary and details */}
                                                            <div className="border-t border-[#D4C8FF]/50" />

                                                            {/* Event Details section */}
                                                            <div className="px-[20px] py-[24px]">
                                                                <h4 className="text-[14px] font-semibold text-[#1E1B39] leading-[18px] mb-[16px]">Event Details</h4>

                                                                {/* Row 1: Application Info, Conversation ID, Message Count */}
                                                                <div className="grid grid-cols-3 gap-x-[80px] mb-[16px]">
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Application Info:</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px] flex items-center gap-[8px]">
                                                                            <span>{event.application?.domain || event.platform || 'Unknown'}</span>
                                                                            {event.application?.aiDescription && (
                                                                                <div className="group relative flex items-center">
                                                                                    <CircleHelp className="w-[16px] h-[16px] text-[#1E1B39] hover:text-[#6466FF] cursor-help transition-colors flex-shrink-0" />
                                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-[#1E1B39] text-white text-[12px] font-medium p-[10px] shadow-xl z-20 pointer-events-none leading-[18px]">
                                                                                        {event.application.aiDescription}
                                                                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1E1B39]" />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Conversation ID:</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{event.conversationId || 'N/A'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Message Count</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{event.messageCount || 0}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Row 2: Input Length, Analysis Source, Confidence */}
                                                                <div className="grid grid-cols-3 gap-x-[80px] mb-[16px]">
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Input Length</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{event.inputLength || 0} chars</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Analysis Source:</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{event.analysisSource || 'N/A'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Confidence</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{((event.confidence || 0) * 100).toFixed(0)}%</div>
                                                                    </div>
                                                                </div>

                                                                {/* Row 3: User Override */}
                                                                <div className="grid grid-cols-3 gap-x-[80px]">
                                                                    <div>
                                                                        <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">User Override:</span>
                                                                        <div className="text-[#1E1B39] text-[14px] font-medium leading-[18px] mt-[2px]">{event.userOverride ? 'Yes' : 'No'}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Detected Data Types (below divider) */}
                                                                {event.sensitiveDataDetected && event.dataTypes && (() => {
                                                                    try {
                                                                        const types = Array.isArray(event.dataTypes)
                                                                            ? event.dataTypes
                                                                            : typeof event.dataTypes === 'string'
                                                                                ? JSON.parse(event.dataTypes)
                                                                                : [];
                                                                        return types.length > 0 ? (
                                                                            <div className="mt-[20px] pt-[15px] border-t border-[#D4C8FF]/50">
                                                                                <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Detected Data Type</span>
                                                                                <div className="flex flex-wrap gap-2 mt-[10px]">
                                                                                    {types.map((type: string, idx: number) => (
                                                                                        <span key={idx} className="px-[10px] py-[2px] text-[10px] font-semibold leading-[13px]" style={{ backgroundColor: 'rgba(226, 45, 84, 0.13)', color: '#E22D54', borderRadius: '45px' }}>
                                                                                            {type}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ) : null;
                                                                    } catch (e) {
                                                                        console.error('Error parsing dataTypes:', e);
                                                                        return null;
                                                                    }
                                                                })()}

                                                                {/* Pattern Matches (below divider) */}
                                                                {event.patternMatches && (() => {
                                                                    try {
                                                                        const matches = Array.isArray(event.patternMatches)
                                                                            ? event.patternMatches
                                                                            : typeof event.patternMatches === 'string'
                                                                                ? JSON.parse(event.patternMatches)
                                                                                : [];
                                                                        return matches.length > 0 ? (
                                                                            <div className="mt-[20px] pt-[15px] border-t border-[#D4C8FF]/50">
                                                                                <span className="text-[#A5AEB7] text-[13px] font-medium leading-[22px]">Pattern Matches</span>
                                                                                <div className="flex flex-wrap gap-2 mt-[10px]">
                                                                                    {matches.map((match: any, idx: number) => (
                                                                                        <span key={idx} className="px-[10px] py-[2px] text-[10px] font-semibold leading-[13px]" style={{ backgroundColor: 'rgba(226, 45, 84, 0.13)', color: '#E22D54', borderRadius: '45px' }}>
                                                                                            {match.patternName || match.category}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ) : null;
                                                                    } catch (e) {
                                                                        console.error('Error parsing patternMatches:', e);
                                                                        return null;
                                                                    }
                                                                })()}
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
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] hover:bg-[#EDE8FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                    Previous
                                </button>
                                <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                                    className="px-3 py-1 bg-[#F6F0FF] text-[#6466FF] text-[13px] hover:bg-[#EDE8FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function EventsPage() {
    return (
        <Suspense fallback={<div className="p-8"><TableSkeleton rows={10} columns={8} /></div>}>
            <ProtectedRoute>
                <EventsContent />
            </ProtectedRoute>
        </Suspense>
    );
}
