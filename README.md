# 麵包國圖書管理 (My Books)

這是為個人設計的圖書管理 Progressive Web App (PWA)，支援在手機端掃描 ISBN 條碼快速登錄藏書，並具有完整的分類、搜尋與管理功能。

## 系統需求
- Docker 與 Docker Compose
- Node.js (開發環境)

## 安裝與啟動方式

1. **複製專案並建立設定檔**
   請在 `backend/` 目錄與 `frontend/` 目錄下建立自己的 `.env` 檔案（可以參考 `.env.example`）：
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **設定環境變數**
   - **後端 (`backend/.env`)**：配置你要用來保護「刪除功能」的 `DELETE_PIN`。
   - **前端 (`frontend/.env`)**：配置如果你有穿透內網需求 (如 ngrok) 所需要的 `VITE_ALLOWED_HOSTS`。

3. **啟動 Docker 容器**
   在專案根目錄下執行：
   ```bash
   docker compose up -d
   ```
   這會自動拉取所需的 Node 映像檔，並將前端與後端服務啟動運行。

4. **開始使用**
   前端預設會執行在 port `5000`。請打開您的瀏覽器並訪問 `http://localhost:5000`。

## 功能亮點
- **離線支援與自動更新**：作為一款 PWA，即使在網路不佳狀況下依然可開啟；並且當有新版部署時，後台服務工友(Service Worker) 會自動清除舊緩存並熱重載。
- **智慧相機掃描**：一鍵開啟後鏡頭與快速對焦，相容常見書籍的一維與二維條碼。
- **藏書防撞號提示**：掃描如果發現資料庫內已有同 ISBN 的書，會智慧通知「是否要將數量直接加 1」。
- **彈性的擴充欄位與安全機制**：所有修改如位置、持有人、備註甚至圖書封面皆可手動覆寫；刪除藏書也導入了獨立 PIN 碼機制防止手滑。

## 相關文件
有關各個功能演化原因及技術選擇，請參考 [implementation.md](implementation.md)。
