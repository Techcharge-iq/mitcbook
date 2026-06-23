import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { currencySymbols, type PurchaseInvoice, type LineItem, type PurchaseInvoiceStatus } from '@/types';
import { Plus, Trash2, Save, ArrowLeft, Edit2, Receipt, Building2, Calendar, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PurchaseInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    purchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice,
    getVendors, getClient, settings, generatePurchaseInvoiceNumber, createJournalEntry,
    payments, getPaymentsByInvoice, calculateInvoicePaymentStatus,
  } = useApp();

  const isEditing = id && id !== 'new';
  const existing = isEditing ? purchaseInvoices.find((p) => p.id === id) : null;
  const currencySymbol = currencySymbols[settings.currency];
  const vendors = getVendors();

  // ✅ Get payments for this invoice
  const invoicePayments = useMemo(() => {
    if (!existing) return [];
    return getPaymentsByInvoice(existing.id);
  }, [existing, getPaymentsByInvoice]);

  // ✅ Calculate payment status
  const paymentStatus = useMemo(() => {
    if (!existing) return 'draft';
    return calculateInvoicePaymentStatus(existing.id);
  }, [existing, calculateInvoicePaymentStatus]);

  // ✅ Calculate total paid and balance
  const totalPaid = useMemo(() => {
    return invoicePayments.reduce((sum, p) => sum + p.amount, 0);
  }, [invoicePayments]);

  const balanceDue = useMemo(() => {
    if (!existing) return 0;
    return existing.netTotal - totalPaid;
  }, [existing, totalPaid]);

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const [vendorId, setVendorId] = useState(existing?.vendorId || '');
  const [invoiceDate, setInvoiceDate] = useState(existing?.invoiceDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(existing?.dueDate || defaultDueDate.toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [terms, setTerms] = useState(existing?.terms || '');
  const [vatEnabled, setVatEnabled] = useState(existing?.vatEnabled ?? settings.vatEnabled ?? true);
  const [items, setItems] = useState<LineItem[]>(
    existing?.items || [{ id: crypto.randomUUID(), name: '', description: '', quantity: 1, rate: 0, total: 0 }]
  );

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);
  const [tempItem, setTempItem] = useState<LineItem>({ id: '', name: '', description: '', quantity: 1, rate: 0, total: 0 });

  // ✅ Calculate VAT
  const vatRate = vatEnabled ? (settings.defaultVatPercentage ?? 5) : 0;
  const netTotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const vatTotal = useMemo(() => +(netTotal * vatRate / 100).toFixed(3), [netTotal, vatRate]);
  const grandTotal = +(netTotal + vatTotal).toFixed(3);
  const currentStatus = existing?.status || 'draft';

  // ✅ Get vendor name
  const vendorName = useMemo(() => {
    const vendor = getClient(vendorId);
    return vendor?.name || '';
  }, [vendorId, getClient]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'quantity' || field === 'rate') {
        item[field] = Number(value) || 0;
        item.total = item.quantity * item.rate;
      } else {
        (item as any)[field] = value;
      }
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    if (isMobile) {
      setTempItem({ id: crypto.randomUUID(), name: '', description: '', quantity: 1, rate: 0, total: 0 });
      setIsAddItemSheetOpen(true);
    } else {
      setItems((prev) => [...prev, { id: crypto.randomUUID(), name: '', description: '', quantity: 1, rate: 0, total: 0 }]);
    }
  };

  const saveMobileItem = () => {
    if (!tempItem.name.trim()) {
      toast({ title: 'Error', description: 'Item name is required', variant: 'destructive' });
      return;
    }
    const itemToSave = { ...tempItem, total: tempItem.quantity * tempItem.rate };
    if (editingItemIndex !== null) {
      setItems((prev) => { const u = [...prev]; u[editingItemIndex] = itemToSave; return u; });
      setEditingItemIndex(null);
    } else {
      setItems((prev) => [...prev, itemToSave]);
    }
    setIsAddItemSheetOpen(false);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast({ title: 'Cannot remove', description: 'At least one item is required.', variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!vendorId) {
      toast({ title: 'Error', description: 'Please select a vendor', variant: 'destructive' });
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      toast({ title: 'Error', description: 'All items must have a name', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();
    if (isEditing && existing) {
      const updated: PurchaseInvoice = {
        ...existing,
        vendorId,
        items,
        netTotal: grandTotal,
        invoiceDate,
        dueDate,
        notes,
        terms,
        vatEnabled,
        updatedAt: now,
      };
      updatePurchaseInvoice(updated);
      toast({ title: 'Bill updated', description: `${existing.number} updated.` });
    } else {
      const pi: PurchaseInvoice = {
        id: crypto.randomUUID(),
        number: generatePurchaseInvoiceNumber(),
        vendorId,
        items,
        netTotal: grandTotal,
        status: 'draft',
        invoiceDate,
        dueDate,
        notes,
        terms,
        vatEnabled,
        createdAt: now,
        updatedAt: now,
      };
      addPurchaseInvoice(pi);

      // Journal: Debit Expense, Credit A/P
      try {
        createJournalEntry({
          id: crypto.randomUUID(),
          date: now,
          reference: pi.number,
          referenceType: 'purchase_invoice',
          referenceId: pi.id,
          description: `Purchase Invoice ${pi.number} - ${vendorName}`,
          lines: [
            { accountId: 'acc-5000', debit: grandTotal, credit: 0 },
            { accountId: 'acc-2000', debit: 0, credit: grandTotal },
          ],
          createdAt: now,
        });
      } catch (err) {
        console.error('[Journal] Entry failed:', err);
        toast({ title: 'Journal entry failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
      }

      toast({ title: 'Bill created', description: `${pi.number} created.` });
      navigate(`/purchases/${pi.id}`);
      return;
    }
  };

  useEffect(() => {
    if (isEditing && !existing) navigate('/purchases');
  }, [isEditing, existing, navigate]);

  // ✅ Status badge colors
  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-primary/10 text-primary',
    paid: 'bg-success/10 text-success',
    partial: 'bg-warning/10 text-warning',
    overdue: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-3 pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases')} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">
              {isEditing ? existing?.number : 'New Purchase Bill'}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              {isEditing ? 'Edit purchase invoice' : 'Create purchase invoice'}
            </p>
          </div>
          {isEditing && (
            <Badge variant="outline" className={`${statusColors[currentStatus]} text-xs ml-1`}>
              {currentStatus}
            </Badge>
          )}
        </div>
        {isEditing && currentStatus !== 'cancelled' && balanceDue > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/payments`)}
            className="h-8 px-2 gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Payment</span>
          </Button>
        )}
      </div>

      {/* ✅ Payment Summary Card (when editing) */}
      {isEditing && existing && (
        <Card>
          <CardContent className="px-3 py-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Bill Amount</p>
                <p className="text-sm font-bold">{currencySymbol}{existing.netTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                <p className="text-sm font-bold text-success">{currencySymbol}{totalPaid.toLocaleString('en-IN')}</p>
              </div>
              <div className={`rounded-lg p-2 ${balanceDue > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
                <p className={`text-sm font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-success'}`}>
                  {currencySymbol}{balanceDue.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            {invoicePayments.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Payment History</p>
                {invoicePayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1">
                    <span>{new Date(p.date).toLocaleDateString()}</span>
                    <span className="font-medium">{currencySymbol}{p.amount.toLocaleString('en-IN')}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{p.method}</Badge>
                    {p.reference && <span className="text-muted-foreground text-[10px]">Ref: {p.reference}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vendor & Details */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Vendor & Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vendors.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No vendors found. Add a vendor in Parties first.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Invoice Date
              </Label>
              <Input 
                type="date" 
                value={invoiceDate} 
                onChange={(e) => setInvoiceDate(e.target.value)} 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Due Date
              </Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor Reference</Label>
              <Input 
                value={terms} 
                onChange={(e) => setTerms(e.target.value)} 
                placeholder="PO # or reference" 
                className="h-9" 
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-xs">VAT Enabled</Label>
              <p className="text-[10px] text-muted-foreground">Apply VAT on this purchase invoice</p>
            </div>
            <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Items
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" />Add
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 w-8">#</th>
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2 w-20">Qty</th>
                  <th className="text-right py-2 w-24">Rate</th>
                  <th className="text-right py-2 w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2">
                      <Input 
                        value={item.name} 
                        onChange={(e) => updateItem(index, 'name', e.target.value)} 
                        placeholder="Item name" 
                        className="h-8" 
                      />
                    </td>
                    <td className="py-2">
                      <Input 
                        value={item.description} 
                        onChange={(e) => updateItem(index, 'description', e.target.value)} 
                        placeholder="Description" 
                        className="h-8" 
                      />
                    </td>
                    <td className="py-2">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)} 
                        className="h-8 text-right" 
                      />
                    </td>
                    <td className="py-2">
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.rate} 
                        onChange={(e) => updateItem(index, 'rate', e.target.value)} 
                        className="h-8 text-right" 
                      />
                    </td>
                    <td className="py-2 text-right font-medium">
                      {currencySymbol}{item.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(index)} 
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors" 
                onClick={() => { 
                  setEditingItemIndex(index); 
                  setTempItem({ ...items[index] }); 
                  setIsAddItemSheetOpen(true); 
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name || 'Untitled'}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantity} × {currencySymbol}{item.rate.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {currencySymbol}{item.total.toLocaleString('en-IN')}
                    </p>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground mt-1 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-3 flex justify-end">
            <div className="w-full sm:w-64 rounded-lg bg-warning/10 p-2.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currencySymbol}{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
              </div>
              {vatEnabled && vatTotal > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>{currencySymbol}{vatTotal.toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t">
                <span>{vatEnabled ? 'Total' : 'Net Total'}</span>
                <span>{currencySymbol}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm">Notes & Terms</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Notes..." 
              rows={2} 
              className="resize-none text-sm" 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Terms</Label>
            <Textarea 
              value={terms} 
              onChange={(e) => setTerms(e.target.value)} 
              placeholder="Payment terms..." 
              rows={2} 
              className="resize-none text-sm" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:relative p-3 lg:p-0 bg-background border-t lg:border-0 z-30">
        <Button onClick={handleSave} variant="outline" size="sm" className="w-full h-9">
          <Save className="mr-1.5 h-4 w-4" />
          Save {isEditing ? 'Changes' : 'Draft'}
        </Button>
      </div>

      {/* Mobile Item Sheet */}
      <Sheet open={isAddItemSheetOpen} onOpenChange={(open) => { 
        setIsAddItemSheetOpen(open); 
        if (!open) setEditingItemIndex(null); 
      }}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader className="text-left">
            <SheetTitle>{editingItemIndex !== null ? 'Edit Item' : 'Add Item'}</SheetTitle>
            <SheetDescription>Item details</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Item Name *</Label>
              <Input 
                value={tempItem.name} 
                onChange={(e) => setTempItem({ ...tempItem, name: e.target.value })} 
                className="h-10" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input 
                value={tempItem.description} 
                onChange={(e) => setTempItem({ ...tempItem, description: e.target.value })} 
                className="h-10" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={tempItem.quantity} 
                  onChange={(e) => setTempItem({ ...tempItem, quantity: Number(e.target.value) || 1 })} 
                  className="h-10" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rate</Label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={tempItem.rate} 
                  onChange={(e) => setTempItem({ ...tempItem, rate: Number(e.target.value) || 0 })} 
                  className="h-10" 
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>{currencySymbol}{(tempItem.quantity * tempItem.rate).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            {editingItemIndex !== null && (
              <Button 
                variant="destructive" 
                onClick={() => { 
                  removeItem(editingItemIndex); 
                  setIsAddItemSheetOpen(false); 
                  setEditingItemIndex(null); 
                }} 
                className="flex-1"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />Delete
              </Button>
            )}
            <Button onClick={saveMobileItem} className="flex-1">
              <Save className="mr-1.5 h-4 w-4" />
              {editingItemIndex !== null ? 'Update' : 'Add'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}