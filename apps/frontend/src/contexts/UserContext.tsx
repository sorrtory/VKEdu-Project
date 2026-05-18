'use client'

import React from "react";

interface User {
    userId: string;
    nickname: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface AuthErrorResponse {
    message?: string | string[];
    error?: string;
}

interface UserContextValue {
    user: User | null;
    accessToken: string | null;
    isAuthLoading: boolean;
    loginWithTokens: (tokens: AuthTokens) => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

const ACCESS_TOKEN_STORAGE_KEY = 'bb_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'bb_refresh_token';

async function getCurrentUser(accessToken: string): Promise<User | null> {
    const response = await fetch('/api/auth/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        return null;
    }

    return (await response.json()) as User;
}

function isAuthTokens(payload: unknown): payload is AuthTokens {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const maybeTokens = payload as Partial<AuthTokens>;
    return typeof maybeTokens.accessToken === 'string' && typeof maybeTokens.refreshToken === 'string';
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [accessToken, setAccessToken] = React.useState<string | null>(null);
    const [refreshToken, setRefreshToken] = React.useState<string | null>(null);
    const [isAuthLoading, setIsAuthLoading] = React.useState(true);

    const clearAuthState = React.useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);

        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
            window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
    }, []);

    const storeTokens = React.useCallback((tokens: AuthTokens) => {
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken);
            window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
        }
    }, []);

    const refreshAccessTokens = React.useCallback(async (currentRefreshToken: string): Promise<AuthTokens | null> => {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        const payload = (await response.json()) as AuthTokens | AuthErrorResponse;
        if (!response.ok || !isAuthTokens(payload)) {
            return null;
        }

        storeTokens(payload);
        return payload;
    }, [storeTokens]);

    const loginWithTokens = React.useCallback(async (tokens: AuthTokens) => {
        storeTokens(tokens);

        const me = await getCurrentUser(tokens.accessToken);
        if (!me) {
            clearAuthState();
            throw new Error('Не удалось получить данные пользователя');
        }

        setUser(me);
    }, [clearAuthState, storeTokens]);

    const logout = React.useCallback(async () => {
        if (refreshToken) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });
        }

        clearAuthState();
    }, [clearAuthState, refreshToken]);

    React.useEffect(() => {
        const initializeAuth = async () => {
            if (typeof window === 'undefined') {
                setIsAuthLoading(false);
                return;
            }

            const storedAccessToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
            const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

            if (!storedAccessToken || !storedRefreshToken) {
                setIsAuthLoading(false);
                return;
            }

            setAccessToken(storedAccessToken);
            setRefreshToken(storedRefreshToken);

            let activeAccessToken = storedAccessToken;
            let me = await getCurrentUser(activeAccessToken);

            if (!me) {
                const refreshedTokens = await refreshAccessTokens(storedRefreshToken);
                if (refreshedTokens) {
                    activeAccessToken = refreshedTokens.accessToken;
                    me = await getCurrentUser(activeAccessToken);
                }
            }

            if (me) {
                setUser(me);
            } else {
                clearAuthState();
            }

            setIsAuthLoading(false);
        };

        void initializeAuth();
    }, [clearAuthState, refreshAccessTokens]);

    const value = React.useMemo<UserContextValue>(() => ({
        user,
        accessToken,
        isAuthLoading,
        loginWithTokens,
        logout,
    }), [user, accessToken, isAuthLoading, loginWithTokens, logout]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}


export function useUser(): UserContextValue {
    const context = React.useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }

    return context;
}
