我的理解：
用戶要喺呢個工具核心 system prompt（constants.ts 的 FINAL_PRD_PROMPT，Section 1.1 Framework & Runtime Lock）加一條新規則 — PRD 生成時須要求所有環境變數統一寫入 `.env.local`、不建立 `.env`，並確保專案用 `create-next-app` 起手以確保 `.gitignore` 自動排除 `.env*`。

查閱來源：
已讀 constants.ts:25-223 全段 CHAT_SYSTEM_PROMPT / FINAL_PRD_PROMPT，確認 Section 1.1 Framework & Runtime Lock 為最合適插入位置（已有 Framework/Runtime/Deployment/Forbidden Modules 並列規則）。已讀 PROJECT-STATUS.md 確認目前進度（Chapter 04 進行中，CHAT/FINAL_PRD_PROMPT 仍在迭代中）。

執行步驟：
1. constants.ts:96 — Framework 行加註 "scaffolded via create-next-app"，說明此舉保證 .gitignore 自動含 .env* 排除規則
2. constants.ts:100 後新增一行 "Environment Variables" 規則：所有環境變數（不分機密與否）統一寫入 .env.local，永不建立 .env 檔案，依賴 create-next-app 預設 .gitignore

等待確認：
請確認執行 Edit。
