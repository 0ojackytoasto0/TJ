# -*- coding: utf-8 -*-
"""
调教直播间 · 模块化语音包生成

默认只生成「模块短句」+ 开场/台词/后调等核心句，不再为每一条长指令出 MP3。
前端：有整句 MP3 就播；没有则立刻用本地 TTS（见 js/game.js）。

用法：
  pip install -r requirements.txt
  python 生成语音.py --dry                 # 统计（默认 modules）
  python 生成语音.py                       # 生成模块包
  python 生成语音.py --mode core            # 模块 + intro/aftercare/finale/jerk
  python 生成语音.py --mode full            # 旧行为：全部任务池（很大）
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
        for key in ("phrases", "toys", "locations", "stems"):
            for s in mod.get(key) or []:
                if isinstance(s, str):
                    add_text(seen, s, host)
        # 也收录 scenarios 里的玩具/地点标签
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


def collect(mode: str) -> dict[str, str]:
    host = default_host()
    seen = collect_modules(host)
    collect_lines(host, seen)

    if mode == "modules":
        # 只要模块 + 台词；开场规矩仍常用，收一点 intro
        collect_intro(host, seen)
        for name in ("aftercare", "finale"):
            collect_pool(name, host, seen)
        return seen

    if mode == "core":
        collect_intro(host, seen)
        collect_jerk(host, seen)
        for name in CORE_POOLS:
            collect_pool(name, host, seen)
        return seen

    # full
    for name in FULL_POOLS:
        collect_pool(name, host, seen)
    collect_intro(host, seen)
    collect_jerk(host, seen)
    return seen


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
    ap = argparse.ArgumentParser(description="模块化语音包生成")
    ap.add_argument("--dry", action="store_true", help="只写 manifest，不生成")
    ap.add_argument("--voice", default="both", choices=["yunyang", "yunxi", "both"])
    ap.add_argument(
        "--mode",
        default="modules",
        choices=["modules", "core", "full"],
        help="modules=短句模块(默认) / core=常用池 / full=全部任务",
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

    # 哈希索引：前端用它判断「有没有整句 MP3」
    index = {"mode": args.mode, "count": len(manifest), "hashes": sorted(set(manifest.values()))}
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    print(f"mode={args.mode} · 共 {len(manifest)} 条（已写入 tts/manifest.json + tts/index.json）")
    if args.dry:
        return

    if args.voice in ("yunyang", "both"):
        asyncio.run(generate(manifest, "yunyang", args.limit))
    if args.voice in ("yunxi", "both"):
        asyncio.run(generate(manifest, "yunxi", args.limit))


if __name__ == "__main__":
    main()
