'use client';

import { useState, useEffect } from 'react';
import { useCreateIntegration, useUpdateIntegration } from '@/hooks/use-integrations';
import { Integration } from '@/types';
import { X, ChevronDown } from 'lucide-react';

interface IntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration?: Integration;
}

const labelClass = 'block text-[13px] text-[#A5AEB7] font-semibold mb-[6px]';
const inputClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF]';
const selectClass = 'w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer';

export default function IntegrationModal({ isOpen, onClose, integration }: IntegrationModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState('SYSLOG');
    const [syslogHost, setSyslogHost] = useState('');
    const [syslogPort, setSyslogPort] = useState(514);
    const [syslogProtocol, setSyslogProtocol] = useState('TCP');

    const createIntegration = useCreateIntegration();
    const updateIntegration = useUpdateIntegration();

    useEffect(() => {
        if (integration) {
            setName(integration.name);
            setType(integration.type);

            // Extract config
            const config = integration.config || {};
            setSyslogHost(config.host || '');
            setSyslogPort(config.port || 514);
            setSyslogProtocol(config.protocol || 'TCP');
        } else {
            // Reset
            setName('');
            setType('SYSLOG');
            setSyslogHost('');
            setSyslogPort(514);
            setSyslogProtocol('TCP');
        }
    }, [integration, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const config = {
            host: syslogHost,
            port: Number(syslogPort),
            protocol: syslogProtocol
        };

        const payload = {
            name,
            type,
            config,
            isActive: true,
        };

        try {
            if (integration) {
                await updateIntegration.mutateAsync({ id: integration.id, data: payload });
            } else {
                await createIntegration.mutateAsync(payload);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save integration');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white border border-[#D4C8FF]/50 w-full max-w-lg p-[32px] relative">
                <button
                    onClick={onClose}
                    className="absolute top-[24px] right-[24px] text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer"
                >
                    <X size={20} />
                </button>

                <h2 className="text-[20px] font-semibold text-[#1E1B39] mb-[24px]">
                    {integration ? 'Edit Syslog Integration' : 'New Syslog Integration'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-[16px]">
                    <div>
                        <label className={labelClass}>Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Corporate Splunk"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-[16px]">
                        <div className="col-span-2">
                            <label className={labelClass}>Host / IP</label>
                            <input
                                type="text"
                                required
                                value={syslogHost}
                                onChange={(e) => setSyslogHost(e.target.value)}
                                className={inputClass}
                                placeholder="192.168.1.50"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Port</label>
                            <input
                                type="number"
                                required
                                value={syslogPort}
                                onChange={(e) => setSyslogPort(Number(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Protocol</label>
                            <div className="relative">
                                <select
                                    value={syslogProtocol}
                                    onChange={(e) => setSyslogProtocol(e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="TCP">TCP (Unencrypted)</option>
                                    <option value="TLS">TLS (Secure)</option>
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-[24px] pt-[20px] border-t border-[#D4C8FF]/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-[36px] px-[16px] text-[14px] font-medium border border-[#D4C8FF]/50 text-[#1E1B39] hover:bg-[#F6F0FF] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="h-[36px] px-[16px] text-[14px] font-medium bg-[#6466FF] text-white hover:bg-[#5557E0] transition-colors cursor-pointer"
                        >
                            Save Integration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
