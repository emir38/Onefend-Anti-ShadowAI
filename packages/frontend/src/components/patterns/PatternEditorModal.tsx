'use client';

import { useState, useEffect } from 'react';
import { useCreatePattern, useUpdatePattern, useDeletePattern } from '@/hooks/use-api';
import { X, ChevronDown } from 'lucide-react';

interface PatternEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pattern?: any;
}

const CATEGORIES = ['CUSTOM', 'FINANCIAL', 'PII', 'HEALTH', 'SECRETS', 'NETWORK', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ACTIONS = ['ALLOW', 'LOG', 'WARN', 'BLOCK'];

export function PatternEditorModal({ isOpen, onClose, pattern }: PatternEditorModalProps) {
    const createPattern = useCreatePattern();
    const updatePattern = useUpdatePattern();
    const deletePatternHook = useDeletePattern();

    const [name, setName] = useState('');
    const [category, setCategory] = useState('CUSTOM');
    const [regex, setRegex] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('MEDIUM');
    const [defaultAction, setDefaultAction] = useState('WARN');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [multiline, setMultiline] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (pattern) {
            setName(pattern.name); setCategory(pattern.category); setRegex(pattern.regex);
            setDescription(pattern.description || ''); setSeverity(pattern.severity);
            setDefaultAction(pattern.defaultAction); setCaseSensitive(pattern.caseSensitive); setMultiline(pattern.multiline);
        } else {
            setName(''); setCategory('CUSTOM'); setRegex(''); setDescription('');
            setSeverity('MEDIUM'); setDefaultAction('WARN'); setCaseSensitive(false); setMultiline(false);
        }
        setError(null);
    }, [pattern, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // El backend (DetectionPattern) espera el campo `regex`, NO `pattern`
        // (eso era del modelo legacy SensitiveDataPattern). Dejamos los demas
        // campos tal cual porque ya coinciden con CreateDetectionPatternDto.
        const data = { name, category, regex, description, severity, defaultAction, caseSensitive, multiline };
        try {
            if (pattern) { await updatePattern.mutateAsync({ id: pattern.id, data }); }
            else { await createPattern.mutateAsync(data); }
            onClose();
        } catch (err: any) { setError(err.message || 'Failed to save pattern'); }
    };

    const handleReset = async () => {
        if (!pattern) return;
        if (!confirm('Are you sure you want to reset/delete this pattern?')) return;
        try { await deletePatternHook.mutateAsync(pattern.id); onClose(); }
        catch (err: any) { setError(err.message || 'Failed to delete pattern'); }
    };

    if (!isOpen) return null;

    const selectClass = (disabled?: boolean) =>
        `w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] appearance-none cursor-pointer${disabled ? ' opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B39]/50">
            <div className="bg-white border border-[#D4C8FF] shadow-2xl relative flex flex-col max-h-[90vh]" style={{ width: 560 }}>
                <button onClick={onClose} className="absolute top-[21px] right-[18px] text-[#1E1B39] hover:opacity-70 cursor-pointer">
                    <X className="w-[24px] h-[24px]" />
                </button>

                {/* Header */}
                <div className="px-[25px] pt-[24px] flex-shrink-0">
                    <h2 className="text-[22px] font-semibold text-[#1E1B39] leading-[30px]">
                        {pattern ? 'Edit Detection Pattern' : 'Create Detection Pattern'}
                    </h2>
                    <p className="text-[14px] font-medium text-[#A5AEB7] leading-[18px] mt-[1px]">
                        {pattern?.isBuiltIn ? 'Customise severity and action for this built-in pattern.' : 'Define a new data detection pattern.'}
                    </p>
                    <div className="border-b border-[#D4C8FF] mt-[12px]" />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
                    <div className="px-[25px] pt-[24px] space-y-[18px] flex-1">

                        {/* Built-in notice */}
                        {pattern?.isBuiltIn && (
                            <div className="bg-[#EDE8FF] border border-[#D4C8FF] px-4 py-3 text-[13px] text-[#615E83]">
                                <span className="font-semibold block mb-1 text-[#1E1B39]">Editing Built-in Pattern</span>
                                Core detection logic (Regex, Name) cannot be changed, but you can customise Severity and Default Action.
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-[13px]">
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                className={`w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]${pattern?.isBuiltIn ? ' opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="e.g. Project Secret Code" required disabled={pattern?.isBuiltIn} />
                        </div>

                        {/* Category + Severity row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Category</label>
                                <div className="relative">
                                    <select value={category} onChange={e => setCategory(e.target.value)}
                                        className={selectClass(pattern?.isBuiltIn)} disabled={pattern?.isBuiltIn}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Severity</label>
                                <div className="relative">
                                    <select value={severity} onChange={e => setSeverity(e.target.value)} className={selectClass()}>
                                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Regex */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">
                                Regular Expression <span className="text-[#A5AEB7] font-normal">(JS flavor)</span>
                            </label>
                            <input type="text" value={regex} onChange={e => setRegex(e.target.value)}
                                className={`w-full h-[36px] px-[12px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-mono focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7]${pattern?.isBuiltIn ? ' opacity-50 cursor-not-allowed' : ''}`}
                                placeholder={`e.g. \\bPROJ-\\d{4}\\b`} required disabled={pattern?.isBuiltIn} />
                            <div className="mt-2 flex gap-5">
                                <label className={`flex items-center gap-2 text-[13px] text-[#615E83]${pattern?.isBuiltIn ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}>
                                    <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)}
                                        className="accent-[#6466FF] w-4 h-4" disabled={pattern?.isBuiltIn} />
                                    Case Sensitive
                                </label>
                                <label className={`flex items-center gap-2 text-[13px] text-[#615E83]${pattern?.isBuiltIn ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}>
                                    <input type="checkbox" checked={multiline} onChange={e => setMultiline(e.target.checked)}
                                        className="accent-[#6466FF] w-4 h-4" disabled={pattern?.isBuiltIn} />
                                    Multiline
                                </label>
                            </div>
                        </div>

                        {/* Default Action */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Default Action</label>
                            <div className="relative">
                                <select value={defaultAction} onChange={e => setDefaultAction(e.target.value)} className={selectClass()}>
                                    {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1B39] pointer-events-none" />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#A5AEB7] leading-[16px] mb-[10px]">Description <span className="font-normal">(Optional)</span></label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                className="w-full px-[12px] py-[8px] bg-white border border-[#D4C8FF]/50 text-[14px] text-[#1E1B39] font-medium focus:outline-none focus:ring-1 focus:ring-[#6466FF] placeholder:text-[#A5AEB7] min-h-[72px]"
                                placeholder="Explain what this pattern detects..." />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-[25px] pb-[24px] pt-[20px] flex items-center justify-between flex-shrink-0">
                        <div>
                            {pattern && !pattern.isBuiltIn && (
                                <button type="button" onClick={handleReset}
                                    className="h-[48px] px-[20px] text-[#EF4444] border border-[#EF4444] hover:bg-red-50 text-[14px] font-medium transition-colors cursor-pointer">
                                    Reset / Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-[16px]">
                            <button type="button" onClick={onClose}
                                className="h-[48px] px-[35px] border border-[#6466FF] text-[#6466FF] text-[14px] font-medium hover:bg-[#6466FF]/5 transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button type="submit" disabled={createPattern.isPending || updatePattern.isPending}
                                className="h-[48px] px-[26px] bg-[#6466FF] hover:bg-[#5558EE] text-white text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer">
                                {createPattern.isPending || updatePattern.isPending ? 'Saving...' : 'Save Pattern'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
