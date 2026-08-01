import { useState } from 'react';
import { useExportReport } from '@/hooks/use-api';
import { X } from 'lucide-react';

interface ReportExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultStartDate: Date;
    defaultEndDate: Date;
    filters?: {
        platform?: string;
        riskLevel?: string;
        action?: string;
    };
}

// ── Figma SVG icons embedded directly from downloaded assets ──────────────────

// PDF file icon — exact Figma "icon/pdf" (36×36 viewBox, scaled to 18×18)
function PdfIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <mask id="pdf-mask" fill="white">
                <path d="M5.9999 15.6V14.4H4.7999V15.6H5.9999ZM15.5999 15.6V14.4H14.3999V15.6H15.5999ZM15.5999 25.2H14.3999V26.4H15.5999V25.2ZM32.3999 8.4H33.5999V7.9032L33.2495 7.5504L32.3999 8.4ZM25.1999 1.2L26.0495 0.3504L25.6967 0H25.1999V1.2ZM5.9999 16.8H8.3999V14.4H5.9999V16.8ZM7.1999 26.4V20.4H4.7999V26.4H7.1999ZM7.1999 20.4V15.6H4.7999V20.4H7.1999ZM8.3999 19.2H5.9999V21.6H8.3999V19.2ZM9.5999 18C9.5999 18.3183 9.47347 18.6235 9.24843 18.8485C9.02339 19.0736 8.71816 19.2 8.3999 19.2V21.6C9.35468 21.6 10.2704 21.2207 10.9455 20.5456C11.6206 19.8705 11.9999 18.9548 11.9999 18H9.5999ZM8.3999 16.8C8.71816 16.8 9.02339 16.9264 9.24843 17.1515C9.47347 17.3765 9.5999 17.6817 9.5999 18H11.9999C11.9999 17.0452 11.6206 16.1295 10.9455 15.4544C10.2704 14.7793 9.35468 14.4 8.3999 14.4V16.8ZM14.3999 15.6V25.2H16.7999V15.6H14.3999ZM15.5999 26.4H17.9999V24H15.5999V26.4ZM21.5999 22.8V18H19.1999V22.8H21.5999ZM17.9999 14.4H15.5999V16.8H17.9999V14.4ZM21.5999 18C21.5999 17.0452 21.2206 16.1295 20.5455 15.4544C19.8704 14.7793 18.9547 14.4 17.9999 14.4V16.8C18.3182 16.8 18.6234 16.9264 18.8484 17.1515C19.0735 17.3765 19.1999 17.6817 19.1999 18H21.5999ZM17.9999 26.4C18.9547 26.4 19.8704 26.0207 20.5455 25.3456C21.2206 24.6705 21.5999 23.7548 21.5999 22.8H19.1999C19.1999 23.1183 19.0735 23.4235 18.8484 23.6485C18.6234 23.8736 18.3182 24 17.9999 24V26.4ZM23.9999 14.4V26.4H26.3999V14.4H23.9999ZM25.1999 16.8H31.1999V14.4H25.1999V16.8ZM25.1999 21.6H28.7999V19.2H25.1999V21.6ZM4.7999 12V3.6H2.3999V12H4.7999ZM31.1999 8.4V12H33.5999V8.4H31.1999ZM5.9999 2.4H25.1999V0H5.9999V2.4ZM24.3503 2.0496L31.5503 9.2496L33.2495 7.5504L26.0495 0.3504L24.3503 2.0496ZM4.7999 3.6C4.7999 3.28174 4.92633 2.97652 5.15137 2.75147C5.37642 2.52643 5.68164 2.4 5.9999 2.4V0C5.04512 0 4.12945 0.379285 3.45432 1.05442C2.77919 1.72955 2.3999 2.64522 2.3999 3.6H4.7999ZM2.3999 28.8V32.4H4.7999V28.8H2.3999ZM5.9999 36H29.9999V33.6H5.9999V36ZM33.5999 32.4V28.8H31.1999V32.4H33.5999ZM29.9999 36C30.9547 36 31.8704 35.6207 32.5455 34.9456C33.2206 34.2705 33.5999 33.3548 33.5999 32.4H31.1999C31.1999 32.7183 31.0735 33.0235 30.8484 33.2485C30.6234 33.4736 30.3182 33.6 29.9999 33.6V36ZM2.3999 32.4C2.3999 33.3548 2.77919 34.2705 3.45432 34.9456C4.12945 35.6207 5.04512 36 5.9999 36V33.6C5.68164 33.6 5.37642 33.4736 5.15137 33.2485C4.92633 33.0235 4.7999 32.7183 4.7999 32.4H2.3999Z"/>
            </mask>
            <path d="M5.9999 15.6V14.4H4.7999V15.6H5.9999ZM15.5999 15.6V14.4H14.3999V15.6H15.5999ZM15.5999 25.2H14.3999V26.4H15.5999V25.2ZM32.3999 8.4H33.5999V7.9032L33.2495 7.5504L32.3999 8.4ZM25.1999 1.2L26.0495 0.3504L25.6967 0H25.1999V1.2ZM5.9999 16.8H8.3999V14.4H5.9999V16.8ZM7.1999 26.4V20.4H4.7999V26.4H7.1999ZM7.1999 20.4V15.6H4.7999V20.4H7.1999ZM8.3999 19.2H5.9999V21.6H8.3999V19.2ZM9.5999 18C9.5999 18.3183 9.47347 18.6235 9.24843 18.8485C9.02339 19.0736 8.71816 19.2 8.3999 19.2V21.6C9.35468 21.6 10.2704 21.2207 10.9455 20.5456C11.6206 19.8705 11.9999 18.9548 11.9999 18H9.5999ZM8.3999 16.8C8.71816 16.8 9.02339 16.9264 9.24843 17.1515C9.47347 17.3765 9.5999 17.6817 9.5999 18H11.9999C11.9999 17.0452 11.6206 16.1295 10.9455 15.4544C10.2704 14.7793 9.35468 14.4 8.3999 14.4V16.8ZM14.3999 15.6V25.2H16.7999V15.6H14.3999ZM15.5999 26.4H17.9999V24H15.5999V26.4ZM21.5999 22.8V18H19.1999V22.8H21.5999ZM17.9999 14.4H15.5999V16.8H17.9999V14.4ZM21.5999 18C21.5999 17.0452 21.2206 16.1295 20.5455 15.4544C19.8704 14.7793 18.9547 14.4 17.9999 14.4V16.8C18.3182 16.8 18.6234 16.9264 18.8484 17.1515C19.0735 17.3765 19.1999 17.6817 19.1999 18H21.5999ZM17.9999 26.4C18.9547 26.4 19.8704 26.0207 20.5455 25.3456C21.2206 24.6705 21.5999 23.7548 21.5999 22.8H19.1999C19.1999 23.1183 19.0735 23.4235 18.8484 23.6485C18.6234 23.8736 18.3182 24 17.9999 24V26.4ZM23.9999 14.4V26.4H26.3999V14.4H23.9999ZM25.1999 16.8H31.1999V14.4H25.1999V16.8ZM25.1999 21.6H28.7999V19.2H25.1999V21.6ZM4.7999 12V3.6H2.3999V12H4.7999ZM31.1999 8.4V12H33.5999V8.4H31.1999ZM5.9999 2.4H25.1999V0H5.9999V2.4ZM24.3503 2.0496L31.5503 9.2496L33.2495 7.5504L26.0495 0.3504L24.3503 2.0496ZM4.7999 3.6C4.7999 3.28174 4.92633 2.97652 5.15137 2.75147C5.37642 2.52643 5.68164 2.4 5.9999 2.4V0C5.04512 0 4.12945 0.379285 3.45432 1.05442C2.77919 1.72955 2.3999 2.64522 2.3999 3.6H4.7999ZM2.3999 28.8V32.4H4.7999V28.8H2.3999ZM5.9999 36H29.9999V33.6H5.9999V36ZM33.5999 32.4V28.8H31.1999V32.4H33.5999ZM29.9999 36C30.9547 36 31.8704 35.6207 32.5455 34.9456C33.2206 34.2705 33.5999 33.3548 33.5999 32.4H31.1999C31.1999 32.7183 31.0735 33.0235 30.8484 33.2485C30.6234 33.4736 30.3182 33.6 29.9999 33.6V36ZM2.3999 32.4C2.3999 33.3548 2.77919 34.2705 3.45432 34.9456C4.12945 35.6207 5.04512 36 5.9999 36V33.6C5.68164 33.6 5.37642 33.4736 5.15137 33.2485C4.92633 33.0235 4.7999 32.7183 4.7999 32.4H2.3999Z" fill="#1E1B39" mask="url(#pdf-mask)" />
        </svg>
    );
}

// CSV file icon — exact Figma "icon/csv" (38×38 viewBox, scaled to 18×18)
function CsvIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M34.1999 8.86667H35.4665V8.34227L35.0967 7.96987L34.1999 8.86667ZM26.5999 1.26667L27.4967 0.369867L27.1243 0H26.5999V1.26667ZM16.4665 16.4667V15.2H15.1999V16.4667H16.4665ZM16.4665 21.5333H15.1999V22.8H16.4665V21.5333ZM21.5332 21.5333H22.7999V20.2667H21.5332V21.5333ZM21.5332 26.6V27.8667H22.7999V26.6H21.5332ZM26.5999 24.0667H25.3332V24.5911L25.7031 24.9635L26.5999 24.0667ZM29.1332 26.6L28.2364 27.4968L29.1332 28.3911L30.03 27.4968L29.1332 26.6ZM31.6665 24.0667L32.5633 24.9635L32.9332 24.5911V24.0667H31.6665ZM6.3332 16.4667V15.2H5.06654V16.4667H6.3332ZM6.3332 26.6H5.06654V27.8667H6.3332V26.6ZM5.06654 12.6667V3.8H2.5332V12.6667H5.06654ZM32.9332 8.86667V12.6667H35.4665V8.86667H32.9332ZM6.3332 2.53333H26.5999V0H6.3332V2.53333ZM25.7031 2.16347L33.3031 9.76347L35.0967 7.96987L27.4967 0.369867L25.7031 2.16347ZM5.06654 3.8C5.06654 3.46406 5.19999 3.14188 5.43753 2.90433C5.67508 2.66679 5.99726 2.53333 6.3332 2.53333V0C5.32538 0 4.35884 0.400356 3.6462 1.11299C2.93356 1.82563 2.5332 2.79218 2.5332 3.8H5.06654ZM2.5332 30.4V34.2H5.06654V30.4H2.5332ZM6.3332 38H31.6665V35.4667H6.3332V38ZM35.4665 34.2V30.4H32.9332V34.2H35.4665ZM31.6665 38C32.6744 38 33.6409 37.5996 34.3535 36.887C35.0662 36.1744 35.4665 35.2078 35.4665 34.2H32.9332C32.9332 34.5359 32.7998 34.8581 32.5622 35.0957C32.3247 35.3332 32.0025 35.4667 31.6665 35.4667V38ZM2.5332 34.2C2.5332 35.2078 2.93356 36.1744 3.6462 36.887C4.35884 37.5996 5.32538 38 6.3332 38V35.4667C5.99726 35.4667 5.67508 35.3332 5.43753 35.0957C5.19999 34.8581 5.06654 34.5359 5.06654 34.2H2.5332ZM22.7999 15.2H16.4665V17.7333H22.7999V15.2ZM15.1999 16.4667V21.5333H17.7332V16.4667H15.1999ZM16.4665 22.8H21.5332V20.2667H16.4665V22.8ZM20.2665 21.5333V26.6H22.7999V21.5333H20.2665ZM21.5332 25.3333H15.1999V27.8667H21.5332V25.3333ZM25.3332 15.2V24.0667H27.8665V15.2H25.3332ZM25.7031 24.9635L28.2364 27.4968L30.03 25.7032L27.4967 23.1699L25.7031 24.9635ZM30.03 27.4968L32.5633 24.9635L30.7697 23.1699L28.2364 25.7032L30.03 27.4968ZM32.9332 24.0667V15.2H30.3999V24.0667H32.9332ZM12.6665 15.2H6.3332V17.7333H12.6665V15.2ZM5.06654 16.4667V26.6H7.59987V16.4667H5.06654ZM6.3332 27.8667H12.6665V25.3333H6.3332V27.8667Z" fill="#1E1B39"/>
        </svg>
    );
}

// Calendar icon — exact Figma calendar stroke outline (46×46 viewBox)
function CalendarIcon({ size = 19 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.6665 15.3333H38.3332M7.6665 15.3333V32.2C7.6665 34.3466 7.6665 35.42 8.08434 36.2403C8.45185 36.9616 9.03825 37.548 9.7595 37.9155C10.5779 38.3333 11.6513 38.3333 13.7941 38.3333H32.2056C34.3484 38.3333 35.4198 38.3333 36.2383 37.9155C36.9608 37.5475 37.5473 36.961 37.9153 36.2403C38.3332 35.42 38.3332 34.3505 38.3332 32.2076V15.3333M7.6665 15.3333V13.8C7.6665 11.6533 7.6665 10.58 8.08434 9.75965C8.45234 9.03706 9.03692 8.45248 9.7595 8.08448C10.5798 7.66665 11.6532 7.66665 13.7998 7.66665H15.3332M38.3332 15.3333V13.7942C38.3332 11.6514 38.3332 10.5781 37.9153 9.75965C37.5473 9.0381 36.9602 8.45166 36.2383 8.08448C35.4198 7.66665 34.3465 7.66665 32.1998 7.66665H30.6665M15.3332 7.66665H30.6665M15.3332 7.66665V3.83331M30.6665 7.66665V3.83331" stroke="#1E1B39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export default function ReportExportModal({
    isOpen,
    onClose,
    defaultStartDate,
    defaultEndDate,
    filters
}: ReportExportModalProps) {
    const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');

    const formatDateForDisplay = (d: Date) => {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    };

    const formatDateForInput = (d: Date) => d.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(formatDateForInput(defaultStartDate));
    const [endDate, setEndDate] = useState(formatDateForInput(defaultEndDate));

    const { mutate: exportReport, isPending } = useExportReport();

    if (!isOpen) return null;

    const handleExport = () => {
        exportReport(
            { format, startDate: new Date(startDate), endDate: new Date(endDate), ...(filters || {}) },
            {
                onSuccess: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `onefend-report-${startDate}-to-${endDate}.${format}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    onClose();
                },
                onError: (err) => { alert('Failed to export: ' + err.message); }
            }
        );
    };

    const startDateObj = new Date(startDate + 'T00:00:00');
    const endDateObj = new Date(endDate + 'T00:00:00');

    // Figma layout:
    // Popup: 418×390. Padding left/right: 25px.
    // Content width: 418 - 25 - 25 = 368px
    // Date fields: each 172px, gap 21px → 172+21+172 = 365px (fits in 368px)
    // Format row: PDF option is 172px wide (aligned with Start Date), gap 21px, CSV option (aligned with End Date)
    // PDF radio starts at same X as Start Date label
    // CSV radio starts at same X as End Date label → left: 25 + 172 + 21 = 218px

    const DATE_FIELD_W = 172;
    const FIELD_GAP = 21;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
            <div
                className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col"
                style={{ width: 418, height: 340 }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 transition-opacity cursor-pointer"
                >
                    <X className="w-[24px] h-[24px]" />
                </button>

                {/* Header */}
                <div className="px-[25px] pt-[24px]">
                    <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">Export Report</h2>
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">
                        Generate insights from your conversation events.
                    </p>
                    <div className="border-b border-[#D4C8FF] mt-[12px]" />
                </div>

                {/* Body */}
                <div className="px-[25px] pt-[27px] flex-1">

                    {/* Format label */}
                    <p className="text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[16px]">Format</p>

                    {/* Format radio row — each option aligns with its date field below */}
                    <div className="flex items-center" style={{ gap: FIELD_GAP }}>

                        {/* PDF — exactly DATE_FIELD_W wide, so radio aligns with Start Date */}
                            <button
                                type="button"
                                onClick={() => setFormat('pdf')}
                                className="flex items-center gap-[8px] cursor-pointer"
                                style={{ width: DATE_FIELD_W, flexShrink: 0 }}
                            >
                                <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${format === 'pdf' ? 'border-[#6466FF]' : 'border-[#A5AEB7]'}`}>
                                    {format === 'pdf' && <div className="w-[8px] h-[8px] rounded-full bg-[#6466FF]" />}
                                </div>
                                <PdfIcon size={18} />
                                <span className="text-[14px] font-medium text-[#1E1B39] leading-[18px]">PDF Summary</span>
                            </button>

                        {/* CSV — starts at same X as End Date field */}
                        <button
                            type="button"
                            onClick={() => setFormat('csv')}
                            className="flex items-center gap-[8px] cursor-pointer"
                        >
                            <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${format === 'csv' ? 'border-[#6466FF]' : 'border-[#A5AEB7]'}`}>
                                {format === 'csv' && <div className="w-[8px] h-[8px] rounded-full bg-[#6466FF]" />}
                            </div>
                            <CsvIcon size={18} />
                            <span className="text-[14px] font-medium text-[#1E1B39] leading-[18px]">CSV Data</span>
                        </button>
                    </div>

                    {/* Date fields — 172px each, 21px gap, calendar icon RIGHT in black */}
                    <div className="flex items-end mt-[20px]" style={{ gap: FIELD_GAP }}>
                        {/* Start Date */}
                        <div style={{ width: DATE_FIELD_W, flexShrink: 0 }}>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Start Date</label>
                            <div className="relative">
                                <div className="flex items-center justify-between h-[36px] border border-[#D4C8FF]/50 px-[12px]">
                                    <span className="text-[14px] font-medium text-[#1E1B39] leading-[18px]">{formatDateForDisplay(startDateObj)}</span>
                                    <CalendarIcon size={19} />
                                </div>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>

                        {/* End Date */}
                        <div style={{ width: DATE_FIELD_W, flexShrink: 0 }}>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">End Date</label>
                            <div className="relative">
                                <div className="flex items-center justify-between h-[36px] border border-[#D4C8FF]/50 px-[12px]">
                                    <span className="text-[14px] font-medium text-[#1E1B39] leading-[18px]">{formatDateForDisplay(endDateObj)}</span>
                                    <CalendarIcon size={19} />
                                </div>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-[25px] pb-[24px] pt-[20px] flex items-center gap-[20px]">
                    <button
                        onClick={handleExport}
                        disabled={isPending}
                        className="h-[48px] px-[20px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium leading-[18px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {isPending ? 'Generating...' : 'Export Report'}
                    </button>
                    <button
                        onClick={onClose}
                        className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium leading-[18px] hover:bg-[#6466FF]/5 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
