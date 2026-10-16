# 專案文件:班級廣播站 Lab

## 1. 背景與需求

| 項目 | 內容 |
|---|---|
| 課程 | 雲計算實踐 第三單元 第八課 消息服務 |
| 學生 | 中學生,約 14–16 歲 |
| 原 Lab | Labex:Use Alibaba Cloud Message Service(Queue、Topic、Console、SDK) |
| 需求 | 新 Lab,免費,課前不需準備紙張或額外物品;組員人數不固定;可託管於免費平台;第三方服務可接受 |
| 授課語言 | 繁體中文,技術詞保留英文 |

## 2. 設計決定

| 決定 | 原因 | 狀態 |
|---|---|---|
| 使用 MQTT + HiveMQ 公共 Broker | 免費、毋須帳戶、概念貼近 Topic / Push | 已採用 |
| Port 8884 + SSL | HiveMQ 瀏覽器客戶端不接受非 TLS 連線;GitHub Pages 為 https,頁面需用 wss | 已採用 |
| 自建網站取代 HiveMQ 客戶端 | 可簡化介面、控制 Room 命名 | 已建立 `client.html` |
| Poll 以模擬方式保留 | MQTT 本身是 Push,沒有真正的 Poll | 已建立 `poll.html` |
| Poll 模擬法:每次新建連線、讀取 Retained message、關閉 | 模仿 HTTP 一問一答、連線即完結 | 已實作,未實測 |
| 不用固定 A/B/C/D 角色 | 組員人數不一 | 工作紙 v3 已改 |
| 託管用 GitHub Pages | 已有 VS Code 與 GitHub | 已採用 |
| Firebase Realtime Database 方案 | 曾評估,改用 HiveMQ 後不再需要 | 已放棄 |
| Cloudflare Workers 方案 | 曾評估,需寫後端、較複雜 | 未採用 |
| 任務 3 Queue 用便利貼角色扮演 | 標準 MQTT 沒有 Queue | 仍用紙,待決定 |

## 3. 任務結構(約 60 分鐘)

| 任務 | 時間 | 內容 | 使用工具 | 對應知識點 |
|---|---|---|---|---|
| 0 | 5 分鐘 | 連線 Broker | `client.html` | Broker 是中介 |
| 1 | 10 分鐘 | Poll vs Push | `poll.html` | Poll 浪費資源、延遲 |
| 2 | 15 分鐘 | Topic 訂閱、發布、通配符 | `client.html` | Push、一對多 |
| 3 | 10 分鐘 | Queue 角色扮演 | 便利貼 | 一則訊息只給一人 |
| 4 | 10 分鐘 | 離線漏收、Retained | `client.html` | 訊息暫存與解耦 |
| 5 | 10 分鐘 | 總結作答 | 工作紙 | 鞏固 |

## 4. 網站檔案狀態

| 檔案 | 功能 | 狀態 |
|---|---|---|
| `index.html` | 首頁導航 | 已建立 |
| `client.html` | Connection、Publish、Subscriptions、Messages;支援 `+`、`#` 通配符與 Retain | 已建立,未實測 |
| `poll.html` | Poll 模擬、Push 對照、機器人、結束時清除 Retained 訊息 | 已建立,未實測 |
| `style.css` | 共用樣式 | 已建立 |

## 5. 工作紙狀態

- 現有版本:`Lab_MessagingServices_MQTT_v3.docx`。
- v3 的任務 1 是單頁 `index.html`(Poll 面板與 Push 面板),與目前多頁網站不一致。

## 6. 待辦事項

- [ ] 上傳網站檔案到 GitHub 並啟用 Pages。
- [ ] 用學校 Wi-Fi 與手機熱點測試 `wss://broker.hivemq.com:8884/mqtt`。
- [ ] 多部裝置同時測試 `poll.html`,確認公共 Broker 不限制連線頻率。
- [ ] 確認 Retained 訊息被清除(結束後再開同一 Room,Poll 應顯示無資料)。
- [ ] 更新工作紙:任務 0、2、4 改用 `client.html`;任務 1 改用 `poll.html`,指標改為「HTTP Request 次數」、「200 有新資料」、「304 沒有變化」、「開啟連線次數」。
- [ ] 把教師附錄的託管步驟改為 VS Code Source Control 版本。
- [ ] 決定任務 3 是否改為不用紙(例如教師投影演示加討論)。
- [ ] 試教後按學生反應調整時間與難度。

## 7. 風險與未知項目

| 風險 | 影響 | 處理 |
|---|---|---|
| 學校封鎖 wss 8884 | 全部網頁功能失效 | 課前測試;向 IT 部門查詢;準備手機熱點 |
| 公共 Broker 限制連線頻率 | Poll 每次新建連線,40 人約每分鐘 480 個連線,可能被限制 | 測試;必要時改用 10 秒間隔 |
| 公共 Broker 人人可見 | 私隱風險 | 禁止個人資料;Room 名稱用班別-組別 |
| Retained 訊息殘留 | 下一班讀到舊資料 | 每組使用不同 Room;結束時清除 |
| `retain` 旗標行為 | Push 面板依賴「即時轉發的訊息 retain 為 false」來排除舊資料 | 依 MQTT 一般行為,尚未在 HiveMQ 實測 |
| Poll 並非真 HTTP | 學生可能誤解 | 課堂上明確說明 |
| 相同 Room 多人按機器人 | 訊息數增加 | 屬正常,工作紙已註明 |

## 8. 驗收準則

- 學生用手機或電腦開啟網址,毋須安裝或註冊,即可完成任務 0–4。
- 任務 1 的數據可讓學生分辨 Poll 與 Push 在詢問次數、白問比例與延遲上的差異。
- 組員人數不影響任務完成。
- 教師課前準備不需紙張(任務 3 的便利貼除外,如未改動)。
