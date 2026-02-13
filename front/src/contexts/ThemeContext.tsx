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
        gradientFrom: '#1c3a11', // Deep forest
        gradientVia: '#43B02A', // Primary
        gradientTo: '#5dc73a', // Bright lime (less white)
    },
    {
        id: 'red',
        name: 'Pantone 711 C',
        primaryColor: '#CB2C30',
        gradientFrom: '#4d1112', // Deep burgundy
        gradientVia: '#CB2C30', // Primary
        gradientTo: '#e63c40', // Bright red
    },
    {
        id: 'gray',
        name: 'Pantone 438 C',
        primaryColor: '#584446',
        gradientFrom: '#1a1415', // Deep charcoal
        gradientVia: '#584446', // Primary
        gradientTo: '#8c7678', // Soft ash
    },
    {
        id: 'yellow',
        name: 'Pantone 116 C',
        primaryColor: '#FFCD00',
        gradientFrom: '#665200', // Deep gold
        gradientVia: '#FFCD00', // Primary
        gradientTo: '#ffe033', // Golden glow
    },
    {
        id: 'orange',
        name: 'Pantone 715 C',
        primaryColor: '#F8BD2E',
        gradientFrom: '#634b12', // Deep bronze
        gradientVia: '#F8BD2E', // Primary
        gradientTo: '#ffd05e', // Warm glow
    },
    {
        id: 'lime',
        name: 'Pantone 382 C',
        primaryColor: '#C4D600',
        gradientFrom: '#4b5200', // Deep olive
        gradientVia: '#C4D600', // Primary
        gradientTo: '#e3f533', // Electric lime
    },
    {
        id: 'black',
        name: 'Pantone Process Black C',
        primaryColor: '#2C2A29',
        gradientFrom: '#000000', // Pitch black
        gradientVia: '#2C2A29', // Deep gray
        gradientTo: '#4d4b4a', // Steel
    },
    {
        id: 'cyan',
        name: 'Pantone 637 C',
        primaryColor: '#4EC3E0',
        gradientFrom: '#1c4e5a', // Deep ocean
        gradientVia: '#4EC3E0', // Primary
        gradientTo: '#7dd4ed', // Sky glow
    },
    {
        id: 'absolute_black',
        name: 'Noir Absolu',
        primaryColor: '#000000',
        gradientFrom: '#000000',
        gradientVia: '#050505',
        gradientTo: '#1a1a1a',
    },
    {
        id: 'violet',
        name: 'Pantone 2685 C',
        primaryColor: '#7C3AED',
        gradientFrom: '#2e1065', // Deep purple
        gradientVia: '#7C3AED', // Primary
        gradientTo: '#a78bfa', // Lavender glow
    },
    {
        id: 'toxic_green',
        name: 'Vert Toxique',
        primaryColor: '#33CC33',
        gradientFrom: '#0a3d0a', // Deep neon
        gradientVia: '#33CC33', // Primary
        gradientTo: '#52eb52', // Neon glow
    },
    {
        id: 'deep_blue',
        name: 'Bleu Profond',
        primaryColor: '#1C69A8',
        gradientFrom: '#081e30', // Deep abyss
        gradientVia: '#1C69A8', // Primary
        gradientTo: '#2a86cf', // Azure glow
    },
    {
        id: 'vibrant_pink',
        name: 'Rose Vibrant',
        primaryColor: '#F6339A',
        gradientFrom: '#4d0b2f', // Deep fuchsia
        gradientVia: '#F6339A', // Primary
        gradientTo: '#fa71b7', // Pink glow
    },
    {
        id: 'blaze_orange',
        name: 'Orange Flamboyant',
        primaryColor: '#FF8904',
        gradientFrom: '#4d2901', // Deep coal-orange
        gradientVia: '#FF8904', // Primary
        gradientTo: '#ffa842', // Amber glow
    },
    {
        id: 'royal_blue',
        name: 'Bleu Royal',
        primaryColor: '#3333FF',
        gradientFrom: '#00004d', // Ultra deep blue
        gradientVia: '#3333FF', // Primary
        gradientTo: '#6666ff', // Sapphire glow
    },
    {
        id: 'pure_red',
        name: 'Rouge Pur',
        primaryColor: '#CC0000',
        gradientFrom: '#330000', // Deep blood
        gradientVia: '#CC0000', // Primary
        gradientTo: '#ff3333', // Lava glow
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
