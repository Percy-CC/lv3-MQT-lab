# 班級廣播站 Lab(消息服務 Messaging Services)

雲計算實踐 第三單元第八課的實驗。對象為 14–16 歲中學生,以 MQTT 與瀏覽器網頁體驗 Poll、Push、Topic 與 Queue 的概念。

## 目標

- 比較 Poll 與 Push 通信模式。
- 理解 Topic 模型(一對多)與 Queue 模型(一則訊息只給一人)。
- 理解雲消息服務為何要暫存訊息、令服務解耦。
- 對應原講義的 Labex:Use Alibaba Cloud Message Service(需要雲帳戶與 SDK,新 Lab 作為免帳戶的替代或預備活動)。

## 專案結構

```
.
├── README.md        專案說明(本檔)
├── project.md       需求、設計決定、任務與待辦
├── log.md           工作記錄
├── index.html       首頁
├── client.html      仿 HiveMQ 的 MQTT 客戶端(Push)
├── poll.html        HTTP Poll 模擬,與 Push 並排比較
├── style.css        共用樣式
└── docs/
    └── Lab_MessagingServices_MQTT_v3.docx   學生工作紙(含教師附錄)
```

> 注意:`docs/` 內的工作紙目前仍是 v3(單頁 index.html 版本),尚未配合多頁網站更新。詳見 `project.md` 的待辦。

## 技術

- 純靜態網站(HTML、CSS、JavaScript),不需要後端。
- MQTT.js 5.16.0(由 cdnjs 載入)。
- Broker:HiveMQ 公共 Broker,`wss://broker.hivemq.com:8884/mqtt`。
- 託管:GitHub Pages(從 `main` 分支的根目錄發布)。

## 快速開始

1. 把全部網站檔案放在 repository 最上層。
2. 用 VS Code 的 Source Control 面板 Stage、Commit、Sync Changes。
3. GitHub → Settings → Pages → Source 選 Deploy from a branch → Branch 選 `main`,資料夾選 `/ (root)`。
4. 網址格式:`https://<帳號>.github.io/<repo 名稱>/`。
5. 課前用學校 Wi-Fi 測試,見 `project.md` 的「課前檢查清單」。

## 使用限制

- 公共 Broker 人人可見,不得輸入個人資料。
- Poll 為模擬(每次新建連線、讀取 Retained message、立即關閉),並非真正的 HTTP。
- 標準 MQTT 沒有 Queue 模型,任務 3 以角色扮演處理。

## 相關文件

- `project.md`:設計、任務、待辦與風險。
- `log.md`:按日期的工作記錄。
