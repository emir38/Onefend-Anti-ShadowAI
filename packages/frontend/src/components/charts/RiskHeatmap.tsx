'use client';

import React from 'react';

interface RiskHeatmapProps {
    data: {
        category: string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        count: number;
    }[];
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ data }) => {
    // Unique categories
    const categories = Array.from(new Set(data.map((d) => d.category))).sort();
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];

    const getCount = (cat: string, risk: string) => {
        return data.find((d) => d.category === cat && d.riskLevel === risk)?.count || 0;
    };

    const getMaxCount = () => {
        return Math.max(...data.map(d => d.count), 1);
    };

    const maxCount = getMaxCount();

    const getCellColor = (count: number) => {
        if (count === 0) return 'text-[#1E1B39]';
        const intensity = count / maxCount;
        if (intensity <= 0.4) return 'bg-[#ECC6CE] text-[#1E1B39]';
        return 'bg-[#E22D54] text-white';
    };

    return (
        <div className="bg-white border border-[#D4C8FF]/50 p-[24px] shadow-sm flex flex-col">
            <div className="mb-[20px] pb-1">
                <h3 className="text-[15px] font-semibold text-[#1E1B39] leading-[19px]">Risk Heatmaps</h3>
                <p className="text-[12px] font-medium text-[#A5AEB7] leading-[15px] mt-[5px]">Concentration of risk by data category</p>
            </div>
            <div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="px-0 py-[15px] text-[#A5AEB7] text-[13px] font-medium border-b border-[#D4C8FF]">Category</th>
                                {riskLevels.map((risk) => (
                                    <th key={risk} className="px-2 py-[15px] text-center text-[13px] font-medium capitalize text-[#A5AEB7] border-b border-[#D4C8FF]">{risk}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat} className="border-b border-[#D4C8FF] last:border-0 hover:bg-[#FAF7FF] transition-colors">
                                    <td className="px-0 py-[15px] text-[14px] font-medium text-[#1E1B39]">{cat}</td>
                                    {riskLevels.map((risk) => {
                                        const count = getCount(cat, risk);
                                        return (
                                            <td key={risk} className="px-4 py-[10px]">
                                                <div
                                                    className={`h-[24px] w-[61px] mx-auto flex items-center justify-center transition-colors ${getCellColor(count)}`}
                                                    title={`${count} events`}
                                                >
                                                    <span className={`text-[12px] font-medium ${count === 0 ? 'text-[#1E1B39]' : ''}`}>
                                                        {count}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-[14px] text-[#A5AEB7]">
                                        No data available for heatmap
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
