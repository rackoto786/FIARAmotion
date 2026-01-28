import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
    id: string;
    name: string;
    primaryColor: string;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
}

export const THEME_COLORS: ThemeColors[] = [
    {
        id: 'green',
        name: 'Pantone 361 C',
        primaryColor: '#43B02A',
        gradientFrom: '#2d5a1e',
        gradientVia: '#43B02A',
        gradientTo: '#5dc73a',
    },
    {
        id: 'red',
        name: 'Pantone 711 C',
        primaryColor: '#CB2C30',
        gradientFrom: '#8a1f22',
        gradientVia: '#CB2C30',
        gradientTo: '#e63c40',
    },
    {
        id: 'gray',
        name: 'Pantone 438 C',
        primaryColor: '#584446',
        gradientFrom: '#2c2122',
        gradientVia: '#584446',
        gradientTo: '#7a6668',
    },
    {
        id: 'yellow',
        name: 'Pantone 116 C',
        primaryColor: '#FFCD00',
        gradientFrom: '#cc9900',
        gradientVia: '#FFCD00',
        gradientTo: '#ffe033',
    },
    {
        id: 'orange',
        name: 'Pantone 715 C',
        primaryColor: '#F8BD2E',
        gradientFrom: '#c69424',
        gradientVia: '#F8BD2E',
        gradientTo: '#ffd05e',
    },
    {
        id: 'lime',
        name: 'Pantone 382 C',
        primaryColor: '#C4D600',
        gradientFrom: '#8a9600',
        gradientVia: '#C4D600',
        gradientTo: '#d9e833',
    },
    {
        id: 'black',
        name: 'Pantone Process Black C',
        primaryColor: '#2C2A29',
        gradientFrom: '#1a1918',
        gradientVia: '#2C2A29',
        gradientTo: '#3e3c3a',
    },
    {
        id: 'cyan',
        name: 'Pantone 637 C',
        primaryColor: '#4EC3E0',
        gradientFrom: '#3a8fa3',
        gradientVia: '#4EC3E0',
        gradientTo: '#7dd4ed',
    },
    {
        id: 'absolute_black',
        name: 'Noir Absolu',
        primaryColor: '#000000',
        gradientFrom: '#000000',
        gradientVia: '#000000',
        gradientTo: '#000000',
    },
    {
        id: 'violet',
        name: 'Pantone 2685 C',
        primaryColor: '#7C3AED',
        gradientFrom: '#5B21B6',
        gradientVia: '#7C3AED',
        gradientTo: '#A78BFA',
    },
];

interface ThemeContextType {
    currentTheme: ThemeColors;
    setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeColors>(() => {
        // Load saved theme from localStorage
        const savedThemeId = localStorage.getItem('sidebarTheme');
        return THEME_COLORS.find(t => t.id === savedThemeId) || THEME_COLORS[0];
    });

    const setTheme = (themeId: string) => {
        const theme = THEME_COLORS.find(t => t.id === themeId);
        if (theme) {
            setCurrentTheme(theme);
            localStorage.setItem('sidebarTheme', themeId);
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
