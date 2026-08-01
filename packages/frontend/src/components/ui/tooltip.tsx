'use client';

import React from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactElement;
    side?: 'top' | 'bottom';
    /**
     * Si es false, no muestra el tooltip (util para ocultarlo cuando no aplica).
     * Default: true.
     */
    show?: boolean;
}

/**
 * Tooltip minimal custom, sin dependencias externas (no Radix, no Floating UI).
 * Usa CSS puro con group-hover para aparecer al pasar el mouse encima.
 *
 * Uso:
 *   <Tooltip content="Available in Business plan">
 *     <button disabled>Create</button>
 *   </Tooltip>
 */
export function Tooltip({ content, children, side = 'top', show = true }: TooltipProps) {
    if (!show) return children;

    return (
        <span className="relative inline-flex group">
            {children}
            <span
                role="tooltip"
                className={[
                    'pointer-events-none absolute z-50 left-1/2 -translate-x-1/2',
                    side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
                    'whitespace-nowrap rounded-md bg-[#1E1B39] px-2.5 py-1 text-xs font-medium text-white',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                    'shadow-lg',
                ].join(' ')}
            >
                {content}
            </span>
        </span>
    );
}
