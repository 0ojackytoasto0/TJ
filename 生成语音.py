# -*- coding: utf-8 -*-
"""
调教直播间 · 语音包生成

默认 full：保留大部分整句 MP3（指令/惩罚/台词等）。
道具/地点等短名仍作为模块一并收录，方便「画面写细项、语音用通称」或单独点名道具。

前端：index 里列出的哈希才播 MP3；具体道具名会先归一成 肛塞/假鸡巴/跳蛋… 再查哈希。

用法：
  pip install -r requirements.txt
  python 生成语音.py --dry                 # 统计并刷新 manifest/index（默认 full）
  python 生成语音.py                       # 生成缺的整句 + 模块
  python 生成语音.py --mode modules         # 只要短句模块
  python 生成语音.py --mode core           # 模块 + intro/aftercare/finale/jerk
  python 生成语音.py --voice yunyang
  python 生成语音.py --limit 20
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys

try:
    import edge_tts
except ImportError:
    print("请先安装：pip install edge-tts", file=sys.stderr)
    sys.exit(1)

BASE = os.path.dirname(os.path.abspath(__file__))
TASKS = os.path.join(BASE, "data", "tasks")
SITE = os.path.join(BASE, "data", "site.json")
MODULES = os.path.join(BASE, "data", "tts-modules.json")
SCENARIOS = os.path.join(BASE, "data", "scenarios.json")
OUT = os.path.join(BASE, "tts")

VOICES = {
    "yunyang": "zh-CN-YunyangNeural",
    "yunxi": "zh-CN-YunxiNeural",
}
RATE = "-4%"

FIXED_TEXTS = [
    "跟着节拍撸动，坚持到倒计时结束。",
    "停下来了，好孩子。你做得对。现在跟着我深呼吸——吸气，呼气。你的安全，比什么都重要。",
    "骚狗，跪好了。听主人说话，别让我失望。",
    "主人现在的语速，听着还习惯吗？",
    "这个音调，是不是更有主人的感觉？",
    "服从度上来了，{c}。主人开始信任你了。",
    "羞耻值要爆了，{c}。再继续下去，今晚只能崩溃收场。",
    "体力快见底了，{c}。还能撑住吗？",
    "跳过问题？观众可都在等着呢。",
    "观众可都看着呢。拒绝一次，就加练一条。",
    "谁让你射的？！违规的骚狗，滚去后调。",
    "看来你已经到极限了……今天的直播提前进入后调。",
]

CORE_POOLS = ["aftercare", "finale", "recite"]
FULL_POOLS = [
    "instruct",
    "punish",
    "train",
    "chat",
    "order",
    "recite",
    "aftercare",
    "finale",
    "insert",
]


def djb2(text: str) -> str:
    h = 5381
    for ch in text:
        h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
    return format(h, "x")


def default_host() -> str:
    try:
        with open(SITE, encoding="utf-8") as f:
            return json.load(f).get("hostName") or "主人"
    except Exception:
        return "主人"


def norm(text: str, host: str | None = None) -> str:
    host = host if host is not None else default_host()
    s = (
        str(text)
        .replace("{n}", "骚狗")
        .replace("{c}", "骚狗")
        .replace("{host}", host)
        .replace("{toy}", "玩具")
        .replace("{plug}", "肛塞")
        .replace("{dildo}", "假鸡巴")
        .replace("{vibe}", "跳蛋")
        .replace("{candle}", "蜡烛")
        .replace("{stroker}", "自慰棒")
    )
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("调教室", "调教直播间").replace("调教房", "调教直播间")
    return s


def load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def add_text(seen: dict[str, str], text: str, host: str):
    n = norm(text, host)
    if n:
        seen.setdefault(n, djb2(n))


def collect_modules(host: str) -> dict[str, str]:
    seen: dict[str, str] = {}
    if os.path.isfile(MODULES):
        mod = load_json(MODULES)
        for key in ("phrases", "call", "toys", "locations", "stems"):
            for s in mod.get(key) or []:
                if isinstance(s, str):
                    add_text(seen, s, host)
    if os.path.isfile(SCENARIOS):
        sc = load_json(SCENARIOS)
        for toy in sc.get("toys") or []:
            if isinstance(toy, dict) and toy.get("label"):
                add_text(seen, toy["label"], host)
        for loc in sc.get("locations") or []:
            if isinstance(loc, dict) and loc.get("label"):
                add_text(seen, loc["label"], host)
                add_text(seen, "本场场景：" + loc["label"], host)
    for s in FIXED_TEXTS:
        add_text(seen, s, host)
    return seen


def collect_lines(host: str, seen: dict[str, str]):
    lines_path = os.path.join(TASKS, "lines.json")
    if not os.path.isfile(lines_path):
        return
    lines = load_json(lines_path)
    for key in ("papaOpen", "papaTrans", "papaPraise", "papaClose", "fail1", "fail2"):
        for s in lines.get(key) or []:
            if isinstance(s, str):
                add_text(seen, s, host)
    for key in ("stageOpen", "actOpen"):
        block = lines.get(key) or {}
        if isinstance(block, dict):
            for arr in block.values():
                if isinstance(arr, list):
                    for s in arr:
                        if isinstance(s, str):
                            add_text(seen, s, host)
    for group in lines.get("shutdown") or []:
        if isinstance(group, list):
            for s in group:
                if isinstance(s, str):
                    add_text(seen, s, host)
    for ev in lines.get("events") or []:
        if isinstance(ev, dict) and ev.get("txt"):
            add_text(seen, ev["txt"], host)


def collect_pool(name: str, host: str, seen: dict[str, str]):
    path = os.path.join(TASKS, name + ".json")
    if not os.path.isfile(path):
        return
    data = load_json(path)
    if not isinstance(data, list):
        return
    for item in data:
        if isinstance(item, dict) and item.get("t"):
            add_text(seen, item["t"], host)
            if item.get("papa"):
                add_text(seen, (item.get("papa") + " " + item["t"]).strip(), host)


def collect_intro(host: str, seen: dict[str, str]):
    path = os.path.join(TASKS, "intro.json")
    if not os.path.isfile(path):
        return
    for item in load_json(path):
        if not isinstance(item, dict):
            continue
        papa = item.get("papa") or ""
        t = item.get("t") or ""
        if papa or t:
            add_text(seen, (papa + " " + t).strip(), host)


def collect_jerk(host: str, seen: dict[str, str]):
    path = os.path.join(TASKS, "jerk.json")
    if not os.path.isfile(path):
        return
    for item in load_json(path):
        if not isinstance(item, dict):
            continue
        if item.get("t"):
            add_text(seen, item["t"], host)
        for step in item.get("steps") or []:
            if isinstance(step, dict) and step.get("txt"):
                add_text(seen, step["txt"], host)


def collect_scenarios(host: str, seen: dict[str, str]):
    """一对一场景剧本 beats（宿舍/公厕等），此前未进语音包会整段走系统 TTS。"""
    if not os.path.isfile(SCENARIOS):
        return
    sc = load_json(SCENARIOS)
    beats = sc.get("beats") or {}
    if not isinstance(beats, dict):
        return
    for _kind, arr in beats.items():
        if not isinstance(arr, list):
            continue
        for item in arr:
            if not isinstance(item, dict):
                continue
            papa = item.get("papa") or ""
            t = item.get("t") or ""
            if papa:
                add_text(seen, papa, host)
            if t:
                add_text(seen, t, host)
            if papa and t:
                add_text(seen, (papa + " " + t).strip(), host)
    # 兜底到达句（无匹配 beat 时）
    for loc in sc.get("locations") or []:
        if isinstance(loc, dict) and loc.get("label"):
            add_text(seen, "场景：" + loc["label"] + "。", host)
            add_text(
                seen,
                "面对镜头报出你现在的位置「"
                + loc["label"]
                + "」，摆好跪姿，说「主人，狗就位」。",
                host,
            )
            add_text(seen, "本场场景：" + loc["label"] + " · 前戏含铃铛", host)


def collect_game_js_lines(host: str, seen: dict[str, str]):
    """从 game.js 里捞中文对白字符串（speak / toast / 口吻短句）。"""
    path = os.path.join(BASE, "js", "game.js")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        src = f.read()
    # 单引号或双引号里的中文短句
    for m in re.finditer(r"['\"]([^'\"\n]{4,180})['\"]", src):
        s = m.group(1)
        if not re.search(r"[\u4e00-\u9fff]", s):
            continue
        # 排除明显非对白
        if re.search(r"[{}<>/=\\]|function |return |const |var |let ", s):
            continue
        if s.startswith("http") or s.endswith(".js") or s.endswith(".mp3"):
            continue
        add_text(seen, s, host)


def collect(mode: str) -> dict[str, str]:
    host = default_host()
    # 任何模式都带上道具/地点短名模块
    seen = collect_modules(host)
    collect_lines(host, seen)
    collect_game_js_lines(host, seen)

    if mode == "modules":
        collect_intro(host, seen)
        collect_scenarios(host, seen)
        for name in ("aftercare", "finale"):
            collect_pool(name, host, seen)
        return seen

    if mode == "core":
        collect_intro(host, seen)
        collect_jerk(host, seen)
        collect_scenarios(host, seen)
        for name in CORE_POOLS:
            collect_pool(name, host, seen)
        return seen

    # full：大部分整句 + 模块 + 场景剧本
    for name in FULL_POOLS:
        collect_pool(name, host, seen)
    collect_intro(host, seen)
    collect_jerk(host, seen)
    collect_scenarios(host, seen)
    return seen


def existing_mp3_hashes() -> set[str]:
    """前端 index 只列磁盘上真实存在的文件，避免空哈希导致整句不播。"""
    hashes: set[str] = set()
    for pack in VOICES:
        folder = os.path.join(OUT, pack)
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            if not name.endswith(".mp3"):
                continue
            path = os.path.join(folder, name)
            try:
                if os.path.getsize(path) > 1000:
                    hashes.add(name[:-4])
            except OSError:
                pass
    return hashes


async def gen_one(sem, text, voice, out):
    async with sem:
        for attempt in range(3):
            try:
                c = edge_tts.Communicate(text, voice, rate=RATE)
                await c.save(out)
                return None
            except Exception as e:
                if attempt == 2:
                    return (text, str(e))
                await asyncio.sleep(1 + attempt)


async def generate(manifest: dict[str, str], pack: str, limit: int | None = None):
    voice = VOICES[pack]
    folder = os.path.join(OUT, pack)
    os.makedirs(folder, exist_ok=True)
    sem = asyncio.Semaphore(4)
    tasks = []
    for text, h in manifest.items():
        path = os.path.join(folder, h + ".mp3")
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            continue
        tasks.append(gen_one(sem, text, voice, path))
        if limit is not None and len(tasks) >= limit:
            break

    total = len(tasks)
    if total == 0:
        print(f"[{pack}] 无需生成（均已存在），清单共 {len(manifest)} 条", flush=True)
        return

    done = 0
    failed = []
    for i in range(0, len(tasks), 8):
        batch = tasks[i : i + 8]
        results = await asyncio.gather(*batch, return_exceptions=True)
        for r in results:
            if isinstance(r, tuple):
                failed.append(r)
            elif isinstance(r, Exception):
                failed.append(("<unknown>", str(r)))
        done += len(batch)
        print(f"[{pack}] {done}/{total}", flush=True)

    if failed:
        fail_path = os.path.join(OUT, pack + "_failed.json")
        with open(fail_path, "w", encoding="utf-8") as f:
            json.dump(failed, f, ensure_ascii=False, indent=1)
        print(f"[{pack}] 失败 {len(failed)} 条 → tts/{pack}_failed.json")
    else:
        print(f"[{pack}] 完成，本轮 {total} 条（清单共 {len(manifest)} 条）")


def main():
    ap = argparse.ArgumentParser(description="语音包生成（默认保留大部分整句）")
    ap.add_argument("--dry", action="store_true", help="只写 manifest/index，不生成")
    ap.add_argument("--voice", default="both", choices=["yunyang", "yunxi", "both"])
    ap.add_argument(
        "--mode",
        default="full",
        choices=["modules", "core", "full"],
        help="full=大部分整句+模块(默认) / core=常用池 / modules=仅短句模块",
    )
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    if not os.path.isdir(TASKS):
        print(f"找不到任务目录：{TASKS}", file=sys.stderr)
        sys.exit(1)

    manifest = collect(args.mode)
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(OUT, "manifest.json")
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    # index：以磁盘已有 MP3 为准（避免 modules 模式覆盖后前端以为只剩 200 条）
    disk = existing_mp3_hashes()
    man_hashes = set(manifest.values())
    # 已有文件 + 本轮清单里尚未生成的不写入（避免假阳性 404）
    # 已有文件即使不在本轮清单也保留，兼容旧录音
    index_hashes = sorted(disk)
    index = {
        "mode": args.mode,
        "manifestCount": len(manifest),
        "count": len(index_hashes),
        "hashes": index_hashes,
        "note": "hashes=磁盘上已有 mp3；具体道具名由前端归一成通称后再查",
    }
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    overlap = len(disk & man_hashes)
    print(
        f"mode={args.mode} · 清单 {len(manifest)} 条 · 磁盘 MP3 哈希 {len(disk)} · 与清单重合 {overlap}",
        flush=True,
    )
    print("已写入 tts/manifest.json + tts/index.json", flush=True)
    if args.dry:
        return

    if args.voice in ("yunyang", "both"):
        asyncio.run(generate(manifest, "yunyang", args.limit))
    if args.voice in ("yunxi", "both"):
        asyncio.run(generate(manifest, "yunxi", args.limit))

    # 生成后再扫一遍磁盘，刷新 index
    disk = existing_mp3_hashes()
    index = {
        "mode": args.mode,
        "manifestCount": len(manifest),
        "count": len(disk),
        "hashes": sorted(disk),
        "note": "hashes=磁盘上已有 mp3；具体道具名由前端归一成通称后再查",
    }
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print(f"已刷新 index：{len(disk)} 条可用哈希", flush=True)


if __name__ == "__main__":
    main()
