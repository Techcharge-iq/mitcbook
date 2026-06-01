import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Receipt, ShoppingCart, CreditCard, MoreHorizontal,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Users, BookOpen, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Sales', href: '/invoices', icon: Receipt },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Payments', href: '/payments', icon: CreditCard },
];

const moreItems = [
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Parties', href: '/clients', icon: Users },
  { name: 'Chart of Accounts', href: '/accounts', icon: BookOpen },
  { name: 'Profit & Loss', href: '/reports/pnl', icon: BarChart3 },
  { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: BarChart3 },
  { name: 'Trial Balance', href: '/reports/trial-balance', icon: BarChart3 },
  { name: 'Aging Report', href: '/reports/aging', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link key={item.name} to={item.href}
                className={cn('flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 transition-colors min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground')}>
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium truncate">{item.name}</span>
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 transition-colors min-w-0 text-muted-foreground')}>
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader className="text-left"><SheetTitle>More</SheetTitle></SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {moreItems.map((item) => (
              <Link key={item.name} to={item.href} onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-center font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
