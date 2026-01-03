export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TRANSFER = 'TRANSFER',
  CASH = 'CASH',
  OTHER = 'OTHER'
}

export enum ReportType {
  DRE_ACCRUAL = 'DRE_ACCRUAL', // Competência
  CASH_FLOW = 'CASH_FLOW',     // Fluxo de Caixa (Diário + DRE Caixa)
}

export interface Supplier {
  id: string;
  name: string;
  document?: string | null; // CNPJ/CPF
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  initialBalance: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null; // Null means root level
  type: TransactionType;
  isActive: boolean;        // Global visibility
  includeInDRE: boolean;    // Reporting visibility
  isGroup: boolean;         // Is it a folder? (cannot receive transactions/CC links directly)
  order: number;            // For sorting
}

export interface CostCenter {
  id: string;
  name: string;
  isActive: boolean;
  dreCategoryId: string; // LINK OBRIGATÓRIO: Herança da DRE
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  
  // Dates
  date: string; // Data de Vencimento (Due Date)
  competenceDate: string; // Data de Competência (Accrual Date)
  paymentDate?: string; // Data do Pagamento (Cash Date) - Obrigatório se PAID
  
  // Categorization
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string; // Inherited from Cost Center (System fills this)
  costCenterId: string; // User selects this (Mandatory)
  
  // Entity
  supplierId: string;
  supplierName: string;
  
  // Details
  documentNumber?: string; // New: Nota Fiscal / Recibo ID
  paymentMethod?: PaymentMethod; // New
  bankAccountId?: string; // New
  
  installments?: { current: number; total: number };
}

export interface BudgetLine {
  categoryId: string;
  month: string; // YYYY-MM
  amount: number;
}

export interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  matchedTransactionId?: string;
}

export interface KPI {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  percent: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  type?: 'text' | 'audio' | 'image';
}

export interface DrilldownState {
  isOpen: boolean;
  title: string;
  transactions: Transaction[];
}