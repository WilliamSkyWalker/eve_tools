#!/usr/bin/env python3
"""Refresh scripts/data/serenity-mission-names.json from a Serenity SharedCache.

Run: python3 scripts/export-serenity-mission-names.py /path/to/SharedCache
The mapping keys are Wiki source titles. Each missionID identifies a verified
level-five variant. An overview of a chain uses its first covered mission's
name. A nameID without a missionID is a localization-only match and does not
identify a level-five encounter (Alluring Emanations in build 3736091).
"""

import argparse
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from serenity_client import U32, client_resources, localization, read_table

OUTPUT = Path(__file__).parent / 'data' / 'serenity-mission-names.json'
MISSION_PATH = 'res:/staticdata/missions.fsdbinary'
DUNGEON_PATH = 'res:/staticdata/dungeons.fsdbinary'
EN_PATH = 'res:/localizationfsd/localization_fsd_en-us.pickle'
ZH_PATH = 'res:/localizationfsd/localization_fsd_zh.pickle'


def export(cache, mapping):
    build, resources = client_resources(cache, [MISSION_PATH, DUNGEON_PATH, EN_PATH, ZH_PATH])
    missions, positions = read_table(cache, resources[MISSION_PATH], 'missions',
                                     'fe7af19efb9ef6fac66280d5c03d0275', 224)
    dungeons, dungeon_positions = read_table(cache, resources[DUNGEON_PATH], 'dungeons',
                                             '6a6b5b71d5e78cfd3c61f952ffa1c58d', 80)
    mission_names = {U32.unpack_from(missions, pos + 196)[0] for pos in positions.values()}
    names = {}
    for title, entry in sorted(mapping.items()):
        mission_id = entry.get('missionID')
        if mission_id is None:
            name_id = entry['nameID']
            if name_id not in mission_names:
                raise ValueError(f'{title}: nameID {name_id} is no longer a mission name')
            names[title] = {'nameID': name_id}
            continue
        pos = positions[mission_id]
        dungeon_id = U32.unpack_from(missions, pos + 144)[0]
        difficulty = U32.unpack_from(dungeons, dungeon_positions[dungeon_id] + 40)[0]
        if difficulty != 5:
            raise ValueError(f'{title}: mission {mission_id} has dungeon difficulty {difficulty}')
        names[title] = {'missionID': mission_id, 'nameID': U32.unpack_from(missions, pos + 196)[0]}

    name_ids = {entry['nameID'] for entry in names.values()}
    english = localization(cache, resources[EN_PATH], name_ids)
    chinese = localization(cache, resources[ZH_PATH], name_ids)
    for entry in names.values():
        name_id = entry['nameID']
        entry.update(en=english[name_id], zh=chinese[name_id])
        if not entry['en'] or not entry['zh']:
            raise ValueError(f'Empty mission localization for nameID {name_id}')
    return build, names


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('shared_cache', type=Path)
    parser.add_argument('--mapping', type=Path, default=OUTPUT)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    mapping = json.loads(args.mapping.read_text(encoding='utf-8'))['names']
    if not mapping:
        raise ValueError('Empty mission mapping')
    build, names = export(args.shared_cache, mapping)
    lines = [f'    {json.dumps(title)}: {json.dumps(entry, ensure_ascii=False)}'
             for title, entry in names.items()]
    output = '{\n  "build": %d,\n  "names": {\n%s\n  }\n}\n' % (build, ',\n'.join(lines))
    with NamedTemporaryFile(mode='w', dir=args.output.parent, encoding='utf-8', delete=False) as tmp:
        tmp.write(output)
    Path(tmp.name).replace(args.output)
    print(f'Exported {len(names)} mission names from Serenity build {build}')


if __name__ == '__main__':
    main()
