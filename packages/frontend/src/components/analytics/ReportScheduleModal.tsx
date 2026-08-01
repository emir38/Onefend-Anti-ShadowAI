import { useState } from 'react';
import { useCreateReportSchedule } from '@/hooks/use-api';
import { X, Clock, ChevronDown } from 'lucide-react';

interface ReportScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReportScheduleModal({ isOpen, onClose }: ReportScheduleModalProps) {
    const [frequency, setFrequency] = useState('WEEKLY');
    const [runTime, setRunTime] = useState('09:00');
    const [recipients, setRecipients] = useState('');

    const { mutate: createSchedule, isPending } = useCreateReportSchedule();

    if (!isOpen) return null;

    const handleSubmit = () => {
        const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e);
        if (recipientList.length === 0) {
            alert('Please enter at least one recipient email.');
            return;
        }

        createSchedule(
            { frequency, recipients: recipientList, runTime },
            {
                onSuccess: () => {
                    alert('Report scheduled successfully!');
                    onClose();
                    setRecipients('');
                },
                onError: (err) => {
                    alert('Failed to schedule report: ' + err.message);
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
            <div
                className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col"
                style={{ width: 418, minHeight: 467 }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-[21px] right-[18px] text-[#A5AEB7] hover:text-[#1E1B39] transition-colors cursor-pointer"
                >
                    <X className="w-[24px] h-[24px]" />
                </button>

                {/* Header */}
                <div className="px-[25px] pt-[24px]">
                    <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Schedule Report</h2>
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">Receive automated PDF reports via email.</p>
                    <div className="border-b border-[#D4C8FF] mt-[12px]" />
                </div>

                {/* Form fields */}
                <div className="px-[25px] pt-[27px] space-y-[20px] flex-1">
                    {/* Frequency */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Frequency</label>
                        <div className="relative">
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none appearance-none cursor-pointer"
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>

                    {/* Time */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Time (Local)</label>
                        <div className="relative">
                            <input
                                type="time"
                                value={runTime}
                                onChange={(e) => setRunTime(e.target.value)}
                                className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none [color-scheme:light]"
                            />
                            <Clock className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[19px] h-[19px] text-[#1E1B39] pointer-events-none" />
                        </div>
                    </div>

                    {/* Recipients */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Recipients (comma separated)</label>
                        <input
                            type="text"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            placeholder="email@example.com, boss@example.com"
                            className="w-full h-[36px] bg-white border border-[#D4C8FF]/50 px-[12px] text-[#1E1B39] text-[14px] font-medium leading-[18px] focus:ring-1 focus:ring-[#6466FF] outline-none placeholder:text-[#A5AEB7] placeholder:font-medium"
                        />
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="px-[25px] pb-[24px] pt-[20px] flex items-center gap-[20px]">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="h-[48px] px-[16px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium leading-[18px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {isPending ? 'Scheduling...' : 'Schedule Report'}
                    </button>
                    <button
                        onClick={onClose}
                        className="h-[48px] px-[16px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium leading-[18px] hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
