import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRemoteCollection } from '@/hooks/useRemoteCollection';
import type { 
  Client, Quotation, Invoice, PurchaseInvoice, BusinessSettings, 
  Payment, Account, JournalEntry, JournalLine, Company, Voucher, 
  VoucherType, AuditEntry, Item, InvoiceStatus, Project, ProjectStatus,
  PaymentAllocation, PaymentModeDetail, ReceiptType, ReceiptDTO,
  OutstandingSummary, PaymentAllocationSummary
} from '@/types';
import { buildSalesInvoicePostingEntry, repostSalesInvoice as buildSalesInvoiceRepostEntries } from '@/lib/postingEngine';
import {
  applyJournalLinesToBalances,
  assertBalancedLines,
  buildBalancesFromJournalEntries,
  getNetBalanceForAccount,
  type AccountBalanceStore,
} from '@/lib/accounting';
import type { Salesman } from '@/types';
import { DEFAULT_ACCOUNTS } from '@/types';

interface AppContextType {
  // Clients
  clients: Client[];
  setClients: (clients: Client[] | ((prev: Client[]) => Client[])) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  getCustomers: () => Client[];
  getVendors: () => Client[];
  
  // Quotations
  quotations: Quotation[];
  setQuotations: (quotations: Quotation[] | ((prev: Quotation[]) => Quotation[])) => void;
  addQuotation: (quotation: Quotation) => void;
  updateQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  getQuotation: (id: string) => Quotation | undefined;
  
  // Invoices
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[] | ((prev: Invoice[]) => Invoice[])) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  // Purchase Invoices
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (pi: PurchaseInvoice[] | ((prev: PurchaseInvoice[]) => PurchaseInvoice[])) => void;
  addPurchaseInvoice: (pi: PurchaseInvoice) => void;
  updatePurchaseInvoice: (pi: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;
  getPurchaseInvoice: (id: string) => PurchaseInvoice | undefined;
  generatePurchaseInvoiceNumber: () => string;
  
  // Payments
  payments: Payment[];
  addPayment: (payment: Payment) => void;
  updatePayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByClient: (clientId: string) => Payment[];
  calculateInvoicePaymentStatus: (invoiceId: string) => Extract<InvoiceStatus, 'sent' | 'partial' | 'paid'>;
  
  // ✅ NEW: Payment allocation functions
  createReceipt: (receipt: ReceiptDTO) => Payment;
  getAllocationsByPayment: (paymentId: string) => PaymentAllocation[];
  getOutstandingInvoices: (clientId: string) => Invoice[];
  getClientOutstandingSummary: (clientId: string) => OutstandingSummary;
  getPaymentAllocationSummary: (paymentId: string) => PaymentAllocationSummary | null;
  getTotalOutstanding: (clientId: string) => number;

  // Accounts & Journal
  accounts: Account[];
  setAccounts: (accounts: Account[] | ((prev: Account[]) => Account[])) => void;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  // Vouchers
  vouchers: Voucher[];
  addVoucher: (voucher: Voucher) => void;
  updateVoucher: (voucher: Voucher) => void;
  deleteVoucher: (id: string) => void;
  generateVoucherNumber: (type: string) => string;
  addJournalVoucher: (voucher: Voucher, lines: JournalLine[]) => void;

  // Items
  items: Item[];

  // Salesmen
  salesmen: Salesman[];
  addSalesman: (s: Salesman) => void;
  getSalesman: (id: string) => Salesman | undefined;
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => Item | undefined;
  adjustItemStock: (itemId: string, delta: number) => void;

  // Journal
  journalEntries: JournalEntry[];
  accountBalances: AccountBalanceStore;
  createJournalEntry: (entry: JournalEntry) => void;
  postJournalForReference: (entry: JournalEntry) => JournalEntry;
  postTransactionEntry: (input: {
    date: string;
    reference: string;
    referenceType: JournalEntry['referenceType'];
    referenceId: string;
    description: string;
    lines: JournalLine[];
    idempotencyKey?: string;
  }) => JournalEntry;
  reverseJournalForReference: (referenceType: JournalEntry['referenceType'], referenceId: string) => JournalEntry[];
  postSalesInvoice: (invoice: Invoice) => JournalEntry;
  repostSalesInvoice: (invoiceBefore: Invoice, invoiceAfter: Invoice) => JournalEntry[];
  reconcileJournalBalances: () => void;
  getAccountBalance: (accountId: string) => number;
  
  // Company management
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (companyId: string) => void;
  createCompany: (name: string) => void;
  updateCompany: (id: string, name: string) => void;
  deleteCompany: (id: string) => void;

  // Business Settings
  settings: BusinessSettings;
  setSettings: (settings: BusinessSettings | ((prev: BusinessSettings) => BusinessSettings)) => void;
  
  // Sync functionality
  syncToDatabase: () => Promise<void>;
  syncFromDatabase: () => Promise<void>;
  forceSync: () => Promise<void>;
  isElectron: boolean;
  
  // Audit & activity log
  auditLog: AuditEntry[];
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => void;
  getRecentAuditLog: (limit?: number) => AuditEntry[];

  // Utility functions
  generateQuotationNumber: () => string;
  generateInvoiceNumber: () => string;
  generateReceiptNumber: () => string;
  currentCompany: Company | null;
  setCurrentCompany: (company: Company) => void;
}

const defaultSettings: BusinessSettings = {
  name: '',
  email: '',
  phone: '',
  address: '',
  currency: 'OMR',
  theme: 'system',  
  vatEnabled: true,
  allowManualInvoiceNumberEntry: false,
  defaultVatPercentage: 5,
  bankName: '',
  bankAccountNumber: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useLocalStorage<Company[]>('app_companies', [{ id: 'default', name: 'Default Company' }]);
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage<string>('app_selected_company_id', 'default');

  // Get current company
  const currentCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || companies[0] || null;
  }, [companies, selectedCompanyId]);

  // Set current company
  const setCurrentCompany = (company: Company) => {
    setSelectedCompanyId(company.id);
  };

  const companyKey = (key: string) => `app_${key}_${selectedCompanyId}`;

  // ✅ NEW: Payment allocations collection
  const [paymentAllocations, setPaymentAllocations] = useRemoteCollection<PaymentAllocation>(
    'payment_allocations', 
    companyKey('payment_allocations'), 
    [], 
    selectedCompanyId
  );

  // ✅ NEW: Payment mode details collection
  const [paymentModeDetails, setPaymentModeDetails] = useRemoteCollection<PaymentModeDetail>(
    'payment_mode_details', 
    companyKey('payment_mode_details'), 
    [], 
    selectedCompanyId
  );

  // ✅ NEW: Sync companies from Supabase on load
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        
        if (!uid || cancelled) return;
        
        const { data, error } = await supabase
          .from('business_settings')
          .select('company_id, name')
          .eq('user_id', uid);
        
        if (cancelled) return;
        
        if (!error && data && data.length > 0) {
          const uniqueCompanies = Array.from(
            new Map(data.map(item => [
              item.company_id || 'default', 
              { 
                id: item.company_id || 'default', 
                name: item.name || 'Default Company' 
              }
            ]))
          ).map(([_, value]) => value);
          
          setCompanies(prev => {
            const existingMap = new Map(prev.map(c => [c.id, c]));
            uniqueCompanies.forEach(company => {
              if (!existingMap.has(company.id)) {
                existingMap.set(company.id, company);
              }
            });
            return Array.from(existingMap.values());
          });
          
          const currentCompanyExists = uniqueCompanies.some(c => c.id === selectedCompanyId);
          if (!currentCompanyExists && uniqueCompanies.length > 0) {
            setSelectedCompanyId(uniqueCompanies[0].id);
          }
          
          console.log('✅ Companies synced from Supabase:', uniqueCompanies.length);
        }
      } catch (error) {
        console.error('Failed to load companies from Supabase:', error);
      }
    })();
    
    return () => { cancelled = true; };
  }, []);

  // ✅ UPDATED: Pass companyId to all useRemoteCollection calls
  const [clients, setClients] = useRemoteCollection<Client>('clients', companyKey('clients'), [], selectedCompanyId);
  const [quotations, setQuotations] = useRemoteCollection<Quotation>('quotations', companyKey('quotations'), [], selectedCompanyId);
  const [invoices, setInvoices] = useRemoteCollection<Invoice>('invoices', companyKey('invoices'), [], selectedCompanyId);
  const [projects, setProjects] = useRemoteCollection<Project>('projects', companyKey('projects'), [], selectedCompanyId);
  const [purchaseInvoices, setPurchaseInvoices] = useRemoteCollection<PurchaseInvoice>('purchaseInvoices', companyKey('purchase_invoices'), [], selectedCompanyId);
  const [payments, setPayments] = useRemoteCollection<Payment>('payments', companyKey('payments'), [], selectedCompanyId);
  const [accounts, setAccounts] = useRemoteCollection<Account>('accounts', companyKey('accounts'), DEFAULT_ACCOUNTS, selectedCompanyId);
  const [journalEntries, setJournalEntries] = useRemoteCollection<JournalEntry>('journalEntries', companyKey('journal_entries'), [], selectedCompanyId);
  const [accountBalances, setAccountBalances] = useLocalStorage<AccountBalanceStore>(companyKey('account_balances'), {});
  const [vouchers, setVouchers] = useRemoteCollection<Voucher>('vouchers', companyKey('vouchers'), [], selectedCompanyId);
  const [items, setItems] = useRemoteCollection<Item>('items', companyKey('items'), [], selectedCompanyId);
  const [salesmen, setSalesmen] = useRemoteCollection<Salesman>('salesmen', companyKey('salesmen'), [], selectedCompanyId);
  const [settings, setSettings] = useLocalStorage<BusinessSettings>(companyKey('settings'), defaultSettings);
  const [auditLog, setAuditLog] = useLocalStorage<AuditEntry[]>(companyKey('audit_log'), []);

  // ✅ DEBUG: Log invoices when they change
  useEffect(() => {
    console.log('📊 [AppContext] Invoices loaded:', invoices.length);
    if (invoices.length > 0) {
      console.log('📊 [AppContext] First invoice:', invoices[0]);
    } else {
      console.warn('⚠️ [AppContext] No invoices found!');
    }
  }, [invoices]);

  // ✅ UPDATED: Cloud sync with company_id
  useEffect(() => {
    let cancelled = false;
    let hydrated = false;
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', uid)
        .eq('company_id', selectedCompanyId)
        .maybeSingle();
        
      if (cancelled) return;
      if (!error && data) {
        setSettings({
          name: data.name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          logo: data.logo ?? undefined,
          currency: (data.currency as BusinessSettings['currency']) ?? 'OMR',
          taxNumber: data.tax_number ?? undefined,
          theme: (data.theme as BusinessSettings['theme']) ?? 'system',
          vatEnabled: data.vat_enabled ?? true,
          defaultVatPercentage: Number(data.default_vat_percentage ?? 5),
          bankName: data.bank_name ?? '',
          bankAccountNumber: data.bank_account_number ?? '',
          signature: data.signature ?? undefined,
        });
      }
      hydrated = true;
      void hydrated;
    })();
    return () => { cancelled = true; };
  }, [selectedCompanyId]);

  // ✅ UPDATED: Push settings with company_id
  const settingsPushRef = React.useRef<string>('');
  useEffect(() => {
    const snapshot = JSON.stringify(settings);
    if (snapshot === settingsPushRef.current) return;
    settingsPushRef.current = snapshot;
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      
      const payload = {
        user_id: uid,
        company_id: selectedCompanyId,
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        logo: settings.logo,
        currency: settings.currency,
        tax_number: settings.taxNumber,
        theme: settings.theme,
        vat_enabled: settings.vatEnabled ?? true,
        default_vat_percentage: settings.defaultVatPercentage ?? 0,
        bank_name: settings.bankName,
        bank_account_number: settings.bankAccountNumber,
        signature: settings.signature,
      };
      
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', uid)
        .eq('company_id', selectedCompanyId)
        .maybeSingle();
        
      if (existing?.id) {
        await supabase.from('business_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('business_settings').insert(payload);
      }
    })();
  }, [settings, selectedCompanyId]);

  const normalizeAccounts = (input: Account[]): Account[] => {
    const hasKindField = input.every((account) => account.kind === 'group' || account.kind === 'ledger');
    const hasConsistentParent = input.every((account) => Object.prototype.hasOwnProperty.call(account, 'parentId'));
    if (hasKindField && hasConsistentParent) {
      return input;
    }

    const migrated = input.map((account) => {
      const defaultAccount = DEFAULT_ACCOUNTS.find((candidate) => candidate.id === account.id);
      const fallbackKind = defaultAccount?.kind ?? 'ledger';
      const fallbackParentId = defaultAccount?.parentId ?? null;
      return {
        ...account,
        kind: account.kind ?? fallbackKind,
        parentId: account.parentId ?? fallbackParentId,
      };
    });

    const existingIds = new Set(migrated.map((account) => account.id));
    const missingSystemAccounts = DEFAULT_ACCOUNTS.filter((account) => !existingIds.has(account.id));
    return [...migrated, ...missingSystemAccounts];
  };

  useEffect(() => {
    const migratedAccounts = normalizeAccounts(accounts);
    if (migratedAccounts.length !== accounts.length || migratedAccounts.some((account, index) => account !== accounts[index])) {
      setAccounts(migratedAccounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, setAccounts]);

  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => {
    const auditEntry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    setAuditLog((prev) => [auditEntry, ...prev]);
  };

  const getRecentAuditLog = (limit = 10) => auditLog.slice(0, limit);

  // ✅ NEW: Generate receipt number
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

  // ✅ NEW: Get all payments for an invoice
  const getAllPaymentsForInvoice = (invoiceId: string): number => {
    return payments
      .filter((p) => p.allocations?.some((a) => a.invoiceId === invoiceId))
      .reduce((sum, p) => sum + p.allocations?.reduce((s, a) => s + a.adjustedAmount, 0) || 0, 0);
  };

  // ✅ NEW: Get allocations by payment
  const getAllocationsByPayment = (paymentId: string): PaymentAllocation[] => {
    const payment = payments.find((p) => p.id === paymentId);
    return payment?.allocations || [];
  };

  // ✅ NEW: Get outstanding invoices for a client
  const getOutstandingInvoices = (clientId: string): Invoice[] => {
    return invoices.filter((i) => 
      i.clientId === clientId && 
      i.status !== 'paid' && 
      i.status !== 'cancelled'
    );
  };

  // ✅ NEW: Get total outstanding for a client
  const getTotalOutstanding = (clientId: string): number => {
    const outstandingInvoices = getOutstandingInvoices(clientId);
    return outstandingInvoices.reduce((sum, i) => {
      const paid = getAllPaymentsForInvoice(i.id);
      return sum + (i.netTotal - paid);
    }, 0);
  };

  // ✅ NEW: Get client outstanding summary
  const getClientOutstandingSummary = (clientId: string): OutstandingSummary => {
    const client = getClient(clientId);
    const clientInvoices = getOutstandingInvoices(clientId);
    const now = new Date();
    
    let totalOutstanding = 0;
    let totalOverdue = 0;
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const invoiceDetails: OutstandingSummary['invoices'] = [];

    for (const invoice of clientInvoices) {
      const paid = getAllPaymentsForInvoice(invoice.id);
      const outstanding = invoice.netTotal - paid;
      if (outstanding <= 0) continue;

      totalOutstanding += outstanding;

      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 0) {
        totalOverdue += outstanding;
        if (daysOverdue <= 30) aging['0-30'] += outstanding;
        else if (daysOverdue <= 60) aging['31-60'] += outstanding;
        else if (daysOverdue <= 90) aging['61-90'] += outstanding;
        else aging['90+'] += outstanding;
      }

      invoiceDetails.push({
        id: invoice.id,
        number: invoice.number,
        dueDate: invoice.dueDate,
        amount: invoice.netTotal,
        paid,
        outstanding,
        status: invoice.status,
      });
    }

    return {
      clientId,
      clientName: client?.name || 'Unknown Client',
      totalOutstanding,
      totalOverdue,
      aging,
      invoices: invoiceDetails,
    };
  };

  // ✅ NEW: Get payment allocation summary
  const getPaymentAllocationSummary = (paymentId: string): PaymentAllocationSummary | null => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return null;

    const client = getClient(payment.clientId);
    const allocations = payment.allocations || [];

    return {
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      receiptDate: payment.receiptDate,
      clientName: client?.name || 'Unknown Client',
      totalAmount: payment.netAmount,
      allocatedAmount: allocations.reduce((sum, a) => sum + a.adjustedAmount, 0),
      unallocatedAmount: payment.netAmount - allocations.reduce((sum, a) => sum + a.adjustedAmount, 0),
      invoices: allocations.map((a) => ({
        invoiceNumber: a.invoiceNumber,
        billDate: a.billDate,
        dueDate: a.dueDate,
        amount: a.billAmount,
        receiptAmount: a.receiptAmount,
        discount: a.discountAmount,
        adjusted: a.adjustedAmount,
        outstandingAfter: a.outstandingAfter,
      })),
    };
  };

  // ✅ NEW: Create receipt with bill-wise allocation
  const createReceipt = (receipt: ReceiptDTO): Payment => {
    // 1. Validate total allocations match net amount
    const totalAllocated = receipt.allocations.reduce((sum, a) => sum + a.adjustedAmount, 0);
    if (Math.abs(totalAllocated - receipt.netAmount) > 0.001) {
      throw new Error(`Total allocated (${totalAllocated}) does not match net amount (${receipt.netAmount})`);
    }

    // 2. Create payment record
    const payment: Payment = {
    id: crypto.randomUUID(),
    company_id: selectedCompanyId,
    // ✅ REQUIRED FIELDS
    receiptNumber: receipt.receiptNumber || generateReceiptNumber(),
    receiptDate: receipt.receiptDate || new Date().toISOString().split('T')[0],
    clientId: receipt.clientId,  // ← REQUIRED
    receiptType: receipt.receiptType || 'against_bills',
    paymentMode: receipt.paymentMode || 'bank',  // ← REQUIRED
    updatedAt: new Date().toISOString(),  // ← REQUIRED
    
    // Amounts
    amountReceived: receipt.amountReceived || 0,
    discount: receipt.discount || 0,
    netAmount: receipt.netAmount || 0,
    unadjustedAmount: receipt.unadjustedAmount || 0,
    
    // Details
    narration: receipt.narration || '',
    allocations: receipt.allocations || [],
    paymentModeDetails: receipt.paymentModeDetails.map(m => ({
      ...m,
      id: m.id || crypto.randomUUID(),  // ✅ Ensure id exists
    })),
    
    // Legacy fields
    invoiceId: receipt.allocations.length === 1 ? receipt.allocations[0].invoiceId : undefined,
    invoiceType: 'sales',
    amount: receipt.netAmount || 0,
    date: receipt.receiptDate || new Date().toISOString().split('T')[0],
    method: receipt.paymentMode || 'bank',
    reference: receipt.receiptNumber || '',
    notes: receipt.narration || '',
    
    createdAt: new Date().toISOString(),
  };

    // 3. Save payment
    setPayments((prev) => [...prev, payment]);

    // 4. Save allocations
    const allocationsWithId = receipt.allocations.map((a) => ({
      ...a,
      id: a.id || crypto.randomUUID(),
    }));
    setPaymentAllocations((prev) => [...prev, ...allocationsWithId]);

    // 5. Save payment mode details
    const modeDetailsWithId = receipt.paymentModeDetails.map((m) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
    }));
    setPaymentModeDetails((prev) => [...prev, ...modeDetailsWithId]);

    // 6. Update invoice statuses
    for (const allocation of receipt.allocations) {
      const invoice = invoices.find((i) => i.id === allocation.invoiceId);
      if (invoice) {
        const totalPaid = getAllPaymentsForInvoice(allocation.invoiceId) + allocation.adjustedAmount;
        const newStatus: InvoiceStatus = 
          totalPaid >= invoice.netTotal ? 'paid' : 
          totalPaid > 0 ? 'partial' : 'sent';
        
        setInvoices((prev) => prev.map((i) => 
          i.id === invoice.id ? { 
            ...i, 
            status: newStatus,
            updatedAt: new Date().toISOString()
          } : i
        ));
      }
    }

    // 7. Create journal entry
    const paymentAccountId = receipt.paymentMode === 'cash' ? 'acc-1000' : 'acc-1010';
    const lines: JournalLine[] = [
      { accountId: paymentAccountId, debit: receipt.netAmount, credit: 0 },
      { accountId: 'acc-1100', debit: 0, credit: receipt.netAmount },
    ];

    if (receipt.discount > 0) {
      lines.push({ accountId: 'acc-5000', debit: receipt.discount, credit: 0 });
      lines[1] = { accountId: 'acc-1100', debit: 0, credit: receipt.netAmount + receipt.discount };
    }

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      company_id: selectedCompanyId,
      date: receipt.receiptDate || new Date().toISOString().split('T')[0],
      reference: payment.receiptNumber,
      referenceType: 'receipt',
      referenceId: payment.id,
      description: `Receipt ${payment.receiptNumber} from ${receipt.clientId}`,
      lines,
      createdAt: new Date().toISOString(),
      idempotencyKey: `receipt:${payment.id}`,
    };

    createJournalEntry(entry);

    // 8. Add audit entry
    addAuditEntry({
      type: 'payment',
      action: 'created',
      target: payment.receiptNumber,
      details: `Receipt created for ${receipt.allocations.length} bill(s)`,
      value: payment.netAmount,
    });

    return payment;
  };

  // ✅ UPDATED: Client operations with company_id
  const addClient = (client: Client) => {
    const clientWithCompany = {
      ...client,
      company_id: selectedCompanyId,
    };
    setClients((prev) => [...prev, clientWithCompany]);
    addAuditEntry({
      type: 'client',
      action: 'created',
      target: client.name,
      details: `Created ${client.type} for company ${selectedCompanyId}`,
    });
  };

  const updateClient = (client: Client) => {
    const clientWithCompany = {
      ...client,
      company_id: selectedCompanyId,
    };
    setClients((prev) => prev.map((c) => (c.id === client.id ? clientWithCompany : c)));
    addAuditEntry({
      type: 'client',
      action: 'updated',
      target: client.name,
      details: `Updated client profile`,
    });
  };

  const deleteClient = (id: string) => {
    const existing = clients.find((c) => c.id === id);
    const openInvoices = invoices.filter(
      (i) => i.clientId === id && !['paid', 'cancelled'].includes(i.status)
    );
    if (openInvoices.length > 0) {
      throw new Error(
        `Cannot delete: this client has ${openInvoices.length} open invoice(s). Please settle or cancel them first.`
      );
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'client',
        action: 'deleted',
        target: existing.name,
        details: `Removed customer/vendor profile`,
      });
    }
  };
  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getCustomers = () => clients.filter((c) => c.type === 'customer' || c.type === 'both');
  const getVendors = () => clients.filter((c) => c.type === 'vendor' || c.type === 'both');

  // ✅ UPDATED: Quotation operations with company_id
  const addQuotation = (quotation: Quotation) => {
    const quotationWithCompany = {
      ...quotation,
      company_id: selectedCompanyId,
    };
    setQuotations((prev) => [...prev, quotationWithCompany]);
    addAuditEntry({
      type: 'quotation',
      action: 'created',
      target: quotation.number,
      details: `Quotation saved for client ${quotation.clientId} for company ${selectedCompanyId}`,
      value: quotation.netTotal,
    });
  };

  const updateQuotation = (quotation: Quotation) => {
    const quotationWithCompany = {
      ...quotation,
      company_id: selectedCompanyId,
    };
    setQuotations((prev) => prev.map((q) => (q.id === quotation.id ? quotationWithCompany : q)));
    addAuditEntry({
      type: 'quotation',
      action: 'updated',
      target: quotation.number,
      details: 'Quotation details updated',
      value: quotation.netTotal,
    });
  };

  const deleteQuotation = (id: string) => {
    const existing = quotations.find((q) => q.id === id);
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'quotation',
        action: 'deleted',
        target: existing.number,
        details: 'Quotation removed',
      });
    }
  };
  const getQuotation = (id: string) => quotations.find((q) => q.id === id);

  // ✅ UPDATED: Invoice operations with company_id
  const addInvoice = (invoice: Invoice) => {
    const invoiceWithCompany = {
      ...invoice,
      company_id: selectedCompanyId,
    };
    setInvoices((prev) => [...prev, invoiceWithCompany]);
    addAuditEntry({
      type: 'invoice',
      action: 'created',
      target: invoice.number,
      details: `Sales invoice created for client ${invoice.clientId} for company ${selectedCompanyId}`,
      value: invoice.netTotal,
    });
  };

  const updateInvoice = (invoice: Invoice) => {
    const invoiceWithCompany = {
      ...invoice,
      company_id: selectedCompanyId,
    };
    setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoiceWithCompany : i)));
    addAuditEntry({
      type: 'invoice',
      action: 'updated',
      target: invoice.number,
      details: `Invoice status updated to ${invoice.status}`,
      value: invoice.netTotal,
    });
  };

  const deleteInvoice = (id: string) => {
    const existing = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'invoice',
        action: 'deleted',
        target: existing.number,
        details: 'Sales invoice deleted',
      });
    }
  };
  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  // ✅ UPDATED: Project operations with company_id
  const addProject = (project: Project) => {
    const projectWithCompany = {
      ...project,
      company_id: selectedCompanyId,
    };
    setProjects((prev) => [...prev, projectWithCompany]);
    addAuditEntry({
      type: 'project',
      action: 'created',
      target: project.name,
      details: `Project created for customer ${project.customerId} for company ${selectedCompanyId}`,
      value: project.totalValue,
    });
  };

  const updateProject = (project: Project) => {
    const projectWithCompany = {
      ...project,
      company_id: selectedCompanyId,
    };
    setProjects((prev) => prev.map((p) => (p.id === project.id ? projectWithCompany : p)));
    addAuditEntry({
      type: 'project',
      action: 'updated',
      target: project.name,
      details: `Project status updated to ${project.status}`,
      value: project.totalValue,
    });
  };

  const deleteProject = (id: string) => {
    const existing = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'project',
        action: 'deleted',
        target: existing.name,
        details: 'Project deleted',
      });
    }
  };
  const getProject = (id: string) => projects.find((p) => p.id === id);

  // ✅ UPDATED: Purchase Invoice operations with company_id
  const addPurchaseInvoice = (pi: PurchaseInvoice) => {
    const piWithCompany = {
      ...pi,
      company_id: selectedCompanyId,
    };
    setPurchaseInvoices((prev) => [...prev, piWithCompany]);
    addAuditEntry({
      type: 'purchase_invoice',
      action: 'created',
      target: pi.number,
      details: `Purchase invoice created for vendor ${pi.vendorId} for company ${selectedCompanyId}`,
      value: pi.netTotal,
    });
  };

  const updatePurchaseInvoice = (pi: PurchaseInvoice) => {
    const piWithCompany = {
      ...pi,
      company_id: selectedCompanyId,
    };
    setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? piWithCompany : p)));
    addAuditEntry({
      type: 'purchase_invoice',
      action: 'updated',
      target: pi.number,
      details: `Purchase invoice status updated to ${pi.status}`,
      value: pi.netTotal,
    });
  };

  const deletePurchaseInvoice = (id: string) => {
    const existing = purchaseInvoices.find((p) => p.id === id);
    setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'purchase_invoice',
        action: 'deleted',
        target: existing.number,
        details: 'Purchase invoice deleted',
      });
    }
  };
  const getPurchaseInvoice = (id: string) => purchaseInvoices.find((p) => p.id === id);

  // ✅ UPDATED: Payment operations with company_id
  const addPayment = (payment: Payment) => {
    const paymentWithCompany = {
      ...payment,
      company_id: selectedCompanyId,
    };
    setPayments((prev) => [...prev, paymentWithCompany]);
    addAuditEntry({
      type: 'payment',
      action: 'processed',
      target: payment.reference || payment.invoiceId || '',
      details: `Payment recorded via ${payment.method} for company ${selectedCompanyId}`,
      value: payment.amount,
    });
  };
  
  const getPaymentsByInvoice = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId);
  const getPaymentsByClient = (clientId: string) => {
    const clientInvoiceIds = invoices.filter((i) => i.clientId === clientId).map((i) => i.id);
    const clientPurchaseIds = purchaseInvoices.filter((p) => p.vendorId === clientId).map((p) => p.id);
    return payments.filter((p) => clientInvoiceIds.includes(p.invoiceId) || clientPurchaseIds.includes(p.invoiceId));
  };

  const removeJournalByReference = (
    referenceType: JournalEntry['referenceType'],
    referenceId: string,
  ) => {
    setJournalEntries((prev) =>
      prev.filter((e) => !(e.referenceType === referenceType && e.referenceId === referenceId)),
    );
  };

  const refreshInvoiceStatusAfterPayment = (payment: Payment, removedAmount: number) => {
    if (payment.invoiceType === 'sales') {
      const inv = invoices.find((i) => i.id === payment.invoiceId);
      if (!inv) return;
      const remainingPaid = payments
        .filter((p) => p.invoiceId === inv.id && p.id !== payment.id)
        .reduce((s, p) => s + p.amount, 0) - removedAmount;
      const totalPaid = Math.max(0, remainingPaid + payment.amount);
      const status: InvoiceStatus =
        totalPaid <= 0 ? 'sent' : totalPaid < inv.netTotal ? 'partial' : 'paid';
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status, updatedAt: new Date().toISOString() } : i)));
    } else {
      const pi = purchaseInvoices.find((p) => p.id === payment.invoiceId);
      if (!pi) return;
      const remainingPaid = payments
        .filter((p) => p.invoiceId === pi.id && p.id !== payment.id)
        .reduce((s, p) => s + p.amount, 0) - removedAmount;
      const totalPaid = Math.max(0, remainingPaid + payment.amount);
      const status = totalPaid <= 0 ? 'sent' : totalPaid < pi.netTotal ? 'partial' : 'paid';
      setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? { ...p, status: status as any, updatedAt: new Date().toISOString() } : p)));
    }
  };

  const updatePayment = (payment: Payment) => {
    const existing = payments.find((p) => p.id === payment.id);
    setPayments((prev) => prev.map((p) => (p.id === payment.id ? payment : p)));

    const refType: JournalEntry['referenceType'] =
      payment.invoiceType === 'sales' ? 'receipt' : 'payment';
    const previousRefType: JournalEntry['referenceType'] = existing
      ? existing.invoiceType === 'sales' ? 'receipt' : 'payment'
      : refType;

    setJournalEntries((prev) =>
      prev.filter(
        (e) =>
          !(
            (e.referenceType === previousRefType || e.referenceType === refType) &&
            e.referenceId === payment.id
          ),
      ),
    );

    const paymentAccountId = payment.method === 'cash' ? 'acc-1000' : 'acc-1010';
    const lines: JournalLine[] =
      payment.invoiceType === 'sales'
        ? [
            { accountId: paymentAccountId, debit: payment.amount || 0, credit: 0 },
            { accountId: 'acc-1100', debit: 0, credit: payment.amount || 0 },
          ]
        : [
            { accountId: 'acc-2000', debit: payment.amount || 0, credit: 0 },
            { accountId: paymentAccountId, debit: 0, credit: payment.amount || 0 },
          ];

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      date: payment.date || new Date().toISOString().split('T')[0],
      reference: `${refType === 'receipt' ? 'REC' : 'PAY'}-${payment.id.slice(0, 8)}`,
      referenceType: refType,
      referenceId: payment.id,
      description: `${refType === 'receipt' ? 'Receipt' : 'Payment'} ${payment.reference || payment.invoiceId} (updated)`,
      lines,
      createdAt: new Date().toISOString(),
      idempotencyKey: `${refType}:${payment.id}:${Date.now()}`,
    };
    assertBalancedLines(newEntry.lines, 'Updated payment journal is unbalanced');
    setJournalEntries((prev) => [...prev, newEntry]);

    addAuditEntry({
      type: 'payment', action: 'updated',
      target: payment.reference || payment.invoiceId || '',
      details: `Payment updated (${payment.method}) – journal reversed and reposted`,
      value: payment.amount,
    });
  };

  const deletePayment = (id: string) => {
    const existing = payments.find((p) => p.id === id);
    if (!existing) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));
    
    // Remove allocations
    setPaymentAllocations((prev) => prev.filter((a) => 
      !existing.allocations?.some((pa) => pa.id === a.id)
    ));
    
    // Remove mode details
    setPaymentModeDetails((prev) => prev.filter((m) => 
      !existing.paymentModeDetails?.some((pm) => pm.id === m.id)
    ));
    
    const refType: JournalEntry['referenceType'] = existing.invoiceType === 'sales' ? 'receipt' : 'payment';
    removeJournalByReference(refType, existing.id);
    
    if (existing.invoiceType === 'sales') {
      const inv = invoices.find((i) => i.id === existing.invoiceId);
      if (inv) {
        const remaining = payments
          .filter((p) => p.invoiceId === inv.id && p.id !== id)
          .reduce((s, p) => s + p.amount, 0);
        const status: InvoiceStatus =
          remaining <= 0 ? 'sent' : remaining < inv.netTotal ? 'partial' : 'paid';
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status, updatedAt: new Date().toISOString() } : i)));
      }
    } else {
      const pi = purchaseInvoices.find((p) => p.id === existing.invoiceId);
      if (pi) {
        const remaining = payments
          .filter((p) => p.invoiceId === pi.id && p.id !== id)
          .reduce((s, p) => s + p.amount, 0);
        const status = remaining <= 0 ? 'sent' : remaining < pi.netTotal ? 'partial' : 'paid';
        setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? { ...p, status: status as any, updatedAt: new Date().toISOString() } : p)));
      }
    }
    addAuditEntry({
      type: 'payment', action: 'deleted',
      target: existing.reference || existing.invoiceId || '',
      details: 'Payment deleted and journal reversed',
      value: existing.amount,
    });
  };

  // Account operations
  const addAccount = (account: Account) => {
    if (!account.kind) {
      throw new Error('Account kind is required.');
    }
    if (account.parentId) {
      const parent = accounts.find((candidate) => candidate.id === account.parentId);
      if (!parent) {
        throw new Error('Selected parent group does not exist.');
      }
      if (parent.kind !== 'group') {
        throw new Error('Accounts can only be created under group nodes.');
      }
      if (parent.type !== account.type) {
        throw new Error('Parent group type must match account type.');
      }
    }
    if (account.parentId === account.id) {
      throw new Error('An account cannot be its own parent.');
    }
    const parentLookup = new Map(accounts.map((candidate) => [candidate.id, candidate.parentId]));
    parentLookup.set(account.id, account.parentId);
    const seen = new Set<string>([account.id]);
    let cursor = account.parentId;
    while (cursor) {
      if (seen.has(cursor)) {
        throw new Error('Account hierarchy cycle detected.');
      }
      seen.add(cursor);
      cursor = parentLookup.get(cursor) ?? null;
    }

    const accountWithCompany = {
      ...account,
      company_id: selectedCompanyId,
    };
    setAccounts((prev) => [...prev, accountWithCompany]);
    addAuditEntry({
      type: 'account',
      action: 'created',
      target: account.name,
      details: 'Chart of accounts item added',
    });
  };
  
  const deleteAccount = (id: string) => {
    setAccounts((prev) => {
      const target = prev.find((account) => account.id === id);
      if (!target || target.isSystem) {
        return prev;
      }

      const hasChildren = prev.some((account) => account.parentId === id);
      if (hasChildren) {
        throw new Error('Cannot delete a group account that still has child accounts.');
      }

      return prev.filter((account) => account.id !== id);
    });
  };

  // Journal operations
  const createJournalEntry = (entry: JournalEntry) => {
    assertBalancedLines(entry.lines, 'Journal entry is unbalanced');
    const entryWithCompany = {
      ...entry,
      company_id: selectedCompanyId,
    };
    setJournalEntries((prev) => [...prev, entryWithCompany]);
    setAccountBalances((prev) => applyJournalLinesToBalances(entry.lines, prev));
    addAuditEntry({
      type: 'account',
      action: 'created',
      target: entry.reference,
      details: `Journal entry recorded for ${entry.referenceType}`,
    });
  };

  const postJournalForReference = (entry: JournalEntry) => {
    const duplicate = entry.idempotencyKey
      ? journalEntries.find((existing) => existing.idempotencyKey === entry.idempotencyKey)
      : undefined;
    if (duplicate) {
      return duplicate;
    }
    createJournalEntry(entry);
    return entry;
  };

  const postTransactionEntry = (input: {
    date: string;
    reference: string;
    referenceType: JournalEntry['referenceType'];
    referenceId: string;
    description: string;
    lines: JournalLine[];
    idempotencyKey?: string;
  }): JournalEntry => {
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: input.date,
      reference: input.reference,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      lines: input.lines,
      createdAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    };
    return postJournalForReference(entry);
  };

  const reverseJournalForReference = (
    referenceType: JournalEntry['referenceType'],
    referenceId: string,
  ): JournalEntry[] => {
    if (referenceType !== 'sales_invoice') return [];
    const existingForRef = journalEntries.filter(
      (entry) => entry.referenceType === referenceType && entry.referenceId === referenceId,
    );
    const baseInvoice = invoices.find((inv) => inv.id === referenceId);
    if (!baseInvoice || existingForRef.length === 0) {
      return [];
    }

    const reversals = buildSalesInvoiceRepostEntries(baseInvoice, baseInvoice, existingForRef)
      .filter((entry) => !!entry.reversalOf);

    return reversals.map((entry) => postJournalForReference(entry));
  };

  const postSalesInvoice = (invoice: Invoice): JournalEntry => {
    const postingEntry = buildSalesInvoicePostingEntry(invoice);
    return postJournalForReference(postingEntry);
  };

  const repostSalesInvoice = (invoiceBefore: Invoice, invoiceAfter: Invoice): JournalEntry[] => {
    const existingForRef = journalEntries.filter(
      (entry) => entry.referenceType === 'sales_invoice' && entry.referenceId === invoiceBefore.id,
    );
    const generatedEntries = buildSalesInvoiceRepostEntries(invoiceBefore, invoiceAfter, existingForRef);
    return generatedEntries.map((entry) => postJournalForReference(entry));
  };

  // ✅ UPDATED: Voucher operations with company_id
  const addVoucher = (voucher: Voucher) => {
    const voucherWithCompany = {
      ...voucher,
      company_id: selectedCompanyId,
    };
    setVouchers((prev) => [...prev, voucherWithCompany]);
    addAuditEntry({
      type: 'voucher',
      action: 'created',
      target: voucher.number,
      details: `Voucher created for ${voucher.partyName} for company ${selectedCompanyId}`,
      value: voucher.amount,
    });
  };
  
  const updateVoucher = (voucher: Voucher) => {
    const voucherWithCompany = {
      ...voucher,
      company_id: selectedCompanyId,
    };
    setVouchers((prev) => prev.map((v) => (v.id === voucher.id ? voucherWithCompany : v)));
    addAuditEntry({
      type: 'voucher', action: 'updated',
      target: voucher.number,
      details: `Voucher updated for ${voucher.partyName}`,
      value: voucher.amount,
    });
  };
  
  const deleteVoucher = (id: string) => {
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return;
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    setJournalEntries((prev) => prev.filter((e) => e.referenceId !== id));
    addAuditEntry({
      type: 'voucher', action: 'deleted',
      target: existing.number,
      details: 'Voucher deleted and journal reversed',
      value: existing.amount,
    });
  };
  
  const generateVoucherNumber = (type: string) => {
    const prefix = type.toUpperCase().replace(/_/g, '-');
    const year = new Date().getFullYear();
    const count = vouchers.filter((v) => v.type === type).length + 1;
    return `${prefix}-${year}-${count.toString().padStart(3, '0')}`;
  };

  const addJournalVoucher = (voucher: Voucher, lines: JournalLine[]) => {
    const voucherWithCompany = {
      ...voucher,
      company_id: selectedCompanyId,
    };
    setVouchers((prev) => [...prev, voucherWithCompany]);
    assertBalancedLines(lines, 'Journal voucher is unbalanced');
    postTransactionEntry({
      date: voucher.date,
      reference: voucher.number,
      referenceType: 'journal',
      referenceId: voucher.id,
      description: voucher.narration || `Journal Voucher ${voucher.number}`,
      lines,
      idempotencyKey: `journal:${voucher.id}`,
    });
    addAuditEntry({
      type: 'voucher', action: 'created', target: voucher.number,
      details: 'Journal voucher posted', value: voucher.amount,
    });
  };

  // ✅ UPDATED: Item operations with company_id
  const addItem = (item: Item) => {
    const itemWithCompany = {
      ...item,
      company_id: selectedCompanyId,
    };
    setItems((prev) => [...prev, itemWithCompany]);
  };
  
  const addSalesman = (s: Salesman) => {
    const salesmanWithCompany = {
      ...s,
      company_id: selectedCompanyId,
    };
    setSalesmen((prev) => [...prev, salesmanWithCompany]);
  };
  
  const getSalesman = (id: string) => salesmen.find((s) => s.id === id);
  
  const updateItem = (item: Item) => {
    const itemWithCompany = {
      ...item,
      company_id: selectedCompanyId,
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? itemWithCompany : i)));
  };
  
  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };
  
  const getItem = (id: string) => items.find((i) => i.id === id);
  
  const adjustItemStock = (itemId: string, delta: number) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, stock: i.stock + delta } : i)));
  };
  
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const reconcileJournalBalances = () => {
    const rebuilt = buildBalancesFromJournalEntries(journalEntries);
    const trackedAccounts = new Set([...Object.keys(rebuilt), ...Object.keys(accountBalances)]);
    const mismatch = [...trackedAccounts].some((accountId) => {
      const cached = accountBalances[accountId] ?? { debit: 0, credit: 0 };
      const fresh = rebuilt[accountId] ?? { debit: 0, credit: 0 };
      return Math.abs(cached.debit - fresh.debit) > 0.001 || Math.abs(cached.credit - fresh.credit) > 0.001;
    });
    if (mismatch) {
      setAccountBalances(rebuilt);
    }
  };

  useEffect(() => {
    reconcileJournalBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalEntries]);

  const getAccountBalance = (accountId: string) =>
    getNetBalanceForAccount(accountId, accountsById, accountBalances);

  // ✅ UPDATED: Company operations with Supabase sync
  const createCompany = (name: string) => {
    const id = crypto.randomUUID();
    const newCompany: Company = { id, name };
    setCompanies((prev) => [...prev, newCompany]);
    setSelectedCompanyId(id);
    
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) return;
        
        await supabase.from('business_settings').insert({
          user_id: uid,
          company_id: id,
          name: name,
          email: settings.email || '',
          phone: settings.phone || '',
          address: settings.address || '',
          currency: settings.currency || 'OMR',
          vat_enabled: settings.vatEnabled ?? true,
          default_vat_percentage: settings.defaultVatPercentage ?? 5,
        });
        console.log('✅ Company created in Supabase:', name);
      } catch (error) {
        console.error('Failed to create company in Supabase:', error);
      }
    })();
  };

  const updateCompany = (id: string, name: string) => {
    setCompanies((prev) => prev.map((company) => (company.id === id ? { ...company, name } : company)));
    
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) return;
        
        await supabase
          .from('business_settings')
          .update({ name })
          .eq('user_id', uid)
          .eq('company_id', id);
        console.log('✅ Company updated in Supabase:', name);
      } catch (error) {
        console.error('Failed to update company in Supabase:', error);
      }
    })();
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => {
      const updated = prev.filter((company) => company.id !== id);
      if (id === selectedCompanyId) {
        const fallback = updated[0] ?? { id: 'default', name: 'Default Company' };
        setSelectedCompanyId(fallback.id);
      }
      return updated;
    });

    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) return;
        
        await supabase
          .from('business_settings')
          .delete()
          .eq('user_id', uid)
          .eq('company_id', id);
        console.log('✅ Company deleted from Supabase:', id);
      } catch (error) {
        console.error('Failed to delete company from Supabase:', error);
      }
    })();

    try {
      const keys = ['clients', 'quotations', 'invoices', 'purchase_invoices', 'payments', 'accounts', 'journal_entries', 'account_balances', 'settings', 'vouchers', 'items', 'audit_log', 'payment_allocations', 'payment_mode_details'];
      keys.forEach(k => window.localStorage.removeItem(`app_${k}_${id}`));
    } catch (error) {
      console.warn('Failed to remove company data', error);
    }
  };

  // Generate unique numbers
  const generateQuotationNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const existing = new Set(quotations.map((q) => q.number));
    let count = quotations.filter((q) => q.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const existing = new Set(invoices.map((i) => i.number));
    let count = invoices.filter((i) => i.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  const generatePurchaseInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `PI-${year}-`;
    const existing = new Set(purchaseInvoices.map((p) => p.number));
    let count = purchaseInvoices.filter((p) => p.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  // Helper function to calculate invoice payment status based on payment records
  const calculateInvoicePaymentStatus = (invoiceId: string): Extract<InvoiceStatus, 'sent' | 'partial' | 'paid'> => {
    const invoicePayments = getPaymentsByInvoice(invoiceId);
    const invoice = invoices.find((i) => i.id === invoiceId);
    
    if (!invoice) return 'sent';
    
    const totalPaid = invoicePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const invoiceTotal = invoice.netTotal;
    
    if (totalPaid === 0) {
      return 'sent';
    } else if (totalPaid < invoiceTotal) {
      return 'partial';
    } else {
      return 'paid';
    }
  };

  // Sync functionality
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const syncToDatabase = async () => {
    if (!isElectron) {
      throw new Error('Sync is only available in the desktop app');
    }

    try {
      // Sync clients
      for (const client of clients) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO parties (id, type, name, email, phone, address, tax_number, payment_terms, credit_limit, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [client.id, client.type, client.name, client.email, client.phone, client.address, client.taxRegistrationNumber, client.paymentTermsDays, client.creditLimit, client.createdAt]
        );
      }

      // Sync quotations
      for (const quotation of quotations) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO quotations (id, number, client_id, salesman_id, net_total, vat_amount, total, status, converted_invoice_id, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotation.id, quotation.number, quotation.clientId, quotation.salesmanId || null, quotation.netTotal, 0, quotation.netTotal, quotation.status, quotation.convertedInvoiceId, quotation.notes, quotation.terms, quotation.createdAt, quotation.updatedAt]
        );
      }

      // Sync invoices
      for (const invoice of invoices) {
        const invoiceVatAmount = invoice.vatEnabled === false ? 0 : invoice.items.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO invoices (id, number, manual_invoice_number, invoice_number_mode, client_id, salesman_id, quotation_id, net_total, vat_amount, total, vat_enabled, status, due_date, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoice.id, invoice.number, invoice.manualInvoiceNumber || null, invoice.invoiceNumberMode || 'auto', invoice.clientId, (invoice as any).salesmanId || null, invoice.quotationId, invoice.netTotal, invoiceVatAmount, invoice.netTotal, invoice.vatEnabled === false ? 0 : 1, invoice.status, invoice.dueDate, invoice.notes, invoice.terms, invoice.createdAt, invoice.updatedAt]
        );
      }

      // Sync purchase invoices
      for (const pi of purchaseInvoices) {
        const purchaseVatAmount = pi.vatEnabled === false ? 0 : pi.items.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO purchase_invoices (id, number, manual_invoice_number, invoice_number_mode, vendor_id, net_total, vat_amount, total, vat_enabled, status, due_date, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pi.id, pi.number, pi.manualInvoiceNumber || null, pi.invoiceNumberMode || 'auto', pi.vendorId, pi.netTotal, purchaseVatAmount, pi.netTotal, pi.vatEnabled === false ? 0 : 1, pi.status, pi.dueDate, pi.notes, pi.terms, pi.createdAt, pi.updatedAt]
        );
      }

      // Sync payments (including allocations and mode details)
      for (const payment of payments) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO payments (id, invoice_id, invoice_type, amount, date, method, reference, notes, created_at, receipt_number, receipt_date, receipt_type, amount_received, discount, net_amount, unadjusted_amount, narration)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payment.id, 
            payment.invoiceId || '', 
            payment.invoiceType || 'sales', 
            payment.amount || 0, 
            payment.date || payment.receiptDate, 
            payment.method || payment.paymentMode, 
            payment.reference || payment.receiptNumber, 
            payment.notes || payment.narration, 
            payment.createdAt,
            payment.receiptNumber || '',
            payment.receiptDate || '',
            payment.receiptType || 'against_bills',
            payment.amountReceived || 0,
            payment.discount || 0,
            payment.netAmount || 0,
            payment.unadjustedAmount || 0,
            payment.narration || ''
          ]
        );
      }

      // Sync salesmen
      for (const s of salesmen) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO salesmen (id, name, phone, created_at) VALUES (?, ?, ?, ?)`,
          [s.id, s.name, s.phone || null, s.createdAt]
        );
      }

      // Sync business settings
      await window.electronAPI!.query(
        `INSERT OR REPLACE INTO business_settings (id, name, email, phone, address, logo, currency, tax_number)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [settings.name, settings.email, settings.phone, settings.address, settings.logo, settings.currency, settings.taxNumber]
      );

    } catch (error) {
      console.error('Sync to database failed:', error);
      throw error;
    }
  };

  const syncFromDatabase = async () => {
    if (!isElectron) {
      throw new Error('Sync is only available in the desktop app');
    }

    try {
      // Sync clients from database
      const dbClients = await window.electronAPI!.getParties();
      if (dbClients && dbClients.length > 0) {
        const formattedClients: Client[] = dbClients.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          type: c.type,
          paymentTermsDays: c.payment_terms,
          taxRegistrationNumber: c.tax_number,
          creditLimit: c.credit_limit,
          createdAt: c.created_at,
        }));
        setClients(formattedClients);
      }

      // Sync quotations from database
      const dbQuotations = await window.electronAPI!.getQuotations();
      if (dbQuotations && dbQuotations.length > 0) {
        const formattedQuotations: Quotation[] = dbQuotations.map((q: any) => ({
          id: q.id,
          number: q.number,
          clientId: q.client_id,
          salesmanId: q.salesman_id,
          items: [],
          netTotal: q.net_total,
          vatAmount: q.vat_amount || 0,
          total: q.total || q.net_total,
          status: q.status,
          convertedInvoiceId: q.converted_invoice_id,
          notes: q.notes,
          terms: q.terms,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
        }));
        setQuotations(formattedQuotations);
      }

      // Sync invoices from database
      const dbInvoices = await window.electronAPI!.getInvoices();
      if (dbInvoices && dbInvoices.length > 0) {
        const formattedInvoices: Invoice[] = dbInvoices.map((i: any) => ({
          id: i.id,
          number: i.number || i.invoice_no,
          manualInvoiceNumber: i.manual_invoice_number || undefined,
          invoiceNumberMode: i.invoice_number_mode || 'auto',
          vatEnabled: i.vat_enabled === 0 ? false : true,
          clientId: i.client_id,
          salesmanId: i.salesman_id,
          quotationId: i.quotation_id,
          items: [],
          netTotal: i.net_total,
          status: i.status,
          dueDate: i.due_date,
          notes: i.notes,
          terms: i.terms,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
        }));
        setInvoices(formattedInvoices);
      }

      // Sync purchase invoices from database
      const dbPurchaseInvoices = await window.electronAPI!.getPurchaseInvoices();
      if (dbPurchaseInvoices && dbPurchaseInvoices.length > 0) {
        const formattedPurchaseInvoices: PurchaseInvoice[] = dbPurchaseInvoices.map((p: any) => ({
          id: p.id,
          number: p.number || p.invoice_no,
          manualInvoiceNumber: p.manual_invoice_number || undefined,
          invoiceNumberMode: p.invoice_number_mode || 'auto',
          vatEnabled: p.vat_enabled === 0 ? false : true,
          vendorId: p.vendor_id,
          items: [],
          netTotal: p.net_total,
          status: p.status,
          dueDate: p.due_date,
          notes: p.notes,
          terms: p.terms,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setPurchaseInvoices(formattedPurchaseInvoices);
      }

      // Sync payments from database
      const dbPayments = await window.electronAPI!.getPayments();
      if (dbPayments && dbPayments.length > 0) {
        const formattedPayments: Payment[] = dbPayments.map((p: any) => ({
          id: p.id,
          invoiceId: p.invoice_id,
          invoiceType: p.invoice_type,
          amount: p.amount,
          date: p.date,
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          createdAt: p.created_at,
      // ✅ REQUIRED FIELDS
          clientId: p.client_id || '',  // ← ADD THIS
          paymentMode: p.payment_mode || 'bank',  // ← ADD THIS
          updatedAt: p.updated_at || new Date().toISOString(),  // ← ADD THIS
          receiptNumber: p.receipt_number || '',
          receiptDate: p.receipt_date || p.date,
          receiptType: p.receipt_type || 'against_bills',
          amountReceived: p.amount_received || p.amount,
          discount: p.discount || 0,
          netAmount: p.net_amount || p.amount,
          unadjustedAmount: p.unadjusted_amount || 0,
          narration: p.narration || p.notes || '',
          allocations: [],
          paymentModeDetails: [],
        }));
        setPayments(formattedPayments);
      }

      // Sync business settings from database
      const dbSettings = (await window.electronAPI!.getBusinessSettings()) as Record<string, any> | null;
      if (dbSettings) {
        setSettings({
          name: dbSettings.name || '',
          email: dbSettings.email || '',
          phone: dbSettings.phone || '',
          address: dbSettings.address || '',
          logo: dbSettings.logo,
          currency: dbSettings.currency || 'INR',
          taxNumber: dbSettings.tax_number,
          defaultVatPercentage: dbSettings.default_vat_percentage ?? settings.defaultVatPercentage ?? 18,
          vatEnabled: dbSettings.vat_enabled ?? settings.vatEnabled,
          allowManualInvoiceNumberEntry: dbSettings.allow_manual_invoice_number_entry ?? settings.allowManualInvoiceNumberEntry ?? false,
          bankName: settings.bankName,
          bankAccountNumber: settings.bankAccountNumber,
          theme: settings.theme,
        });
      }

    } catch (error) {
      console.error('Sync from database failed:', error);
      throw error;
    }
  };

  const forceSync = async () => {
    try {
      await syncFromDatabase();
      await syncToDatabase();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={useMemo(() => ({
        companies, selectedCompanyId, setSelectedCompanyId, createCompany, updateCompany, deleteCompany,
        clients, setClients, addClient, updateClient, deleteClient, getClient, getCustomers, getVendors,
        quotations, setQuotations, addQuotation, updateQuotation, deleteQuotation, getQuotation,
        invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice, getInvoice,
        projects, setProjects, addProject, updateProject, deleteProject, getProject,
        purchaseInvoices, setPurchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoice, generatePurchaseInvoiceNumber,
        payments, addPayment, updatePayment, deletePayment, getPaymentsByInvoice, getPaymentsByClient, calculateInvoicePaymentStatus,
        createReceipt, getAllocationsByPayment, getOutstandingInvoices, getClientOutstandingSummary, getPaymentAllocationSummary, getTotalOutstanding,
        accounts, setAccounts, addAccount, deleteAccount,
        journalEntries, accountBalances, createJournalEntry, postJournalForReference, postTransactionEntry, reverseJournalForReference, postSalesInvoice, repostSalesInvoice, reconcileJournalBalances, getAccountBalance,
        vouchers, addVoucher, updateVoucher, deleteVoucher, generateVoucherNumber,
        addJournalVoucher,
        items, addItem, updateItem, deleteItem, getItem, adjustItemStock,
        salesmen, addSalesman, getSalesman,
        settings, setSettings,
        syncToDatabase, syncFromDatabase, forceSync, isElectron,
        auditLog, addAuditEntry, getRecentAuditLog,
        generateQuotationNumber, generateInvoiceNumber, generateReceiptNumber,
        currentCompany, setCurrentCompany,
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }), [
        companies, selectedCompanyId,
        clients, quotations, invoices, projects, purchaseInvoices,
        payments, paymentAllocations, paymentModeDetails,
        accounts, journalEntries, accountBalances,
        vouchers, items, salesmen, settings, auditLog, isElectron,
        currentCompany,
      ])}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}