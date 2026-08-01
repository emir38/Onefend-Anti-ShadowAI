'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface ResponseTimeChartProps {
    data: {
        date: string;
        blocked: number;
        bypassed: number;
    }[];
}

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ data }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Response Validity</CardTitle>
                <CardDescription>Blocks vs User Overrides (Bypasses) over time</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                        color: 'hsl(var(--popover-foreground))'
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="blocked"
                                    name="Blocked (Secure)"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#22c55e' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bypassed"
                                    name="Bypassed (Risk)"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#ef4444' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No response data available
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
