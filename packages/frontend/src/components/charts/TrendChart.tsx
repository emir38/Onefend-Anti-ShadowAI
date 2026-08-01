'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
    data: Array<{ date: string; count: number }>;
    title?: string;
}

export default function TrendChart({ data, title = 'Event Trends (Last 7 Days)' }: TrendChartProps) {
    // Format date for display (MM/DD)
    const formattedData = data.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return (
        <div className="bg-white border border-[#D4C8FF]/50 p-6 h-full shadow-sm">
            <h3 className="text-[16px] font-semibold text-[#1E1B39] mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 200, 255, 0.5)" vertical={false} />
                    <XAxis
                        dataKey="displayDate"
                        stroke="#A5AEB7"
                        style={{ fontSize: '10px' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        tick={{ fill: '#A5AEB7' }}
                    />
                    <YAxis
                        stroke="#A5AEB7"
                        style={{ fontSize: '10px' }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        tick={{ fill: '#A5AEB7' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: 'rgba(212, 200, 255, 0.5)',
                            borderRadius: '8px',
                            color: '#1E1B39',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                        }}
                        labelStyle={{ color: '#1E1B39', fontWeight: 600, paddingBottom: 4 }}
                        cursor={{ stroke: 'rgba(212, 200, 255, 0.5)', strokeWidth: 2 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#6466FF"
                        strokeWidth={2}
                        dot={{ fill: '#6466FF', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#6466FF', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
