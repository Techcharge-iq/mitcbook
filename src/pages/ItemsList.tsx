// pages/ItemsList.tsx
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, Wrench, Search, Building2 } from 'lucide-react';
import type { Item, ItemKind } from '@/types';
import { currencySymbols } from '@/types';
import {
  generateCode,
  getMovements,
  getStockBalance,
  getInventoryValuation,
  getServiceUsage,
  isItemActive,
  getItemKind,
} from '@/lib/stockLedger';

const GOODS_UNITS = ['PCS', 'KG', 'BOX', 'LTR', 'MTR', 'SET', 'BAG', 'CTN'];
const SERVICE_UNITS = ['Job', 'Hour', 'Visit', 'Service', 'Day', 'Month'];

const emptyItem = (kind: ItemKind, defaultVat: number, vatEnabled: boolean, companyId: string): Item => ({
  id: '',
  kind,
  code: '',
  category: '',
  name: '',
  description: '',
  unit: kind === 'goods' ? 'PCS' : 'Job',
  rate: 0,
  cost: 0,
  stock: 0,
  minStock: 0,
  reorderLevel: 0,
  active: true,
  vatApplicable: vatEnabled,
  vatPercentage: defaultVat,
  createdAt: new Date().toISOString(),
  companyId: companyId,
});

export default function ItemsList() {
  const { 
    items, 
    addItem, 
    updateItem, 
    deleteItem, 
    settings, 
    invoices, 
    purchaseInvoices,
    currentCompany,
    companies,
    setCurrentCompany
  } = useApp();
  const { toast } = useToast();
  const currencySymbol = currencySymbols[settings.currency];
  const defaultVat = settings.defaultVatPercentage ?? 5;
  const vatEnabled = settings.vatEnabled ?? true;

  const [tab, setTab] = useState<ItemKind>('goods');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Item>(emptyItem('goods', defaultVat, vatEnabled, currentCompany?.id || ''));
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  // Filter items by current company
  const companyItems = useMemo(() => {
    if (!currentCompany) return [];
    return items.filter(item => item.companyId === currentCompany.id || (item as any).company_id === currentCompany.id);
  }, [items, currentCompany]);

  const goods = useMemo(() => companyItems.filter((i) => getItemKind(i) === 'goods'), [companyItems]);
  const services = useMemo(() => companyItems.filter((i) => getItemKind(i) === 'services'), [companyItems]);

  const filterList = (list: Item[]) => {
    const q = search.trim().toLowerCase();
    return list.filter((i) => {
      if (statusFilter === 'active' && !isItemActive(i)) return false;
      if (statusFilter === 'inactive' && isItemActive(i)) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.code ?? '').toLowerCase().includes(q) ||
        (i.category ?? '').toLowerCase().includes(q)
      );
    });
  };

  const openNew = () => {
    if (!currentCompany) {
      toast({ title: 'No Company Selected', description: 'Please select a company first', variant: 'destructive' });
      return;
    }
    const fresh = emptyItem(tab, defaultVat, vatEnabled, currentCompany.id);
    fresh.code = generateCode(tab, companyItems);
    setEditing(null);
    setForm(fresh);
    setEditorOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ ...emptyItem(getItemKind(item), defaultVat, vatEnabled, currentCompany?.id || ''), ...item });
    setEditorOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (!currentCompany) {
      toast({ title: 'No Company Selected', variant: 'destructive' });
      return;
    }
    
    const code = form.code?.trim() || generateCode(getItemKind(form), companyItems);
    const payload: Item = { 
      ...form, 
      code, 
      companyId: currentCompany.id
    };
    
    if (editing) {
      updateItem({ ...payload, id: editing.id });
      toast({ title: 'Item updated', description: form.name });
    } else {
      addItem({ ...payload, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      toast({ title: `${getItemKind(form) === 'goods' ? 'Goods' : 'Service'} created`, description: form.name });
    }
    setEditorOpen(false);
  };

  const remove = (item: Item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    deleteItem(item.id);
    toast({ title: 'Deleted', variant: 'destructive' });
  };

  // Show company selection prompt if no company
  if (!currentCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Company Selected</h2>
        <p className="text-sm text-muted-foreground">Please select a company from the dropdown above to manage items.</p>
        {companies.length > 0 && (
          <Select onValueChange={(value) => {
            const company = companies.find(c => c.id === value);
            if (company) setCurrentCompany(company);
          }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Items Management
            <Badge variant="outline" className="ml-2 text-xs">
              {currentCompany.name}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">Goods & Services master with stock tracking</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> New {tab === 'goods' ? 'Goods' : 'Service'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ItemKind)}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="goods" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Goods
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{goods.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Services
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{services.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-3">
          <CardHeader className="py-2.5 px-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="h-8 border-0 shadow-none focus-visible:ring-0 px-0"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <TabsContent value="goods" className="mt-0">
              <GoodsTable
                rows={filterList(goods)}
                currencySymbol={currencySymbol}
                invoices={invoices}
                purchases={purchaseInvoices}
                onOpen={(it) => setDetailItem(it)}
                onEdit={openEdit}
                onDelete={remove}
              />
            </TabsContent>
            <TabsContent value="services" className="mt-0">
              <ServicesTable
                rows={filterList(services)}
                currencySymbol={currencySymbol}
                invoices={invoices}
                onOpen={(it) => setDetailItem(it)}
                onEdit={openEdit}
                onDelete={remove}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit' : 'New'} {getItemKind(form) === 'goods' ? 'Goods' : 'Service'}
            </DialogTitle>
            <DialogDescription>
              {currentCompany && `Company: ${currentCompany.name}`}
              <br />
              {getItemKind(form) === 'goods'
                ? 'Inventory-tracked product'
                : 'Non-inventory service item'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{getItemKind(form) === 'goods' ? 'Item' : 'Service'} Code</Label>
                <Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto" className="h-9" />
              </div>
              <div className="space-y-1.5 flex items-end justify-between rounded-md border px-2.5">
                <div>
                  <Label className="text-xs">Active</Label>
                  <p className="text-[10px] text-muted-foreground">Inactive items hidden in pickers</p>
                </div>
                <Switch checked={form.active !== false} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{getItemKind(form) === 'goods' ? 'Item' : 'Service'} Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tea Powder" className="h-9" />
            </div>

            {getItemKind(form) === 'goods' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beverages" className="h-9" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit ?? ''} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(getItemKind(form) === 'goods' ? GOODS_UNITS : SERVICE_UNITS).map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Selling Price ({currencySymbol})</Label>
                <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) || 0 })} className="h-9" />
              </div>
            </div>

            {getItemKind(form) === 'goods' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Purchase Cost ({currencySymbol})</Label>
                    <Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current / Opening Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum Stock</Label>
                  <Input type="number" value={form.minStock ?? 0} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) || 0, reorderLevel: Number(e.target.value) || 0 })} className="h-9" />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border p-2.5">
                <Label className="text-xs">VAT Applicable</Label>
                <Switch checked={form.vatApplicable} onCheckedChange={(v) => setForm({ ...form, vatApplicable: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VAT %</Label>
                <Input type="number" step="0.01" value={form.vatPercentage} onChange={(e) => setForm({ ...form, vatPercentage: Number(e.target.value) || 0 })} disabled={!form.vatApplicable} className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <SheetContent side="right" className="sm:max-w-[560px] w-full overflow-y-auto">
          {detailItem && (
            <DetailPanel
              item={detailItem}
              currencySymbol={currencySymbol}
              invoices={invoices}
              purchases={purchaseInvoices}
              onEdit={() => { openEdit(detailItem); setDetailItem(null); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GoodsTable({ rows, currencySymbol, invoices, purchases, onOpen, onEdit, onDelete }: {
  rows: Item[];
  currencySymbol: string;
  invoices: any[];
  purchases: any[];
  onOpen: (it: Item) => void;
  onEdit: (it: Item) => void;
  onDelete: (it: Item) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No goods yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2">Code</th>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2 hidden md:table-cell">Category</th>
            <th className="text-left py-2 hidden sm:table-cell">Unit</th>
            <th className="text-right py-2 hidden md:table-cell">Cost</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Stock</th>
            <th className="text-right py-2 hidden sm:table-cell">Min</th>
            <th className="text-center py-2">Status</th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const movements = getMovements(item, { invoices, purchases });
            const balance = getStockBalance(item, movements);
            const min = item.minStock ?? item.reorderLevel ?? 0;
            const low = balance < min || balance < 0;
            return (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onOpen(item)}>
                <td className="py-2 font-mono text-xs">{item.code || '—'}</td>
                <td className="py-2 font-medium">{item.name}</td>
                <td className="py-2 hidden md:table-cell text-muted-foreground">{item.category || '—'}</td>
                <td className="py-2 hidden sm:table-cell text-muted-foreground">{item.unit || '—'}</td>
                <td className="py-2 text-right hidden md:table-cell">{currencySymbol}{(item.cost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                <td className="py-2 text-right">{currencySymbol}{item.rate.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                <td className={`py-2 text-right font-semibold ${low ? 'text-destructive' : ''}`}>{balance}</td>
                <td className="py-2 text-right hidden sm:table-cell text-muted-foreground">{min}</td>
                <td className="py-2 text-center">
                  <Badge variant={isItemActive(item) ? 'secondary' : 'outline'} className="text-[10px]">
                    {isItemActive(item) ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ServicesTable({ rows, currencySymbol, invoices, onOpen, onEdit, onDelete }: {
  rows: Item[];
  currencySymbol: string;
  invoices: any[];
  onOpen: (it: Item) => void;
  onEdit: (it: Item) => void;
  onDelete: (it: Item) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No services yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2">Code</th>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2 hidden sm:table-cell">Unit</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2 hidden md:table-cell">Total Sales</th>
            <th className="text-center py-2">Status</th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const usage = getServiceUsage(item, invoices);
            return (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onOpen(item)}>
                <td className="py-2 font-mono text-xs">{item.code || '—'}</td>
                <td className="py-2 font-medium">{item.name}</td>
                <td className="py-2 hidden sm:table-cell text-muted-foreground">{item.unit || '—'}</td>
                <td className="py-2 text-right">{currencySymbol}{item.rate.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                <td className="py-2 text-right hidden md:table-cell">{currencySymbol}{usage.totalSales.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                <td className="py-2 text-center">
                  <Badge variant={isItemActive(item) ? 'secondary' : 'outline'} className="text-[10px]">
                    {isItemActive(item) ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ item, currencySymbol, invoices, purchases, onEdit }: {
  item: Item;
  currencySymbol: string;
  invoices: any[];
  purchases: any[];
  onEdit: () => void;
}) {
  const isGoods = getItemKind(item) === 'goods';
  const movements = isGoods ? getMovements(item, { invoices, purchases }) : [];
  const balance = isGoods ? getStockBalance(item, movements) : 0;
  const valuation = isGoods ? getInventoryValuation(item, balance) : 0;
  const totalPurchased = movements.filter((m) => m.type === 'purchased').reduce((s, m) => s + m.qty, 0);
  const totalSold = movements.filter((m) => m.type === 'sold').reduce((s, m) => s + Math.abs(m.qty), 0);
  const usage = !isGoods ? getServiceUsage(item, invoices) : null;
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {isGoods ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
          {item.name}
        </SheetTitle>
        <SheetDescription>
          {item.code || '—'} · {item.unit || '—'} · {isItemActive(item) ? 'Active' : 'Inactive'}
          {item.companyId && (
            <span className="block text-[10px] text-muted-foreground mt-1">
              Company ID: {item.companyId}
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        {isGoods ? (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Current Stock" value={String(balance)} highlight={balance < 0} />
            <Stat label="Inventory Value" value={fmt(valuation)} />
            <Stat label="Total Purchased" value={String(totalPurchased)} />
            <Stat label="Total Sold" value={String(totalSold)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Times Used" value={String(usage!.timesUsed)} />
            <Stat label="Total Sales" value={fmt(usage!.totalSales)} />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{isGoods ? 'Stock Movements' : 'Usage History'}</h3>
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
          </div>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Reference</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-right py-2 px-2">Qty</th>
                  {isGoods && <th className="text-right py-2 px-2">Balance</th>}
                </tr>
              </thead>
              <tbody>
                {isGoods ? (
                  movements.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No movements</td></tr>
                  ) : movements.map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 px-2">{m.date || '—'}</td>
                      <td className="py-1.5 px-2 font-medium">{m.reference}</td>
                      <td className="py-1.5 px-2">
                        <Badge variant="secondary" className="text-[9px]">{m.type}</Badge>
                      </td>
                      <td className={`py-1.5 px-2 text-right ${m.qty < 0 ? 'text-destructive' : m.qty > 0 ? 'text-success' : ''}`}>
                        {m.qty > 0 ? '+' : ''}{m.qty}
                      </td>
                      <td className={`py-1.5 px-2 text-right font-semibold ${(m.runningBalance ?? 0) < 0 ? 'text-destructive' : ''}`}>
                        {m.runningBalance}
                      </td>
                    </tr>
                  ))
                ) : (
                  usage!.rows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Not used yet</td></tr>
                  ) : usage!.rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 px-2">{r.date}</td>
                      <td className="py-1.5 px-2 font-medium">{r.doc}</td>
                      <td className="py-1.5 px-2"><Badge variant="secondary" className="text-[9px]">sold</Badge></td>
                      <td className="py-1.5 px-2 text-right">{r.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  );
}