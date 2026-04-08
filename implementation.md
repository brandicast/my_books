# 麵包國圖書管理 (My Books) 開發與實作紀錄

## 專案概述
本專案為一個「個人圖書管理系統」，為了讓使用者能夠以手機快速且輕量化地掃描及登記藏書，因此選擇開發為一款 Progressive Web App (PWA)。系統提供條碼掃描、新增、編輯、刪除書籍，以及依照多重條件進行分類與搜尋等功能。

### 技術選型與架構
- **前端 (Frontend)**：React (Vite 構建)、Lucide Icons、HTML5-Qrcode
- **後端 (Backend)**：Node.js (Express)
- **資料庫 (Database)**：SQLite (Better-Sqlite3)
- **部署環境**：Docker & Docker Compose (將前後端獨立為 Container 並透過 Proxy 溝通)
- **連線支援**：透過 ngrok 等隧道工具對外暴露時，解決 HTTPS / CORS / Mixed-Content 問題。

---

## 核心功能與開發考量 (Development Decisions)

### 1. PWA 與行動端體驗
- **需求**：使用者會以手機作為主要掃描與管理工具。
- **實作考量**：
  - 導入了 `vite-plugin-pwa`，支援離線模式並具有桌面圖示設定 (Manifest)。
  - **自動更新邏輯**：為了避免 PWA 強制快取舊版網頁導致 "Failed to fetch dynamically imported module" 錯亂，採用 `autoUpdate` 加上 `workbox: { skipWaiting: true, clientsClaim: true }`，並於入口處 (`main.jsx`) 設定 `controllerchange` 監聽器，當背景一偵測到新版便強制重載刷新。

### 2. 相機條碼掃描模組
- **需求**：需要穩定能讀取書籍 ISBN（主要是 EAN-13 與一些舊式條碼）的相機工具。
- **實作考量**：
  - 放棄原先的 `Html5QrcodeScanner` widget（在部分手機與 UI 上衝突且難以自訂），改為直接控制 `Html5Qrcode` 底層 API。
  - 加入了相機鎖的機制 (Lock Mechanism)，防止在 React 嚴格模式 (StrictMode) 下引發快速雙重觸發導致的「出現兩個攝影機視窗」Bug。
  - 指定 `facingMode: environment` 即預設使用手機後鏡頭。

### 3. 重複書籍的數量管理 (Quantity)
- **需求**：因為同樣的書籍可能會購買多本，在掃描重複 ISBN 時不應直接報錯阻擋。
- **實作考量**：
  - 當查詢 Google Books API 之前，會先 `GET /api/books/isbn/:isbn` 比對自家資料庫。若發現同一本 ISBN，則跳出提示問使用者是否「數量 + 1」。
  - 後端增加 `PUT /api/books/:id/increment` API 與 `quantity` 欄位以支援此需求。

### 4. 欄位體驗優化與字串處理 (Autocomplete & Split)
- **需求**：標籤 (Hashtags)、存放地點、所有人等需要能快速帶入舊記錄；且要容許各種逗號分隔全形的意外。
- **實作考量**：
  - **選單體驗**：放棄原生的 `<datalist>`（因在 iOS/部分行動瀏覽器上若前方有文字便不彈出選項，UX 極差），改用 `<input>` 搭配一個自訂的向下箭頭 `<select>` (Combo Box概念)；選取後自動填入 Input，保留最高的手動編輯彈性。
  - **全形支援**：標籤與作者字串在處理時，統一針對正則表達式 `/[,，]/` 進行 `split()`，提升中文使用者的容錯率。

### 5. 後端安全性與設定切離
- **需求**：避免刪除等危險操作被隨意觸發，且某些變動性質的設定不能鎖死在程式碼內。
- **實作考量**：
  - **刪除保護**：前端呼叫 DELETE 之前會跳出 Prompt，使用者需輸入一組配置在後端 `.env` 內的 `DELETE_PIN`。前後端透過 `x-pin-code` Header 傳遞比對。
  - **動態白名單**：Vite 開發環境中的 `allowedHosts`（如 ngrok 的動態位址）已經抽離至 `frontend/.env` 中。

---

## 後續擴充建議
1. 可以加入更多 API 來源 (如博客來、TAAZE) 增強在台灣繁體圖書的抓取命中率。
2. 開放書籍狀態管理（例如：借出中、已歸還），並連結「借閱人」資料表。
3. 圖表分析統計目前所有藏書的種類比例。
