'use client';

import { useState, useRef, useEffect } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function Input({ label, error, value: propValue, onChange, ...props }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (propValue !== undefined) {
            setHasValue(String(propValue).length > 0);
        }
    }, [propValue]);

    const handleFocus = () => setIsFocused(true);
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        setHasValue(e.target.value.length > 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHasValue(e.target.value.length > 0);
        onChange?.(e);
    };

    const isActive = isFocused || hasValue;

    return (
        <div className="relative w-full">
            <label
                className={`
                    absolute left-3 transition-all duration-150 pointer-events-none
                    ${isActive 
                        ? 'text-xs -top-0.9' 
                        : 'text-base top-3'
                    }
                    ${error 
                        ? 'text-error' 
                        : isActive ?
                        'text-primary' 
                        : 'text-secondary'
                    }   
                    z-10
                `}
                onClick={() => inputRef.current?.focus()}
            >
                {label}
            </label>
            
            <input
                ref={inputRef}
                value={propValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`
                    w-full px-3 py-3 border-2 rounded-4
                    focus:outline-none focus:ring-4 
                    transition-all duration-150
                    text-gray-900 dark:text-gray-900
                    ${error 
                        ? 'border-error focus:ring-error/20' 
                        : 'border-primary focus:ring-primary/20 focus:border-primary'
                    }
                `}
                {...props}
            />
            
            {error && (
                <p className="mt-1 text-sm text-error">
                    {error}
                </p>
            )}
        </div>
    );
}