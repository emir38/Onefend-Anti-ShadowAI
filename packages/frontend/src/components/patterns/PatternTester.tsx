'use client';

import { useState } from 'react';
import { useTestPattern, useAiAnalysis } from '@/hooks/use-api';

interface PatternTesterProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PatternTester({ isOpen, onClose }: PatternTesterProps) {
    const testPattern = useTestPattern();
    const aiAnalysis = useAiAnalysis();

    const [mode, setMode] = useState<'REGEX' | 'AI'>('REGEX');

    // Regex Form State
    const [regex, setRegex] = useState('');
    const [testString, setTestString] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [multiline, setMultiline] = useState(false);

    // AI Form State
    const [aiText, setAiText] = useState('');
    const [aiResult, setAiResult] = useState<any>(null);

    const [regexResult, setRegexResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRegexTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setRegexResult(null);

        try {
            const res = await testPattern.mutateAsync({
                regex,
                testString,
                caseSensitive,
                multiline
            });
            setRegexResult(res);
        } catch (err: any) {
            setError(err.message || 'Error testing regex');
        }
    };

    const handleAiTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setAiResult(null);

        try {
            const res = await aiAnalysis.mutateAsync({
                text: aiText,
                context: 'Manual Test'
            });
            setAiResult(res);
        } catch (err: any) {
            setError(err.message || 'Error performing AI analysis');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">
                        Test Detection Patterns
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex border-b border-gray-700">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'REGEX' ? 'bg-blue-900/20 text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setMode('REGEX')}
                    >
                        Regex Engine
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'AI' ? 'bg-purple-900/20 text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setMode('AI')}
                    >
                        Onefend Analysis
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {mode === 'REGEX' ? (
                        <>
                            <div className="bg-blue-900/20 border border-blue-800 rounded p-4 text-sm text-blue-200">
                                Use this tool to verify your regex against sample text before saving it.
                            </div>

                            <form onSubmit={handleRegexTest} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Regular Expression</label>
                                    <input
                                        type="text"
                                        value={regex}
                                        onChange={e => setRegex(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. \b(CONFIDENTIAL)\b"
                                        required
                                    />
                                    <div className="mt-2 flex space-x-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="form-checkbox bg-gray-900 border-gray-700 text-blue-600 rounded focus:ring-blue-500" />
                                            <span className="text-sm text-gray-300">Case Sensitive</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" checked={multiline} onChange={e => setMultiline(e.target.checked)} className="form-checkbox bg-gray-900 border-gray-700 text-blue-600 rounded focus:ring-blue-500" />
                                            <span className="text-sm text-gray-300">Multiline</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Test String</label>
                                    <textarea
                                        value={testString}
                                        onChange={e => setTestString(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] font-mono"
                                        placeholder="Paste text here to test against the regex..."
                                        required
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={testPattern.isPending}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {testPattern.isPending ? 'Testing...' : 'Test Regex'}
                                    </button>
                                </div>
                            </form>

                            {regexResult && (
                                <div className={`border rounded-lg p-4 ${regexResult.hasMatch ? 'bg-green-900/20 border-green-700' : 'bg-gray-700/50 border-gray-600'}`}>
                                    <h3 className={`text-lg font-medium mb-2 ${regexResult.hasMatch ? 'text-green-400' : 'text-gray-400'}`}>
                                        {regexResult.hasMatch ? '✅ Match Found' : '❌ No Match'}
                                    </h3>
                                    {regexResult.hasMatch && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-300">Matches found: {regexResult.matches.length}</p>
                                            <div className="bg-black/50 rounded p-2 text-sm font-mono text-green-300 overflow-x-auto">
                                                {JSON.stringify(regexResult.matches, null, 2)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="bg-purple-900/20 border border-purple-800 rounded p-4 text-sm text-purple-200">
                                Use the Onefend analysis engine to evaluate text context and risk level. Detection is deeper and understands nuance.
                            </div>

                            <form onSubmit={handleAiTest} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Text to Analyze</label>
                                    <textarea
                                        value={aiText}
                                        onChange={e => setAiText(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 text-sm min-h-[120px] font-mono"
                                        placeholder="Paste sensitive text here (e.g. strategy document, code snippet)..."
                                        required
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={aiAnalysis.isPending}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                                    >
                                        {aiAnalysis.isPending ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Analyzing...
                                            </>
                                        ) : 'Analyze with AI'}
                                    </button>
                                </div>
                            </form>

                            {aiResult && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className={`border rounded-lg p-4 ${aiResult.riskLevel === 'CRITICAL' || aiResult.riskLevel === 'HIGH' ? 'bg-red-900/20 border-red-700' :
                                        aiResult.riskLevel === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-green-900/20 border-green-700'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">Analysis Result</h3>
                                                <div className="flex gap-2">
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white border border-white/20">
                                                        {aiResult.category}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${aiResult.riskLevel === 'HIGH' || aiResult.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                                                        aiResult.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' :
                                                            'bg-green-500/20 text-green-400 border-green-500/20'
                                                        }`}>
                                                        {aiResult.riskLevel} RISK
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                                        {(aiResult.confidenceScore * 100).toFixed(0)}% Conf.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-3">
                                            {aiResult.summary}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded text-sm">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
