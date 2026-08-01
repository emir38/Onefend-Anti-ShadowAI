import { useState } from 'react';
import { useAlerts, useCreateAlert, useDeleteAlert } from '@/hooks/use-api';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface AlertsConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AlertsConfigModal({ isOpen, onClose }: AlertsConfigModalProps) {
    const { data: alerts, isLoading } = useAlerts();
    const { mutate: createAlert } = useCreateAlert();
    const { mutate: deleteAlert } = useDeleteAlert();

    const [isCreating, setIsCreating] = useState(false);
    const [newAlert, setNewAlert] = useState({
        name: '',
        triggerType: 'HIGH_RISK_EVENT',
        threshold: 1,
        channel: 'EMAIL',
        destination: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createAlert(newAlert, {
            onSuccess: () => {
                setIsCreating(false);
                setNewAlert({ name: '', triggerType: 'HIGH_RISK_EVENT', threshold: 1, channel: 'EMAIL', destination: '' });
            }
        });
    };

    // ── Alert Config list view (Figma: 418 × 387) ──
    if (!isCreating) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
                <div
                    className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col"
                    style={{ width: 418, minHeight: 387 }}
                >
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-[21px] right-[18px] text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer"
                    >
                        <X className="w-[24px] h-[24px]" />
                    </button>

                    {/* Header */}
                    <div className="px-[25px] pt-[24px]">
                        <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Alert Configuration</h2>
                        <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">Manage real-time notifications for security incidents.</p>
                        <div className="border-b border-[#D4C8FF] mt-[12px]" />
                    </div>

                    {/* Content */}
                    <div className="px-[25px] pt-[23px] pb-[24px] flex-1">
                        {/* Create New Alert Rule button — dashed border, rounded corners like Figma */}
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-[364px] h-[57px] border-[1.5px] border-dashed border-[#D4C8FF] rounded-[10px] text-[#A5AEB7] hover:border-[#6466FF] hover:text-[#6466FF] transition-colors flex items-center justify-center gap-[4px] cursor-pointer"
                        >
                            <Plus className="w-[18px] h-[18px]" />
                            <span className="text-[14px] font-medium leading-[18px]">Create New Alert Rule</span>
                        </button>

                        {/* Alert list */}
                        <div className="mt-[20px] space-y-[12px]">
                            {isLoading ? (
                                <div className="text-center text-[#A5AEB7] text-[14px] font-medium py-[40px]">Loading alerts...</div>
                            ) : alerts?.length === 0 ? (
                                <div className="text-center text-[#A5AEB7] text-[14px] font-medium leading-[18px] py-[40px]">
                                    No alerts configured yet.
                                </div>
                            ) : (
                                alerts?.map((alert: any) => (
                                    <div key={alert.id} className="bg-white border border-[#D4C8FF]/50 p-[16px] flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-semibold text-[#1E1B39] text-[14px] leading-[18px]">{alert.name}</h4>
                                            <div className="text-[12px] mt-[6px] flex gap-[8px]">
                                                <span className="bg-[#EFF3FF] text-[#6466FF] px-[8px] py-[2px] font-medium">{alert.triggerType}</span>
                                                <span className="bg-[#6466FF]/10 text-[#6466FF] px-[8px] py-[2px] font-medium">{alert.channel}</span>
                                            </div>
                                            <div className="text-[13px] text-[#A5AEB7] mt-[6px]">
                                                To: <span className="text-[#1E1B39]">{alert.destination}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteAlert(alert.id)}
                                            className="text-[#A5AEB7] hover:text-[#E22D54] transition-all p-[8px] cursor-pointer"
                                            title="Delete Alert"
                                        >
                                            <Trash2 className="w-[18px] h-[18px]" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Create New Alert form view (Figma: 418 × 549) ──
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
            <div
                className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col"
                style={{ width: 480, height: 549 }}
            >
                {/* Close */}
                <button
                    onClick={() => setIsCreating(false)}
                    className="absolute top-[21px] right-[18px] text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer"
                >
                    <X className="w-[24px] h-[24px]" />
                </button>

                {/* Header */}
                <div className="px-[25px] pt-[24px]">
                    <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Alert Configuration</h2>
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">Manage real-time notifications for security incidents.</p>
                    <div className="border-b border-[#D4C8FF] mt-[12px]" />
                </div>

                {/* Create form */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    <div className="px-[28px] pt-[27px] space-y-[20px] flex-1">
                        {/* Alert Name */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Alert Name</label>
                            <input
                                type="text"
                                required
                                value={newAlert.name}
                                onChange={e => setNewAlert({ ...newAlert, name: e.target.value })}
                                placeholder="e.g., Critical Events Monitor"
                                className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none placeholder:text-[#A5AEB7] placeholder:font-medium"
                            />
                        </div>

                        {/* Trigger Type + Event Threshold — side by side, fixed widths */}
                        <div className="flex gap-[12px]">
                            <div style={{ width: 210 }}>
                                <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Trigger Type</label>
                                <div className="relative">
                                    <select
                                        value={newAlert.triggerType}
                                        onChange={e => setNewAlert({ ...newAlert, triggerType: e.target.value })}
                                        className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="HIGH_RISK_EVENT">High Risk Event</option>
                                        <option value="PATTERN_MATCH_THRESHOLD">Pattern Match</option>
                                    </select>
                                    <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-[13px] leading-[16px] mb-[10px] whitespace-nowrap">
                                    <span className="font-semibold text-[#A5AEB7]">Event Threshold </span>
                                    <span className="font-normal text-[#A5AEB7]">(e.g.1 per hour)</span>
                                </label>
                                {/* Custom number spinner — matches Figma ChevronsUpDown icon */}
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={newAlert.threshold}
                                        onChange={e => setNewAlert({ ...newAlert, threshold: parseInt(e.target.value) || 1 })}
                                        className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 pl-[12px] pr-[32px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                    />
                                    {/* Up/Down spinner buttons — black, matching Figma */}
                                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-[#D4C8FF]/50">
                                        <button
                                            type="button"
                                            onClick={() => setNewAlert({ ...newAlert, threshold: (newAlert.threshold || 1) + 1 })}
                                            className="flex-1 flex items-center justify-center px-[6px] hover:bg-[#F6F0FF] cursor-pointer"
                                        >
                                            <ChevronUp className="w-[12px] h-[12px] text-[#1E1B39]" />
                                        </button>
                                        <div className="border-t border-[#D4C8FF]/50" />
                                        <button
                                            type="button"
                                            onClick={() => setNewAlert({ ...newAlert, threshold: Math.max(1, (newAlert.threshold || 1) - 1) })}
                                            className="flex-1 flex items-center justify-center px-[6px] hover:bg-[#F6F0FF] cursor-pointer"
                                        >
                                            <ChevronDown className="w-[12px] h-[12px] text-[#1E1B39]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Channel */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Channel</label>
                            <div className="relative">
                                <select
                                    value={newAlert.channel}
                                    onChange={e => setNewAlert({ ...newAlert, channel: e.target.value })}
                                    className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none appearance-none cursor-pointer"
                                >
                                    <option value="EMAIL">Email</option>
                                    <option value="SLACK_WEBHOOK">Slack Webhook</option>
                                </select>
                                <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>

                        {/* Destination */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">
                                Destination ({newAlert.channel === 'EMAIL' ? 'Email Address' : 'Webhook URL'})
                            </label>
                            <input
                                type={newAlert.channel === 'EMAIL' ? 'email' : 'url'}
                                required
                                value={newAlert.destination}
                                onChange={e => setNewAlert({ ...newAlert, destination: e.target.value })}
                                placeholder={newAlert.channel === 'EMAIL' ? 'email@example.com' : 'https://hooks.slack.com/...'}
                                className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none placeholder:text-[#A5AEB7] placeholder:font-medium"
                            />
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="px-[28px] pb-[24px] pt-[20px] flex items-center gap-[18px]">
                        <button
                            type="submit"
                            className="h-[48px] px-[26px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium leading-[18px] transition-colors cursor-pointer"
                        >
                            Save Alert
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium leading-[18px] hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
