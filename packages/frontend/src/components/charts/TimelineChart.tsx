'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimelineChartProps {
    data: Array<{
        timestamp: string;
        total: number;
        high: number;
        medium: number;
        low: number;
    }>;
}

export default function TimelineChart({ data }: TimelineChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white border border-[#D4C8FF]/50 shadow-sm h-[400px] flex items-center justify-center">
                <p className="text-[#A5AEB7]">No timeline data available</p>
            </div>
        );
    }

    // Format timestamp for display
    const formattedData = data.map(item => ({
        ...item,
        displayTime: new Date(item.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
        }),
    }));

    return (
        <div className="bg-white border border-[#D4C8FF]/50 shadow-sm p-[24px]">
            <div className="mb-[16px]">
                <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Event Timeline (Last 24 Hours)</h3>
                <p className="text-[12px] font-medium text-[#A5AEB7] mt-1 leading-[15px]">Hourly breakdown of events by risk level over time</p>
                <div className="border-b border-[#D4C8FF] mt-[16px]" />
            </div>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={formattedData}>
                    <defs>
                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4C8FF" opacity={0.5} />
                    <XAxis
                        dataKey="displayTime"
                        stroke="#A5AEB7"
                        style={{ fontSize: '11px' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fill: '#A5AEB7' }}
                    />
                    <YAxis stroke="#A5AEB7" style={{ fontSize: '12px' }} tick={{ fill: '#A5AEB7' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid rgba(212, 200, 255, 0.5)',
                            borderRadius: '0px',
                            color: '#1E1B39',
                        }}
                        labelStyle={{ color: '#1E1B39' }}
                    />
                    <Legend formatter={(value) => <span style={{ color: '#1E1B39', fontSize: '12px' }}>{value}</span>} />
                    <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="#EF4444"
                        fillOpacity={1}
                        fill="url(#colorHigh)"
                        name="High Risk"
                    />
                    <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke="#F59E0B"
                        fillOpacity={1}
                        fill="url(#colorMedium)"
                        name="Medium Risk"
                    />
                    <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorLow)"
                        name="Low Risk"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
