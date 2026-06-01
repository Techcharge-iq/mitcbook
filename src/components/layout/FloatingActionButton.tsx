import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Receipt, X } from 'lucide-react';

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 lg:hidden">
      {/* Sub-actions */}
      <div className={cn(
        'flex flex-col gap-2 transition-all duration-200',
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        <Link
          to="/quotations/new"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 bg-card border border-border rounded-full pl-3 pr-4 py-2 shadow-lg hover:bg-accent transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">New Quote</span>
        </Link>
        <Link
          to="/invoices/new"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 bg-card border border-border rounded-full pl-3 pr-4 py-2 shadow-lg hover:bg-accent transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">New Invoice</span>
        </Link>
      </div>

      {/* Main FAB */}
      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-transform duration-200',
          isOpen && 'rotate-45'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
