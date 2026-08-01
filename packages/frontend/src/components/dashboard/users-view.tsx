'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import ConfirmModal from '@/components/confirm-modal';
import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useDeleteUsers,
} from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/contexts/auth-context';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';
import { Users, Search, ChevronDown, X, Check, AlertCircle } from 'lucide-react';

const ROLES = ['ALL', 'ADMIN', 'ANALYST', 'VIEWER'];

const labelClass = 'block text-[13px] text-[#A5AEB7] font-semibold mb-[6px]';
const inputClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF]';
const selectClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer';

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';

    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        role: 'VIEWER',
        isActive: true,
    });

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Filtering & Pagination State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('ALL');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Debounce search
    const debouncedSearch = useDebounce(search, 500);

    // React Query hooks
    const { data, isLoading, error } = useUsers({
        page,
        limit: 10,
        role: role === 'ALL' ? undefined : role,
        excludeRole: 'USER',
        search: debouncedSearch,
        sortBy,
        sortOrder,
    });

    const users = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();
    const deleteBatchMutation = useDeleteUsers();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelectAll = () => {
        if (selectedIds.length === users.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(users.map((u: any) => u.id));
        }
    };

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} users?`)) return;
        try {
            await deleteBatchMutation.mutateAsync(selectedIds);
            setSelectedIds([]);
        } catch (err: any) {
            alert(err.message || 'Failed to delete users');
        }
    };

    const isPasswordValid = (pw: string) =>
        pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const needsPassword = !editingUser || formData.password.length > 0;
        if (needsPassword && !isPasswordValid(formData.password)) {
            alert('Password does not meet the security policy. Check the requirements below the password field.');
            return;
        }

        const body: any = {
            role: formData.role,
        };

        if (editingUser) {
            body.identifier = formData.identifier;
            body.isActive = formData.isActive;
            if (formData.password) {
                body.password = formData.password;
            }
        } else {
            body.identifier = formData.identifier;
            body.password = formData.password;
        }

        try {
            if (editingUser) {
                await updateMutation.mutateAsync({ id: editingUser.id, data: body });
            } else {
                await createMutation.mutateAsync(body);
            }
            setShowModal(false);
            resetForm();
        } catch (err: any) {
            alert(err.message || 'Failed to save user');
        }
    };

    const handleDelete = (id: string) => {
        setUserToDelete(id);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await deleteMutation.mutateAsync(userToDelete);
            setShowConfirmModal(false);
            setUserToDelete(null);
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const cancelDelete = () => {
        setShowConfirmModal(false);
        setUserToDelete(null);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setFormData({
            identifier: user.identifier,
            password: '',
            role: user.role,
            isActive: user.isActive,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({
            identifier: '',
            password: '',
            role: 'VIEWER',
            isActive: true,
        });
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getRoleBadgeStyle = (role: string): { bg: string; color: string } => {
        switch (role) {
            case 'ADMIN': return { bg: 'rgba(139, 92, 246, 0.13)', color: '#8B5CF6' };
            case 'ANALYST': return { bg: 'rgba(100, 102, 255, 0.13)', color: '#6466FF' };
            case 'VIEWER': return { bg: 'rgba(59, 130, 246, 0.13)', color: '#3B82F6' };
            case 'USER': return { bg: 'rgba(37, 198, 136, 0.13)', color: '#25C688' };
            default: return { bg: 'rgba(165, 174, 183, 0.2)', color: '#A5AEB7' };
        }
    };

    const formatRoleName = (role: string) => {
        if (role === 'ITADMIN') return 'Analyst (Old)';
        if (role === 'ANALYST') return 'Analyst';
        return role.charAt(0) + role.slice(1).toLowerCase();
    };

    return (
        <ProtectedRoute>
            <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                {/* Header */}
                <div className="flex justify-between items-center mb-[24px]">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-[16px] font-semibold text-[#1E1B39]">Users</h2>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px]">Manage user accounts and permissions</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="bg-[#6466FF] text-white hover:bg-[#5557E0] h-[48px] px-[24px] flex items-center gap-[6px] text-[14px] font-medium transition-colors cursor-pointer"
                        >
                            + Add User
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="px-[0px] py-[20px]">
                    <div className="flex flex-col sm:flex-row gap-[16px]">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by identifier..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className={inputClass}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => { setRole(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : formatRoleName(r)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="border border-[#D4C8FF]/50 min-h-[300px]">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={10} columns={5} /></div>
                    ) : error ? (
                        <div className="p-8 text-center text-[#E22D54]">Error: {error.message}</div>
                    ) : users.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                title="No users found"
                                description="No users match your current filters. Add a new user or adjust filters."
                                actionLabel={isAdmin ? "+ Add User" : undefined}
                                onAction={isAdmin ? () => { resetForm(); setShowModal(true); } : undefined}
                                icon={<Users className="h-10 w-10 text-[#A5AEB7]" />}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead style={{ backgroundColor: 'rgba(212, 200, 255, 0.3)' }}>
                                        <tr>
                                            {isAdmin && (
                                                <th className="px-6 py-4 w-4">
                                                    <input
                                                        type="checkbox"
                                                        onChange={toggleSelectAll}
                                                        checked={users.length > 0 && selectedIds.length === users.length}
                                                        className="border-[#D4C8FF]/50 text-[#6466FF] focus:ring-[#6466FF] bg-white cursor-pointer accent-[#6466FF]"
                                                    />
                                                </th>
                                            )}
                                            <th
                                                className="px-6 py-4 text-[14px] font-medium text-[#1E1B39] cursor-pointer hover:text-[#6466FF] transition-colors"
                                                onClick={() => handleSort('identifier')}
                                            >
                                                Identifier / Email {sortBy === 'identifier' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Role</th>
                                            <th className="px-6 py-4 text-[14px] font-medium text-[#1E1B39]">Status</th>
                                            {isAdmin && <th className="px-6 py-4 text-right text-[14px] font-medium text-[#1E1B39]">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D4C8FF]/30">
                                        {users.map((user: any) => {
                                            const roleStyle = getRoleBadgeStyle(user.role);
                                            return (
                                                <tr key={user.id} className={`hover:bg-[#F6F0FF] transition-colors ${selectedIds.includes(user.id) ? 'bg-[#6466FF]/5' : 'bg-white'}`}>
                                                    {isAdmin && (
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(user.id)}
                                                                onChange={() => toggleSelectOne(user.id)}
                                                                className="border-[#D4C8FF]/50 text-[#6466FF] focus:ring-[#6466FF] bg-white cursor-pointer accent-[#6466FF]"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4">
                                                        <div className="text-[14px] font-medium text-[#1E1B39]">{user.identifier}</div>
                                                        <div className="text-[13px] text-[#A5AEB7] mt-0.5 leading-[22px]">ID: {user.id.slice(0, 8)}...</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide"
                                                            style={{
                                                                backgroundColor: roleStyle.bg,
                                                                color: roleStyle.color,
                                                                borderRadius: '45px',
                                                                lineHeight: '13px',
                                                            }}
                                                        >
                                                            {formatRoleName(user.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {user.isActive ? (
                                                            <span className="px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)', color: '#25C688', borderRadius: '45px', lineHeight: '13px' }}>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(165, 174, 183, 0.2)', color: '#A5AEB7', borderRadius: '45px', lineHeight: '13px' }}>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleEdit(user)}
                                                                className="text-[#6466FF] hover:text-[#5557E0] transition-colors mr-4 cursor-pointer font-medium text-[13px]"
                                                                disabled={updateMutation.isPending}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="text-[#E22D54] hover:text-[#E22D54]/80 transition-colors cursor-pointer font-medium text-[13px]"
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                {deleteMutation.isPending ? '...' : 'Delete'}
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
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

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border border-[#D4C8FF]/50 p-[32px] w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="absolute top-[24px] right-[24px] text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-[20px] font-semibold text-[#1E1B39] mb-[24px]">{editingUser ? 'Edit User' : 'Add User'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-[16px]">
                            <div>
                                <label className={labelClass}>Identifier / Email</label>
                                <input
                                    type="text"
                                    value={formData.identifier}
                                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                    className={inputClass}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Password {editingUser && <span className="text-[#A5AEB7] font-normal">(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={inputClass}
                                    placeholder="••••••••"
                                    required={!editingUser}
                                    minLength={12}
                                />
                                {(formData.password.length > 0 || (!editingUser && formData.password.length === 0)) && (
                                    <div className="mt-[8px] space-y-[4px]">
                                        {[
                                            { label: 'At least 12 characters', valid: formData.password.length >= 12 },
                                            { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(formData.password) },
                                            { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(formData.password) },
                                            { label: 'One number (0-9)', valid: /[0-9]/.test(formData.password) },
                                        ].map((rule) => (
                                            <div key={rule.label} className="flex items-center gap-[6px]">
                                                {formData.password.length === 0 ? (
                                                    <AlertCircle className="w-[14px] h-[14px] text-[#A5AEB7]" />
                                                ) : rule.valid ? (
                                                    <Check className="w-[14px] h-[14px] text-[#25C688]" />
                                                ) : (
                                                    <X className="w-[14px] h-[14px] text-[#E22D54]" />
                                                )}
                                                <span className={`text-[12px] ${
                                                    formData.password.length === 0
                                                        ? 'text-[#A5AEB7]'
                                                        : rule.valid ? 'text-[#25C688]' : 'text-[#E22D54]'
                                                }`}>
                                                    {rule.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Role</label>
                                <div className="relative">
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className={selectClass}
                                        required
                                    >
                                        {ROLES.filter(r => r !== 'ALL').map((role) => (
                                            <option key={role} value={role}>{formatRoleName(role)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                                </div>
                            </div>
                            {editingUser && (
                                <div className="flex items-center pt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="mr-2 border-[#D4C8FF]/50 text-[#6466FF] focus:ring-[#6466FF] accent-[#6466FF]"
                                    />
                                    <label htmlFor="isActive" className="text-[14px] text-[#1E1B39] cursor-pointer">Active User</label>
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 mt-[24px] pt-[20px] border-t border-[#D4C8FF]/50">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="h-[36px] px-[16px] text-[14px] font-medium border border-[#D4C8FF]/50 text-[#1E1B39] hover:bg-[#F6F0FF] transition-colors cursor-pointer"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-[36px] px-[16px] text-[14px] font-medium bg-[#6466FF] hover:bg-[#5557E0] text-white transition-colors disabled:opacity-50 cursor-pointer"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Saving...'
                                        : editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                isLoading={deleteMutation.isPending}
                variant="danger"
            />

            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-[#D4C8FF]/50 text-[#1E1B39] px-6 py-3 flex items-center space-x-4 z-50" style={{ borderRadius: '45px' }}>
                    <span className="text-[14px] font-medium">{selectedIds.length} selected</span>
                    <button
                        onClick={handleBulkDelete}
                        className="bg-[#E22D54] hover:bg-[#C9244A] text-white text-[12px] font-bold py-2.5 px-5 uppercase tracking-wider transition-colors cursor-pointer" style={{ borderRadius: '45px' }}
                        disabled={deleteBatchMutation.isPending}
                    >
                        {deleteBatchMutation.isPending ? 'Deleting...' : 'Delete Selected'}
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        className="text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer text-[14px]"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </ProtectedRoute>
    );
}
