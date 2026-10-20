# 班級廣播站 Lab(消息服務 Messaging Services)

雲計算實踐 第三單元第八課的實驗。對象為 14–16 歲中學生,以 MQTT 與瀏覽器網頁體驗 Poll、Push、Topic 與 Queue 的概念。

## 目標

- 比較 Poll 與 Push 通信模式。
- 理解 Topic 模型(一對多)與 Queue 模型(一則訊息只給一人)。
- 理解雲消息服務為何要暫存訊息、令服務解耦。
- 以 `queue.html` 預演任務 3 的便利貼角色扮演，比較 Topic 與 Queue。
- 對應原講義的 Labex:Use Alibaba Cloud Message Service(需要雲帳戶與 SDK,新 Lab 作為免帳戶的替代或預備活動)。

## 專案結構

```
.
├── README.md        專案說明(本檔)
├── project.md       需求、設計決定、任務與待辦
├── log.md           工作記錄
├── index.html       首頁
├── client.html      仿 HiveMQ 的 MQTT 客戶端(Push)
├── poll.html        Poll 動畫示範與 HiveMQ 真實實驗
├── queue.html       Topic / Queue 比較與任務 3 角色扮演預演
├── css/
│   └── theme.css    全站共用主題與元件樣式
└── js/
    ├── anim-common.js      動畫共用工具與深淺色模式
    ├── anim-overview.js    首頁 MQTT 模型動畫
    ├── anim-pollpush.js    Poll 與 Push 模擬動畫
    ├── anim-topics.js      Topic 通配符練習
    ├── anim-retained.js    Retained 訊息動畫
    ├── anim-queue-compare.js Topic / Queue 派發比較動畫
    └── anim-queue-roleplay.js 任務 3 便利貼領取預演動畫
```

> 學生工作紙 v3 尚未配合目前的多頁網站更新，且目前不包含在此專案目錄中；後續工作見 `project.md`。

## 技術

- 純靜態網站(HTML、CSS、JavaScript),不需要後端。
- MQTT.js 5.16.0(由 cdnjs 載入)。
- Broker:HiveMQ 公共 Broker,`wss://broker.hivemq.com:8884/mqtt`。
- 託管:GitHub Pages(從 `main` 分支的根目錄發布)。

## 快速開始

1. 把全部網站檔案放在 repository 最上層。
2. 本機預覽可在專案目錄執行 `python -m http.server 8000`，再開啟 `http://localhost:8000/`。
3. 用 VS Code 的 Source Control 面板 Stage、Commit、Sync Changes。
4. GitHub → Settings → Pages → Source 選 Deploy from a branch → Branch 選 `main`，資料夾選 `/ (root)`。
5. 網址格式：`https://<帳號>.github.io/<repo 名稱>/`。
6. 課前用學校 Wi-Fi 測試，見 `project.md` 的待辦事項。

## 使用限制

- 公共 Broker 人人可見,不得輸入個人資料。
- Poll 動畫示範完全在本機執行；真實實驗以 MQTT 每次新建連線、讀取 Retained message 後立即關閉，模擬 HTTP 請求，並非真正的 HTTP。
- `queue.html` 的兩個動畫只在瀏覽器本機執行，不會連線 HiveMQ；課堂角色扮演仍使用便利貼。
- Queue 動畫 A 以共用 Publisher 同時對照 Topic 廣播與 Queue 派單，提供職員收件矩陣、收到次數統計、排隊等待、暫停及速度控制。
- Queue 動畫 B 預演先到先領的輸送帶式角色扮演，提供單步／自動領取、職員彩色識別、訂單記錄卡、完成提示及合計。
- 各時間軸動畫均可選擇 `0.5×`、`1×` 或 `2×` 播放速度；Topic 通配符練習是即時互動，不設動畫速度。
- 標準 MQTT 沒有 Queue 模型,任務 3 以角色扮演處理。

## 相關文件

- `project.md`:設計、任務、待辦與風險。
- `log.md`:按日期的工作記錄。
