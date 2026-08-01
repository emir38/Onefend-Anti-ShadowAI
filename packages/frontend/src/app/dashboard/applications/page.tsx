'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import {
    useApplications,
    useCreateApplication,
    useUpdateApplication,
    useDeleteApplication,
    useDeleteApplications
} from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useDebounce } from '@/hooks/use-debounce';
import { AppWindow, X, ChevronDown, Trash2, Pencil, Search, CircleHelp, RefreshCw } from 'lucide-react';

const CATEGORIES = ['ALL', 'AI_ASSISTANT', 'CLOUD_STORAGE', 'COMMUNICATION', 'PRODUCTIVITY', 'DEVELOPMENT', 'SOCIAL_MEDIA', 'UNKNOWN'];

const formatCategory = (cat: string) => cat.replace(/_/g, ' ');

const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-500';
    if (score >= 50) return 'text-[#F59E0B]';
    return 'text-[#6466FF]';
};

// ── Risk Score Bar — horizontal, green fill + shadow track + dot marker ────────
function RiskBar({ score, width = 368 }: { score: number; width?: number }) {
    const pct = Math.max(0, Math.min(100, score));
    const BAR_H = 8;
    const DOT_R = 8;
    const PAD = DOT_R; // left/right padding so dot never clips
    const innerW = width - PAD * 2;
    const fillW = (pct / 100) * innerW;
    const dotX = PAD + fillW;
    const dotY = DOT_R + 2;
    const svgH = DOT_R * 2 + 4;
    const barY = dotY - BAR_H / 2;

    return (
        <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} style={{ overflow: 'visible', display: 'block' }}>
            {/* Shadow/track — full inner width */}
            <rect x={PAD} y={barY} width={innerW} height={BAR_H} fill="#E5E0FF" />
            {/* Green fill */}
            {pct > 0 && (
                <rect x={PAD} y={barY} width={fillW} height={BAR_H} fill="#4ADE80" />
            )}
            {/* Dot marker: white ring + green core */}
            {pct > 0 && (
                <>
                    <circle cx={dotX} cy={dotY} r={DOT_R} fill="white" stroke="#D4C8FF" strokeWidth="1.5" />
                    <circle cx={dotX} cy={dotY} r={5} fill="#4ADE80" />
                </>
            )}
        </svg>
    );
}

export default function ApplicationsPage() {
    const { user } = useAuth();
    const canModify = user?.role === 'ADMIN';
    const canEdit = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    const [showModal, setShowModal] = useState(false);
    const [editingApp, setEditingApp] = useState<any>(null);
    const [formData, setFormData] = useState({
        domain: '',
        name: '',
        category: 'UNKNOWN',
        riskScore: 50,
        isKnown: false,
    });

    // Delete confirm modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [appToDelete, setAppToDelete] = useState<string | null>(null);

    // Filtering & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const debouncedSearch = useDebounce(search, 500);

    const { data, isLoading, error, refetch, isFetching } = useApplications({
        page, limit: 10, category, search: debouncedSearch, sortBy, sortOrder,
    });

    const applications = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const createMutation = useCreateApplication();
    const updateMutation = useUpdateApplication();
    const deleteMutation = useDeleteApplication();
    const deleteBatchMutation = useDeleteApplications();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === applications.length ? [] : applications.map((app: any) => app.id));
    };
    const toggleSelectOne = (id: string) => {
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} applications?`)) return;
        try { await deleteBatchMutation.mutateAsync(selectedIds); setSelectedIds([]); }
        catch (err: any) { alert(err.message || 'Failed to delete applications'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingApp) { await updateMutation.mutateAsync({ id: editingApp.id, data: formData }); }
            else { await createMutation.mutateAsync(formData); }
            setShowModal(false); resetForm();
        } catch (err: any) { alert(err.message || 'Failed to save application'); }
    };

    const handleDelete = (id: string) => { setAppToDelete(id); setShowDeleteModal(true); };
    const confirmDelete = async () => {
        if (!appToDelete) return;
        try { await deleteMutation.mutateAsync(appToDelete); setShowDeleteModal(false); setAppToDelete(null); }
        catch (err: any) { alert(err.message || 'Failed to delete application'); }
    };

    const handleEdit = (app: any) => {
        setEditingApp(app);
        setFormData({ domain: app.domain, name: app.name || '', category: app.category, riskScore: app.riskScore, isKnown: app.isKnown || false });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingApp(null);
        setFormData({ domain: '', name: '', category: 'UNKNOWN', riskScore: 50, isKnown: false });
    };

    const handleSort = (field: string) => {
        if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
        else { setSortBy(field); setSortOrder('asc'); }
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">

                {/* Page header */}
                <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Applications</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Manage SaaS and AI applications</p>
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
                        {canModify && (
                            <button
                                onClick={() => { resetForm(); setShowModal(true); }}
                                className="bg-[#6466FF] text-white hover:bg-[#5558EE] px-[16px] py-[12px] flex items-center gap-[6px] text-[14px] font-medium transition-colors cursor-pointer"
                            >
                                + Add Application
                            </button>
                        )}
                    </div>
                </div>

                {/* Search / Filter bar */}
                <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 border border-[#D4C8FF]/50">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#A5AEB7] pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by name or domain..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                        />
                    </div>
                    <div className="w-full sm:w-48 relative">
                        <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{formatCategory(cat)}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#1E1B39] pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#D4C8FF]/50 min-h-[400px]">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={10} columns={6} /></div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400">Error: {error.message}</div>
                    ) : applications.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                title="No applications found"
                                description="No applications match your current filters. Add a new application or adjust filters."
                                actionLabel={canModify ? '+ Add Application' : undefined}
                                onAction={canModify ? () => { resetForm(); setShowModal(true); } : undefined}
                                icon={<AppWindow className="h-10 w-10 text-[#A5AEB7]" />}
                            />
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                {/* ── Header — distinct bg color ── */}
                                <thead style={{ backgroundColor: '#F6F0FF' }}>
                                    <tr>
                                        {canModify && (
                                            <th className="px-6 py-3 w-4">
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleSelectAll}
                                                    checked={applications.length > 0 && selectedIds.length === applications.length}
                                                    className="border-[#D4C8FF] text-[#6466FF] focus:ring-[#6466FF] accent-[#6466FF]"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] cursor-pointer hover:text-[#6466FF]" onClick={() => handleSort('name')}>
                                            Application {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] cursor-pointer hover:text-[#6466FF]" onClick={() => handleSort('domain')}>
                                            Domain {sortBy === 'domain' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Category</th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] cursor-pointer hover:text-[#6466FF]" onClick={() => handleSort('riskScore')}>
                                            Risk Score {sortBy === 'riskScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Status</th>
                                        {(canEdit || canModify) && (
                                            <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#1E1B39]">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                {/* ── Rows — white bg ── */}
                                <tbody className="divide-y divide-[#D4C8FF]/30">
                                    {applications.map((app: any) => (
                                        <tr key={app.id} className={`hover:bg-[#FAF7FF] ${selectedIds.includes(app.id) ? 'bg-[#6466FF]/5' : 'bg-white'}`}>
                                            {canModify && (
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(app.id)}
                                                        onChange={() => toggleSelectOne(app.id)}
                                                        className="border-[#D4C8FF] text-[#6466FF] focus:ring-[#6466FF] accent-[#6466FF]"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-[8px]">
                                                    <span className="text-[14px] font-medium text-[#1E1B39]">{app.name || 'Unknown'}</span>
                                                    {app.aiDescription && (
                                                        <div className="group relative flex items-center">
                                                            <CircleHelp className="w-[16px] h-[16px] text-[#1E1B39] hover:text-[#6466FF] cursor-help transition-colors flex-shrink-0" />
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-[#1E1B39] text-white text-[12px] font-medium p-[10px] shadow-xl z-20 pointer-events-none leading-[18px]">
                                                                {app.aiDescription}
                                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1E1B39]" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[14px] text-[#615E83]">{app.domain}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-[11px] font-semibold bg-[#EDE8FF] text-[#6466FF] uppercase tracking-wide">
                                                    {formatCategory(app.category)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[14px] font-semibold ${getRiskColor(app.riskScore)}`}>{app.riskScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${app.isKnown ? 'bg-[#EDE8FF] text-[#6466FF]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                                                    {app.isKnown ? 'Known' : 'Unknown'}
                                                </span>
                                            </td>
                                            {(canEdit || canModify) && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEdit(app)}
                                                                className="text-[#1E1B39] hover:text-[#6466FF] transition-colors cursor-pointer"
                                                                disabled={updateMutation.isPending}
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-[16px] h-[16px]" />
                                                            </button>
                                                        )}
                                                        {canModify && (
                                                            <button
                                                                onClick={() => handleDelete(app.id)}
                                                                className="text-[#EF4444] hover:text-[#DC2626] transition-colors cursor-pointer"
                                                                disabled={deleteMutation.isPending}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-[16px] h-[16px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

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

            {/* ── Add / Edit Application Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
                    <div className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col" style={{ width: 418, minHeight: 583 }}>
                        {/* Close */}
                        <button onClick={() => { setShowModal(false); resetForm(); }} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                            <X className="w-[24px] h-[24px]" />
                        </button>

                        {/* Header */}
                        <div className="px-[25px] pt-[24px]">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">
                                {editingApp ? 'Edit Application' : 'Add Application'}
                            </h2>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">
                                {editingApp ? 'Update application details and risk classification.' : 'Register a new SaaS or AI application to monitor.'}
                            </p>
                            <div className="border-b border-[#D4C8FF] mt-[12px]" />
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                            <div className="px-[25px] pt-[24px] space-y-[18px] flex-1">

                                {/* Domain */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Domain</label>
                                    <input
                                        type="text"
                                        value={formData.domain}
                                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                        placeholder="example.com"
                                        required
                                        disabled={!!editingApp}
                                    />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                        placeholder="Application Name"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Category</label>
                                    <div className="relative">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                                            required
                                        >
                                            {CATEGORIES.filter(c => c !== 'ALL').map((cat) => (
                                                <option key={cat} value={cat}>{formatCategory(cat)}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                                    </div>
                                </div>

                                {/* Risk Score — full-width bar, labels aligned to bar edges */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[12px]">
                                        Risk Score: <span className="text-[#1E1B39]">{formData.riskScore}</span>
                                    </label>
                                    {/* Bar: full content width, PAD=8 on each side so dot never clips */}
                                    <div className="w-full">
                                        <RiskBar score={formData.riskScore} width={368} />
                                    </div>
                                    {/* Invisible slider on top — same clickable area */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={formData.riskScore}
                                        onChange={(e) => setFormData({ ...formData, riskScore: parseInt(e.target.value) })}
                                        className="w-full cursor-pointer opacity-0 h-[20px] -mt-[15px] relative z-10 block"
                                    />
                                    {/*
                                        Label row: PAD=8px offsets on each side match bar's internal padding.
                                        '0' sits at left=8px (bar start), '100' sits at right=8px (bar end),
                                        '50' is centered between them.
                                    */}
                                    <div className="flex justify-between text-[11px] text-[#A5AEB7] -mt-1" style={{ paddingLeft: 8, paddingRight: 8 }}>
                                        <span>0</span>
                                        <span>50</span>
                                        <span>100</span>
                                    </div>
                                </div>

                                {/* Mark as known */}
                                <div className="flex items-center gap-[10px]">
                                    <input
                                        type="checkbox"
                                        id="isKnown"
                                        checked={formData.isKnown}
                                        onChange={(e) => setFormData({ ...formData, isKnown: e.target.checked })}
                                        className="w-[16px] h-[16px] border-[#D4C8FF] accent-[#6466FF]"
                                    />
                                    <label htmlFor="isKnown" className="text-[13px] text-[#615E83] cursor-pointer">Mark as known application</label>
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="px-[25px] pb-[24px] pt-[20px] flex items-center gap-[20px]">
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="h-[48px] px-[26px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingApp ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Application Modal — matches Figma 418×246 ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
                    <div className="bg-white border border-[#D4C8FF] shadow-2xl flex flex-col" style={{ width: 418 }}>
                        {/* Title section */}
                        <div className="px-[25px] pt-[30px] pb-[16px]">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Delete Application</h2>
                            <div className="border-b border-[#D4C8FF] mt-[16px]" />
                        </div>
                        {/* Message */}
                        <div className="px-[25px] pt-[4px] pb-[8px]">
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[22px]">
                                Are you sure you want to delete this application? This action cannot be undone.
                            </p>
                        </div>
                        {/* Buttons */}
                        <div className="px-[25px] pb-[24px] pt-[16px] flex items-center gap-[20px]">
                            <button
                                onClick={confirmDelete}
                                disabled={deleteMutation.isPending}
                                className="h-[48px] px-[20px] bg-[#EF4444] hover:bg-[#DC2626] text-white text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-[8px]"
                            >
                                <Trash2 className="w-[16px] h-[16px]" />
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => { setShowDeleteModal(false); setAppToDelete(null); }}
                                className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk selection bar — rectangle (not pill), matches Figma ── */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-[#D4C8FF] flex items-center gap-[24px] px-[24px] py-[16px] shadow-2xl z-50">
                    <span className="text-[14px] font-medium text-[#1E1B39]">{selectedIds.length} selected</span>
                    <button
                        onClick={handleBulkDelete}
                        className="bg-[#EF4444] hover:bg-[#DC2626] text-white text-[13px] font-semibold py-[10px] px-[16px] uppercase tracking-wider transition-colors flex items-center gap-[6px] cursor-pointer disabled:opacity-50"
                        disabled={deleteBatchMutation.isPending}
                    >
                        <Trash2 className="w-[14px] h-[14px]" />
                        {deleteBatchMutation.isPending ? 'Deleting...' : 'Delete selected'}
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        className="text-[#6466FF] text-[14px] font-medium hover:underline cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </ProtectedRoute>
    );
}
