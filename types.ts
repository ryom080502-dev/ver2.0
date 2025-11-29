export interface ReceiptData {
  id: number;
  status: 'success' | 'error';
  date: string | null;
  store_name: string | null;
  total_amount: number;
  has_invoice: boolean;
  invoice_number: string | null;
  amount_10_percent: number;
  amount_8_percent: number;
  amount_non_invoice: number;
  error_message: string | null;
}

export interface AnalysisResult {
  fileName: string;
  timestamp: string;
  data: ReceiptData[];
}