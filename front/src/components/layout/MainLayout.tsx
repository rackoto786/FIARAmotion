import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIAssistant } from '@/components/assistant/AIAssistant';

export const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={cn(
          'transition-all duration-500 ease-in-out',
          sidebarCollapsed ? 'ml-20' : 'ml-72'
        )}
      >
        <Header onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AIAssistant />
    </div>
  );
};
