'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProtectedSidebarProps } from '@/types';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Files,
  Home,
  LayoutDashboard,
  Menu,
  PenTool,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// Icon mapping
const iconMap = {
  Users,
  Bell,
  Files,
  PenTool,
  CreditCard,
  Shield,
  Home,
  Settings,
  LayoutDashboard,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
};

export function ProtectedSidebar({ collapsed, onToggle, sidebarGroups }: ProtectedSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(sidebarGroups.filter((group) => group.defaultOpen).map((group) => group.title))
  );

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  // Get icon component
  const getIcon = (icon: React.ComponentType<{ className?: string }> | string) => {
    if (typeof icon === 'string') {
      return iconMap[icon as keyof typeof iconMap] || Users; // Default to Users icon
    }
    return icon;
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-bold text-primary-foreground text-sm">BS</span>
            </div>
            <Link href="/">
              <span className="font-semibold text-lg">Better-SaaS</span>
            </Link>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <TooltipProvider>
          <nav className="space-y-4">
            {sidebarGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.title);

              return (
                <div key={group.title} className="space-y-1">
                  {/* Group Header */}
                  {!collapsed && (
                    <Button
                      variant="ghost"
                      className="h-8 w-full justify-between px-2 font-medium text-muted-foreground text-xs hover:text-foreground"
                      onClick={() => toggleGroup(group.title)}
                    >
                      <span className="uppercase tracking-wider">{group.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  )}

                  {/* Group Items */}
                  {(collapsed || isExpanded) && (
                    <div className={cn('space-y-1', !collapsed && 'ml-2')}>
                      {group.items.map((item) => {
                        const Icon = getIcon(item.icon);
                        const isActive =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);

                        const buttonContent = (
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'h-9 w-full justify-start',
                              collapsed ? 'px-2' : 'px-3',
                              isActive && 'bg-secondary text-secondary-foreground'
                            )}
                            asChild
                          >
                            <Link href={item.href}>
                              <Icon className={cn('h-4 w-4', !collapsed && 'mr-3')} />
                              {!collapsed && <span className="text-sm">{item.title}</span>}
                            </Link>
                          </Button>
                        );

                        if (collapsed) {
                          return (
                            <Tooltip key={item.href} delayDuration={0}>
                              <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                              <TooltipContent side="right" className="ml-2">
                                <div className="font-medium">{group.title}</div>
                                <div className="text-muted-foreground text-sm">{item.title}</div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return <div key={item.href}>{buttonContent}</div>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </TooltipProvider>
      </ScrollArea>
    </div>
  );
}
