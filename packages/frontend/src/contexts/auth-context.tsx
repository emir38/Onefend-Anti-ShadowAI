'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, LoginRequest } from '@/lib/api-client';

interface User {
    id: string;
    email: string;
    role: string;
    isMfaEnabled?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginRequest) => Promise<any>;
    verifyMfaLogin: (tempToken: string, code: string) => Promise<any>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        /**
         * Check active session by querying the backend with the SSO cookie.
         * We no longer use localStorage -- the HttpOnly cookie is the single source of truth.
         * If the backend responds 200, we have a valid session.
         */
        const checkSession = async () => {
            try {
                const data = await authApi.validateSession();
                if (data?.user) {
                    setUser(data.user);
                }
            } catch {
                // No valid session -- keep user=null
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = useCallback(async (credentials: LoginRequest) => {
        const response = await authApi.login(credentials);
        if (response.access_token && response.user) {
            // Cookie set automatically by the backend via Set-Cookie
            // We don't store anything in localStorage
            setUser(response.user);
            // Mark as not-loading to avoid ProtectedRoute flash
            setLoading(false);
        }
        return response;
    }, []);

    const verifyMfaLogin = useCallback(async (tempToken: string, code: string) => {
        const response = await authApi.verifyMfa({ tempToken, code });
        if (response.access_token && response.user) {
            // Cookie set automatically by the backend after successful MFA
            setUser(response.user);
            setLoading(false);
        }
        // Return response so the login page can verify the result
        return response;
    }, []);

    const logout = useCallback(async () => {
        try {
            // Revoke token in Redis + clear .onefend.io cookie
            await authApi.logout();
        } catch {
            /* ignore network errors during logout */
        } finally {
            setUser(null);
            // Full navigation to /login to clear all client-side state
            window.location.href = '/login';
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                verifyMfaLogin,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
