'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import ConfirmModal from '@/components/confirm-modal';
import {
    useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup,
    useGroupMembers, useAddGroupMember, useRemoveGroupMember, useUsers, useGroup
} from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/contexts/auth-context';
import { Pencil, Trash2, Search, X } from 'lucide-react';

export default function GroupsPage() {
    const { user } = useAuth();
    const canModify = user?.role === 'ADMIN';
    const canEdit = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showPoliciesModal, setShowPoliciesModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToRemove, setUserToRemove] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const { data: groups = [], isLoading, error } = useGroups();
    const { data: members = [] } = useGroupMembers(selectedGroup?.id || '');
    const { data: searchResults } = useUsers({ search: debouncedSearchTerm, limit: 20, isActive: true, role: 'USER' });
    const { data: groupDetails } = useGroup(selectedGroup?.id || '');

    const createMutation = useCreateGroup();
    const updateMutation = useUpdateGroup();
    const deleteMutation = useDeleteGroup();
    const addMemberMutation = useAddGroupMember();
    const removeMemberMutation = useRemoveGroupMember();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGroup) { await updateMutation.mutateAsync({ id: editingGroup.id, data: formData }); }
            else { await createMutation.mutateAsync(formData); }
            setShowModal(false); resetForm();
        } catch (err: any) { alert(err.message || 'Failed to save group'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return;
        try { await deleteMutation.mutateAsync(id); }
        catch (err: any) { alert(err.message || 'Failed to delete group'); }
    };

    const handleEdit = (group: any) => {
        setEditingGroup(group);
        setFormData({ name: group.name, description: group.description || '' });
        setShowModal(true);
    };

    const resetForm = () => { setEditingGroup(null); setFormData({ name: '', description: '' }); };

    const handleManageMembers = (group: any) => { setSelectedGroup(group); setSearchTerm(''); setShowMembersModal(true); };
    const handleViewPolicies = (group: any) => { setSelectedGroup(group); setShowPoliciesModal(true); };

    const handleAddMember = async (userId: string) => {
        if (!selectedGroup) return;
        try { await addMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId }); setSearchTerm(''); }
        catch (err: any) { alert(err.message || 'Failed to add member'); }
    };

    const handleRemoveMember = (userId: string) => { setUserToRemove(userId); setShowConfirmModal(true); };

    const confirmRemoveMember = async () => {
        if (!selectedGroup || !userToRemove) return;
        try { await removeMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId: userToRemove }); setShowConfirmModal(false); setUserToRemove(null); }
        catch (err: any) { alert(err.message || 'Failed to remove member'); }
    };

    const isMember = (userId: string) => members.some((m: any) => m.userId === userId);
    const foundUsers = searchResults?.data?.filter((u: any) => !isMember(u.id)) || [];
    const memberUsers = members.map((m: any) => m.user).filter(Boolean);

    if (isLoading) return <ProtectedRoute><div className="flex items-center justify-center h-64 text-[#A5AEB7]">Loading groups...</div></ProtectedRoute>;
    if (error) return <ProtectedRoute><div className="flex items-center justify-center h-64 text-red-400">Error loading groups: {error.message}</div></ProtectedRoute>;

    // Shared modal overlay + panel styles
    const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50";
    const panel = "bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col";

    return (
        <ProtectedRoute>
            <div className="space-y-4">
                {/* Sub-header */}
                <div className="flex justify-between items-center pt-2">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[18px] font-semibold text-[#1E1B39] tracking-tight">Groups</h2>
                        <p className="text-[13px] text-[#A5AEB7]">Manage user groups and teams</p>
                    </div>
                    {canModify && (
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="bg-[#6466FF] text-white hover:bg-[#5558EE] px-[16px] py-[10px] text-[14px] font-medium transition-colors cursor-pointer"
                        >
                            + Add Group
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white border border-[#D4C8FF]/50 min-h-[300px]">
                    {groups.length === 0 ? (
                        <div className="p-8 text-center text-[#A5AEB7]">No groups found</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead style={{ backgroundColor: '#F6F0FF' }}>
                                <tr>
                                    <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Name</th>
                                    <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Description</th>
                                    <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Members</th>
                                    {(canEdit || canModify) && (
                                        <th className="px-6 py-3 text-right text-[13px] font-semibold text-[#1E1B39]">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D4C8FF]/30">
                                {(groups as any[]).map((group: any) => (
                                    <tr key={group.id} className="bg-white hover:bg-[#FAF7FF] transition-colors">
                                        <td className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">{group.name}</td>
                                        <td className="px-6 py-4 text-[14px] text-[#615E83]">{group.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-[11px] font-semibold bg-[#EDE8FF] text-[#6466FF] uppercase tracking-wide">
                                                {group._count?.members || 0} members
                                            </span>
                                        </td>
                                        {(canEdit || canModify) && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => handleViewPolicies(group)}
                                                        className="text-[#6466FF] hover:text-[#5557E0] font-medium text-[13px] transition-colors cursor-pointer">
                                                        View Policies
                                                    </button>
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={() => handleManageMembers(group)}
                                                                className="text-[#1E1B39] hover:text-[#6466FF] font-medium text-[13px] transition-colors cursor-pointer">
                                                                Members
                                                            </button>
                                                            <button onClick={() => handleEdit(group)} disabled={updateMutation.isPending}
                                                                className="text-[#1E1B39] hover:text-[#6466FF] transition-colors cursor-pointer" title="Edit">
                                                                <Pencil className="w-[16px] h-[16px]" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {canModify && (
                                                        <button onClick={() => handleDelete(group.id)} disabled={deleteMutation.isPending}
                                                            className="text-[#EF4444] hover:text-[#DC2626] transition-colors cursor-pointer" title="Delete">
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
                    )}
                </div>
            </div>

            {/* Create/Edit Group Modal */}
            {showModal && (
                <div className={overlay}>
                    <div className={panel} style={{ width: 418 }}>
                        <button onClick={() => { setShowModal(false); resetForm(); }} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                            <X className="w-[24px] h-[24px]" />
                        </button>
                        <div className="px-[25px] pt-[24px]">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">{editingGroup ? 'Edit Group' : 'Add Group'}</h2>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">
                                {editingGroup ? 'Update group details.' : 'Create a new user group.'}
                            </p>
                            <div className="border-b border-[#D4C8FF] mt-[12px]" />
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                            <div className="px-[25px] pt-[24px] space-y-[18px] flex-1">
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Name</label>
                                    <input type="text" value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                        placeholder="Engineering Team" required />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Description</label>
                                    <textarea value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-[12px] py-[8px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7] min-h-[80px]"
                                        placeholder="Group description..." rows={3} />
                                </div>
                            </div>
                            <div className="px-[25px] pb-[24px] pt-[20px] flex items-center gap-[20px]">
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                                    className="h-[48px] px-[26px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer">
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingGroup ? 'Update' : 'Create'}
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

            {/* Manage Members Modal */}
            {showMembersModal && selectedGroup && (
                <div className={overlay}>
                    <div className={`${panel} max-h-[85vh]`} style={{ width: 560 }}>
                        <button onClick={() => setShowMembersModal(false)} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                            <X className="w-[24px] h-[24px]" />
                        </button>
                        <div className="px-[25px] pt-[24px] flex-shrink-0">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Manage Members</h2>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">{selectedGroup.name}</p>
                            <div className="border-b border-[#D4C8FF] mt-[12px]" />
                        </div>

                        <div className="px-[25px] pt-[20px] pb-[24px] flex-1 overflow-y-auto">
                            {/* Current Members */}
                            <div className="mb-6">
                                <h3 className="text-[13px] font-semibold text-[#A5AEB7] uppercase tracking-wide mb-3">Current Members ({memberUsers.length})</h3>
                                {memberUsers.length === 0 ? (
                                    <p className="text-[14px] text-[#A5AEB7]">No members yet. Add some below.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {memberUsers.map((u: any) => (
                                            <div key={u.id} className="flex items-center justify-between bg-[#F6F0FF] p-3 border border-[#D4C8FF]/50">
                                                <div>
                                                    <div className="text-[14px] font-medium text-[#1E1B39]">{u.identifier}</div>
                                                    <div className="text-[12px] text-[#A5AEB7] capitalize mt-0.5">{u.role?.toLowerCase()}</div>
                                                </div>
                                                {canEdit && (
                                                    <button onClick={() => handleRemoveMember(u.id)} disabled={removeMemberMutation.isPending}
                                                        className="text-[#EF4444] hover:text-[#DC2626] text-[13px] font-medium cursor-pointer transition-colors">
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Members */}
                            {canEdit && (
                                <div>
                                    <h3 className="text-[13px] font-semibold text-[#A5AEB7] uppercase tracking-wide mb-3">Add Members</h3>
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5AEB7] pointer-events-none" />
                                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]"
                                            placeholder="Type to search users..." />
                                    </div>
                                    {foundUsers.length === 0 ? (
                                        <p className="text-[14px] text-[#A5AEB7] text-center py-4">
                                            {debouncedSearchTerm ? `No users found matching "${debouncedSearchTerm}"` : 'No available users to add'}
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {foundUsers.map((u: any) => (
                                                <div key={u.id} className="flex items-center justify-between bg-white p-3 border border-[#D4C8FF]/50">
                                                    <div>
                                                        <div className="text-[14px] font-medium text-[#1E1B39]">{u.identifier}</div>
                                                        <div className="text-[12px] text-[#A5AEB7] capitalize mt-0.5">{u.role?.toLowerCase()}</div>
                                                    </div>
                                                    <button onClick={() => handleAddMember(u.id)} disabled={addMemberMutation.isPending}
                                                        className="text-[#6466FF] hover:text-[#5557E0] text-[13px] font-medium cursor-pointer px-3 py-1 border border-[#6466FF] hover:bg-[#6466FF]/5 transition-colors">
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-[25px] pb-[20px] flex-shrink-0 border-t border-[#D4C8FF] pt-[16px]">
                            <button onClick={() => setShowMembersModal(false)}
                                className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Policies Modal */}
            {showPoliciesModal && groupDetails && (
                <div className={overlay}>
                    <div className={`${panel} max-h-[85vh]`} style={{ width: 600 }}>
                        <button onClick={() => setShowPoliciesModal(false)} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                            <X className="w-[24px] h-[24px]" />
                        </button>
                        <div className="px-[25px] pt-[24px] flex-shrink-0">
                            <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Active Policies</h2>
                            <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">{groupDetails.name}</p>
                            <div className="border-b border-[#D4C8FF] mt-[12px]" />
                        </div>

                        <div className="px-[25px] pt-[20px] pb-[24px] flex-1 overflow-y-auto">
                            {!groupDetails.policyAssignments?.length ? (
                                <div className="p-8 text-center bg-[#F6F0FF] border border-[#D4C8FF]/50">
                                    <span className="text-[14px] font-medium block text-[#615E83]">No policies assigned</span>
                                    <span className="text-[13px] mt-1 block text-[#A5AEB7]">Assignments are inherited based on groups or direct associations.</span>
                                </div>
                            ) : (
                                <div className="border border-[#D4C8FF]/50">
                                    <table className="w-full text-left">
                                        <thead style={{ backgroundColor: '#F6F0FF' }}>
                                            <tr>
                                                <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Application</th>
                                                <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Action</th>
                                                <th className="px-6 py-3 text-[13px] font-semibold text-[#1E1B39]">Priority</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#D4C8FF]/30 bg-white">
                                            {groupDetails.policyAssignments.map((assignment: any) => (
                                                <tr key={assignment.id} className="hover:bg-[#FAF7FF]">
                                                    <td className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">
                                                        {assignment.policy.application.name || assignment.policy.application.domain}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                                            assignment.policy.action === 'BLOCK' ? 'bg-red-100 text-red-600' :
                                                            assignment.policy.action === 'WARN' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                            {assignment.policy.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] text-[#615E83]">{assignment.policy.priority}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="px-[25px] pb-[20px] flex-shrink-0 border-t border-[#D4C8FF] pt-[16px]">
                            <button onClick={() => setShowPoliciesModal(false)}
                                className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Remove Member"
                message="Are you sure you want to remove this user from the group?"
                confirmText="Remove"
                cancelText="Cancel"
                onConfirm={confirmRemoveMember}
                onCancel={() => { setShowConfirmModal(false); setUserToRemove(null); }}
                isLoading={removeMemberMutation.isPending}
                variant="warning"
            />
        </ProtectedRoute>
    );
}
