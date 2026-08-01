'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api-client';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!token) {
            setError('No reset token found in URL');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(password)) {
            setError('12+ chars, 1 uppercase, 1 lowercase, 1 number required.');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword({ token, newPassword: password });
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return <div className="text-center text-green-400 bg-green-500/10 border border-green-500/50 p-4 rounded-lg">Password reset successful! Redirecting to login...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/50 text-sm text-center">{error}</div>}
            <div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    required
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                 <p className="text-[12px] text-gray-400 mb-4">Must be 12+ chars, 1 uppercase, 1 lowercase, 1 number.</p>
                <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm Password"
                    required
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button type="submit" disabled={loading} className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                <h1 className="text-3xl font-bold text-white mb-8 text-center">New Password</h1>
                <Suspense fallback={<div className="text-gray-400 text-center">Loading form...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
