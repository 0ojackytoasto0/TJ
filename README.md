# 可配置调教直播间（GitHub Pages）

基于 [XrayPapa/TJ](https://github.com/XrayPapa/TJ) 的中文模拟调教直播间，增加了：

- **访问密码**（可选：`data/site.json` 里 `passwordHash` 为空则无密码）
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

**当前：无密码**（`passwordHash` 为空，直接进 18+ 确认页）。

## 设置 / 关闭密码

**关闭密码：** 把 [`data/site.json`](data/site.json) 的 `passwordHash` 设为 `""`。

**开启密码：**

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

## 语音（MP3 包 · iPhone 友好）

默认音色包为 **云扬（MP3）**，与原库一样用 `Audio` 播放，在 iPhone 上比系统朗读稳。

### 生成语音包

```bash
pip install -r requirements.txt
python 生成语音.py --dry              # 查看有多少条文本
python 生成语音.py --voice yunyang    # 生成云扬（推荐先跑这个）
python 生成语音.py --voice both       # 云扬 + 云希
python 生成语音.py --limit 5          # 调试：每包先生成 5 条
```

- 脚本从 [`data/tasks/`](data/tasks/) 收集任务与台词，输出到 [`tts/yunyang/`](tts/) 等。
- 哈希规则与前端 `ttsHash(normTTS(...))` 一致。
- 改任务文案后需**重新运行**脚本，才会有对应 mp3。
- 生成中的网络请求走 Edge TTS，需能访问外网；全量可能要较久。
- 生成完成后把整个 `tts/` 目录一并部署到 GitHub Pages。

未找到 mp3 时会自动回退到 **本地系统语音**。

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
