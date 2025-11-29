import React from 'react';
import { ReceiptData } from '../types';

interface ResultsTableProps {
  data: ReceiptData[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">日付</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">店舗名</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">支払総額</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">インボイス</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">10%対象</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">8%対象</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">対象外/不明</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((item) => (
              <tr key={item.id} className={item.status === 'error' ? 'bg-red-50' : 'hover:bg-slate-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {item.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                  {item.date || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {item.store_name || '-'}
                  {item.status === 'error' && (
                     <div className="text-red-500 text-xs mt-1 max-w-[200px] truncate" title={item.error_message || ''}>
                       ⚠️ {item.error_message}
                     </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                  {formatCurrency(item.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {item.has_invoice ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      適合
                      {item.invoice_number && <span className="ml-1 opacity-75 hidden sm:inline">({item.invoice_number})</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      非適合
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(item.amount_10_percent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(item.amount_8_percent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(item.amount_non_invoice)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;