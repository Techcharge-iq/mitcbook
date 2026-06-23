import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { currencySymbols, type Invoice, type LineItem, type InvoiceStatus, type Client } from '@/types';
import { Plus, Trash2, Save, ArrowLeft, Send, Download, Share2, Edit2, CreditCard, Printer } from 'lucide-react';
import { generatePDF, printDocument, shareViaWhatsApp } from '@/lib/documentUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ItemPicker } from '@/components/ItemPicker';
import { InvoicePrint } from '@/components/InvoicePrint';

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    invoices, addInvoice, updateInvoice,
    quotations, updateQuotation,
    clients, addClient, getClient, settings,
    generateInvoiceNumber,
    postSalesInvoice, repostSalesInvoice, adjustItemStock, calculateInvoicePaymentStatus,
    salesmen, addSalesman,
    projects,
    payments, getPaymentsByInvoice,
  } = useApp();

  const isEditing = id && id !== 'new';
  const existingInvoice = isEditing ? invoices.find((i) => i.id === id) : null;
  const fromQuotationId = searchParams.get('fromQuotation');
  const sourceQuotation = fromQuotationId ? quotations.find((q) => q.id === fromQuotationId) : null;
  const currencySymbol = currencySymbols[settings.currency];

  // ✅ State for date column toggle - OFF by default
  const [showDateColumn, setShowDateColumn] = useState(() => {
    if (existingInvoice && existingInvoice.showDateColumn !== undefined) {
      return existingInvoice.showDateColumn;
    }
    return false;
  });

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const [clientId, setClientId] = useState(existingInvoice?.clientId || sourceQuotation?.clientId || '');
  const [salesmanId, setSalesmanId] = useState<string>(existingInvoice?.salesmanId || sourceQuotation?.salesmanId || '');
  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoiceDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate || defaultDueDate.toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existingInvoice?.notes || sourceQuotation?.notes || '');
  const [terms, setTerms] = useState(existingInvoice?.terms || sourceQuotation?.terms || 'Payment terms: Net 30 days');
  const [invoiceType, setInvoiceType] = useState<'normal' | 'project'>(existingInvoice?.invoiceType || 'normal');
  const [projectId, setProjectId] = useState(existingInvoice?.projectId || '');
  const [projectInvoicePercentage, setProjectInvoicePercentage] = useState<number>(existingInvoice?.projectSummary?.currentPercentage || 0);
  const [projectBillingValue, setProjectBillingValue] = useState<number>(existingInvoice?.billingValue || 0);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(existingInvoice?.selectedActivityIds || []);
  const [invoiceNumberMode, setInvoiceNumberMode] = useState<'auto' | 'manual'>(existingInvoice?.invoiceNumberMode || 'auto');
  const [invoiceNumber, setInvoiceNumber] = useState(existingInvoice?.number || generateInvoiceNumber());
  const [vatEnabled, setVatEnabled] = useState(existingInvoice?.vatEnabled ?? settings.vatEnabled ?? true);
  const [items, setItems] = useState<LineItem[]>(
    existingInvoice?.items || sourceQuotation?.items || [{ 
      id: crypto.randomUUID(), 
      name: '', 
      description: '', 
      quantity: 1, 
      rate: 0, 
      total: 0,
      itemDate: new Date().toISOString().split('T')[0]
    }]
  );

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '', taxRegistrationNumber: '' });
  const [isAddSalesmanOpen, setIsAddSalesmanOpen] = useState(false);
  const [newSalesman, setNewSalesman] = useState({ name: '', phone: '' });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);
  const [tempItem, setTempItem] = useState<LineItem>({ 
    id: '', 
    name: '', 
    description: '', 
    quantity: 1, 
    rate: 0, 
    total: 0,
    itemDate: new Date().toISOString().split('T')[0]
  });

  const canUseManualInvoiceNumber = settings.allowManualInvoiceNumberEntry || existingInvoice?.invoiceNumberMode === 'manual';
  const netTotal = useMemo(() => items.reduce((sum, item) => sum + (item.total || 0), 0), [items]);
  const vatRate = vatEnabled ? (settings.defaultVatPercentage ?? 5) : 0;
  const vatTotal = useMemo(() => +(netTotal * vatRate / 100).toFixed(3), [netTotal, vatRate]);
  const grandTotal = +(netTotal + vatTotal).toFixed(3);
  
  // ✅ Calculate payment status
  const displayedStatus: InvoiceStatus | 'draft' = existingInvoice ? calculateInvoicePaymentStatus(existingInvoice.id) : 'draft';
  const currentStatus: InvoiceStatus = existingInvoice?.status === 'draft' 
    ? 'draft' 
    : existingInvoice?.status === 'cancelled'
    ? 'cancelled'
    : displayedStatus;

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects],
  );

  const projectActivities = useMemo(() => selectedProject?.activities || [], [selectedProject]);

  // ✅ Calculate already billed activities
  const getBilledActivityIds = useMemo(() => {
    if (!selectedProject) return new Set<string>();
    
    const previousInvoices = invoices.filter(
      (inv) => inv.projectId === selectedProject.id && inv.id !== existingInvoice?.id
    );
    
    const billedIds = new Set<string>();
    for (const inv of previousInvoices) {
      if (inv.selectedActivityIds) {
        for (const id of inv.selectedActivityIds) {
          billedIds.add(id);
        }
      }
    }
    return billedIds;
  }, [invoices, selectedProject, existingInvoice]);

  // ✅ Filter available activities (not yet fully billed)
  const availableActivities = useMemo(() => {
    if (!selectedProject) return [];
    
    return selectedProject.activities.filter((activity) => {
      const isFullyBilled = getBilledActivityIds.has(activity.id);
      return !isFullyBilled;
    });
  }, [selectedProject, getBilledActivityIds]);

  const selectedProjectActivities = useMemo(
    () => projectActivities.filter((activity) => selectedActivityIds.includes(activity.id)),
    [projectActivities, selectedActivityIds],
  );

  useEffect(() => {
    if (invoiceType === 'project' && selectedProject && !isEditing) {
      setClientId(selectedProject.customerId);
    }
  }, [invoiceType, selectedProject, isEditing]);

  useEffect(() => {
    if (invoiceType === 'project' && selectedProject) {
      if (!isEditing) {
        setSelectedActivityIds([]);
        setProjectInvoicePercentage(0);
        setProjectBillingValue(0);
      }
      setItems([{ 
        id: crypto.randomUUID(), 
        name: '', 
        description: '', 
        quantity: 1, 
        rate: 0, 
        total: 0,
        itemDate: new Date().toISOString().split('T')[0]
      }]);
    }
  }, [invoiceType, selectedProject?.id, isEditing]);

  useEffect(() => {
    if (invoiceType !== 'project' || !selectedProject) return;
    const selectedActivities = selectedProject.activities.filter((activity) => selectedActivityIds.includes(activity.id));
    const totalPercentage = selectedActivities.reduce((sum, activity) => sum + activity.percentage, 0);
    const totalValue = selectedActivities.reduce((sum, activity) => sum + activity.value, 0);
    setProjectInvoicePercentage(totalPercentage);
    setProjectBillingValue(totalValue);
    if (selectedActivities.length > 0) {
      setItems(selectedActivities.map((activity) => ({
        id: crypto.randomUUID(),
        name: activity.name,
        description: `Project activity: ${activity.name}`,
        quantity: 1,
        rate: activity.value,
        total: activity.value,
        vatApplicable: false,
        vatPercentage: 0,
        vatAmount: 0,
        itemDate: new Date().toISOString().split('T')[0],
      })));
    } else {
      setItems([{ 
        id: crypto.randomUUID(), 
        name: '', 
        description: '', 
        quantity: 1, 
        rate: 0, 
        total: 0,
        itemDate: new Date().toISOString().split('T')[0]
      }]);
    }
  }, [invoiceType, selectedProject, selectedActivityIds]);

  useEffect(() => {
    if (invoiceNumberMode === 'auto' && !isEditing) {
      setInvoiceNumber(generateInvoiceNumber());
    }
  }, [invoiceNumberMode, isEditing]);

  // ✅ Load saved toggle state when editing
  useEffect(() => {
    if (isEditing && existingInvoice) {
      if (existingInvoice.showDateColumn !== undefined) {
        setShowDateColumn(existingInvoice.showDateColumn);
      } else {
        setShowDateColumn(false);
      }
    }
  }, [isEditing, existingInvoice]);

  const projectSummary = useMemo(() => {
    if (invoiceType !== 'project' || !selectedProject) return undefined;

    const previousProjectInvoices = invoices.filter(
      (invoice) => invoice.invoiceType === 'project' && invoice.projectId === selectedProject.id && invoice.id !== existingInvoice?.id,
    );

    const previousAmount = previousProjectInvoices.reduce((sum, invoice) => sum + (invoice.netTotal || 0), 0);
    const previousPercentage = previousProjectInvoices.reduce(
      (sum, invoice) => sum + (invoice.projectSummary?.currentPercentage || 0),
      0,
    );

    const currentAmount = projectBillingValue;
    const currentPercentage = projectInvoicePercentage;
    const totalInvoicedAmount = previousAmount + currentAmount;
    const totalInvoicedPercentage = Math.min(100, previousPercentage + currentPercentage);

    return {
      projectTotalValue: selectedProject.totalValue,
      previousPercentage,
      previousAmount,
      currentPercentage,
      currentAmount,
      totalInvoicedPercentage,
      totalInvoicedAmount,
      remainingPercentage: Math.max(0, 100 - totalInvoicedPercentage),
      remainingAmount: Math.max(0, selectedProject.totalValue - totalInvoicedAmount),
    };
  }, [invoiceType, selectedProject, invoices, grandTotal, projectInvoicePercentage, existingInvoice?.id]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const currentVatApplicable = vatEnabled && item.vatApplicable;
      if (field === 'quantity' || field === 'rate') {
        item[field] = Number(value) || 0;
        item.total = item.quantity * item.rate;
        item.vatAmount = currentVatApplicable ? (item.total * (item.vatPercentage ?? 0)) / 100 : 0;
      } else { (item as any)[field] = value; }
      if (!vatEnabled) {
        item.vatAmount = 0;
        item.vatApplicable = false;
      }
      updated[index] = item;
      return updated;
    });
  };

  const selectItemForRow = (index: number, picked: { id: string; name: string; description?: string; unit?: string; rate: number; vatApplicable: boolean; vatPercentage: number; }) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      const qty = cur.quantity || 1;
      const rate = picked.rate;
      const total = qty * rate;
      const vatAmount = vatEnabled && picked.vatApplicable ? (total * picked.vatPercentage) / 100 : 0;
      updated[index] = {
        ...cur,
        itemId: picked.id,
        name: picked.name,
        description: picked.description ?? cur.description,
        unit: picked.unit ?? cur.unit,
        rate,
        total,
        vatApplicable: vatEnabled ? picked.vatApplicable : false,
        vatPercentage: picked.vatPercentage,
        vatAmount,
      };
      return updated;
    });
  };

  const addItem = () => {
    if (isMobile) {
      setTempItem({ 
        id: crypto.randomUUID(), 
        name: '', 
        description: '', 
        quantity: 1, 
        rate: 0, 
        total: 0,
        itemDate: new Date().toISOString().split('T')[0]
      });
      setIsAddItemSheetOpen(true);
    } else {
      setItems((prev) => [...prev, { 
        id: crypto.randomUUID(), 
        name: '', 
        description: '', 
        quantity: 1, 
        rate: 0, 
        total: 0,
        itemDate: new Date().toISOString().split('T')[0]
      }]);
    }
  };

  const saveMobileItem = () => {
    if (!tempItem.name.trim()) { toast({ title: 'Error', description: 'Item name is required', variant: 'destructive' }); return; }
    const itemToSave = { ...tempItem, total: tempItem.quantity * tempItem.rate };
    if (editingItemIndex !== null) {
      setItems((prev) => { const updated = [...prev]; updated[editingItemIndex] = itemToSave; return updated; });
      setEditingItemIndex(null);
    } else { setItems((prev) => [...prev, itemToSave]); }
    setIsAddItemSheetOpen(false);
    setTempItem({ 
      id: '', 
      name: '', 
      description: '', 
      quantity: 1, 
      rate: 0, 
      total: 0,
      itemDate: new Date().toISOString().split('T')[0]
    });
  };

  const editItemMobile = (index: number) => { setEditingItemIndex(index); setTempItem({ ...items[index] }); setIsAddItemSheetOpen(true); };

  const removeItem = (index: number) => {
    if (items.length === 1) { toast({ title: 'Cannot remove', description: 'At least one item is required.', variant: 'destructive' }); return; }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddClient = () => {
    if (!newClient.name.trim()) { toast({ title: 'Error', description: 'Client name is required', variant: 'destructive' }); return; }
    const client: Client = { 
      id: crypto.randomUUID(), 
      name: newClient.name,
      email: newClient.email || '',
      phone: newClient.phone || '',
      address: newClient.address || '',
      type: 'customer',
      taxRegistrationNumber: newClient.taxRegistrationNumber || '',
      createdAt: new Date().toISOString() 
    };
    addClient(client);
    setClientId(client.id);
    setIsAddClientOpen(false);
    setNewClient({ name: '', email: '', phone: '', address: '', taxRegistrationNumber: '' });
    toast({ title: 'Client added', description: `${client.name} has been added.` });
  };

  const handleSave = () => {
    if (!clientId) { toast({ title: 'Error', description: 'Please select a client', variant: 'destructive' }); return; }
    if (!salesmanId) { toast({ title: 'Error', description: 'Please select a salesman', variant: 'destructive' }); return; }
    if (invoiceNumberMode === 'manual' && !invoiceNumber.trim()) { toast({ title: 'Error', description: 'Invoice number is required when manual mode is enabled', variant: 'destructive' }); return; }
    if (invoices.some((invoice) => invoice.number === invoiceNumber && invoice.id !== existingInvoice?.id)) { toast({ title: 'Error', description: 'Invoice number already exists', variant: 'destructive' }); return; }
    if (items.some((item) => !item.name.trim())) { toast({ title: 'Error', description: 'All items must have a name', variant: 'destructive' }); return; }
    if (invoiceType === 'project' && !projectId) { toast({ title: 'Error', description: 'Please select a project for project invoices', variant: 'destructive' }); return; }
    if (invoiceType === 'project' && selectedActivityIds.length === 0) { toast({ title: 'Error', description: 'Please select at least one unbilled project activity', variant: 'destructive' }); return; }
    if (invoiceType === 'project' && projectInvoicePercentage <= 0) { toast({ title: 'Error', description: 'Project billing percentage must be greater than 0', variant: 'destructive' }); return; }

    const now = new Date().toISOString();
    const resolvedNumber = invoiceNumberMode === 'manual' ? invoiceNumber.trim() : invoiceNumber;

    if (isEditing && existingInvoice) {
      const updated: Invoice = {
        ...existingInvoice,
        number: resolvedNumber,
        manualInvoiceNumber: invoiceNumberMode === 'manual' ? resolvedNumber : undefined,
        invoiceNumberMode,
        vatEnabled,
        clientId,
        items,
        netTotal: grandTotal,
        invoiceDate,
        dueDate,
        notes,
        terms,
        salesmanId,
        invoiceType,
        projectId: invoiceType === 'project' ? projectId : undefined,
        selectedActivityIds: invoiceType === 'project' ? selectedActivityIds : undefined,
        billingPercentage: invoiceType === 'project' ? projectInvoicePercentage : undefined,
        billingValue: invoiceType === 'project' ? projectBillingValue : undefined,
        projectSummary: invoiceType === 'project' ? projectSummary : undefined,
        showDateColumn: showDateColumn,
        updatedAt: now,
      };

      try {
        updateInvoice(updated);
        repostSalesInvoice(existingInvoice, updated);
      } catch (err) {
        updateInvoice(existingInvoice);
        toast({ title: 'Invoice update failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
        return;
      }

      toast({ title: 'Invoice updated', description: `${updated.number} has been updated.` });
    } else {
      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        number: resolvedNumber,
        manualInvoiceNumber: invoiceNumberMode === 'manual' ? resolvedNumber : undefined,
        invoiceNumberMode,
        vatEnabled,
        clientId,
        quotationId: sourceQuotation?.id,
        invoiceType,
        projectId: invoiceType === 'project' ? projectId : undefined,
        selectedActivityIds: invoiceType === 'project' ? selectedActivityIds : undefined,
        billingPercentage: invoiceType === 'project' ? projectInvoicePercentage : undefined,
        billingValue: invoiceType === 'project' ? projectBillingValue : undefined,
        projectSummary: invoiceType === 'project' ? projectSummary : undefined,
        items,
        netTotal: grandTotal,
        status: 'draft',
        invoiceDate,
        dueDate,
        notes,
        terms,
        salesmanId,
        showDateColumn: showDateColumn,
        createdAt: now,
        updatedAt: now,
      };
      addInvoice(newInvoice);

      items.forEach((li) => { if (li.itemId) adjustItemStock(li.itemId, -li.quantity); });

      if (sourceQuotation) {
        updateQuotation({ ...sourceQuotation, status: 'converted', convertedInvoiceId: newInvoice.id, updatedAt: now });
      }

      try {
        postSalesInvoice(newInvoice);
      } catch (err) {
        console.error('[InvoiceForm] Journal entry failed:', err);
        toast({ title: 'Journal entry failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
      }

      toast({ title: 'Invoice created', description: `${newInvoice.number} has been created.` });
      navigate(`/invoices/${newInvoice.id}`);
      return;
    }
  };

  const handleMarkAsSent = () => {
    if (!existingInvoice) return;
    const now = new Date().toISOString();
    updateInvoice({ ...existingInvoice, status: 'sent', updatedAt: now });
    toast({ title: 'Invoice sent', description: `${existingInvoice.number} marked as sent.` });
  };

  const handleDownloadPDF = async () => {
    if (!existingInvoice) return;
    const client = getClient(clientId);
    try {
      await generatePDF({ 
        type: 'invoice', 
        document: existingInvoice, 
        client, 
        settings,
        showDateColumn: showDateColumn
      });
      toast({ title: 'PDF downloaded successfully' });
    } catch (err) {
      toast({ title: 'PDF generation failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    }
  };

  const handlePrint = async () => {
    if (!existingInvoice) return;
    const client = getClient(clientId);
    try {
      await printDocument({ 
        type: 'invoice', 
        document: existingInvoice, 
        client, 
        settings,
        showDateColumn: showDateColumn
      });
    } catch (err) {
      toast({ title: 'Print failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    }
  };

  const handleShare = () => {
    if (!existingInvoice) return;
    const client = getClient(clientId);
    shareViaWhatsApp({ 
      type: 'invoice', 
      document: existingInvoice, 
      client, 
      settings,
      showDateColumn: showDateColumn
    });
  };

  useEffect(() => { if (isEditing && !existingInvoice) navigate('/invoices'); }, [isEditing, existingInvoice, navigate]);

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-primary/10 text-primary',
    paid: 'bg-success/10 text-success',
    partial: 'bg-warning/10 text-warning',
    overdue: 'bg-destructive/10 text-destructive',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-3 pb-24 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">
              {isEditing ? existingInvoice?.number : 'New Invoice'}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              {sourceQuotation ? `From ${sourceQuotation.number}` : isEditing ? 'Edit invoice' : 'Create invoice'}
            </p>
          </div>
          {isEditing && (
            <Badge variant="outline" className={`${statusColors[currentStatus]} text-xs ml-1`}>
              {currentStatus}
            </Badge>
          )}
        </div>
        {isEditing && (
          <div className="flex gap-1.5 shrink-0">
            {(currentStatus === 'partial' || (existingInvoice?.status === 'sent' && currentStatus !== 'paid')) && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${id}/payment`)} className="h-8 px-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Payment</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 px-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Print</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-8 px-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 px-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Share</span>
            </Button>
          </div>
        )}
      </div>

      {/* ✅ DATE COLUMN TOGGLE */}
      <Card>
        <CardContent className="px-3 py-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-xs font-medium">Show Date Column</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {showDateColumn 
                  ? '📅 Date column visible | S.No hidden' 
                  : '🔢 S.No visible | Date column hidden'}
              </p>
            </div>
            <Switch checked={showDateColumn} onCheckedChange={setShowDateColumn} />
          </div>
        </CardContent>
      </Card>

      {/* ✅ Invoice Preview */}
      {isEditing && existingInvoice && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Invoice Preview</span>
              <span className="text-xs font-normal text-muted-foreground">
                {showDateColumn ? '📅 Showing Date column' : '🔢 Showing S.No column'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <InvoicePrint
              invoice={existingInvoice}
              client={getClient(clientId)}
              settings={settings}
              showDateColumn={showDateColumn}
              payments={getPaymentsByInvoice(existingInvoice.id)}
            />
          </CardContent>
        </Card>
      )}

      {/* Client & Details */}
      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Client & Details</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Type</Label>
              <RadioGroup value={invoiceType} onValueChange={(value) => {
                setInvoiceType(value as 'normal' | 'project');
                if (value !== 'project') {
                  setProjectId('');
                  setProjectInvoicePercentage(0);
                }
              }}>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 cursor-pointer">
                    <RadioGroupItem value="normal" />
                    <span className="text-sm">Normal</span>
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 cursor-pointer">
                    <RadioGroupItem value="project" />
                    <span className="text-sm">Project</span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {invoiceType === 'project' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Project *</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Project Billing %</Label>
                    <Input type="number" value={projectInvoicePercentage} disabled className="h-9 bg-muted/30" />
                    <p className="text-[10px] text-muted-foreground">Calculated from selected project activities.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Project Billing Value</Label>
                    <Input type="text" value={`${currencySymbol}${projectBillingValue.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`} disabled className="h-9 bg-muted/30" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs">Invoice Number</Label>
                    <p className="text-[10px] text-muted-foreground">{invoiceNumberMode === 'manual' ? 'Manually enter the invoice number' : 'Automatically generated invoice number'}</p>
                  </div>
                  {canUseManualInvoiceNumber && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={invoiceNumberMode === 'manual'}
                        onCheckedChange={(value) => setInvoiceNumberMode(value ? 'manual' : 'auto')}
                        disabled={!settings.allowManualInvoiceNumberEntry}
                      />
                      <span className="text-xs text-muted-foreground">Manual</span>
                    </div>
                  )}
                </div>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={invoiceNumberMode !== 'manual'}
                  className="h-9"
                />
                {!canUseManualInvoiceNumber && (
                  <p className="text-[10px] text-muted-foreground">Manual invoice numbers are disabled in settings.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-xs">VAT Enabled</Label>
                  <p className="text-[10px] text-muted-foreground">Enable or disable VAT for this invoice.</p>
                </div>
                <Switch checked={vatEnabled} onCheckedChange={(value) => setVatEnabled(value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client *</Label>
              <div className="flex gap-1.5">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddClientOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Salesman *</Label>
              <div className="flex gap-1.5">
                <Select value={salesmanId} onValueChange={setSalesmanId}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select salesman" /></SelectTrigger>
                  <SelectContent>
                    {salesmen.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddSalesmanOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Project Summary */}
      {invoiceType === 'project' && selectedProject && projectSummary && (
        <Card>
          <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Project Summary</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Project Value</p>
                <p className="text-sm font-semibold">{currencySymbol}{projectSummary.projectTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Billed</p>
                <p className="text-sm font-semibold">{projectSummary.totalInvoicedPercentage.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">{currencySymbol}{projectSummary.totalInvoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Remaining</p>
                <p className="text-sm font-semibold text-primary">{projectSummary.remainingPercentage.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">{currencySymbol}{projectSummary.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Unbilled Activities</p>
                <p className="text-sm font-semibold">{availableActivities.length}</p>
                <p className="text-xs text-muted-foreground">of {selectedProject.activities.length} total</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Billed Activities</p>
                <p className="text-sm font-semibold">{selectedProject.activities.length - availableActivities.length}</p>
                <p className="text-xs text-muted-foreground">Fully completed</p>
              </div>
            </div>
            <Progress value={Math.min(100, Math.max(0, projectSummary.totalInvoicedPercentage))} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Billed: {projectSummary.totalInvoicedPercentage.toFixed(1)}%</span>
              <span>Remaining: {projectSummary.remainingPercentage.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Project Activities - Only Show Unbilled */}
      {invoiceType === 'project' && selectedProject && (
        <Card>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm">Project Activities</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Select unbilled project activities to include on this invoice.
              {availableActivities.length === 0 && ' All activities have been fully billed.'}
            </p>
            
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Available: {availableActivities.length} of {selectedProject.activities.length} activities</span>
              <span>•</span>
              <span>Billed: {selectedProject.activities.length - availableActivities.length} activities</span>
              <span>•</span>
              <span>Remaining Value: {currencySymbol}{
                availableActivities.reduce((sum, a) => sum + a.value, 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 3 })
              }</span>
            </div>

            <div className="space-y-2">
              {availableActivities.length > 0 ? (
                availableActivities.map((activity) => {
                  const isSelected = selectedActivityIds.includes(activity.id);
                  return (
                    <label 
                      key={activity.id} 
                      className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedActivityIds((prev) => 
                            checked ? [...prev, activity.id] : prev.filter((id) => id !== activity.id)
                          );
                        }}
                        className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{activity.name}</p>
                          {getBilledActivityIds.has(activity.id) && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-success border-success/30">
                              ✅ Billed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Value: {currencySymbol}{activity.value.toLocaleString('en-IN', { minimumFractionDigits: 3 })} • 
                          {activity.percentage}% of project
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">
                          {currencySymbol}{activity.value.toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{activity.percentage}%</p>
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-md border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  <p className="font-medium">✅ All activities have been billed</p>
                  <p className="text-xs mt-1">This project is fully invoiced</p>
                </div>
              )}
            </div>

            {/* Selected Summary */}
            {selectedActivityIds.length > 0 && (
              <div className="rounded-md bg-primary/5 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selected Activities:</span>
                  <span className="font-medium">{selectedActivityIds.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing Value:</span>
                  <span className="font-medium">
                    {currencySymbol}{
                      selectedProject.activities
                        .filter(a => selectedActivityIds.includes(a.id))
                        .reduce((sum, a) => sum + a.value, 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 3 })
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing Percentage:</span>
                  <span className="font-medium">
                    {selectedProject.activities
                      .filter(a => selectedActivityIds.includes(a.id))
                      .reduce((sum, a) => sum + a.percentage, 0)
                      .toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3">
          <CardTitle className="text-sm">Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" />Add
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {showDateColumn ? (
                    <>
                      <th className="text-left py-2 w-24">Date</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2 w-20">Qty</th>
                      <th className="text-left py-2 w-20">Unit</th>
                      <th className="text-right py-2 w-24">Rate</th>
                      <th className="text-right py-2 w-24">Amount</th>
                      <th className="w-8"></th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-2 w-8">S.No</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2 w-20">Qty</th>
                      <th className="text-left py-2 w-20">Unit</th>
                      <th className="text-right py-2 w-24">Rate</th>
                      <th className="text-right py-2 w-24">Amount</th>
                      <th className="w-8"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    {showDateColumn ? (
                      <>
                        <td className="py-2">
                          <Input 
                            type="date" 
                            value={item.itemDate || invoiceDate} 
                            onChange={(e) => updateItem(index, 'itemDate', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="py-2 min-w-[180px]">
                          <div className="space-y-1">
                            <ItemPicker
                              value={item.itemId}
                              fallbackName={item.name}
                              onSelect={(it) => selectItemForRow(index, it)}
                            />
                            <Textarea 
                              value={item.description} 
                              onChange={(e) => updateItem(index, 'description', e.target.value)} 
                              placeholder="Description (supports multiline/bullets)" 
                              rows={2} 
                              className="text-sm" 
                            />
                          </div>
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
                            value={item.unit ?? ''} 
                            onChange={(e) => updateItem(index, 'unit', e.target.value)} 
                            placeholder="—" 
                            className="h-8 text-left" 
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
                          {currencySymbol}{(item.total + (item.vatApplicable ? (item.vatAmount ?? 0) : 0)).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </td>
                        <td className="py-2">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 text-muted-foreground">{index + 1}</td>
                        <td className="py-2 min-w-[180px]">
                          <div className="space-y-1">
                            <ItemPicker
                              value={item.itemId}
                              fallbackName={item.name}
                              onSelect={(it) => selectItemForRow(index, it)}
                            />
                            <Textarea 
                              value={item.description} 
                              onChange={(e) => updateItem(index, 'description', e.target.value)} 
                              placeholder="Description (supports multiline/bullets)" 
                              rows={2} 
                              className="text-sm" 
                            />
                          </div>
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
                            value={item.unit ?? ''} 
                            onChange={(e) => updateItem(index, 'unit', e.target.value)} 
                            placeholder="—" 
                            className="h-8 text-left" 
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
                          {currencySymbol}{(item.total + (item.vatApplicable ? (item.vatAmount ?? 0) : 0)).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </td>
                        <td className="py-2">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </>
                    )}
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
                onClick={() => editItemMobile(index)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {showDateColumn ? (
                        <span className="text-xs text-muted-foreground">
                          {item.itemDate ? new Date(item.itemDate).toLocaleDateString('en-GB') : '-'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}.</span>
                      )}
                      <p className="text-sm font-medium truncate">{item.name || 'Untitled item'}</p>
                    </div>
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
          <div className="mt-3 flex justify-end">
            <div className="w-full sm:w-64 rounded-lg bg-primary/10 p-2.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currencySymbol}{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
              </div>
              {vatEnabled && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>{currencySymbol}{vatTotal.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t">
                <span>{vatEnabled ? 'Grand Total' : 'Total'}</span>
                <span>{currencySymbol}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Notes & Terms</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for client..." rows={2} className="resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms" className="text-xs">Terms & Conditions</Label>
            <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms..." rows={2} className="resize-none text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:relative p-3 lg:p-0 bg-background border-t lg:border-0 z-30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 sm:justify-between lg:max-w-none">
          <div className="flex gap-2">
            {currentStatus === 'draft' && isEditing && (
              <Button onClick={handleMarkAsSent} size="sm" className="flex-1 sm:flex-none h-9">
                <Send className="mr-1.5 h-4 w-4" />Mark as Sent
              </Button>
            )}
            {(currentStatus === 'partial' || (existingInvoice?.status === 'sent' && currentStatus !== 'paid')) && isEditing && (
              <Button onClick={() => navigate(`/invoices/${id}/payment`)} size="sm" className="flex-1 sm:flex-none h-9">
                <CreditCard className="mr-1.5 h-4 w-4" />Record Payment
              </Button>
            )}
          </div>
          {currentStatus !== 'cancelled' && (
            <Button onClick={handleSave} variant="outline" size="sm" className="h-9">
              <Save className="mr-1.5 h-4 w-4" />Save {isEditing ? 'Changes' : 'Draft'}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Item Sheet */}
      <Sheet open={isAddItemSheetOpen} onOpenChange={(open) => { 
        setIsAddItemSheetOpen(open); 
        if (!open) { 
          setEditingItemIndex(null); 
          setTempItem({ 
            id: '', 
            name: '', 
            description: '', 
            quantity: 1, 
            rate: 0, 
            total: 0,
            itemDate: new Date().toISOString().split('T')[0]
          }); 
        } 
      }}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader className="text-left">
            <SheetTitle>{editingItemIndex !== null ? 'Edit Item' : 'Add Item'}</SheetTitle>
            <SheetDescription>{editingItemIndex !== null ? 'Update item details' : 'Add a new line item'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Item Name *</Label>
              <Input 
                value={tempItem.name} 
                onChange={(e) => setTempItem({ ...tempItem, name: e.target.value })} 
                placeholder="Item name" 
                className="h-10" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input 
                value={tempItem.description} 
                onChange={(e) => setTempItem({ ...tempItem, description: e.target.value })} 
                placeholder="Description" 
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
                <Label className="text-xs">Rate ({currencySymbol})</Label>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Item Date</Label>
              <Input 
                type="date" 
                value={tempItem.itemDate || invoiceDate} 
                onChange={(e) => setTempItem({ ...tempItem, itemDate: e.target.value })} 
                className="h-10" 
              />
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

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Quick add a new customer</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-xs">Name *</Label>
              <Input 
                id="clientName" 
                value={newClient.name} 
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} 
                placeholder="Client name" 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientEmail" className="text-xs">Email</Label>
              <Input 
                id="clientEmail" 
                type="email" 
                value={newClient.email} 
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} 
                placeholder="email@example.com" 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone" className="text-xs">Phone</Label>
              <Input 
                id="clientPhone" 
                value={newClient.phone} 
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} 
                placeholder="+91 98765 43210" 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientAddress" className="text-xs">Address</Label>
              <Textarea 
                id="clientAddress" 
                value={newClient.address} 
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} 
                placeholder="Street address&#10;City, State&#10;PIN Code"
                rows={3}
                className="resize-y text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Multi-line supported - press Enter for new line</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientVAT" className="text-xs">VAT / Tax Registration Number</Label>
              <Input 
                id="clientVAT" 
                value={newClient.taxRegistrationNumber} 
                onChange={(e) => setNewClient({ ...newClient, taxRegistrationNumber: e.target.value })} 
                placeholder="Enter VAT/Tax number" 
                className="h-9" 
              />
              <p className="text-[10px] text-muted-foreground">Optional - Required for VAT reporting on sales</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddClient}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Salesman Dialog */}
      <Dialog open={isAddSalesmanOpen} onOpenChange={setIsAddSalesmanOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Salesman</DialogTitle>
            <DialogDescription>Quick add a new salesman</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input 
                value={newSalesman.name} 
                onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })} 
                className="h-9" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input 
                value={newSalesman.phone} 
                onChange={(e) => setNewSalesman({ ...newSalesman, phone: e.target.value })} 
                className="h-9" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddSalesmanOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!newSalesman.name.trim()) {
                return toast({ title: 'Error', description: 'Salesman name required', variant: 'destructive' });
              }
              const s = { 
                id: crypto.randomUUID(), 
                name: newSalesman.name, 
                phone: newSalesman.phone, 
                createdAt: new Date().toISOString() 
              };
              addSalesman(s);
              setSalesmanId(s.id);
              setIsAddSalesmanOpen(false);
              setNewSalesman({ name: '', phone: '' });
              toast({ title: 'Salesman added', description: `${s.name} created.` });
            }}>Add Salesman</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}