# 可配置调教直播间（GitHub Pages）

基于 [XrayPapa/TJ](https://github.com/XrayPapa/TJ) 的中文模拟调教直播间，增加了：

- **访问密码**（进入前校验）
- **癖好开关**（开播前勾选）
- **主人称呼 / 称呼池** 可改
- **配置导入导出**（保存在浏览器 `localStorage`）
- 额外癖好包：**夹子 / 马桶 / 饮尿 / 身体涂写**
- **可选加强：后庭插入（假鸡巴 / 肛塞）** — 开启后增加专场环节，并在其他环节混入相关任务

> 仅供 18+ 自愿私密使用。摄像头画面只在本机预览，不会上传。

## 本地预览

不要直接双击 `index.html`（`fetch` JSON 会被浏览器拦截）。用任一本地服务器：

```bash
npx --yes serve .
```

然后打开提示的地址（通常是 `http://localhost:3000`）。

**默认密码：** `tj-change-me`  
上线前请立刻改掉。

## 修改密码

1. 打开 [`tools/hash-password.html`](tools/hash-password.html)（可用浏览器直接打开）。
2. 输入新密码，复制生成的 SHA-256 十六进制字符串。
3. 粘贴到 [`data/site.json`](data/site.json) 的 `passwordHash` 字段。
4. 提交并推送到 GitHub。

密码只在浏览器里做哈希比对，**不能**真正保护仓库里的静态文件。公开仓库里任何人仍可下载源码与任务文本。

## 配置说明

| 文件 | 作用 |
|------|------|
| [`data/site.json`](data/site.json) | 品牌名、主人称呼、密码哈希、难度/节奏参数 |
| [`data/kinks.json`](data/kinks.json) | 癖好目录与默认开关 |
| [`data/tasks/*.json`](data/tasks/) | 任务池、弹幕、台词 |

开播设置页也可以改主人称呼、称呼池和癖好开关；点「导出配置」可备份，刷新后仍会从 `localStorage` 恢复。

任务字段约定（与原版一致）：

- `t` 文本 · `k` 癖好标签 · `w` 热身 · `hi` 高强度 · `o/s/h` 服从/羞耻/热度增量

## 部署到 GitHub Pages

1. 新建 GitHub 仓库，把本目录推上去。
2. **Settings → Pages → Build and deployment**
3. Source 选 **Deploy from a branch**
4. Branch 选 `main`（或 `master`），文件夹选 `/ (root)`
5. 等待部署完成后访问 `https://<用户名>.github.io/<仓库名>/`

若仓库名不是根站点，确认相对路径 `css/`、`js/`、`data/` 能打开（本项目使用相对路径，适合 project pages）。

## 语音

默认使用浏览器 **本地语音（Web Speech）**，方便自定义任务即时朗读。  
设置里仍保留「云扬 / 云希」MP3 包选项；若未放入 `tts/` 资源包，请继续用「本地」。

## 重新提取上游数据（可选）

若你更新了缓存的上游 HTML：

```bash
node tools/extract-data.mjs
node tools/add-kinks.mjs
node tools/build-shell.mjs
node tools/rebuild-css.mjs
node tools/slice-engine.mjs
node tools/patch-engine.mjs
```

注意：重建脚本可能覆盖 `index.html` / `css/app.css` / `js/game.js`，之后需要重新检查密码门与癖好 UI 补丁。

## 安全停播

直播中随时可点 **🛑 停播**。安全停播**不记失败**，并进入安抚流程。
