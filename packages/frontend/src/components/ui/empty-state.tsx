import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
}

export default function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-[4px] border border-border text-center min-h-[300px]">
            {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
            <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground font-medium rounded-[4px] transition-all duration-150 cursor-pointer"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
