import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { currencySymbols, type Payment, type PaymentMethod, type PaymentAllocation, type ReceiptType } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Save, Edit, Trash2, X, Plus, Calculator, Receipt as ReceiptIcon } from 'lucide-react';

export default function PaymentsReceipts() {
  const { toast } = useToast();
  const {
    clients, invoices, purchaseInvoices, payments,
    addPayment, updatePayment, deletePayment, updateInvoice, updatePurchaseInvoice,
    getClient, settings, postTransactionEntry, calculateInvoicePaymentStatus,
    createReceipt, getOutstandingInvoices, getTotalOutstanding,
  } = useApp();

  const currencySymbol = currencySymbols[settings.currency];
  const [mode, setMode] = useState<'receipt' | 'payment'>('receipt');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [partyId, setPartyId] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [amountReceived, setAmountReceived] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('against_bills');

  // ✅ NEW: Bill-wise allocation state
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [unallocatedAmount, setUnallocatedAmount] = useState(0);

  // Filter parties by mode
  const parties = useMemo(() => {
    if (mode === 'receipt') return clients.filter((c) => c.type === 'customer' || c.type === 'both');
    return clients.filter((c) => c.type === 'vendor' || c.type === 'both');
  }, [clients, mode]);

  // Get outstanding invoices for selected party
  const outstandingInvoices = useMemo(() => {
    if (!partyId) return [];
    if (mode === 'receipt') {
      return invoices.filter((i) => 
        i.clientId === partyId && 
        i.status !== 'paid' && 
        i.status !== 'cancelled' &&
        i.status !== 'draft'
      );
    }
    return purchaseInvoices.filter((p) => 
      p.vendorId === partyId && 
      p.status !== 'paid'
    );
  }, [partyId, mode, invoices, purchaseInvoices]);

  // Calculate total outstanding
  const totalOutstanding = useMemo(() => {
    return outstandingInvoices.reduce((sum, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id)
        .reduce((s, p) => s + p.amount, 0);
      return sum + (inv.netTotal - paid);
    }, 0);
  }, [outstandingInvoices, payments]);

  // Calculate balance for selected invoices
  const getInvoiceBalance = (invoiceId: string) => {
    const inv = [...invoices, ...purchaseInvoices].find((i) => i.id === invoiceId);
    if (!inv) return 0;
    const paid = payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
    return inv.netTotal - paid;
  };

  // Get invoice details
  const getInvoiceDetails = (invoiceId: string) => {
    const inv = [...invoices, ...purchaseInvoices].find((i) => i.id === invoiceId);
    return inv;
  };

  // ✅ NEW: Handle invoice selection for allocation
  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => {
      if (prev.includes(invoiceId)) {
        return prev.filter((id) => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  // ✅ NEW: Update allocation amount for an invoice
  const updateAllocationAmount = (invoiceId: string, amount: number) => {
    const invoice = getInvoiceDetails(invoiceId);
    if (!invoice) return;
    
    const balance = getInvoiceBalance(invoiceId);
    const maxAmount = Math.min(amount, balance);
    
    setAllocations((prev) => {
      const existing = prev.find((a) => a.invoiceId === invoiceId);
      if (existing) {
        return prev.map((a) => 
          a.invoiceId === invoiceId 
            ? { 
                ...a, 
                receiptAmount: maxAmount,
                adjustedAmount: maxAmount - a.discountAmount,
                outstandingAfter: balance - maxAmount
              }
            : a
        );
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          invoiceId,
          invoiceNumber: invoice.number,
          billDate: invoice.invoiceDate || date,
          dueDate: invoice.dueDate,
          billAmount: invoice.netTotal,
          outstandingBefore: balance,
          receiptAmount: maxAmount,
          discountAmount: 0,
          adjustedAmount: maxAmount,
          outstandingAfter: balance - maxAmount,
        }];
      }
    });
  };

  // ✅ NEW: Auto-allocate based on selected invoices
  const autoAllocate = () => {
    if (selectedInvoiceIds.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one invoice', variant: 'destructive' });
      return;
    }

    let remainingAmount = amountReceived;
    const newAllocations: PaymentAllocation[] = [];

    for (const invoiceId of selectedInvoiceIds) {
      if (remainingAmount <= 0) break;
      const balance = getInvoiceBalance(invoiceId);
      const invoice = getInvoiceDetails(invoiceId);
      if (!invoice) continue;

      const allocateAmount = Math.min(remainingAmount, balance);
      newAllocations.push({
        id: crypto.randomUUID(),
        invoiceId,
        invoiceNumber: invoice.number,
        billDate: invoice.invoiceDate || date,
        dueDate: invoice.dueDate,
        billAmount: invoice.netTotal,
        outstandingBefore: balance,
        receiptAmount: allocateAmount,
        discountAmount: 0,
        adjustedAmount: allocateAmount,
        outstandingAfter: balance - allocateAmount,
      });
      remainingAmount -= allocateAmount;
    }

    setAllocations(newAllocations);
    setUnallocatedAmount(remainingAmount);
    
    toast({
      title: 'Allocation complete',
      description: `Allocated ${currencySymbol}${(amountReceived - remainingAmount).toLocaleString('en-IN')} to ${newAllocations.length} invoice(s)`,
    });
  };

  // ✅ NEW: Reset allocations when party or amount changes
  useEffect(() => {
    setAllocations([]);
    setSelectedInvoiceIds([]);
    setUnallocatedAmount(0);
  }, [partyId, mode]);

  // ✅ NEW: Update unallocated amount when allocations change
  useEffect(() => {
    const totalAllocated = allocations.reduce((sum, a) => sum + a.adjustedAmount, 0);
    setUnallocatedAmount(amountReceived - totalAllocated);
  }, [allocations, amountReceived]);

  const resetForm = () => {
    setPartyId(''); 
    setSelectedInvoiceIds([]); 
    setAmountReceived(0); 
    setDiscount(0);
    setMethod('bank'); 
    setReference(''); 
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setAllocations([]);
    setUnallocatedAmount(0);
    setEditingPaymentId(null);
  };

  const loadForEdit = (p: Payment) => {
    setMode(p.invoiceType === 'sales' ? 'receipt' : 'payment');
    setEditingPaymentId(p.id);
    const invoice = p.invoiceType === 'sales'
      ? invoices.find((i) => i.id === p.invoiceId)
      : purchaseInvoices.find((pi) => pi.id === p.invoiceId);
    setPartyId((invoice as any)?.clientId || (invoice as any)?.vendorId || '');
    
    // Load allocations if they exist
    if (p.allocations && p.allocations.length > 0) {
      setAllocations(p.allocations);
      setSelectedInvoiceIds(p.allocations.map(a => a.invoiceId));
    } else {
      setSelectedInvoiceIds([p.invoiceId]);
      const balance = getInvoiceBalance(p.invoiceId);
      const invoice = getInvoiceDetails(p.invoiceId);
      if (invoice) {
        setAllocations([{
          id: crypto.randomUUID(),
          invoiceId: p.invoiceId,
          invoiceNumber: invoice.number,
          billDate: invoice.invoiceDate || p.date,
          dueDate: invoice.dueDate,
          billAmount: invoice.netTotal,
          outstandingBefore: balance + p.amount,
          receiptAmount: p.amount,
          discountAmount: 0,
          adjustedAmount: p.amount,
          outstandingAfter: balance,
        }]);
      }
    }
    
    setAmountReceived(p.amountReceived || p.amount || 0);
    setDiscount(p.discount || 0);
    setMethod(p.method || p.paymentMode || 'bank');
    setReference(p.reference || '');
    setDate(p.date || p.receiptDate || new Date().toISOString().split('T')[0]);
    setNotes(p.notes || p.narration || '');
    setReceiptType(p.receiptType || 'against_bills');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (p: Payment) => {
    deletePayment(p.id);
    toast({ title: 'Deleted', description: `${p.invoiceType === 'sales' ? 'Receipt' : 'Payment'} of ${currencySymbol}${p.amount.toLocaleString('en-IN')} removed.` });
    if (editingPaymentId === p.id) resetForm();
  };

  const handleSave = () => {
    // Validation
    if (!partyId) {
      toast({ title: 'Error', description: 'Please select a party', variant: 'destructive' });
      return;
    }

    if (amountReceived <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    // Check if we have allocations
    if (allocations.length === 0) {
      toast({ title: 'Error', description: 'Please allocate the payment to at least one invoice', variant: 'destructive' });
      return;
    }

    // Validate total allocations match amount
    const totalAllocated = allocations.reduce((sum, a) => sum + a.adjustedAmount, 0);
    if (Math.abs(totalAllocated - amountReceived) > 0.01) {
      toast({ 
        title: 'Error', 
        description: `Total allocated (${currencySymbol}${totalAllocated.toLocaleString('en-IN')}) does not match amount received (${currencySymbol}${amountReceived.toLocaleString('en-IN')})`,
        variant: 'destructive' 
      });
      return;
    }

    const now = new Date().toISOString();

    if (editingPaymentId) {
      const existing = payments.find((p) => p.id === editingPaymentId);
      if (!existing) return;

      const updatedPayment: Payment = {
        ...existing,
        receiptNumber: existing.receiptNumber || generateReceiptNumber(),
        receiptDate: date,
        clientId: partyId,
        receiptType,
        paymentMode: method,
        amountReceived,
        discount,
        netAmount: amountReceived - discount,
        unadjustedAmount: unallocatedAmount,
        narration: notes,
        allocations,
        paymentModeDetails: [{ mode: method, amount: amountReceived }],
        invoiceId: allocations.length === 1 ? allocations[0].invoiceId : undefined,
        amount: amountReceived,
        date,
        method,
        reference,
        notes,
        updatedAt: now,
      };

      updatePayment(updatedPayment);

      // Update invoice statuses
      for (const allocation of allocations) {
        const invoice = [...invoices, ...purchaseInvoices].find((i) => i.id === allocation.invoiceId);
        if (invoice) {
          const totalPaid = payments
            .filter((p) => p.invoiceId === allocation.invoiceId)
            .reduce((s, p) => s + p.amount, 0) + allocation.adjustedAmount;
          const newStatus = totalPaid >= invoice.netTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'sent';
          
          if (mode === 'receipt') {
            updateInvoice({ ...invoice as any, status: newStatus, updatedAt: now });
          } else {
            updatePurchaseInvoice({ ...invoice as any, status: newStatus, updatedAt: now });
          }
        }
      }

      toast({ title: 'Updated', description: `${currencySymbol}${amountReceived.toLocaleString('en-IN')} updated.` });
      resetForm();
      return;
    }

    // Create new receipt/payment
    const receiptNumber = generateReceiptNumber();
    
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      company_id: selectedCompanyId,
      receiptNumber,
      receiptDate: date,
      clientId: partyId,
      receiptType,
      paymentMode: method,
      amountReceived,
      discount,
      netAmount: amountReceived - discount,
      unadjustedAmount: unallocatedAmount,
      narration: notes,
      allocations,
      paymentModeDetails: [{ mode: method, amount: amountReceived }],
      invoiceId: allocations.length === 1 ? allocations[0].invoiceId : undefined,
      invoiceType: mode === 'receipt' ? 'sales' : 'purchase',
      amount: amountReceived,
      date,
      method,
      reference,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    addPayment(newPayment);

    // Create journal entry
    const paymentAccountId = method === 'cash' ? 'acc-1000' : 'acc-1010';
    const lines = [
      { accountId: paymentAccountId, debit: amountReceived, credit: 0 },
      { accountId: 'acc-1100', debit: 0, credit: amountReceived },
    ];

    if (discount > 0) {
      lines.push({ accountId: 'acc-5000', debit: discount, credit: 0 });
      lines[1] = { accountId: 'acc-1100', debit: 0, credit: amountReceived + discount };
    }

    postTransactionEntry({
      date,
      reference: receiptNumber,
      referenceType: 'receipt',
      referenceId: newPayment.id,
      description: `${mode === 'receipt' ? 'Receipt' : 'Payment'} from ${getClient(partyId)?.name}`,
      lines,
      idempotencyKey: `${mode}:${newPayment.id}`,
    });

    // Update invoice statuses
    for (const allocation of allocations) {
      const invoice = [...invoices, ...purchaseInvoices].find((i) => i.id === allocation.invoiceId);
      if (invoice) {
        const totalPaid = payments
          .filter((p) => p.invoiceId === allocation.invoiceId)
          .reduce((s, p) => s + p.amount, 0) + allocation.adjustedAmount;
        const newStatus = totalPaid >= invoice.netTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'sent';
        
        if (mode === 'receipt') {
          updateInvoice({ ...invoice as any, status: newStatus, updatedAt: now });
        } else {
          updatePurchaseInvoice({ ...invoice as any, status: newStatus, updatedAt: now });
        }
      }
    }

    toast({ 
      title: mode === 'receipt' ? 'Receipt recorded' : 'Payment recorded', 
      description: `${receiptNumber} - ${currencySymbol}${amountReceived.toLocaleString('en-IN')} allocated to ${allocations.length} invoice(s).` 
    });
    resetForm();
  };

  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    const existing = new Set(payments.map((p) => p.receiptNumber));
    let count = payments.filter((p) => p.receiptNumber?.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(5, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(5, '0')}`;
    }
    return candidate;
  };

  const historyItems = useMemo(() => {
    return payments
      .filter((p) => (mode === 'receipt' ? p.invoiceType === 'sales' : p.invoiceType === 'purchase'))
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [payments, mode]);

  const lookupInvoiceNumber = (p: Payment) => {
    if (p.invoiceType === 'sales') return invoices.find((i) => i.id === p.invoiceId)?.number || '—';
    return purchaseInvoices.find((pi) => pi.id === p.invoiceId)?.number || '—';
  };
  
  const lookupPartyName = (p: Payment) => {
    if (p.invoiceType === 'sales') {
      const inv = invoices.find((i) => i.id === p.invoiceId);
      return inv ? getClient(inv.clientId)?.name : '—';
    }
    const pi = purchaseInvoices.find((x) => x.id === p.invoiceId);
    return pi ? getClient(pi.vendorId)?.name : '—';
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payments & Receipts</h1>
        <p className="text-xs text-muted-foreground">Record and allocate payments against invoices</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => { setMode(v as any); resetForm(); }}>
        <TabsList className="w-full h-9">
          <TabsTrigger value="receipt" className="flex-1 text-xs gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5" />Receipt (Money In)
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex-1 text-xs gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5" />Payment (Money Out)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {editingPaymentId ? 'Edit ' : ''}{mode === 'receipt' ? 'Receive Payment' : 'Make Payment'}
          </CardTitle>
          {editingPaymentId && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetForm}>
              <X className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Party Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">{mode === 'receipt' ? 'Customer' : 'Vendor'} *</Label>
            <Select value={partyId} onValueChange={(v) => { setPartyId(v); resetForm(); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${mode === 'receipt' ? 'customer' : 'vendor'}`} /></SelectTrigger>
              <SelectContent>
                {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {partyId && (
            <>
              {/* Outstanding Summary */}
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Outstanding</span>
                  <span className="text-sm font-bold text-destructive">
                    {currencySymbol}{totalOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">Unpaid Invoices</span>
                  <span className="text-xs font-medium">{outstandingInvoices.length}</span>
                </div>
              </div>

              {/* Invoice Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs">Select Invoices to Pay</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                  {outstandingInvoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No outstanding invoices</p>
                  ) : (
                    outstandingInvoices.map((inv) => {
                      const balance = getInvoiceBalance(inv.id);
                      const isSelected = selectedInvoiceIds.includes(inv.id);
                      return (
                        <label key={inv.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleInvoiceSelection(inv.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{inv.number}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Due: {new Date(inv.dueDate).toLocaleDateString()} • 
                              Balance: {currencySymbol}{balance.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <Badge variant={balance > 0 ? 'destructive' : 'success'} className="text-[9px]">
                            {currencySymbol}{balance.toLocaleString('en-IN')}
                          </Badge>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Amount and Allocation */}
              {selectedInvoiceIds.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount Received *</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={amountReceived} 
                        onChange={(e) => setAmountReceived(Number(e.target.value) || 0)} 
                        className="h-9" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={discount} 
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)} 
                        className="h-9" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={autoAllocate}
                      className="flex-1"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1.5" />
                      Auto Allocate
                    </Button>
                  </div>

                  {/* Allocations List */}
                  {allocations.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bill-wise Allocation</Label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {allocations.map((alloc) => {
                          const invoice = getInvoiceDetails(alloc.invoiceId);
                          return (
                            <div key={alloc.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{alloc.invoiceNumber}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Outstanding: {currencySymbol}{alloc.outstandingBefore.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  value={alloc.receiptAmount}
                                  onChange={(e) => updateAllocationAmount(alloc.invoiceId, Number(e.target.value) || 0)}
                                  className="h-7 w-24 text-right text-xs"
                                />
                                <span className="text-xs font-medium">
                                  {currencySymbol}{alloc.adjustedAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Allocation Summary */}
                      <div className="rounded-md bg-primary/5 p-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Allocated:</span>
                          <span className="font-medium">
                            {currencySymbol}{allocations.reduce((sum, a) => sum + a.adjustedAmount, 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Unallocated:</span>
                          <span className={`font-medium ${unallocatedAmount > 0 ? 'text-warning' : 'text-success'}`}>
                            {currencySymbol}{unallocatedAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <Progress 
                          value={(allocations.reduce((sum, a) => sum + a.adjustedAmount, 0) / (amountReceived || 1)) * 100} 
                          className="h-1.5" 
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Payment Details */}
          {allocations.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Receipt Type</Label>
                <Select value={receiptType} onValueChange={(v) => setReceiptType(v as ReceiptType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="against_bills">Against Bills</SelectItem>
                    <SelectItem value="advance">Advance Payment</SelectItem>
                    <SelectItem value="on_account">On Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reference / Cheque No.</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Narration</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Receipt received against bill(s) as per details..." 
                  rows={2} 
                  className="resize-none text-sm" 
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {selectedInvoiceIds.length > 0 && allocations.length > 0 && (
        <Button onClick={handleSave} className="w-full h-10" disabled={unallocatedAmount > 0.01}>
          <Save className="mr-1.5 h-4 w-4" />
          {editingPaymentId
            ? 'Update'
            : mode === 'receipt' ? 'Record Receipt' : 'Record Payment'}
          {unallocatedAmount > 0.01 && ` (${currencySymbol}${unallocatedAmount.toLocaleString('en-IN')} unallocated)`}
        </Button>
      )}

      {/* History */}
      <Card>
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-sm">
            {mode === 'receipt' ? 'Receipts History' : 'Payments History'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {historyItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No records yet.</p>
          ) : (
            <div className="space-y-1.5">
              {historyItems.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{p.receiptNumber || lookupInvoiceNumber(p)}</p>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{p.method || p.paymentMode}</Badge>
                      {p.allocations && p.allocations.length > 1 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {p.allocations.length} bills
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {lookupPartyName(p)} • {new Date(p.date || p.receiptDate).toLocaleDateString()}
                      {p.reference ? ` • Ref: ${p.reference}` : ''}
                    </p>
                    {p.allocations && p.allocations.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {p.allocations.slice(0, 3).map((a) => (
                          <Badge key={a.id} variant="secondary" className="text-[8px] px-1 py-0">
                            {a.invoiceNumber}: {currencySymbol}{a.adjustedAmount.toLocaleString('en-IN')}
                          </Badge>
                        ))}
                        {p.allocations.length > 3 && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            +{p.allocations.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold shrink-0">{currencySymbol}{(p.amountReceived || p.amount).toLocaleString('en-IN')}</p>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadForEdit(p)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {p.invoiceType === 'sales' ? 'Receipt' : 'Payment'}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the entry and reverses the linked journal. Cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}