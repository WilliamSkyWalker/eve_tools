#!/usr/bin/env python3
"""Replay the enemy-faction evidence against a Serenity SharedCache.

The snapshot indexes reviewed game text by guide level, exact Wiki source title
and opponent. Each reference is [missionID, dungeonID, localization messageID].
The mission must still point to the dungeon and to the reviewed sentence's text
(either a mission message or a dungeon mission briefing). A change to that text
requires a new review. Neither a site's faction nor a mission giver identifies
an opponent by itself. An empty object marks that guide as unconfirmed.

Run: python3 scripts/export-serenity-mission-enemies.py /path/to/SharedCache
"""

import argparse
import hashlib
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from serenity_client import U32, array, client_resources, localization, read_table

OUTPUT = Path(__file__).parent / 'data' / 'serenity-mission-enemies.json'
MISSION_PATH = 'res:/staticdata/missions.fsdbinary'
DUNGEON_PATH = 'res:/staticdata/dungeons.fsdbinary'
EN_PATH = 'res:/localizationfsd/localization_fsd_en-us.pickle'


def mission_message_ids(missions, pos):
    # messages is a hash table from message keys to localization IDs.
    return {U32.unpack_from(missions, entry + 8)[0]
            for bucket in array(missions, pos + 72, 8)
            for entry in array(missions, bucket, 16)}


def replay(cache, snapshot):
    build, resources = client_resources(cache, (MISSION_PATH, DUNGEON_PATH, EN_PATH))
    missions, positions = read_table(cache, resources[MISSION_PATH], 'missions',
                                     'fe7af19efb9ef6fac66280d5c03d0275', 224)
    dungeons, dungeon_positions = read_table(cache, resources[DUNGEON_PATH], 'dungeons',
                                             '6a6b5b71d5e78cfd3c61f952ffa1c58d', 80)
    text_ids = set()
    for level, guides in snapshot['levels'].items():
        for title, opponents in guides.items():
            for opponent, references in opponents.items():
                if not opponent or not references:
                    raise ValueError(f'No evidence for {title}: {opponent}')
                for mission_id, dungeon_id, text_id in references:
                    pos = positions[mission_id]
                    dungeon = dungeon_positions[dungeon_id]
                    if (U32.unpack_from(missions, pos + 144)[0] != dungeon_id
                            or U32.unpack_from(dungeons, dungeon + 40)[0] != int(level)):
                        raise ValueError(f'Changed dungeon or difficulty for {title}, mission {mission_id}')
                    if (text_id != U32.unpack_from(dungeons, dungeon + 64)[0]
                            and text_id not in mission_message_ids(missions, pos)):
                        raise ValueError(f'Message {text_id} is no longer linked to {title} ({mission_id})')
                    text_ids.add(text_id)
    if not text_ids:
        raise ValueError('No reviewed game text in the mapping')
    english = localization(cache, resources[EN_PATH], text_ids)
    hashes = {str(key): hashlib.sha256(english[key].encode()).hexdigest() for key in sorted(text_ids)}
    if hashes != snapshot['textSHA256']:
        changed = [key for key, digest in hashes.items() if snapshot['textSHA256'].get(key) != digest]
        raise ValueError(f'Review changed or unreferenced mission text before exporting: {changed}')
    return {'build': build, 'textSHA256': hashes, 'levels': snapshot['levels']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('shared_cache', type=Path)
    parser.add_argument('--mapping', type=Path, default=OUTPUT)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    snapshot = replay(args.shared_cache, json.loads(args.mapping.read_text(encoding='utf-8')))
    lines = [f'  "build": {snapshot["build"]}', '  "textSHA256": ' + json.dumps(snapshot['textSHA256'], indent=2).replace('\n', '\n  ')]
    levels = []
    for level, guides in sorted(snapshot['levels'].items()):
        rows = [f'      {json.dumps(title)}: {json.dumps(opponents, separators=(",", ":"))}'
                for title, opponents in sorted(guides.items())]
        levels.append(f'    "{level}": {{\n' + ',\n'.join(rows) + '\n    }')
    lines.append('  "levels": {\n' + ',\n'.join(levels) + '\n  }')
    with NamedTemporaryFile(mode='w', dir=args.output.parent, encoding='utf-8', delete=False) as tmp:
        tmp.write('{\n' + ',\n'.join(lines) + '\n}\n')
    Path(tmp.name).replace(args.output)
    print(f'Exported verified mission opponents from Serenity build {snapshot["build"]}')


if __name__ == '__main__':
    main()
