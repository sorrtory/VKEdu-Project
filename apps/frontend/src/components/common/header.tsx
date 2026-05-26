
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { CgProfile } from 'react-icons/cg';
import { IoMdSettings } from 'react-icons/io';
import { FaHistory } from 'react-icons/fa';
import { useUser } from '@/src/contexts/UserContext';
import { useState } from 'react';

export default function Header() {
    const { user, logout, isAuthLoading } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
        setIsLoggingOut(false);
    };

    return (
        <header className="bg-white dark:bg-background-grey flex items-center justify-center h-16 border-b-4 border-primary">
            <div className="flex justify-between w-full p-2">
                <div className="h-12 w-12 overflow-hidden rounded-full">
                    <Link href='/'>
                        <Image 
                        src="/images/Logo.png"
                        alt="logo"
                        width={300}
                        height={300}
                        />
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/history"
                        title="История конференций"
                        className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-4 h-12 w-12 flex flex-col items-center justify-center gap-2 text-white"
                    >
                        <FaHistory size={24}/>
                    </Link>
                        <button className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-4 h-12 w-12 flex flex-col items-center justify-center gap-2"          >
                            <IoMdSettings size={60}/>
                        </button>
                    {!isAuthLoading && user ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            title={`Выйти (${user.nickname})`}
                            className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-full h-12 min-w-12 flex items-center justify-center gap-2 text-white disabled:opacity-70"
                        >
                            <CgProfile size={24}/>
                            <span className="hidden md:inline text-sm">{user.nickname}</span>
                        </button>
                    ) : (
                        <div>
                            <Link href='/auth'>
                                <button className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-full h-12 w-12 flex flex-col items-center justify-center gap-2"          >
                                    <CgProfile size={60}/>
                                </button>
                            </Link>
                        </div>
                    )}
                </div>              
            </div>
        </header>
    )
}
