'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import IntegrationModal from '@/components/integrations/IntegrationModal';
import { useIntegrations, useDeleteIntegration, useUpdateIntegration } from '@/hooks/use-integrations';
import { Integration } from '@/types';

export default function IntegrationsList() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | undefined>(undefined);

    const { data: integrations, isLoading } = useIntegrations();
    const deleteIntegration = useDeleteIntegration();
    const updateIntegration = useUpdateIntegration();

    const handleEdit = (integration: Integration) => {
        setSelectedIntegration(integration);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this integration?')) {
            await deleteIntegration.mutateAsync(id);
        }
    };

    const handleToggleActive = async (integration: Integration) => {
        await updateIntegration.mutateAsync({
            id: integration.id,
            data: { isActive: !integration.isActive }
        });
    };

    const handleCloseModal = () => {
        setSelectedIntegration(undefined);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-[20px]">
            <div className="bg-white border border-[#D4C8FF]/50 p-[32px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[24px] gap-4">
                    <div>
                        <h2 className="text-[16px] font-semibold text-[#1E1B39] mb-[8px]">External Integrations</h2>
                        <p className="text-[14px] text-[#A5AEB7] leading-relaxed">
                            Configure external log destinations (SIEM, Syslog) for enterprise compliance.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#6466FF] hover:bg-[#5557E0] text-white h-[48px] px-[24px] text-[14px] font-medium flex items-center transition-colors cursor-pointer whitespace-nowrap"
                    >
                        <Plus size={18} className="mr-2" /> Add Integration
                    </button>
                </div>

                <div className="border border-[#D4C8FF]/50 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-[#A5AEB7]">Loading integrations...</div>
                    ) : integrations?.data?.length === 0 ? (
                        <div className="p-16 text-center">
                            <h3 className="text-[16px] font-medium text-[#1E1B39] mb-[8px]">No integrations configured</h3>
                            <p className="text-[14px] text-[#A5AEB7] mb-[20px]">Connect Onefend to your SIEM (Splunk, Datadog) or Syslog server.</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-[#6466FF] hover:text-[#5557E0] hover:underline text-[14px] font-medium transition-colors cursor-pointer"
                            >
                                Setup your first integration
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left text-[14px]">
                            <thead style={{ backgroundColor: 'rgba(212, 200, 255, 0.3)' }}>
                                <tr>
                                    <th className="px-6 py-4 font-medium text-[#1E1B39]">Name</th>
                                    <th className="px-6 py-4 font-medium text-[#1E1B39]">Type</th>
                                    <th className="px-6 py-4 font-medium text-[#1E1B39]">Config</th>
                                    <th className="px-6 py-4 font-medium text-[#1E1B39]">Status</th>
                                    <th className="px-6 py-4 font-medium text-[#1E1B39] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D4C8FF]/30 bg-white">
                                {integrations?.data?.map((integration: any) => (
                                    <tr key={integration.id} className="hover:bg-[#F6F0FF] transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#1E1B39]">{integration.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(100, 102, 255, 0.13)', color: '#6466FF', borderRadius: '45px', lineHeight: '13px' }}>
                                                {integration.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[#A5AEB7]">
                                            {integration.type === 'WEBHOOK' ? (
                                                <span className="truncate max-w-[200px] block" title={integration.config?.url || integration.webhookUrl}>
                                                    {integration.config?.url || integration.webhookUrl}
                                                </span>
                                            ) : (
                                                <span>{integration.config?.host}:{integration.config?.port} ({integration.config?.protocol})</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(integration)}
                                                className="cursor-pointer"
                                            >
                                                {integration.isActive ? (
                                                    <span className="flex items-center gap-[4px] px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(37, 198, 136, 0.13)', color: '#25C688', borderRadius: '45px', lineHeight: '13px' }}>
                                                        <CheckCircle size={12} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-[4px] px-[13px] py-[2px] text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(165, 174, 183, 0.2)', color: '#A5AEB7', borderRadius: '45px', lineHeight: '13px' }}>
                                                        <XCircle size={12} /> Disabled
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-3 items-center">
                                                <button
                                                    onClick={() => handleEdit(integration)}
                                                    className="text-[#A5AEB7] hover:text-[#6466FF] transition-colors p-1.5 hover:bg-[#6466FF]/10 cursor-pointer"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(integration.id)}
                                                    className="text-[#A5AEB7] hover:text-[#E22D54] transition-colors p-1.5 hover:bg-[#E22D54]/10 cursor-pointer"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <IntegrationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                integration={selectedIntegration}
            />
        </div>
    );
}
