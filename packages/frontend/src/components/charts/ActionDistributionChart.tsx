'use client';

import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface ActionDistributionChartProps {
    // Accepts both normalized {action, count} and Prisma-raw {action, _count}
    data: Array<{ action: string; count?: number; _count?: number }>;
}

// Exact colors from Figma SVG ellipse exports
const ACTION_COLORS: Record<string, string> = {
    BLOCK: '#5038CF',
    ALLOWED: '#6466FF',
    SOFT_BLOCK: '#93AAFD',
    CLEAR_TEXT: '#C6D2FD',
    WARN: '#DBE2FF',
};

const ACTION_ORDER = ['BLOCK', 'ALLOWED', 'SOFT_BLOCK', 'CLEAR_TEXT', 'WARN'];

const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-col gap-[10px] justify-center">
        {payload?.map((entry: any) => (
            <div key={entry.value} className="flex items-center gap-[8px]">
                <div className="w-[12px] h-[12px] rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[12px] font-medium text-[#1E1B39] leading-[19px]">{entry.value}</span>
            </div>
        ))}
    </div>
);

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm px-[12px] py-[8px]">
                <p className="text-[12px] font-medium text-[#1E1B39]">{payload[0].name}</p>
                <p className="text-[13px] font-semibold text-[#6466FF]">{payload[0].value} events</p>
            </div>
        );
    }
    return null;
};

export default function ActionDistributionChart({ data }: ActionDistributionChartProps) {
    const router = useRouter();

    if (!data || data.length === 0) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm h-[513px] flex items-center justify-center">
                <p className="text-[15px] font-semibold text-[#A5AEB7]">No action data available</p>
            </div>
        );
    }

    const chartData = ACTION_ORDER
        .map(action => {
            const found = data.find(d => d.action === action);
            const value = found ? (found.count ?? found._count ?? 0) : 0;
            return { name: action, value, color: ACTION_COLORS[action] || '#A5AEB7' };
        })
        .filter(d => d.value > 0);

    return (
        <div className="bg-white border border-[#D4C8FF]/50 shadow-sm p-[24px] h-[513px] flex flex-col">
            {/* Header */}
            <div className="mb-[16px] flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Action Distribution</h3>
                    <span className="bg-[#E0E0F6] text-[#6466FF] text-[10px] font-semibold leading-[13px] px-[6px] py-[2px] rounded-full">LAST 7 DAYS</span>
                </div>
                <p className="text-[12px] font-medium text-[#A5AEB7] mt-[6px] leading-[15px]">Breakdown of events by enforcement action type</p>
                <div className="border-b border-[#D4C8FF] mt-[16px]" />
            </div>

            {/* Donut chart */}
            <div className="flex-1 flex items-center justify-center">
                <PieChart width={500} height={350}>
                    <Pie
                        data={chartData}
                        cx="40%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={130}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#FFFFFF"
                        onClick={(entry) => router.push(`/dashboard/events?action=${entry.name}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                onMouseEnter={(e: any) => { if (e.target) e.target.style.opacity = '0.85'; }}
                                onMouseLeave={(e: any) => { if (e.target) e.target.style.opacity = '1'; }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        content={<CustomLegend />}
                    />
                </PieChart>
            </div>
        </div>
    );
}
