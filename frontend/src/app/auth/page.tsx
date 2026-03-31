'use client';

import Input from "@/src/components/ui/Input";
import { useState } from "react";
import { FaVk } from "react-icons/fa";
import Image from 'next/image';

export default function Auth() {

    var [mode, setMode] = useState<'login' | 'register'>('login');

    const handleMode = () => {
        setMode(prev => prev === 'login' ? 'register' : 'login');

        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
    }

    return (

        <div className="relative w-full min-h-[calc(100vh-4rem)] overflow-hidden bg-white flex">
            {mode === 'login' ? (
                <Image 
                src="/images/Logo.png"
                alt="logo"
                width={160}
                height={160}
                />           
            ) : (
                <h3 className="self-start text-sm md:text-base text-white/90 max-w-xl">Забудьте о неудобных конспектах в блокноте во время интернет лекций!</h3>
            )}

            <div
                className="absolute h-full inset-y-0 left-0 min-w-[60vw] bg-primary flex flex-col items-start justify-center p-10 gap-4 transition-transform duration-700 ease-in-out"
                style={{ transform: mode === 'register' ? 'translateX(40vw)' : 'translateX(0)' }}
            >
            {mode === 'login' ? (
                <h1 className="self-start text-5xl md:text-6xl font-extrabold text-white">Логин</h1>
            ) : (
                <h1 className="self-start text-5xl md:text-6xl font-extrabold text-white">Регистрация</h1>
            )}
            {mode === 'login' ? (
                <h3 className="self-start text-sm md:text-base text-white/90 max-w-xl">Broad Board. Для тех, кто готов посвятить 100% себя решению задачи.</h3>
            ) : (
                <h3 className="self-start text-sm md:text-base text-white/90 max-w-xl">Забудьте о неудобных конспектах в блокноте во время интернет лекций!</h3>
            )}
            <form 
            onSubmit={handleSubmit}
            className='flex flex-col bg-white dark:bg-white rounded-4 p-4 w-full max-w-sm gap-3 mx-auto'>
                <Input label="Email" />
                <Input label="Пароль" type="password"/>
                {mode === 'register' && (
                    <div className="fade-in-up">
                        <Input label="Подтвердить пароль" type="password"/>
                    </div>
                )}
                {mode === 'login' ? (
                    <button className="bg-primary hover:bg-primary-hover text-white rounded-4 h-12 px-4 transition focus:outline-none hover:ring-4 hover:ring-primary/30">
                        Войти
                    </button>
                ) : (
                    <button className="bg-primary hover:bg-primary-hover text-white rounded-4 h-12 px-4 transition focus:outline-none hover:ring-4 hover:ring-secondary/30">
                        Зарегистрироваться
                    </button>
                )}

                <div className='flex text-primary items-center justify-center'>
                    <div className="flex-grow border-1 border-primary"></div>
                    {mode === 'login' ? (
                        <span className="m-2">Уже есть аккаунт?</span>
                    ) : (
                        <span className="m-2">Нет аккаунта?</span>
                    )}
                    <div className="flex-grow border-1 border-primary"></div>
                </div>
                {mode === 'login' ? (
                    <button 
                        type="button"
                        onClick={handleMode}
                        className="bg-secondary hover:bg-secondary-dark text-white rounded-4 h-12 px-4 transition focus:outline-none focus:ring-2 focus:ring-secondary/30 hover:ring-2 hover:ring-secondary/20">
                        Зарегистрироваться
                    </button>
                ) : (
                    <button 
                    type="button"
                    onClick={handleMode}
                    className="bg-secondary hover:bg-secondary-dark text-white rounded-4 h-12 px-4 transition focus:outline-none focus:ring-2 focus:ring-secondary/30 hover:ring-2 hover:ring-secondary/20">
                        Войти
                    </button>
                )}
                <div className='flex text-primary items-center justify-center'>
                    <div className="flex-grow border-1 border-primary"></div>
                        <span className="m-2"> Или же... </span>
                    <div className="flex-grow border-1 border-primary"></div>
                </div>
                <button className='bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 px-4 py-2 rounded-4 h-12 transition hover:ring-4 hover:ring-blue-200'>
                    <FaVk size={24}/>
                    <span>Войти через ВК</span>
                </button>
            </form>
            </div>
        </div>

    )
}