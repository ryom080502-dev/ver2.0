import React, { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import ResultsTable from './components/ResultsTable';
import SummaryCard from './components/SummaryCard';
import { analyzeReceiptPdf } from './services/geminiService';
import { ReceiptData } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ReceiptData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to convert file to base64
  const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          data: base64Data,
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const { data, mimeType } = await fileToGenerativePart(selectedFile);
      const dataResults = await analyzeReceiptPdf(data, mimeType);
      setResults(dataResults);
    } catch (err: any) {
      setError(err.message || "解析中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadJson = () => {
    const jsonString = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `receipt_analysis_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCsv = () => {
    if (results.length === 0) return;
    
    const headers = [
      "ID", "Status", "Date", "Store Name", "Total Amount", "Has Invoice", "Invoice No", "10% Amount", "8% Amount", "Non-Invoice Amount", "Error"
    ];
    
    const csvRows = [
      headers.join(','),
      ...results.map(row => {
        const values = [
          row.id,
          row.status,
          row.date,
          // Handle commas in store name by quoting
          `"${(row.store_name || '').replace(/"/g, '""')}"`,
          row.total_amount,
          row.has_invoice,
          row.invoice_number,
          row.amount_10_percent,
          row.amount_8_percent,
          row.amount_non_invoice,
          `"${(row.error_message || '').replace(/"/g, '""')}"`
        ];
        return values.join(',');
      })
    ];

    const csvString = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel compatibility
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `receipt_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-600 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
             </div>
             <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI 経理アシスタント <span className="text-xs font-normal text-slate-500 ml-1">Powered by Gemini 2.5 Flash</span></h1>
          </div>
          <div>
            <a href="https://ai.google.dev/gemini-api/docs/models/gemini-v2" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
               Documentation &rarr;
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Uploader */}
        <section className="mb-10 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">領収書・レシートの一括解析</h2>
            <p className="text-slate-600">
              PDFファイルをアップロードしてください。AIが自動的に複数の領収書を認識し、<br/>
              日付、金額、インボイス登録番号、税率別の内訳を抽出します。
            </p>
          </div>
          
          <FileUploader onFileSelect={processFile} isLoading={isLoading} />
          
          {isLoading && (
            <div className="mt-8 flex flex-col items-center justify-center animate-pulse">
              <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">AIが画像を解析中... 数秒かかります</p>
              <p className="text-xs text-slate-400 mt-2">Gemini 2.5 Flash Model Processing</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
               </svg>
               <div>
                 <h3 className="text-sm font-semibold text-red-800">解析エラー</h3>
                 <p className="text-sm text-red-600 mt-1">{error}</p>
                 <button onClick={() => window.location.reload()} className="text-xs text-red-700 underline mt-2 hover:text-red-900">
                   ページをリロードして再試行
                 </button>
               </div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {results.length > 0 && !isLoading && (
          <section className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">解析結果</h3>
              <div className="flex space-x-3">
                <button 
                  onClick={downloadCsv}
                  className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9 7.5v-7.5m11.25 7.5h7.5a1.125 1.125 0 001.125-1.125v-1.5m-9 2.625v-2.625m7.5 2.625v-2.625m-15-6l2.25-2.25 2.25 2.25m4.875 0l2.25-2.25 2.25 2.25m-6 3.75l2.25-2.25 2.25 2.25m-9 13.125v-3.375c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375m0-9.375v9.375m0-9.375V5.625a3.375 3.375 0 013.375-3.375h6.75a3.375 3.375 0 013.375 3.375v13.5" />
                  </svg>
                  CSVダウンロード
                </button>
                <button 
                  onClick={downloadJson}
                  className="inline-flex items-center px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                  JSONダウンロード
                </button>
              </div>
            </div>

            <SummaryCard data={results} />
            <ResultsTable data={results} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;