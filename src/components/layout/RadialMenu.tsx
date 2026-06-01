import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Receipt, Users, Settings, ShoppingCart,
  BookOpen, BarChart3, Menu, X, Wallet, Package,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Sales', href: '/invoices', icon: Receipt },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Vouchers', href: '/vouchers', icon: Wallet },
  { name: 'Parties', href: '/clients', icon: Users },
  { name: 'Accounts', href: '/accounts', icon: BookOpen },
  { name: 'Reports', href: '/reports/pnl', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const RADIUS = 120;
const MotionLink = motion.create(Link);

export function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Radial items — centered on screen */}
      <div className="fixed inset-0 z-[65] pointer-events-none flex items-center justify-center">
        <AnimatePresence>
          {isOpen && navItems.map((item, index) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            const angle = (index / navItems.length) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * RADIUS;
            const y = Math.sin(rad) * RADIUS;
            const tooltipBelow = y < 0; // items in top half show tooltip below

            return (
              <MotionLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className="absolute pointer-events-auto group"
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x, y, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.04 }}
              >
                <div
                  className={cn(
                    'relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-primary/30'
                      : 'bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {/* Tooltip */}
                  <span
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover text-popover-foreground px-2 py-1 text-xs font-medium shadow-md',
                      'opacity-0 scale-90 transition-all duration-150 pointer-events-none group-hover:opacity-100 group-hover:scale-100',
                      tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                    )}
                  >
                    {item.name}
                  </span>
                </div>
              </MotionLink>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Trigger — bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70]">
        <motion.button
          onClick={toggle}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-xl',
            'bg-primary text-primary-foreground hover:shadow-primary/40',
            isOpen && 'bg-destructive hover:bg-destructive/90'
          )}
          animate={{ rotate: isOpen ? 90 : 0, scale: isOpen ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
      </div>
    </>
  );
}
