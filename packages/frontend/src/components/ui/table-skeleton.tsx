import React from 'react';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export default function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
    return (
        <div className="w-full animate-pulse bg-card rounded-[4px] border border-border overflow-hidden">
            {/* Header */}
            <div className="h-12 bg-muted/50 border-b border-border px-6 flex items-center space-x-4">
                {[...Array(columns)].map((_, i) => (
                    <div key={`header-${i}`} className="h-4 bg-muted/50 rounded" style={{ width: `${Math.floor(100 / columns)}%` }}></div>
                ))}
            </div>

            {/* Rows */}
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4 px-6 border-b border-border last:border-0 hover:bg-muted/10">
                    {[...Array(columns)].map((_, j) => (
                        <div key={`cell-${i}-${j}`} className="h-3 bg-muted/50 rounded" style={{ width: `${Math.floor(Math.random() * 40) + 40}%` }}></div>
                    ))}
                </div>
            ))}
        </div>
    );
}
