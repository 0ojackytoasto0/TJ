# -*- coding: utf-8 -*-
"""
调教直播间 · 语音包批量生成（改编自 XrayPapa/TJ 生成语音.py）

从 data/tasks/*.json 收集待朗读文本，用 edge-tts 生成
tts/yunyang/<djb2>.mp3 与 tts/yunxi/<djb2>.mp3
文件名哈希必须与前端 js/game.js 中 ttsHash(normTTS(text)) 一致。

用法：
  pip install -r requirements.txt
  python 生成语音.py --dry              # 只统计数量
  python 生成语音.py --voice yunyang    # 只云扬
  python 生成语音.py --voice yunxi      # 只云希
  python 生成语音.py --voice both       # 两个包（默认）
  python 生成语音.py --limit 20         # 调试：每包最多生成 N 条新文件
"""
from __future__ import annotations

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
OUT = os.path.join(BASE, "tts")

VOICES = {
    "yunyang": "zh-CN-YunyangNeural",  # 云扬 · 默认男声
    "yunxi": "zh-CN-YunxiNeural",  # 云希
}
RATE = "-4%"

# 游戏内写死的朗读句（与 js/game.js 保持同步）
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

POOL_FILES = [
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
    """与 JS: h=((h<<5)+h+code)>>>0 一致"""
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
    """与 js/game.js normTTS + fixTTS 对齐"""
    host = host if host is not None else default_host()
    s = (
        str(text)
        .replace("{n}", "骚狗")
        .replace("{c}", "骚狗")
        .replace("{host}", host)
    )
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("调教室", "调教直播间").replace("调教房", "调教直播间")
    return s


def load_json(name: str):
    path = os.path.join(TASKS, name + ".json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def collect() -> dict[str, str]:
    host = default_host()
    texts: list[str] = []

    for name in POOL_FILES:
        path = os.path.join(TASKS, name + ".json")
        if not os.path.isfile(path):
            continue
        data = load_json(name)
        if not isinstance(data, list):
            continue
        for item in data:
            if isinstance(item, dict) and item.get("t"):
                texts.append(item["t"])

    # 开场：papa + t 连读（与 renderTask 一致）
    intro_path = os.path.join(TASKS, "intro.json")
    if os.path.isfile(intro_path):
        for item in load_json("intro"):
            if not isinstance(item, dict):
                continue
            papa = item.get("papa") or ""
            t = item.get("t") or ""
            if papa or t:
                texts.append((papa + " " + t).strip())

    # 撸管步骤
    jerk_path = os.path.join(TASKS, "jerk.json")
    if os.path.isfile(jerk_path):
        for item in load_json("jerk"):
            if not isinstance(item, dict):
                continue
            if item.get("t"):
                texts.append(item["t"])
            for step in item.get("steps") or []:
                if isinstance(step, dict) and step.get("txt"):
                    texts.append(step["txt"])

    # 台词 / 开幕 / 结局等
    lines_path = os.path.join(TASKS, "lines.json")
    if os.path.isfile(lines_path):
        lines = load_json("lines")

        for key in ("papaOpen", "papaTrans", "papaPraise", "papaClose", "fail1", "fail2"):
            for s in lines.get(key) or []:
                if isinstance(s, str):
                    texts.append(s)

        for key in ("stageOpen", "actOpen"):
            block = lines.get(key) or {}
            if isinstance(block, dict):
                for arr in block.values():
                    if isinstance(arr, list):
                        for s in arr:
                            if isinstance(s, str):
                                texts.append(s)

        for group in lines.get("shutdown") or []:
            if isinstance(group, list):
                for s in group:
                    if isinstance(s, str):
                        texts.append(s)

        for ev in lines.get("events") or []:
            if isinstance(ev, dict):
                if ev.get("txt"):
                    texts.append(ev["txt"])
                if ev.get("t"):
                    # 事件标题一般不播，但 toast 可能念 txt；保留 txt 即可
                    pass

    texts.extend(FIXED_TEXTS)

    seen: dict[str, str] = {}
    for t in texts:
        n = norm(t, host)
        if n:
            seen.setdefault(n, djb2(n))
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
        print(f"[{pack}] 失败 {len(failed)} 条，已记录到 tts/{pack}_failed.json")
    else:
        print(f"[{pack}] 全部完成，本轮生成 {total} 条（清单共 {len(manifest)} 条）")


def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    voice = "both"
    limit = None
    if "--voice" in args:
        voice = args[args.index("--voice") + 1]
    if "--limit" in args:
        limit = int(args[args.index("--limit") + 1])

    if not os.path.isdir(TASKS):
        print(f"找不到任务目录：{TASKS}", file=sys.stderr)
        sys.exit(1)

    manifest = collect()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    print(f"共 {len(manifest)} 条需要朗读的文本（已写入 tts/manifest.json）")
    if dry:
        return

    if voice in ("yunyang", "both"):
        asyncio.run(generate(manifest, "yunyang", limit))
    if voice in ("yunxi", "both"):
        asyncio.run(generate(manifest, "yunxi", limit))


if __name__ == "__main__":
    main()
