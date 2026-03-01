import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from './api';

interface User {
    id: string;
    name: string;
    phone: string;
    role: 'OWNER' | 'SHOP_STAFF' | 'DELIVERY';
    tenant_id: string;
    shop_name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (phone: string, pin: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(
        localStorage.getItem('token')
    );
    const [loading, setLoading] = useState(!user && !!token);

    useEffect(() => {
        if (token) {
            authApi
                .me()
                .then((res) => {
                    const userData = res.data.data;
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (phone: string, pin: string) => {
        const res = await authApi.login(phone, pin);
        const data = res.data.data;
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
