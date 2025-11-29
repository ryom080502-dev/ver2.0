import os
import json
import time
import pandas as pd
import openpyxl
import streamlit as st
import google.generativeai as genai
from dotenv import load_dotenv

# --- 設定 ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY") # ※サーバー上では「Secrets」から読み込まれます
MODEL_NAME = "gemini-2.5-flash"
TEMPLATE_FILE = "template.xlsx"

# ▼▼▼ 合言葉の設定（ここを変更してください） ▼▼▼
LOGIN_PASSWORD = "fujishima8888" 
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

# --- ページ設定 ---
st.set_page_config(page_title="経費精算AI", layout="wide")

# --- 認証機能 (簡易ログイン) ---
def check_password():
    """パスワード認証が成功したらTrueを返す"""
    if 'authenticated' not in st.session_state:
        st.session_state['authenticated'] = False

    if st.session_state['authenticated']:
        return True

    # ログイン画面の表示
    st.title("🔒 ログイン")
    password = st.text_input("パスワードを入力してください", type="password")
    
    if st.button("ログイン"):
        if password == LOGIN_PASSWORD:
            st.session_state['authenticated'] = True
            st.rerun() # 画面をリロードしてメイン機能を表示
        else:
            st.error("パスワードが違います")
    
    return False

# --- メインロジック関数 ---
def analyze_and_create_excel(uploaded_file, template_path, output_excel_path):
    # (中略: APIキー取得部分はSecrets対応のため少し修正します)
    # Streamlit CloudのSecrets対応
    api_key_to_use = API_KEY
    if not api_key_to_use and "GOOGLE_API_KEY" in st.secrets:
        api_key_to_use = st.secrets["GOOGLE_API_KEY"]

    if not api_key_to_use:
        st.error("APIキー設定エラー: ローカルの.env または CloudのSecretsを確認してください")
        return None

    genai.configure(api_key=api_key_to_use)
    
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config={"temperature": 0, "response_mime_type": "application/json"},
        system_instruction="""
        あなたは優秀な経理担当アシスタントです。
        ユーザーからアップロードされるPDFファイルは、複数のレシートや領収書を連続でスキャンしたデータです。
        以下のルールに従って、画像内の情報を解析し、正確なJSONデータとして出力してください。
        
        ### 抽出・判定ルール
        1. **日付 (date):** `YYYY/MM/DD` 形式。不明な場合は `null`。
        2. **店名 (store_name):** 店舗名。不明な場合は `null`。
        3. **金額の内訳:**
           - **amount_8_percent:** 税率8%（軽減税率・食品など）の対象金額（税込）。
           - **amount_10_percent:** 税率10%の対象金額（税込）。
           - **amount_non_invoice:** インボイス登録番号がない、または区分不明な金額。
        
        ### エラーハンドリング
        - 読み取れない箇所がある場合でも、読み取れた項目は必ず出力する。
        - 全く読めない場合は `status` を `error` とする。
        
        ### 出力フォーマット (JSON List)
        [{"status": "success", "date": "...", "store_name": "...", "amount_8_percent": 0, "amount_10_percent": 0, "amount_non_invoice": 0, "error_message": null}]
        """
    )

    try:
        temp_pdf_path = "temp_input.pdf"
        with open(temp_pdf_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        sample_file = genai.upload_file(path=temp_pdf_path, display_name="User Upload PDF")
        
        with st.spinner('🤖 AIがレシートを解析中... (Googleサーバーで処理しています)'):
            while sample_file.state.name == "PROCESSING":
                time.sleep(1)
                sample_file = genai.get_file(sample_file.name)

            if sample_file.state.name == "FAILED":
                st.error("Google側での処理に失敗しました")
                return None

            response = model.generate_content([sample_file, "このPDFの全ページのレシート情報を抽出してください。"])
            receipt_data = json.loads(response.text)

        # 日付ソート
        receipt_data.sort(key=lambda x: x.get("date") if x.get("date") else "9999/99/99")

        wb = openpyxl.load_workbook(template_path)
        ws = wb.active 
        start_row = 9

        for i, item in enumerate(receipt_data):
            row_num = start_row + i
            if item.get("date"): ws.cell(row=row_num, column=2).value = item["date"]
            if item.get("store_name"): ws.cell(row=row_num, column=3).value = item["store_name"]
            
            amt_8 = item.get("amount_8_percent") or 0
            amt_10 = item.get("amount_10_percent") or 0
            amt_other = item.get("amount_non_invoice") or 0

            total_8_zone = amt_8 + amt_other
            if total_8_zone > 0: ws.cell(row=row_num, column=6).value = total_8_zone
            if amt_10 > 0: ws.cell(row=row_num, column=7).value = amt_10

        wb.save(output_excel_path)
        return receipt_data

    except Exception as e:
        st.error(f"システムエラー: {e}")
        return None

# --- メイン処理 ---
if check_password():
    # 認証OKの場合のみここを表示
    st.title("🧾 経費精算 自動化ツール")
    st.markdown("---")

    col1, col2 = st.columns([1, 1.5])

    with col1:
        st.subheader("📂 1. ファイル選択")
        uploaded_file = st.file_uploader("レシートPDFをアップロード", type=["pdf"])
        
        if uploaded_file is not None:
            st.success("ファイルセット完了！")
            st.write("")
            st.subheader("🚀 2. 解析実行")
            if st.button("AI解析スタート", type="primary", use_container_width=True):
                
                temp_excel_path = "result_download.xlsx"
                if os.path.exists(TEMPLATE_FILE):
                    result_data = analyze_and_create_excel(uploaded_file, TEMPLATE_FILE, temp_excel_path)
                    if result_data:
                        st.session_state['result_data'] = result_data
                        st.session_state['excel_ready'] = True
                else:
                    st.error(f"テンプレート ({TEMPLATE_FILE}) が見つかりません。")

    with col2:
        st.subheader("📊 3. 解析結果プレビュー")
        if 'result_data' in st.session_state:
            data = st.session_state['result_data']
            
            df = pd.DataFrame(data)
            display_cols = ["date", "store_name", "amount_10_percent", "amount_8_percent", "amount_non_invoice"]
            st.dataframe(df[display_cols], use_container_width=True)

            total_yen = sum([d.get("amount_10_percent", 0) + d.get("amount_8_percent", 0) + d.get("amount_non_invoice", 0) for d in data])
            st.metric(label="合計金額", value=f"¥{total_yen:,}")

            st.markdown("---")
            
            if 'excel_ready' in st.session_state:
                with open("result_download.xlsx", "rb") as f:
                    st.download_button(
                        label="📥 完成したExcelをダウンロード",
                        data=f,
                        file_name=f"経費精算_{os.path.basename('result_download.xlsx')}",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        type="primary"
                    )
        else:
            st.info("👈 左側のボタンを押して解析を開始してください。")