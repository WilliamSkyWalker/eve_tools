#!/usr/bin/env python3
"""Generate Simplified Chinese guide text with an offline Marian model."""

from __future__ import annotations

import json
import os
import re
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "public/data/guides.json"
MODEL_NAME = os.environ.get("GUIDE_TRANSLATION_MODEL", "Helsinki-NLP/opus-mt-en-zh")
BATCH_SIZE = int(os.environ.get("GUIDE_TRANSLATION_BATCH", "24"))
WORKERS = int(os.environ.get("GUIDE_TRANSLATION_WORKERS", "4"))

SITE_TERMS = {
    "Advanced Drone Outgrowth Colony": "高级无人机生长殖民地",
    "Rogue Drone": "自由无人机",
    "Angel Cartel": "天使企业联合体",
    "Blood Raider": "血袭者",
    "Sansha's Nation": "萨沙共和国",
    "Guristas": "古斯塔斯",
    "Serpentis": "天蛇",
    "Forsaken Hideaway": "遗弃藏身处",
    "Forlorn Hideaway": "荒废藏身处",
    "Hidden Hideaway": "隐蔽藏身处",
    "Forsaken Rally Point": "遗弃集结点",
    "Forlorn Rally Point": "荒废集结点",
    "Hidden Rally Point": "隐蔽集结点",
    "Forsaken Den": "遗弃集结地",
    "Forlorn Den": "荒废集结地",
    "Hidden Den": "隐蔽集结地",
    "Hideaway": "藏身处",
    "Burrow": "巢穴",
    "Refuge": "避难所",
    "Rally Point": "集结点",
    "Haven": "避难所",
    "Sanctum": "圣坛",
    "Port": "港口",
    "Hub": "枢纽",
    "Base": "基地",
    "Annex": "附属区",
    "Fortress": "堡垒",
    "Naval Shipyard": "海军船坞",
    "Military Complex": "军事复合体",
    "Military Operations Complex": "军事行动复合体",
    "Occupied Mining Colony": "被占领的采矿殖民地",
}

ZH_FIXES = {
    "古里斯塔斯": "古斯塔斯",
    "吉里斯塔斯": "古斯塔斯",
    "古里斯塔": "古斯塔斯",
    "桑沙": "萨沙",
    "桑莎": "萨沙",
    "蛇人": "天蛇",
    "流氓无人机": "自由无人机",
    "天使卡特尔": "天使企业联合体",
    "血液袭击者": "血袭者",
    "死亡空间口袋": "死亡空间房间",
    " Deadspace口袋": "死亡空间房间",
    "Deadspace口袋": "死亡空间房间",
    "该网站": "该站点",
    "这个网站": "这个站点",
    "加固产卵": "增援波次",
    "增援产卵": "增援波次",
    "触发产卵": "触发刷新",
    "产卵": "刷新",
    "物流船": "后勤舰",
    "物流舰": "后勤舰",
    "首都舰": "旗舰",
    "首都船": "旗舰",
    "首都（": "旗舰（",
    "首都(": "旗舰(",
    "无大门": "无加速轨道",
    "无出入口": "无加速轨道",
    "坦克": "防御",
    "暴击": "速刷",
    "老鼠": "敌舰",
    "概述": "概览",
    "演练": "攻略流程",
}

HEADING_ZH = {
    "Overview": "概览",
    "Details": "详情",
    "Walkthrough": "攻略流程",
    "Notes": "注意事项",
    "Blitz": "速刷",
    "Loot": "掉落",
    "Escalation": "远征升级",
    "Warp-In": "跃迁落点",
    "Warp-in": "跃迁落点",
    "Single Pocket": "单一房间",
    "First Room": "第一房间",
    "Second Room": "第二房间",
    "Third Room": "第三房间",
}

def split_chunks(text: str, limit: int = 380) -> list[str]:
    text = text.strip()
    if len(text) <= limit:
        return [text] if text else []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(sentence) > limit:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(sentence[i : i + limit] for i in range(0, len(sentence), limit))
        elif not current:
            current = sentence
        elif len(current) + len(sentence) + 1 <= limit:
            current += " " + sentence
        else:
            chunks.append(current)
            current = sentence
    if current:
        chunks.append(current)
    return chunks


def fix_zh(text: str) -> str:
    for source, target in ZH_FIXES.items():
        text = text.replace(source, target)
    return re.sub(r"\s+([，。；：！？])", r"\1", text).strip()


def composed_site_title(title: str) -> str | None:
    translated = title
    for source, target in sorted(SITE_TERMS.items(), key=lambda item: len(item[0]), reverse=True):
        translated = re.sub(rf"\b{re.escape(source)}\b", target, translated, flags=re.IGNORECASE)
    translated = translated.replace("'s", "的")
    if not re.search(r"[A-Za-z]{2,}", translated):
        return translated
    return None


def collect_jobs(data: dict) -> tuple[list[str], list[tuple]]:
    texts: list[str] = []
    paths: list[tuple] = []

    def add(path: tuple, value: str) -> None:
        for chunk_index, chunk in enumerate(split_chunks(value)):
            texts.append(chunk)
            paths.append((*path, chunk_index))

    for guide_index, guide in enumerate(data["guides"]):
        add((guide_index, "title"), guide["title"])
        for section_index, section in enumerate(guide["sections"]):
            add((guide_index, "section", section_index, "heading"), section["heading"])
            add((guide_index, "section", section_index, "text"), section["text"])
    return texts, paths


def assign_translations(data: dict, paths: list[tuple], translations: list[str]) -> None:
    chunks: dict[tuple, list[tuple[int, str]]] = {}
    for path, translation in zip(paths, translations, strict=True):
        key, chunk_index = path[:-1], path[-1]
        chunks.setdefault(key, []).append((chunk_index, fix_zh(translation)))

    for path, translated_chunks in chunks.items():
        value = " ".join(value for _, value in sorted(translated_chunks))
        guide = data["guides"][path[0]]
        guide.setdefault("zh", {"sections": []})
        if path[1] == "title":
            guide["zh"]["title"] = composed_site_title(guide["title"]) or value
        elif path[1] == "section":
            section_index, field = path[2], path[3]
            while len(guide["zh"]["sections"]) <= section_index:
                guide["zh"]["sections"].append({})
            if field == "heading":
                source_heading = guide["sections"][section_index]["heading"]
                value = HEADING_ZH.get(source_heading, value)
                room = re.fullmatch(r"(?:Room|Pocket)\s+(\d+)", source_heading, re.IGNORECASE)
                if room:
                    value = f"房间 {room.group(1)}"
            guide["zh"]["sections"][section_index][field] = value


def translate_partition(args: tuple[int, list[str], str, int, int]) -> tuple[int, list[str]]:
    partition_index, texts, model_name, batch_size, threads = args
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    model.eval()
    torch.set_num_threads(threads)
    translations: list[str] = []
    with torch.inference_mode():
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=512)
            output = model.generate(**inputs, max_length=512, num_beams=1)
            translations.extend(tokenizer.batch_decode(output, skip_special_tokens=True))
    return partition_index, translations


def main() -> None:
    data = json.loads(DATA_PATH.read_text())
    texts, paths = collect_jobs(data)
    worker_count = max(1, min(WORKERS, len(texts)))
    partition_size = (len(texts) + worker_count - 1) // worker_count
    partitions = [
        texts[start : start + partition_size]
        for start in range(0, len(texts), partition_size)
    ]
    threads = max(1, min(4, (os.cpu_count() or worker_count) // worker_count))
    results: list[list[str] | None] = [None] * len(partitions)
    completed = 0
    with ProcessPoolExecutor(max_workers=worker_count) as executor:
        futures = [
            executor.submit(
                translate_partition,
                (index, partition, MODEL_NAME, BATCH_SIZE, threads),
            )
            for index, partition in enumerate(partitions)
        ]
        for future in as_completed(futures):
            index, translated = future.result()
            results[index] = translated
            completed += len(translated)
            print(f"Translated {completed}/{len(texts)} ({len(results[index])} item shard complete)", flush=True)
    translations = [text for partition in results for text in partition or []]

    assign_translations(data, paths, translations)
    data["translation"] = {
        "language": "zh-Hans",
        "model": MODEL_NAME,
        "kind": "machine",
        "modelLicense": "CC BY 4.0",
        "modelUrl": f"https://huggingface.co/{MODEL_NAME}",
    }
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Wrote Chinese translations for {len(data['guides'])} guides")


if __name__ == "__main__":
    main()
