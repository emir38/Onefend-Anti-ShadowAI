'use client';

import { useRouter } from 'next/navigation';


interface TopUsersChartProps {
    data: Array<{ userId: string; userName: string; count: number }>;
}

// Figma purple gradient palette for bars
const BAR_COLORS = ['#6466FF', '#7A7BFF', '#93AAFD', '#C6D2FD', '#DBE3FF'];


export default function TopUsersChart({ data }: TopUsersChartProps) {
    const router = useRouter();

    if (!data || data.length === 0) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm h-[514px] flex items-center justify-center">
                <p className="text-[15px] font-semibold text-[#A5AEB7]">No user data available</p>
            </div>
        );
    }

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-white border border-[#D4C8FF]/50 shadow-sm p-[24px] h-[514px] flex flex-col">
            {/* Header */}
            <div className="mb-[16px] flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Top 5 Users by Activity</h3>
                    <span className="bg-[#E0E0F6] text-[#6466FF] text-[10px] font-semibold leading-[13px] px-[6px] py-[2px] rounded-full">LAST 7 DAYS</span>
                </div>
                <p className="text-[12px] font-medium text-[#A5AEB7] mt-[6px] leading-[15px]">Most active users during the selected period</p>
                <div className="border-b border-[#D4C8FF] mt-[16px]" />
            </div>

            {/* Custom bar chart — Figma horizontal bars with track + count on right */}
            <div className="flex flex-col gap-[15px] mt-[8px]">
                {data.slice(0, 5).map((user, index) => {
                    const pct = (user.count / maxCount) * 100;
                    const isTop = index === 0;
                    return (
                        <div
                            key={user.userId}
                            className="cursor-pointer group"
                            onClick={() => router.push(`/dashboard/events?userId=${user.userId}`)}
                        >
                            {/* Label row */}
                            <div className="flex items-center justify-between mb-[6px]">
                                <span className="text-[13px] font-medium text-[#1E1B39] leading-[22px]">{user.userName}</span>
                                <span className={`text-[12px] font-medium leading-[15px] ${isTop ? 'text-[#1E1B39]' : 'text-[#615E83]'}`}>{user.count}</span>
                            </div>
                            {/* Bar track */}
                            <div className="relative h-[22px] w-full bg-[#EFF3FF] overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 transition-all duration-500 group-hover:opacity-80"
                                    style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[index] }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-axis scale acts as footer */}
            <div className="mt-auto pt-[8px]">
                <div className="flex justify-between px-0">
                    {[0, 5, 10, 15, 20, 25].map(tick => (
                        <span key={tick} className="text-[11px] text-[#1E1B39] text-center w-[20px]">{tick}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
