import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { currencySymbols, type PurchaseInvoiceStatus } from '@/types';
import { Plus, Search, ShoppingCart, Trash2, Edit } from 'lucide-react';

export default function PurchaseInvoicesList() {
  const { purchaseInvoices, deletePurchaseInvoice, getClient, settings } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseInvoiceStatus | 'all'>('all');
  const currencySymbol = currencySymbols[settings.currency];

  const filtered = purchaseInvoices.filter((p) => {
    const vendor = getClient(p.vendorId);
    const matchesSearch = p.number.toLowerCase().includes(search.toLowerCase()) || vendor?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusDot = (status: PurchaseInvoiceStatus) => {
    const colors: Record<PurchaseInvoiceStatus, string> = {
      draft: 'bg-muted-foreground', sent: 'bg-primary', paid: 'bg-success', partial: 'bg-warning', overdue: 'bg-destructive',
    };
    return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Bills from vendors</p>
        </div>
        <Button asChild size="sm" className="hidden lg:flex">
          <Link to="/purchases/new"><Plus className="mr-1.5 h-4 w-4" />New Bill</Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Received</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No purchase invoices</p>
            <p className="text-xs text-muted-foreground mb-3">{search || statusFilter !== 'all' ? 'Try adjusting filters' : 'Record your first bill'}</p>
            {!search && statusFilter === 'all' && (
              <Button asChild size="sm"><Link to="/purchases/new"><Plus className="mr-1.5 h-4 w-4" />New Bill</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((pi) => {
            const vendor = getClient(pi.vendorId);
            return (
              <Card key={pi.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="hidden xs:flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning shrink-0">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate">{pi.number}</p>
                        {getStatusDot(pi.status)}
                        <span className="text-[10px] text-muted-foreground capitalize">{pi.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{vendor?.name || 'No vendor'}</span>
                        <span>•</span>
                        <span className="shrink-0">Due {new Date(pi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{currencySymbol}{pi.netTotal.toLocaleString('en-IN')}</span>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8"><Link to={`/purchases/${pi.id}`}><Edit className="h-4 w-4" /></Link></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Bill</AlertDialogTitle><AlertDialogDescription>Delete {pi.number}? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletePurchaseInvoice(pi.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
