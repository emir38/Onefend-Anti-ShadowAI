'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import {
    usePolicies,
    useCreatePolicy,
    useUpdatePolicy,
    useDeletePolicy,
    useApplications,
    useGroups
} from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import ConfirmModal from '@/components/confirm-modal';
import { ChevronDown, Pencil, Trash2, X, RefreshCw } from 'lucide-react';

const ACTIONS = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'ALLOW', label: 'Allow' },
    { value: 'WARN', label: 'Warn' },
    { value: 'SOFT_BLOCK', label: 'Soft Block' },
    { value: 'BLOCK', label: 'Block' },
];

const getActionBadge = (action: string) => {
    switch (action) {
        case 'ALLOW':      return 'bg-green-100 text-green-700';
        case 'WARN':       return 'bg-yellow-100 text-yellow-700';
        case 'SOFT_BLOCK': return 'bg-orange-100 text-orange-700';
        case 'BLOCK':      return 'bg-red-100 text-red-700';
        default:           return 'bg-[#EDE8FF] text-[#6466FF]';
    }
};

export default function PoliciesPage() {
    const { user } = useAuth();
    const canModify = user?.role === 'ADMIN';
    const canEdit = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<any>(null);
    const [formData, setFormData] = useState({
        groupIds: [] as string[],
        applicationId: '',
        action: 'ALLOW',
        priority: 10,
    });
    const [isGlobalPolicy, setIsGlobalPolicy] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('ALL');
    const [appFilter, setAppFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [sortBy, setSortBy] = useState('priority');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data, isLoading: isLoadingPolicies, error: policiesError, refetch, isFetching } = usePolicies({
        page, limit: 10, action: actionFilter, applicationId: appFilter, groupId: groupFilter, sortBy, sortOrder,
    });

    const { data: appsData } = useApplications({ limit: 100 });
    const { data: groupsData } = useGroups();

    const applications = appsData?.data || [];
    const groups = Array.isArray(groupsData) ? groupsData : (groupsData?.data || []);
    const policies = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const createMutation = useCreatePolicy();
    const updateMutation = useUpdatePolicy();
    const deleteMutation = useDeletePolicy();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body = {
            applicationId: formData.applicationId,
            groupIds: isGlobalPolicy ? [] : formData.groupIds,
            action: formData.action,
            priority: formData.priority,
        };
        try {
            if (editingPolicy) { await updateMutation.mutateAsync({ id: editingPolicy.id, data: body }); }
            else { await createMutation.mutateAsync(body); }
            setShowModal(false); resetForm();
        } catch (err: any) { alert(err.message || 'Failed to save policy'); }
    };

    const handleDelete = (id: string) => { setPolicyToDelete(id); setShowConfirmModal(true); };
    const confirmDelete = async () => {
        if (!policyToDelete) return;
        try { await deleteMutation.mutateAsync(policyToDelete); setShowConfirmModal(false); setPolicyToDelete(null); }
        catch (err: any) { alert(err.message || 'Failed to delete policy'); }
    };

    const handleEdit = (policy: any) => {
        setEditingPolicy(policy);
        const policyGroupIds = policy.policyGroups?.map((pg: any) => pg.groupId) || [];
        setFormData({ groupIds: policyGroupIds, applicationId: policy.applicationId, action: policy.action, priority: policy.priority });
        setIsGlobalPolicy(policyGroupIds.length === 0);
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingPolicy(null);
        setFormData({ groupIds: [], applicationId: '', action: 'ALLOW', priority: 10 });
        setIsGlobalPolicy(false);
    };

    const handleSort = (field: string) => {
        if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
        else { setSortBy(field); setSortOrder('asc'); }
    };

    const toggleGroupSelection = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
                ? prev.groupIds.filter(id => id !== groupId)
                : [...prev.groupIds, groupId]
        }));
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-full pl-[21px] pr-[24px] py-[24px] gap-[20px]">

                {/* Page header */}
                <div className="flex justify-between items-center bg-white border border-[#D4C8FF]/50 px-[25px] py-[32px]">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[24px] font-semibold text-[#1E1B39] tracking-tight leading-[30px]">Policies</h1>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Configure access control policies</p>
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
                            + Add Policy
                        </button>
                    )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 border border-[#D4C8FF]/50">
                    <div className="flex-1 relative">
                        <select
                            value={appFilter}
                            onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                        >
                            <option value="">All Applications</option>
                            {applications.map((app: any) => (
                                <option key={app.id} value={app.id}>{app.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                    <div className="flex-1 relative">
                        <select
                            value={groupFilter}
                            onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                        >
                            <option value="">All Groups</option>
                            {groups.map((group: any) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                    <div className="w-full sm:w-48 relative">
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] text-[14px] focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                        >
                            {ACTIONS.map((action) => (
                                <option key={action.value} value={action.value}>{action.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#D4C8FF]/50 min-h-[400px]">
                    {isLoadingPolicies ? (
                        <div className="p-8 text-center text-[#A5AEB7]">Loading policies...</div>
                    ) : policiesError ? (
                        <div className="p-8 text-center text-red-400">Error: {policiesError.message}</div>
                    ) : policies.length === 0 ? (
                        <div className="p-8 text-center text-[#A5AEB7]">No policies found matching your criteria</div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead style={{ backgroundColor: '#F6F0FF' }}>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Application</th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Groups</th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39]">Action</th>
                                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#1E1B39] cursor-pointer hover:text-[#6466FF]" onClick={() => handleSort('priority')}>
                                            Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        {(canEdit || canModify) && (
                                            <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#1E1B39]">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D4C8FF]/30">
                                    {policies.map((policy: any) => (
                                        <tr key={policy.id} className="bg-white hover:bg-[#FAF7FF]">
                                            <td className="px-6 py-4">
                                                <div className="text-[14px] font-medium text-[#1E1B39]">{policy.application?.name || 'Unknown'}</div>
                                                <div className="text-[12px] text-[#A5AEB7]">{policy.application?.domain}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {policy.policyGroups?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {policy.policyGroups.map((pg: any) => (
                                                            <span key={pg.id} className="px-2 py-1 text-[11px] font-semibold bg-[#EDE8FF] text-[#6466FF] uppercase tracking-wide">
                                                                {pg.group.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-[#A5AEB7] italic">All Users</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getActionBadge(policy.action)}`}>
                                                    {policy.action.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[14px] font-medium text-[#1E1B39]">{policy.priority}</span>
                                            </td>
                                            {(canEdit || canModify) && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEdit(policy)}
                                                                className="text-[#1E1B39] hover:text-[#6466FF] transition-colors cursor-pointer"
                                                                disabled={updateMutation.isPending}
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-[16px] h-[16px]" />
                                                            </button>
                                                        )}
                                                        {canModify && (
                                                            <button
                                                                onClick={() => handleDelete(policy.id)}
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

            {/* Add / Edit Policy Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
                    <div className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => { setShowModal(false); resetForm(); }} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                            <X className="w-[24px] h-[24px]" />
                        </button>
                        {/* Header */}
                        <div className="px-[25px] pt-[24px]">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">{editingPolicy ? 'Edit Policy' : 'Add Policy'}</h2>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">
                                {editingPolicy ? 'Update access control settings.' : 'Define a new access control rule.'}
                            </p>
                            <div className="border-b border-[#D4C8FF] mt-[12px]" />
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                            <div className="px-[25px] pt-[24px] space-y-[18px] flex-1">

                                {/* Application */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Application</label>
                                    <div className="relative">
                                        <select
                                            value={formData.applicationId}
                                            onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                                            required disabled={!!editingPolicy}
                                        >
                                            <option value="">Select an application</option>
                                            {applications.map((app: any) => (
                                                <option key={app.id} value={app.id}>{app.name} ({app.domain})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                                    </div>
                                </div>

                                {/* Global toggle */}
                                <div className="flex items-center gap-[10px]">
                                    <input
                                        type="checkbox"
                                        id="globalPolicy"
                                        checked={isGlobalPolicy}
                                        onChange={(e) => { setIsGlobalPolicy(e.target.checked); if (e.target.checked) setFormData({ ...formData, groupIds: [] }); }}
                                        className="w-[16px] h-[16px] border-[#D4C8FF] accent-[#6466FF]"
                                    />
                                    <label htmlFor="globalPolicy" className="text-[13px] text-[#615E83] cursor-pointer">Apply to All Users (Global Policy)</label>
                                </div>

                                {/* Groups */}
                                {!isGlobalPolicy && (
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Select Groups</label>
                                        <div className="border border-[#D4C8FF]/50 p-3 max-h-48 overflow-y-auto bg-white">
                                            {groups.length === 0 ? (
                                                <p className="text-[13px] text-[#A5AEB7] p-2">No groups available</p>
                                            ) : (
                                                groups.map((group: any) => (
                                                    <label key={group.id} className="flex items-center py-2 hover:bg-[#FAF7FF] cursor-pointer px-2 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.groupIds.includes(group.id)}
                                                            onChange={() => toggleGroupSelection(group.id)}
                                                            className="mr-3 w-4 h-4 border-[#D4C8FF] accent-[#6466FF]"
                                                        />
                                                        <span className="text-[14px] text-[#1E1B39]">{group.name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#A5AEB7] mt-2">Select one or more groups, or check "Apply to All Users" for a global policy</p>
                                    </div>
                                )}

                                {/* Action */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Action</label>
                                    <div className="relative">
                                        <select
                                            value={formData.action}
                                            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                            className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer"
                                            required
                                        >
                                            {ACTIONS.filter(a => a.value !== 'ALL').map((action) => (
                                                <option key={action.value} value={action.value}>{action.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                                    </div>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Priority</label>
                                    <input
                                        type="number"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF]"
                                        min="0" max="100" required
                                    />
                                    <p className="text-[12px] text-[#A5AEB7] mt-2">Higher priority policies are evaluated first</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-[25px] pb-[24px] pt-[20px] flex items-center gap-[20px]">
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                                    className="h-[48px] px-[26px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer">
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                                    className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Delete Policy"
                message="Are you sure you want to delete this policy? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => { setShowConfirmModal(false); setPolicyToDelete(null); }}
                isLoading={deleteMutation.isPending}
                variant="danger"
            />
        </ProtectedRoute>
    );
}
