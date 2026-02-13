import React, { useState } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'auth';
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({ label, icon, className, value, variant = 'default', ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.toString().length > 0;

    const isAuth = variant === 'auth';

    return (
        <div className={`relative ${isAuth ? 'pt-2' : 'pt-4'} ${className || ''}`}>
            <div className={`
                relative transition-all duration-300
                ${isAuth
                    ? 'bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:bg-primary/5'
                    : 'border-b border-gray-300 focus-within:border-primary'
                }
            `}>
                <input
                    {...props}
                    value={value}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus && props.onFocus(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur && props.onBlur(e);
                    }}
                    className={`
                        w-full bg-transparent 
                        ${isAuth ? 'pb-0 pt-4' : 'pr-8 pb-1'} 
                        text-current placeholder-transparent focus:outline-none 
                        transition-colors duration-300 font-medium text-sm
                    `}
                    placeholder={label}
                />

                <label
                    className={`
                        absolute transition-all duration-300 pointer-events-none
                        ${isAuth ? 'left-4' : 'left-0'}
                        ${(isFocused || hasValue)
                            ? `${isAuth ? 'top-1' : '-top-4'} text-[10px] text-primary font-bold uppercase tracking-wider`
                            : `${isAuth ? 'top-1/2 -translate-y-1/2' : 'top-0'} text-gray-400 font-normal`
                        }
                    `}
                >
                    {label}
                </label>

                {icon && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors duration-300 ${isFocused ? 'text-primary' : ''}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FloatingLabelInput;
