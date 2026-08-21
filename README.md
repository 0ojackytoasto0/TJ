# 可配置调教直播间（GitHub Pages）

基于 [XrayPapa/TJ](https://github.com/XrayPapa/TJ) 的中文模拟调教直播间，增加了：

- **访问密码**（可选：`data/site.json` 里 `passwordHash` 为空则无密码）
- **癖好开关**（开播前勾选）
- **主人称呼 / 称呼池** 可改
- **配置导入导出**（保存在浏览器 `localStorage`）
- 额外癖好包：**夹子 / 马桶 / 饮尿 / 身体涂写**
- **可选加强：后庭插入（假鸡巴 / 肛塞）** — 开启后增加专场环节，并在其他环节混入相关任务
- **一对一视频通话模式**（[`facetime/`](facetime/)）— 接通前可选地点与条件，生成有始有终的场景剧本指令流（无观众弹幕）

> 仅供 18+ 自愿私密使用。摄像头画面只在本机预览，不会上传。

## 本地预览

不要直接双击 `index.html`（`fetch` JSON 会被浏览器拦截）。用任一本地服务器：

```bash
npx --yes serve .
```

然后打开提示的地址（通常是 `http://localhost:3000`）。

| 路径 | 模式 |
|------|------|
| `/` | 多人直播间（LIVE、弹幕、观众点菜） |
| `/facetime/` | 一对一视频通话：选地点/条件（或随机）→ 场景剧本推进；主人 PiP；无弹幕/问答 |

GitHub Pages 上对应 `https://<用户名>.github.io/<仓库名>/` 与 `.../facetime/`。

**当前：访问密码为 `1`**（`passwordHash` 已写入 SHA-256）。

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
| [`data/site.json`](data/site.json) | 品牌名、主人称呼、密码哈希、难度/节奏参数；`callBrandName` / `callFrameCaption` 供 facetime 页展示 |
| [`data/kinks.json`](data/kinks.json) | 癖好目录与默认开关 |
| [`data/scenarios.json`](data/scenarios.json) | 一对一场景：地点、条件、节拍模板与 easy/hard 剧本弧 |
| [`data/tasks/*.json`](data/tasks/) | 任务池、弹幕、台词 |
| [`facetime/`](facetime/) | 一对一通话入口（独立 `localStorage` 键 `tj_facetime_cfg_v1`，复用上级 `data/` 与 `tts/`） |

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

## 语音（模块化 MP3 + 本地回退）

默认按 **模块化** 生成：只为短句模块、地点/玩具名、开场台词等出 MP3；长指令没有对应文件时**立刻用本地系统语音**，不必再为上千条任务逐条生成。

### 生成语音包

```bash
pip install -r requirements.txt
python 生成语音.py --dry                    # 默认 modules：看有多少条
python 生成语音.py --voice yunyang           # 生成模块包（推荐）
python 生成语音.py --mode core --voice both  # 模块 + jerk/aftercare 等常用池
python 生成语音.py --mode full --voice both  # 旧行为：全量任务（很大、很慢）
python 生成语音.py --limit 5                # 调试：先生成 5 条
```

- 模块文案在 [`data/tts-modules.json`](data/tts-modules.json)，可自行加短句。
- 输出：`tts/manifest.json`（文本→哈希）、`tts/index.json`（前端用来判断有没有 MP3）。
- 哈希规则与前端 `ttsHash(normTTS(...))` 一致。
- 改模块文案后重新跑脚本即可；场景随机长句一般走本地 TTS。

未命中 MP3 时自动回退到 **本地系统语音**（不再空等 404）。

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
