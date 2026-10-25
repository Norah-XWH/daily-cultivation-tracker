# Daily Cultivation Tracker

給自己用的每日習慣（habit）。首頁看今天的完成度（overview）。上面可以換成一段時間（over time）：30 天、90 天，或全部記下的日子。項目可以改。不用登錄（login）。記錄保存在這台瀏覽器（browser）裡。介面是繁體中文（traditional Chinese）。

一開始有這些項目：

- Exercise 1、3、4：打卡完成
- Exercise 2：選 30 分鐘或 60 分鐘（minutes），選一項就算完成
- Exercise 5: meditation
- FZN，四個時段都要完成：2:55–3:10am、8:55–9:10am、2:55–3:10pm、8:55–9:10pm
- Read FA：轉法輪要勾 1 Lecture，這項才算完成。各地講法約 1 小時，做多少都可以，不影響這項是否完成
- Have you seized every opportunity to really cultivate? 每天先有 3 條評分，可以再加。每條從 0% 拖到 100%，下面可以寫備註（note）。上面的數字是這幾條的平均。

## 本地運行

```bash
npm install
npm run dev
```

瀏覽器打開 [http://localhost:3000](http://localhost:3000)。

```bash
npm test
```

## 資料

資料寫在這台瀏覽器的 localStorage 裡，鍵名是 `rike.v1`。

## 放到 GitHub

公開倉庫（public repository）可以用免費的 GitHub Pages。推上 `main` 之後，到倉庫的 Settings → Pages，Source 選 GitHub Actions。網址會是 `https://帳號.github.io/倉庫名/`。
