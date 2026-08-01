'use client';

import { useRouter } from 'next/navigation';
import { useTopPatterns } from '@/hooks/use-api';

interface TopPatternsWidgetProps {
    startDate: Date;
    endDate: Date;
}

const BAR_COLORS = ['#6466FF', '#93AAFD', '#C6D2FD'];

export default function TopPatternsWidget({ startDate, endDate }: TopPatternsWidgetProps) {
    const { data: patterns, isLoading } = useTopPatterns({ startDate, endDate });
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm h-[392px] flex items-center justify-center">
                <div className="text-[#A5AEB7]">Loading patterns...</div>
            </div>
        );
    }

    if (!patterns || patterns.length === 0) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm h-[392px] flex items-center justify-center">
                <div className="text-[15px] font-semibold text-[#A5AEB7]">No sensitive data patterns detected</div>
            </div>
        );
    }

    const maxCount = Math.max(...patterns.map((p: any) => p.count), 1);

    return (
        <div className="bg-white border border-[#D4C8FF]/50 shadow-sm p-[24px] h-[392px] flex flex-col">
            {/* Header */}
            <div className="mb-[16px] flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Top Detected Patterns</h3>
                    <span className="bg-[#E0E0F6] text-[#6466FF] text-[10px] font-semibold leading-[13px] px-[6px] py-[2px] rounded-full">LAST 7 DAYS</span>
                </div>
                <p className="text-[12px] font-medium text-[#A5AEB7] mt-[6px] leading-[15px]">Most frequent sensitive data types identified</p>
                <div className="border-b border-[#D4C8FF] mt-[16px]" />
            </div>

            {/* Bars */}
            <div className="flex flex-col gap-[15px] mt-[8px]">
                {patterns.slice(0, 3).map((pattern: any, index: number) => {
                    const pct = (pattern.count / maxCount) * 100;
                    const isTop = index === 0;
                    const count = pattern.count;
                    return (
                        <div
                            key={pattern.name}
                            className="cursor-pointer group"
                            onClick={() => router.push(`/dashboard/events?dataType=${encodeURIComponent(pattern.name)}`)}
                        >
                            <div className="flex items-center justify-between mb-[6px]">
                                <span className="text-[12px] font-medium text-[#1E1B39] leading-[15px] uppercase">{pattern.name}</span>
                                <span className={`text-[12px] font-medium leading-[15px] ${isTop ? 'text-[#1E1B39]' : 'text-[#615E83]'}`}>{count}</span>
                            </div>
                            <div className="relative h-[22px] w-full bg-[#EFF3FF] overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 transition-all duration-500 group-hover:opacity-80"
                                    style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-axis scale acts as footer */}
            <div className="mt-auto pt-[8px]">
                <div className="flex justify-between px-0">
                    {[0, 5, 10, 15, 20, 25, 30, 35].map(tick => (
                        <span key={tick} className="text-[11px] text-[#1E1B39] text-center w-[20px]">{tick}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
