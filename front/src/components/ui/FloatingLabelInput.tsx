import React, { useState } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: React.ReactNode;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({ label, icon, className, value, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.toString().length > 0;

    return (
        <div className={`relative pt-4 ${className || ''}`}>
            <div className="relative border-b border-gray-300 focus-within:border-[#43B02A] transition-colors duration-300">
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
            pr-8 pb-1 text-gray-800 placeholder-transparent focus:outline-none 
            transition-colors duration-300 font-medium text-sm
          `}
                    placeholder={label}
                />

                <label
                    className={`
            absolute left-0 transition-all duration-300 pointer-events-none
            ${(isFocused || hasValue) ? '-top-4 text-xs text-[#43B02A] font-bold' : 'top-0 text-gray-400 font-normal'}
          `}
                >
                    {label}
                </label>

                {/* Icon positioned on the right to match capture */}
                {icon && (
                    <div className="absolute right-0 bottom-2 text-gray-400">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FloatingLabelInput;
