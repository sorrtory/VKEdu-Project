'use client'

import React from "react";

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

interface UserContextValue {
    user: User | null;
    setUser: (user: User | null) => void;
}

const UserContext = React.createContext<UserContextValue | undefined>({
    user: null,
    setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {

}
