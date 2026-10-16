# 工作記錄

格式:日期 | 事項 | 結果 / 決定 | 待跟進

## 2026-10-14

- 收到講義(消息服務 Messaging Services,Poll vs Push、Topic vs Queue、阿里雲 SMQ、Labex 實驗)。
  - 決定:新 Lab 以 MQTT + HiveMQ 公共 Broker 為基礎,免帳戶。
  - 提出五個部分的 Lab 結構(Poll vs Push、Topic、Queue 角色扮演、解耦)。
- 撰寫逐步工作紙,並輸出 Word v1。
- 解釋 HiveMQ 與 MQTT 基本概念、Lab 做了甚麼。
- 檢視學生連線截圖:
  - 兩個視窗皆 connected,Host 為 `broker.hivemq.com`,SSL 已勾選,ClientID 不同。
  - 發現問題:Topic 仍為預設 `testtopic/1`;其中一個視窗 Retain 已勾選且 QoS 為 1。
  - 決定:工作紙任務 0 加入「Port 8884」、「改掉預設 Topic」、「Retain 預設不勾選」。
- 輸出 Word 工作紙(附教師附錄)。

## 2026-10-16

- 評估自建網站取代 HiveMQ 的可行性:
  - 比較 Firebase 與 Cloudflare,當時建議 Firebase(Hosting + Realtime Database)。
  - 寫出 Firebase 環境步驟(專案、規則、匿名登入、GitHub Actions)。
  - 應要求,把任務 1 網頁化,並讓組員人數不固定。
- 澄清需求:不使用 Firebase 資料庫,改為只用 HiveMQ,任務 1 不再使用便利貼。
  - 發現更正:HiveMQ 瀏覽器客戶端不接受非 TLS 連線,所以 Port 一律為 8884 並勾選 SSL;工作紙刪除「8000」。
  - 輸出 Word v2:任務 1 用 Retained message + 兩視窗 + 老師喊「Poll!」。結果:不符合需求(不想要老師口頭帶領式的做法)。
  - 輸出 Word v3 與單頁 `index.html`(Poll 面板與 Push 面板並排,機器人發布 5 則訊息)。
- 解釋 `git clone` 與 `cd`。
  - 改寫 GitHub Pages 部署步驟為 VS Code Source Control 版本(Stage、Commit、Sync Changes)。
- 新需求:做一個仿 HiveMQ 的網站,並另設頁面模擬傳統 HTTP,必須保留 Poll。
  - 建立多頁網站:`index.html`、`client.html`、`poll.html` 與共用樣式。
  - 以 `node --check` 檢查兩頁的 JavaScript 語法,沒有錯誤。
  - 未在瀏覽器實測。
  - 工作紙尚未配合多頁網站更新。
- 建立 `README.md`、`project.md`、`log.md` 以追蹤專案。
- 統一三個正式頁面的深淺色主題、字體、圖示與導覽；將 Overview、Poll/Push、Topic、Retained 動畫拆成獨立腳本。
- 首頁加入 Overview 動畫與實驗入口；客戶端加入 Topic 通配符練習與 Retained 動畫；Poll 頁分開呈現本機模擬與 HiveMQ 真實實驗。
- 保留 MQTT.js 連線設定、Topic 驗證、Poll/機器人流程與結束時清除 Retained 的程式；刪除舊樣式與動畫預覽頁。
- 驗證：五個 JavaScript 檔通過 `node --check`，三頁無重複 ID；瀏覽器測試深淺色、375px 版面、動畫及 MQTT 連線/訂閱/發布，Console 無錯誤。
- 待驗證：學校網絡、多裝置負載、GitHub Pages 部署，以及清除 Retained 後重新訂閱確認。
- 新增 `queue.html` 任務 3 頁面與 Queue 導覽；首頁新增入口卡。
- 新增 Topic / Queue 派發比較動畫，以及便利貼訂單角色扮演預演；加入比較表、參考答案與 SMQ 說明。
- 瀏覽器驗證：Topic 發布 3 張訂單時 3 位職員各收到 3 次；Queue 發布 3 張時合計只處理 3 次；兩位職員領取全部 6 張後按鈕停用，紀錄表各列 3 張。
- 自動示範輪流領取完成；375px 頁面無水平溢出，JavaScript Console 無錯誤。

## 未解決與下一步

- [ ] 上載網站並啟用 GitHub Pages。
- [ ] 學校網絡與多裝置測試(wss 8884、連線頻率)。
- [ ] 更新 Word 工作紙到多頁網站版本。
- [ ] 決定任務 3 是否仍用便利貼。

## 記錄模板(複製使用)

```
## YYYY-MM-DD

- 事項:
  - 結果 / 決定:
  - 問題:
  - 待跟進:
```
