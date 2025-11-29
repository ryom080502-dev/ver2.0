import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ReceiptData } from "../types";

// Define the schema for the receipt extraction
const receiptSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER, description: "A sequential ID for the receipt within the document." },
      status: { type: Type.STRING, enum: ["success", "error"], description: "Processing status." },
      date: { type: Type.STRING, description: "Date in YYYY/MM/DD format." },
      store_name: { type: Type.STRING, description: "Name of the store or vendor." },
      total_amount: { type: Type.NUMBER, description: "Total amount paid (tax included)." },
      has_invoice: { type: Type.BOOLEAN, description: "Whether a valid T+13 digit invoice number exists." },
      invoice_number: { type: Type.STRING, description: "The T+13 digit invoice number." },
      amount_10_percent: { type: Type.NUMBER, description: "Amount subject to 10% tax (Invoice compliant)." },
      amount_8_percent: { type: Type.NUMBER, description: "Amount subject to 8% tax (Invoice compliant)." },
      amount_non_invoice: { type: Type.NUMBER, description: "Amount not invoice compliant or undetermined." },
      error_message: { type: Type.STRING, description: "Reason for error if status is error." },
    },
    required: ["id", "status", "total_amount", "has_invoice", "amount_10_percent", "amount_8_percent", "amount_non_invoice"],
  },
};

export const analyzeReceiptPdf = async (fileBase64: string, mimeType: string): Promise<ReceiptData[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // System instruction based on the user's specific prompt requirements
    const systemInstruction = `
    あなたは優秀な経理担当アシスタントです。
    ユーザーからアップロードされるPDFファイルは、複数のレシートや領収書を連続でスキャンしたデータです。
    以下の手順とルールに従って、画像内の情報を解析し、正確なJSONデータとして出力してください。

    ### 処理手順
    1. PDF内の画像から、個別のレシート・領収書を識別する（1ページに複数枚ある場合や、複数ページにまたがる場合を考慮する）。
    2. 各レシートについて、記載内容を読み取る。
    3. 特に「インボイス制度（適格請求書）」への対応状況と、「税率（8%・10%）」の内訳を厳密に判定する。
    4. 読み取った結果を指定のJSONフォーマットで出力する。

    ### 抽出・判定ルール

    **1. 基本情報**
    * **日付 (date):** YYYY/MM/DD 形式で統一。不明な場合は null。
    * **店名 (store_name):** 店舗名や会社名。
    * **合計金額 (total_amount):** 支払総額（税込）。

    **2. インボイス判定 (has_invoice)**
    * レシート内に「T」から始まり「数字13桁」で構成される「登録番号」が存在するか確認する。
    * 存在する → true
    * 存在しない → false

    **3. 金額の内訳計算 (重要)**
    レシートの明細や税額欄を見て、以下のルールで金額を振り分ける。
    * **amount_10_percent:** インボイス登録番号が**あり**、かつ**税率10%**の対象となる金額（税込）。
    * **amount_8_percent:** インボイス登録番号が**あり**、かつ**税率8%（軽減税率・食品など）**の対象となる金額（税込）。
        * ※レシート内で「軽」「※」「8%対象」などの表記がある項目を集計、または消費税額から逆算して判断する。
    * **amount_non_invoice:** インボイス登録番号が**ない**レシートの合計金額、またはインボイス対応レシートでも税率区分が不明確な金額。

    ### エラーハンドリング
    * 文字が潰れている、重なっているなどで読み取れないレシートがある場合は、そのレシートの status を error とし、error_message に理由を記述する。読み取れたものは success とする。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using 2.5 Flash for good vision capabilities and speed
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: "このPDFファイルに含まれるすべての領収書/レシートを解析し、JSONデータを作成してください。",
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated from AI.");
    }

    try {
      const parsed = JSON.parse(text);
      // Ensure it is an array
      const results: ReceiptData[] = Array.isArray(parsed) ? parsed : [parsed];

      // Sort by date ascending (oldest first)
      // null dates go to the end
      results.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        // String comparison works for YYYY/MM/DD
        return a.date.localeCompare(b.date);
      });

      return results;
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Failed to parse AI response as JSON.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};