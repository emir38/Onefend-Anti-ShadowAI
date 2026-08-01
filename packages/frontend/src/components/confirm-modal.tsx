import { Trash2, AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'danger',
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const btnClass = variant === 'danger'
        ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
        : variant === 'warning'
        ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white'
        : 'bg-[#6466FF] hover:bg-[#5557E0] text-white';

    const Icon = variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : Info;

    return (
        /* Overlay: dark shadow, no blur — matches Analytics popup style */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
            <div className="bg-white border border-[#D4C8FF] shadow-2xl flex flex-col" style={{ width: 418 }}>

                {/* Title + divider */}
                <div className="px-[25px] pt-[30px] pb-[16px]">
                    <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">{title}</h2>
                    <div className="border-b border-[#D4C8FF] mt-[16px]" />
                </div>

                {/* Message */}
                <div className="px-[25px] pt-[4px] pb-[8px]">
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[22px]">{message}</p>
                </div>

                {/* Buttons — sharp corners, no rounding */}
                <div className="px-[25px] pb-[24px] pt-[16px] flex items-center gap-[20px]">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`h-[48px] px-[20px] text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-[8px] ${btnClass}`}
                    >
                        <Icon className="w-[16px] h-[16px]" />
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
