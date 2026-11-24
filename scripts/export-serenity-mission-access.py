#!/usr/bin/env python3
"""Refresh mission gate evidence from a Serenity SharedCache.

Each entry holds the client mission IDs for all covered stages or branches of
one variant. Separate entries represent alternative matches for the Wiki title.
"""

import argparse
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from serenity_client import U32
from serenity_gate_access import colossus_lists, gate_tables, site_access

OUTPUT = Path(__file__).parent / 'data' / 'serenity-mission-access.json'
MISSIONS = {'missions': ('fe7af19efb9ef6fac66280d5c03d0275', 224)}


def export(cache, guides):
    build, tables = gate_tables(cache, MISSIONS)
    lists = colossus_lists(tables)
    missions, mission_positions = tables['missions']
    dungeons, dungeon_positions = tables['dungeons']
    result = {}
    for key, variants in sorted(guides.items()):
        level = int(key.split('|', 1)[0])
        paths = []
        for variant in variants:
            ids = variant['missionIDs']
            if not ids or len(ids) != len(set(ids)):
                raise ValueError(f'{key}: expected a nonempty path of distinct mission IDs')
            locations = set()
            for mission_id in ids:
                dungeon_id = U32.unpack_from(missions, mission_positions[mission_id] + 144)[0]
                difficulty = U32.unpack_from(dungeons, dungeon_positions[dungeon_id] + 40)[0]
                if difficulty != level:
                    raise ValueError(f'{key}: mission {mission_id} has dungeon difficulty {difficulty}')
                locations.add(dungeon_id)
            paths.append({'missionIDs': ids, **site_access(sorted(locations), tables['dungeons'], lists)})
        result[key] = paths
    return build, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('shared_cache', type=Path)
    parser.add_argument('--mapping', type=Path, default=OUTPUT)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    guides = json.loads(args.mapping.read_text(encoding='utf-8'))['guides']
    if not guides:
        raise ValueError('Empty mission mapping')
    build, updated = export(args.shared_cache, guides)
    lines = [f'    {json.dumps(key)}: {json.dumps(value, separators=(",", ":"))}'
             for key, value in updated.items()]
    text = '{\n  "build": %d,\n  "guides": {\n%s\n  }\n}\n' % (build, ',\n'.join(lines))
    with NamedTemporaryFile(mode='w', dir=args.output.parent, encoding='utf-8', delete=False) as tmp:
        tmp.write(text)
    Path(tmp.name).replace(args.output)
    print(f'Exported {len(updated)} guides from Serenity build {build}')


if __name__ == '__main__':
    main()
