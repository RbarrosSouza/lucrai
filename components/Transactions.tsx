import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Filter, CheckCircle, Clock, AlertTriangle, 
  Trash2, X, Calendar, DollarSign, Tag, Briefcase, User, 
  Building, Repeat, Layers, ArrowRight, Save, AlertCircle, ChevronDown,
  CreditCard, CalendarDays, Edit2, FileText, Landmark, RefreshCw
} from 'lucide-react';
import { Transaction, TransactionStatus, TransactionType, Supplier, PaymentMethod, BankAccount, CostCenter, Category } from '../types';
import { supabase } from '../services/supabaseClient';
import { SupplierModal } from './transactions/SupplierModal';
import { formatSupabaseError } from '../services/formatSupabaseError';
import { CostCenterSelect } from './transactions/CostCenterSelect';
import { SupplierSelect } from './transactions/SupplierSelect';
import { addMonthsISO, firstDayOfCurrentMonthISO, formatDateBR, lastDayOfCurrentMonthISO, todayISOInSaoPaulo } from '../services/dates';

// --- HELPER FUNCTIONS ---

const addMonths = addMonthsISO;
const getFirstDayOfMonth = () => firstDayOfCurrentMonthISO();
const getLastDayOfMonth = () => lastDayOfCurrentMonthISO();

async function trySeedDefaultDre(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const orgRes = await supabase.rpc('current_org_id');
    if (orgRes.error) {
      return { ok: false, reason: orgRes.error.message };
    }
    const orgId = orgRes.data as string | null;
    if (!orgId) return { ok: false, reason: 'org_id não encontrado (profiles.active_org_id vazio)' };

    const seedRes = await supabase.rpc('seed_default_dre', { _org_id: orgId });
    if (seedRes.error) return { ok: false, reason: seedRes.error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'Erro desconhecido ao fazer seed do DRE' };
  }
}

// --- COMPONENT ---

const Transactions: React.FC = () => {
  // --- GLOBAL DATA ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<BankAccount & { isActive: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- FILTER STATE ---
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filter Object
  const [filters, setFilters] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    status: '' as TransactionStatus | '',
    supplierId: '',
    costCenterId: '',
    bankId: '',
    paymentMethod: '' as PaymentMethod | '',
    type: 'ALL' as 'ALL' | 'INCOME' | 'EXPENSE'
  });

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultSupplierId, setDefaultSupplierId] = useState<string>('');

  // --- FORM STATE ---
  const [launchMode, setLaunchMode] = useState<'SINGLE' | 'INSTALLMENT' | 'RECURRENT'>('SINGLE');
  
  // Fields
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState(''); 
  const [desc, setDesc] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [bankAccountId, setBankAccountId] = useState('');
  
  // Dates
  const [dateCompetence, setDateCompetence] = useState(todayISOInSaoPaulo()); // Competência
  const [dateDue, setDateDue] = useState(todayISOInSaoPaulo()); // Vencimento
  const [datePayment, setDatePayment] = useState(''); // Pagamento

  // Settings
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [recurrenceCount, setRecurrenceCount] = useState<number>(12);

  // New Supplier Form (migrado para SupplierModal)

  // Auto-preenchimento: ao marcar Pago/Recebido, sugere hoje como data de pagamento (se estiver vazio).
  useEffect(() => {
    if (status !== TransactionStatus.PAID) return;
    if (datePayment) return;
    setDatePayment(todayISOInSaoPaulo());
  }, [status, datePayment]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Aux Data (Suppliers, CCs, Categories)
        const fetchSuppliersSafe = async () => {
        // tentativa completa
        const full = await supabase.from('suppliers').select('id,name,document,email,phone,address,contact_name');
        if (!full.error) return full;
        const isSchemaCacheMissingColumn =
          typeof (full.error as any)?.code === 'string' &&
          (full.error as any).code === 'PGRST204' &&
          typeof (full.error as any)?.message === 'string' &&
          (full.error as any).message.includes('schema cache');
        if (!isSchemaCacheMissingColumn) return full;
        // fallback mínimo
        return await supabase.from('suppliers').select('id,name,document,email');
      };

      const [suppRes, ccRes, catRes, bankRes] = await Promise.all([
        fetchSuppliersSafe(),
        supabase.from('cost_centers').select('*'),
        supabase.from('categories').select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order'),
        supabase.from('bank_accounts').select('id,name,bank_name,initial_balance,is_active'),
      ]);

      if (suppRes.data) {
        const mappedSupp = (suppRes.data as any[]).map((s) => ({
          id: s.id,
          name: s.name,
          document: s.document,
          email: s.email,
          phone: s.phone ?? null,
          address: s.address ?? null,
          contactName: s.contact_name ?? null,
        })) as Supplier[];
        setSuppliers(mappedSupp);

        // Fornecedor padrão "Fornecedor não informado" (permite salvar sem informar contraparte real)
        const existingDefault = mappedSupp.find(
          (s) => (s.name || '').trim().toLowerCase() === 'fornecedor não informado'
        );
        if (existingDefault) {
          setDefaultSupplierId(existingDefault.id);
        } else {
          // tenta criar e retornar com schema completo, com fallback mínimo se o schema ainda não tiver colunas extras
          const fullCreate = await supabase
            .from('suppliers')
            .insert([{ name: 'Fornecedor não informado', document: null }])
            .select('id,name,document,email,phone,address,contact_name');
          const createRes = fullCreate.error?.code === 'PGRST204'
            ? await supabase.from('suppliers').insert([{ name: 'Fornecedor não informado', document: null }]).select('id,name,document,email')
            : fullCreate;

          if (createRes.error) throw createRes.error;
          const row = createRes.data?.[0];
          if (row) {
            const def: Supplier = {
              id: row.id,
              name: row.name,
              document: row.document,
              email: row.email,
              phone: row.phone ?? null,
              address: row.address ?? null,
              contactName: row.contact_name ?? null,
            };
            setSuppliers((prev) => [def, ...prev]);
            setDefaultSupplierId(def.id);
          }
        }
      }
      if (ccRes.data) {
        setCostCenters(ccRes.data.map((c: any) => ({
          id: c.id, name: c.name, isActive: c.is_active, dreCategoryId: c.dre_category_id
        })));
      }
      if (catRes.data) {
        // Se a DRE "do print" ainda não existe para esta org, tenta seed idempotente e recarrega.
        const hasExpectedDre =
          (catRes.data as any[]).some((c) => typeof c?.name === 'string' && c.name.includes('4.10') && c.name.includes('Insumos - Vacinas')) ||
          (catRes.data as any[]).some((c) => typeof c?.name === 'string' && c.name.includes('1.1') && c.name.includes('Venda de produtos'));

        let categoriesSource: any[] = catRes.data as any[];

        if (!hasExpectedDre) {
          const seed = await trySeedDefaultDre();
          if (!seed.ok) {
            console.warn('Não consegui fazer seed da DRE automaticamente:', seed.reason);
          } else {
            const cat2 = await supabase
              .from('categories')
              .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
              .order('sort_order', { ascending: true });
            if (!cat2.error && cat2.data) categoriesSource = cat2.data as any[];
          }
        }

        // estado base (antes do seed) ou resultado recarregado pós-seed
        setCategories(
          categoriesSource.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            isActive: c.is_active,
            isGroup: c.is_group,
            includeInDRE: c.include_in_dre,
            parentId: c.parent_id,
            order: c.sort_order,
          }))
        );
      }
      if (bankRes.error) throw bankRes.error;
      if (bankRes.data) {
        setBankAccounts(
          (bankRes.data as any[]).map((b) => ({
            id: b.id,
            name: b.name,
            bankName: b.bank_name,
            initialBalance: Number(b.initial_balance ?? 0),
            isActive: !!b.is_active,
          }))
        );
      }

      // 2. Fetch Transactions (With filter? For now, fetch all or latest 200 to keep it simple, filtering is client side)
      // Ideally filtering should be server side for scale.
      const { data: tData, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (tError) throw tError;
      
      if (tData) {
        const mappedT = tData.map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          competenceDate: t.competence_date,
          paymentDate: t.payment_date,
          type: t.type,
          status: t.status,
          categoryId: t.category_id,
          costCenterId: t.cost_center_id,
          supplierId: t.supplier_id,
          supplierName: t.supplier_name,
          documentNumber: t.document_number,
          paymentMethod: t.payment_method,
          bankAccountId: t.bank_account_id
        }));
        setTransactions(mappedT);
      }

    } catch (e) {
      console.error(e);
      alert(`Erro ao carregar dados. Verifique a conexão.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DERIVED VALUES & MEMOS ---

  const isExpense = transactionType === TransactionType.EXPENSE;

  const getDefaultCostCenterForCategory = (categoryId: string): string => {
    return costCenters.find((cc) => cc.isActive && cc.dreCategoryId === categoryId)?.id ?? '';
  };

  // 1. Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search Term (Desc, Supplier, Doc)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        t.description.toLowerCase().includes(searchLower) || 
        (t.supplierName || '').toLowerCase().includes(searchLower) ||
        (t.documentNumber && t.documentNumber.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;

      // Date Range
      // Importante: o período desta tela é por VENCIMENTO (coluna "Vencimento").
      // Antes: se PAGO usava paymentDate, o que escondia lançamentos vencidos no período mas pagos fora dele.
      const compareDate = t.date;
      if (compareDate < filters.startDate || compareDate > filters.endDate) return false;

      if (filters.type !== 'ALL' && t.type !== filters.type) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.supplierId && t.supplierId !== filters.supplierId) return false;
      if (filters.costCenterId && t.costCenterId !== filters.costCenterId) return false;
      if (filters.bankId && t.bankAccountId !== filters.bankId) return false;
      if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;

      return true;
    });
  }, [transactions, searchTerm, filters]);

  // 2. Summary Logic
  const summary = useMemo(() => {
    let paidIn = 0;
    let paidOut = 0;
    let openIn = 0;
    let openOut = 0;
    let overdueCount = 0;
    let overdueValue = 0;

    const today = todayISOInSaoPaulo();

    filteredTransactions.forEach(t => {
      // Paid
      if (t.status === TransactionStatus.PAID) {
        if (t.type === TransactionType.INCOME) paidIn += t.amount;
        else paidOut += t.amount;
      } 
      // Open / Pending
      else if (t.status === TransactionStatus.PENDING) {
        if (t.type === TransactionType.INCOME) openIn += t.amount;
        else openOut += t.amount;
      }
      // Overdue
      if (t.status === TransactionStatus.LATE || (t.status === TransactionStatus.PENDING && t.date < today)) {
        overdueCount++;
        overdueValue += t.amount;
      }
    });

    return {
      paidNet: paidIn - paidOut,
      openNet: openIn - openOut,
      overdueValue,
      overdueCount
    };
  }, [filteredTransactions]);

  // --- ACTIONS ---

  const handleResetForm = () => {
    setEditingId(null);
    setDesc('');
    setAmount('');
    setTransactionType(TransactionType.EXPENSE);
    // UX: inicia sem seleção; o supplier padrão é aplicado automaticamente no save se o usuário não escolher.
    setFormSupplierId('');
    setCostCenterId('');
    setDocumentNumber('');
    setStatus(TransactionStatus.PENDING);
    setPaymentMethod('');
    setBankAccountId('');
    setDateCompetence(todayISOInSaoPaulo());
    setDateDue(todayISOInSaoPaulo());
    setDatePayment('');
    setLaunchMode('SINGLE');
    setInstallmentsCount(2);
    setIsModalOpen(true);
  };

  // Sempre que o modal abrir, recarrega categorias/CCs para refletir novas subcategorias da DRE imediatamente.
  useEffect(() => {
    if (!isModalOpen) return;
    fetchInitialData().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setTransactionType(t.type);
    setFormSupplierId(t.supplierId);
    setCostCenterId(t.costCenterId);
    setDocumentNumber(t.documentNumber || '');
    setStatus(t.status);
    setPaymentMethod(t.paymentMethod || '');
    setBankAccountId(t.bankAccountId || '');
    setDateCompetence(t.competenceDate);
    setDateDue(t.date);
    setDatePayment(t.paymentDate || '');
    setLaunchMode('SINGLE'); 
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (e) {
        alert('Erro ao excluir lançamento.');
      }
    }
  };

  const handleSave = async () => {
    if (!amount || !desc) return;
    if (!costCenterId) {
      alert('Selecione um Centro de Custo para continuar');
      return;
    }
    if (!formSupplierId) {
      if (defaultSupplierId) setFormSupplierId(defaultSupplierId);
      else {
        alert('Selecione um fornecedor.');
        return;
      }
    }
    if (status === TransactionStatus.PAID && (!datePayment || !bankAccountId)) {
      alert("Para lançamentos PAGOS, é obrigatório informar Data de Pagamento e Conta Bancária.");
      return;
    }

    const supplier = suppliers.find(s => s.id === (formSupplierId || defaultSupplierId));
    const totalVal = parseFloat(amount);
    const effectiveCostCenterId = costCenterId;
    const cc = costCenters.find((c) => c.id === effectiveCostCenterId);
    const derivedCategoryId = cc?.dreCategoryId ?? '';
    if (!derivedCategoryId) {
      alert('Este Centro de Custo não possui Categoria (DRE) vinculada. Vá em Configurações → Centros de Custo.');
      return;
    }
    
    // DB Object Mapping
    const createDbObject = (overrides: any = {}) => ({
      description: desc,
      amount: overrides.amount || totalVal,
      date: overrides.date || dateDue,
      competence_date: overrides.competenceDate || dateCompetence,
      payment_date: status === TransactionStatus.PAID ? datePayment : null,
      type: transactionType,
      status: overrides.status || status,
      category_id: derivedCategoryId,
      cost_center_id: effectiveCostCenterId,
      supplier_id: (formSupplierId || defaultSupplierId),
      supplier_name: supplier?.name,
      document_number: documentNumber,
      payment_method: paymentMethod || null,
      bank_account_id: bankAccountId || null
    });

    try {
      setIsLoading(true);

      if (editingId) {
        // UPDATE
        const dbObj = createDbObject();
        const { error } = await supabase.from('transactions').update(dbObj).eq('id', editingId);
        if (error) throw error;
        
        // Optimistic Update
        fetchInitialData(); // Refresh to be safe
      } else {
        // CREATE (Handle Installments/Recurrence)
        const rowsToInsert = [];

        if (launchMode === 'SINGLE') {
           rowsToInsert.push(createDbObject());
        } else if (launchMode === 'INSTALLMENT') {
           const installmentVal = totalVal / installmentsCount;
           for (let i = 0; i < installmentsCount; i++) {
             rowsToInsert.push(createDbObject({
               description: `${desc} (${i+1}/${installmentsCount})`,
               amount: installmentVal,
               date: addMonths(dateDue, i),
               status: i === 0 ? status : TransactionStatus.PENDING,
               payment_date: (i === 0 && status === TransactionStatus.PAID) ? datePayment : null
             }));
           }
        } else if (launchMode === 'RECURRENT') {
           for (let i = 0; i < recurrenceCount; i++) {
             const itemDate = addMonths(dateDue, i);
             rowsToInsert.push(createDbObject({
               date: itemDate,
               competenceDate: itemDate,
               status: i === 0 ? status : TransactionStatus.PENDING,
               payment_date: (i === 0 && status === TransactionStatus.PAID) ? datePayment : null
             }));
           }
        }

        const { error } = await supabase.from('transactions').insert(rowsToInsert);
        if (error) throw error;
        
        fetchInitialData();
      }

      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert(`Erro ao salvar transação.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // criação de fornecedor foi movida para <SupplierModal />

  // --- RENDER ---

  const renderStatusBadge = (tStatus: TransactionStatus, tType: TransactionType) => {
    switch (tStatus) {
      case TransactionStatus.PAID:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-800"><CheckCircle size={10} className="mr-1" />{tType === TransactionType.INCOME ? 'Recebido' : 'Pago'}</span>;
      case TransactionStatus.PENDING:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600"><Clock size={10} className="mr-1" />Aberto</span>;
      case TransactionStatus.LATE:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700"><AlertTriangle size={10} className="mr-1" />Atrasado</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* 1. SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pago no Mês */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Realizado (Pago)</p>
             <h3 className="text-xl font-bold mt-1 text-gray-900">
               R$ {summary.paidNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </h3>
           </div>
           <div className="p-2 bg-lucrai-50 text-lucrai-700 rounded-lg">
             <CheckCircle size={20} />
           </div>
        </div>

        {/* Card 2: Em Aberto */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Em Aberto (Previsto)</p>
             <h3 className="text-xl font-bold mt-1 text-gray-900">
               R$ {summary.openNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </h3>
           </div>
           <div className="p-2 bg-lucrai-50 text-lucrai-700 rounded-lg">
             <Clock size={20} />
           </div>
        </div>

        {/* Card 3: Atrasado */}
        <div className="bg-white p-4 rounded-xl border border-red-50 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Atrasado / Vencido</p>
             <h3 className="text-xl font-bold mt-1 text-gray-900">
               R$ {summary.overdueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </h3>
             <p className="text-[10px] text-red-400">{summary.overdueCount} lançamentos</p>
           </div>
           <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
             <AlertTriangle size={20} />
           </div>
        </div>
      </div>

      {/* 2. ACTIONS & FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Quick Type Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
               {/* QUICK TYPE FILTER */}
               <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-center">
                  <button 
                    onClick={() => setFilters({...filters, type: 'ALL'})} 
                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filters.type === 'ALL' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Tudo
                  </button>
                  <button 
                    onClick={() => setFilters({...filters, type: 'INCOME'})} 
                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filters.type === 'INCOME' ? 'bg-white shadow text-lucrai-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Receitas
                  </button>
                  <button 
                    onClick={() => setFilters({...filters, type: 'EXPENSE'})} 
                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filters.type === 'EXPENSE' ? 'bg-white shadow text-lucrai-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Despesas
                  </button>
               </div>

               <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por descrição, fornecedor ou documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-200 border bg-gray-50 text-sm focus:border-lucrai-500 focus:ring-lucrai-200 p-2.5"
                  />
               </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full md:w-auto justify-end">
               <button 
                 onClick={fetchInitialData}
                 className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                 title="Atualizar"
               >
                 <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
               </button>
               <button 
                 onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                 className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isFilterPanelOpen ? 'bg-lucrai-50 border-lucrai-200 text-lucrai-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                 <Filter size={16} />
                 <span className="hidden sm:inline">Filtros Avançados</span>
               </button>
               <button 
                 onClick={handleResetForm}
                 className="flex items-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105"
               >
                 <Plus size={16} />
                 <span className="hidden sm:inline">Novo Lançamento</span>
                 <span className="sm:hidden">Novo</span>
               </button>
            </div>
         </div>

         {/* EXPANDABLE FILTER PANEL */}
         {isFilterPanelOpen && (
           <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Período (Início)</label>
                 <input type="date" className="w-full text-sm border-gray-200 rounded-lg" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Período (Fim)</label>
                 <input type="date" className="w-full text-sm border-gray-200 rounded-lg" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                 <select className="w-full text-sm border-gray-200 rounded-lg" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value as any})}>
                    <option value="">Todos</option>
                    <option value={TransactionStatus.PAID}>Pago / Recebido</option>
                    <option value={TransactionStatus.PENDING}>Em Aberto</option>
                    <option value={TransactionStatus.LATE}>Atrasado</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Fornecedor</label>
                 <select className="w-full text-sm border-gray-200 rounded-lg" value={filters.supplierId} onChange={e => setFilters({...filters, supplierId: e.target.value})}>
                    <option value="">Todos</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Centro de Custo</label>
                 <select className="w-full text-sm border-gray-200 rounded-lg" value={filters.costCenterId} onChange={e => setFilters({...filters, costCenterId: e.target.value})}>
                    <option value="">Todos</option>
                    {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Banco / Conta</label>
                 <select className="w-full text-sm border-gray-200 rounded-lg" value={filters.bankId} onChange={e => setFilters({...filters, bankId: e.target.value})}>
                    <option value="">Todos</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Método Pagto</label>
                 <select className="w-full text-sm border-gray-200 rounded-lg" value={filters.paymentMethod} onChange={e => setFilters({...filters, paymentMethod: e.target.value as any})}>
                    <option value="">Todos</option>
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
              </div>
           </div>
         )}
      </div>

      {/* 3. TABLE */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {isLoading && transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Carregando lançamentos...</div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descrição / Documento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Centro de Custo</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredTransactions.map((t) => {
                  const cc = costCenters.find(c => c.id === t.costCenterId);
                  return (
                    <tr key={t.id} className="hover:bg-lucrai-50/40 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                         <div className="font-medium">{formatDateBR(t.date)}</div>
                         <div className="text-xs text-gray-400">Comp: {formatDateBR(t.competenceDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{t.description}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-xs text-gray-500 flex items-center gap-1">
                               <Building size={10} /> {t.supplierName}
                             </span>
                             {t.documentNumber && (
                               <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded flex items-center gap-0.5">
                                 <FileText size={8} /> {t.documentNumber}
                               </span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{cc?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {t.installments && (
                          <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                            Parc. {t.installments.current}/{t.installments.total}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                         {renderStatusBadge(t.status, t.type)}
                         {t.status === TransactionStatus.PAID && t.paymentDate && (
                           <div className="text-[10px] text-gray-400 mt-1">
                             Pg: {formatDateBR(t.paymentDate)}
                           </div>
                         )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-lucrai-700 hover:bg-lucrai-50 rounded" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          )}
          
          {filteredTransactions.length === 0 && !isLoading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
               <Search size={48} className="mb-4 text-gray-200" />
               <p>Nenhum lançamento encontrado com os filtros atuais.</p>
               <button onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })} className="mt-2 text-sm text-lucrai-700 hover:underline">
                 Limpar filtros de data
               </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL (NEW / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-lucrai-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-6 pb-2">
               <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors">
                 <X size={20} />
               </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              
              {/* Type & Value */}
              <div className="flex flex-col items-center justify-center mb-6 mt-2">
                 <div className="bg-gray-100 p-1 rounded-full flex text-sm font-bold mb-4 border border-gray-200">
                    <button
                      onClick={() => setTransactionType(TransactionType.EXPENSE)}
                      className={`px-6 py-1.5 rounded-full transition-all ${
                        isExpense ? 'bg-lucrai-500 text-white shadow-sm shadow-lucrai-200' : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      onClick={() => setTransactionType(TransactionType.INCOME)}
                      className={`px-6 py-1.5 rounded-full transition-all ${
                        !isExpense ? 'bg-lucrai-500 text-white shadow-sm shadow-lucrai-200' : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                      }`}
                    >
                      Receita
                    </button>
                 </div>
                 <div className="relative w-full flex justify-center items-center">
                    <span className="text-3xl font-bold mr-2 text-lucrai-600">R$</span>
                    <input
                      type="number"
                      autoFocus
                      placeholder="0,00"
                      className="text-5xl font-bold bg-transparent border-none focus:ring-0 outline-none w-full text-center placeholder-gray-300 text-lucrai-700"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                 </div>
              </div>

              <div className="space-y-4">
                {/* Desc, Doc, Supplier */}
                <div className="grid grid-cols-12 gap-3">
                   <div className="col-span-8">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Descrição</label>
                      <input type="text" className="w-full pl-3 pr-3 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-gray-200 rounded-xl focus:ring-0 outline-none text-gray-800 font-medium" placeholder="Ex: Aluguel" value={desc} onChange={e => setDesc(e.target.value)} />
                   </div>
                   <div className="col-span-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Nº Documento</label>
                      <input type="text" className="w-full pl-3 pr-3 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-gray-200 rounded-xl focus:ring-0 outline-none text-gray-800" placeholder="NF-123" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
                   </div>
                   
                   <div className="col-span-12 md:col-span-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Fornecedor / Cliente</label>
                      <SupplierSelect
                        suppliers={suppliers}
                        value={formSupplierId}
                        placeholder="Selecione fornecedor"
                        onOpen={() => {
                          fetchInitialData().catch(() => {});
                        }}
                        onAdd={() => setIsSupplierModalOpen(true)}
                        onChange={(id) => setFormSupplierId(id)}
                      />
                   </div>

                   <div className="col-span-12 md:col-span-8">
                     <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Centro de Custo</label>
                     <CostCenterSelect
                       categories={categories}
                       costCenters={costCenters}
                       type={transactionType}
                       value={costCenterId}
                       placeholder="Selecione um centro de custo"
                       onOpen={() => {
                         fetchInitialData().catch(() => {});
                       }}
                       onChange={(id) => {
                         setCostCenterId(id);
                       }}
                     />
                   </div>
                </div>

                {/* Dates & Mode */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   {!editingId && (
                     <div className="flex bg-white p-1 rounded-lg border border-gray-200 mb-4">
                        <button
                          onClick={() => setLaunchMode('SINGLE')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                            launchMode === 'SINGLE'
                              ? 'bg-lucrai-500 text-white shadow-sm shadow-lucrai-200'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          À Vista
                        </button>
                        <button
                          onClick={() => setLaunchMode('INSTALLMENT')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                            launchMode === 'INSTALLMENT'
                              ? 'bg-lucrai-500 text-white shadow-sm shadow-lucrai-200'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Parcelado
                        </button>
                        <button
                          onClick={() => setLaunchMode('RECURRENT')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                            launchMode === 'RECURRENT'
                              ? 'bg-lucrai-500 text-white shadow-sm shadow-lucrai-200'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Recorrente
                        </button>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Competência (DRE)</label>
                         <input type="date" className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none text-gray-700" value={dateCompetence} onChange={e => setDateCompetence(e.target.value)} />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vencimento</label>
                         <input type="date" className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none text-gray-700" value={dateDue} onChange={e => setDateDue(e.target.value)} />
                      </div>
                      
                      {(!editingId && (launchMode === 'INSTALLMENT' || launchMode === 'RECURRENT')) && (
                        <div className="col-span-2 flex items-center bg-lucrai-50 p-2 rounded-lg gap-3 border border-lucrai-100">
                           <span className="text-xs font-semibold text-lucrai-700 pl-2">
                             {launchMode === 'INSTALLMENT' ? 'Quantidade de Parcelas:' : 'Repetir por meses:'}
                           </span>
                           <input
                             type="number"
                             min="2"
                             max="120"
                             className="w-16 p-1 text-center text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                             value={launchMode === 'INSTALLMENT' ? installmentsCount : recurrenceCount}
                             onChange={e => launchMode === 'INSTALLMENT' ? setInstallmentsCount(parseInt(e.target.value)) : setRecurrenceCount(parseInt(e.target.value))}
                           />
                        </div>
                      )}
                   </div>
                </div>

                {/* Payment */}
                <div className="flex items-center justify-between pt-2">
                   <span className="text-sm font-medium text-gray-600 pl-1">Já foi pago/recebido?</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={status === TransactionStatus.PAID} onChange={() => setStatus(prev => prev === TransactionStatus.PAID ? TransactionStatus.PENDING : TransactionStatus.PAID)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lucrai-500"></div>
                   </label>
                </div>
                
                {status === TransactionStatus.PAID && (
                   <div className="animate-in fade-in slide-in-from-top-1 bg-lucrai-50 p-4 rounded-xl border border-lucrai-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                         <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data do Pagamento</label>
                         <input type="date" className="w-full bg-white border-none text-sm text-gray-900 font-medium rounded-lg p-2 focus:ring-0" value={datePayment} onChange={e => setDatePayment(e.target.value)} />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Banco / Conta</label>
                         <select className="w-full bg-white border-none text-sm text-gray-900 font-medium rounded-lg p-2 focus:ring-0" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {bankAccounts.filter((b) => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Forma Pagto</label>
                         <select className="w-full bg-white border-none text-sm text-gray-900 font-medium rounded-lg p-2 focus:ring-0" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                            <option value="">Selecione...</option>
                            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                         </select>
                      </div>
                   </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex justify-between items-center">
               <div className="text-xs text-gray-400 italic">* Campos obrigatórios</div>
               <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
                  <button 
                    onClick={handleSave}
                    disabled={!amount || !desc || !costCenterId || (status === TransactionStatus.PAID && (!datePayment || !bankAccountId))}
                    className="px-8 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg shadow-lucrai-200 transform active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-lucrai-500 hover:bg-lucrai-600"
                  >
                    <Save size={18} />
                    {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onCreated={(s) => {
          setSuppliers((prev) => [...prev, s]);
          setFormSupplierId(s.id);
        }}
      />

    </div>
  );
};

export default Transactions;