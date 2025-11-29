import React from 'react';
import { ReceiptData } from '../types';

interface SummaryCardProps {
  data: ReceiptData[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ data }) => {
  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
  const total10 = data.reduce((sum, item) => sum + item.amount_10_percent, 0);
  const total8 = data.reduce((sum, item) => sum + item.amount_8_percent, 0);
  const totalNonInvoice = data.reduce((sum, item) => sum + item.amount_non_invoice, 0);
  const successCount = data.filter(i => i.status === 'success').length;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase">読取枚数</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{successCount} <span className="text-sm font-normal text-slate-500">/ {data.length} 枚</span></p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase">10%対象合計 (インボイス)</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(total10)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase">8%対象合計 (インボイス)</p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(total8)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase">対象外・不明</p>
        <p className="text-2xl font-bold text-slate-600 mt-1">{formatCurrency(totalNonInvoice)}</p>
      </div>
    </div>
  );
};

export default SummaryCard;