import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEME_COLORS } from '@/contexts/ThemeContext';
import { UserRole, ROLE_LABELS } from '@/types';
import {
  LayoutDashboard,
  Car,
  Users,
  Wrench,
  Fuel,
  MapPin,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: UserRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['admin', 'technician', 'driver', 'direction', 'collaborator'],
  },
  {
    icon: Car,
    label: 'Véhicules',
    path: '/vehicles',
    roles: ['admin', 'technician', 'driver', 'direction', 'collaborator'],
  },
  {
    icon: Users,
    label: 'Chauffeurs',
    path: '/drivers',
    roles: ['admin', 'technician', 'driver', 'direction'],
  },
  {
    icon: Wrench,
    label: 'Entretien',
    path: '/maintenance',
    roles: ['admin', 'technician', 'direction', 'collaborator'],
    badge: 3,
  },
  {
    icon: Fuel,
    label: 'Carburant',
    path: '/fuel',
    roles: ['admin', 'technician', 'driver', 'direction', 'collaborator'],
  },
  {
    icon: MapPin,
    label: 'Missions',
    path: '/missions',
    roles: ['admin', 'technician', 'driver', 'direction'],
    badge: 2,
  },
  {
    icon: Calendar,
    label: 'Planning',
    path: '/planning',
    roles: ['admin', 'technician', 'driver', 'direction', 'collaborator'],
  },
  {
    icon: Shield,
    label: 'Échéances',
    path: '/compliance',
    roles: ['admin', 'technician'],
  },
  {
    icon: FileText,
    label: 'Récapitulatif',
    path: '/reports',
    roles: ['admin', 'technician', 'direction'],
  },
  {
    icon: Settings,
    label: 'Paramètres',
    path: '/settings',
    roles: ['admin'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  const location = useLocation();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const content = (
      <NavLink
        to={item.path}
        className={cn(
          'flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 group relative',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-between overflow-hidden">
            <span className="text-sm font-normal capitalize whitespace-nowrap">
              {item.label}
            </span>
            {item.badge && (
              <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-semibold ml-2 shrink-0">
                {item.badge}
              </Badge>
            )}
          </div>
        )}
        {isCollapsed && item.badge && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white shadow-sm" />
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-[#2D1B69] text-white border-white/20 text-xs font-medium capitalize px-3 py-2">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      style={{
        background: `linear-gradient(to bottom, ${currentTheme.gradientFrom}, ${currentTheme.gradientVia}, ${currentTheme.gradientTo})`,
      }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-500 ease-in-out shadow-2xl rounded-r-3xl',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Premium Header */}
      <div className="flex h-20 items-center justify-center border-b border-white/10 px-4 mb-6 relative">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shadow-lg hover:bg-white/30 transition-all duration-300">
            <Car className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight text-white whitespace-nowrap">
              FIARA<span className="text-white/80">motion</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Space */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-2 max-h-[calc(100vh-280px)] thin-scrollbar">
        {filteredNavItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </nav>

      {/* Premium Profile Section */}
      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-white/10 space-y-3">
        {/* Theme Selector */}
        <DropdownMenu open={isThemePickerOpen} onOpenChange={setIsThemePickerOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl justify-start gap-3',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <div
                className="h-6 w-6 rounded-full border-2 border-white/30 shrink-0"
                style={{ backgroundColor: currentTheme.primaryColor }}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium">Changer le thème</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-64 bg-card border-border"
          >
            <div className="grid grid-cols-2 gap-2 p-2">
              {THEME_COLORS.map((theme) => (
                <DropdownMenuItem
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                    currentTheme.id === theme.id && 'bg-accent ring-2 ring-primary'
                  )}
                >
                  <div
                    className="h-8 w-8 rounded-full border-2 border-border shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{theme.name}</p>
                    <p className="text-[10px] text-muted-foreground">{theme.primaryColor}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Card */}
        <div className={cn(
          'rounded-xl bg-white/5 p-4 relative group cursor-default transition-all duration-300',
          isCollapsed ? 'p-2 flex flex-col items-center gap-4' : 'flex items-center gap-4'
        )}>
          <div className="relative shrink-0">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-[#2D1B69] animate-pulse" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate capitalize">{user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/10 text-white/80 border-white/20 text-[10px] font-medium h-4 px-2 leading-none capitalize">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}

          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Ultra-Modern Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-24 h-7 w-7 rounded-lg border border-white/20 bg-[#2D1B69] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#3D2B79] transition-all duration-300 shadow-xl z-50"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};
