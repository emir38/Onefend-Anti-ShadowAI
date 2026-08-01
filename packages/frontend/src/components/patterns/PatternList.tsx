'use client';

import { useState } from 'react';
import { usePatterns, useDeletePattern } from '@/hooks/use-api';
import ConfirmModal from '@/components/confirm-modal';
import { PatternEditorModal } from './PatternEditorModal';
import { PatternTester } from './PatternTester';
import { useAuth } from '@/contexts/auth-context';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';

const getSeverityBadge = (severity: string) => {
    switch (severity) {
        case 'CRITICAL': return 'bg-red-100 text-red-600';
        case 'HIGH':     return 'bg-orange-100 text-orange-700';
        case 'MEDIUM':   return 'bg-yellow-100 text-yellow-700';
        default:         return 'bg-blue-100 text-blue-700';
    }
};

export function PatternList() {
    const { user } = useAuth();
    const hasRoleToModify = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    const { data: patterns, isLoading, error } = usePatterns();
    const deletePattern = useDeletePattern();

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isTesterOpen, setIsTesterOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [patternToDelete, setPatternToDelete] = useState<any>(null);

    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');

    const handleCreate = () => { setSelectedPattern(null); setIsEditorOpen(true); };
    const handleEdit = (pattern: any) => { setSelectedPattern(pattern); setIsEditorOpen(true); };
    const confirmDelete = (pattern: any) => { setPatternToDelete(pattern); setIsDeleteModalOpen(true); };
    const handleDelete = async () => {
        if (!patternToDelete) return;
        try { await deletePattern.mutateAsync(patternToDelete.id); setIsDeleteModalOpen(false); setPatternToDelete(null); }
        catch (err) { alert('Failed to delete pattern'); }
    };

    const filteredPatterns = patterns?.data?.filter((pattern: any) => {
        if (categoryFilter !== 'ALL' && pattern.category !== categoryFilter) return false;
        if (severityFilter !== 'ALL' && pattern.severity !== severityFilter) return false;
        if (actionFilter !== 'ALL' && pattern.defaultAction !== actionFilter) return false;
        if (typeFilter === 'BUILTIN' && !pattern.isBuiltIn) return false;
        if (typeFilter === 'CUSTOM' && pattern.isBuiltIn) return false;
        return true;
    });

    if (isLoading) return <div className="p-8 text-center text-[#A5AEB7]">Loading patterns...</div>;
    if (error) return <div className="p-8 text-center text-red-400">Error loading patterns</div>;

    const categories = Array.from(new Set(patterns?.data?.map((p: any) => p.category) || [])).sort() as string[];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const actions = ['ALLOW', 'WARN', 'SOFT_BLOCK', 'BLOCK', 'LOG'];

    const selectClass = "bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer";

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 border border-[#D4C8FF]/50">
                <div className="flex gap-3">
                    {hasRoleToModify && (
                            <button onClick={handleCreate}
                                className="bg-[#6466FF] text-white hover:bg-[#5558EE] px-[16px] py-[10px] text-[14px] font-medium transition-colors cursor-pointer">
                                + Create Pattern
                            </button>
                    )}
                    <button onClick={() => setIsTesterOpen(true)}
                        className="border border-[#D4C8FF]/50 text-[#615E83] hover:bg-[#F6F0FF] px-[16px] py-[10px] text-[14px] font-medium transition-colors cursor-pointer">
                        Test Detection
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
                            <option value="ALL">All Categories</option>
                            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
                            <option value="ALL">All Severities</option>
                            {severities.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectClass}>
                            <option value="ALL">All Actions</option>
                            {actions.map((act) => <option key={act} value={act}>{act}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
                            <option value="ALL">All Types</option>
                            <option value="BUILTIN">Built-in</option>
                            <option value="CUSTOM">Custom</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#D4C8FF]/50 min-h-[300px]">
                <table className="w-full">
                    <thead style={{ backgroundColor: '#F6F0FF' }}>
                        <tr>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Name</th>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Category</th>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Regex</th>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Severity</th>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Action</th>
                            <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Type</th>
                            {hasRoleToModify && (
                                <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#1E1B39]">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4C8FF]/30">
                        {filteredPatterns?.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-[#A5AEB7]">No patterns match your filters.</td>
                            </tr>
                        ) : (
                            filteredPatterns?.map((pattern: any) => (
                                <tr key={pattern.id} className="bg-white hover:bg-[#FAF7FF]">
                                    <td className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">{pattern.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-[11px] font-semibold bg-[#EDE8FF] text-[#6466FF] uppercase tracking-wide">{pattern.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-[13px] text-[#615E83] font-mono max-w-xs truncate" title={pattern.regex}>
                                        {pattern.regex}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getSeverityBadge(pattern.severity)}`}>
                                            {pattern.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[14px] text-[#615E83]">{pattern.defaultAction}</td>
                                    <td className="px-6 py-4">
                                        {pattern.isBuiltIn
                                            ? <span className="text-[13px] text-[#A5AEB7] italic">Built-in</span>
                                            : <span className="text-[13px] font-medium text-[#6466FF]">Custom</span>
                                        }
                                    </td>
                                    {hasRoleToModify && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => handleEdit(pattern)}
                                                        className="text-[#1E1B39] hover:text-[#6466FF] transition-colors cursor-pointer"
                                                        title="Edit">
                                                        <Pencil className="w-[16px] h-[16px]" />
                                                    </button>
                                                {!pattern.isBuiltIn && (
                                                        <button onClick={() => confirmDelete(pattern)}
                                                            className="text-[#EF4444] hover:text-[#DC2626] transition-colors cursor-pointer"
                                                            title="Delete">
                                                            <Trash2 className="w-[16px] h-[16px]" />
                                                        </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isEditorOpen && (
                <PatternEditorModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} pattern={selectedPattern} />
            )}
            {isTesterOpen && (
                <PatternTester isOpen={isTesterOpen} onClose={() => setIsTesterOpen(false)} />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Delete Pattern"
                message={`Are you sure you want to delete "${patternToDelete?.name}"? This cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => { setIsDeleteModalOpen(false); setPatternToDelete(null); }}
                isLoading={deletePattern.isPending}
            />
        </div>
    );
}
