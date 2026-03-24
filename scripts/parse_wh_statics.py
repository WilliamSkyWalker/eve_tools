#!/usr/bin/env python3
"""
Parse wormhole statics data from OkYk/eve-bookmarks w-static-effect-life.txt
and generate wormhole_systems.json for import.

Format per line:
  J-name [Effect] const <constellation> region <region> [StaticDesignation TargetClass Lifetime]...

Effects: Wolf-Rayet Star, Pulsar, Magnetar, Black Hole, Red Giant, Cataclysmic
Target classes: C1-C6, high, low, null
"""
import json
import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_PATH = '/tmp/wh_statics_raw.txt'
OUTPUT_PATH = os.path.join(BASE_DIR, 'sde_data', 'wormhole_systems.json')

# Known effects in the data file
EFFECTS = [
    'Wolf-Rayet Star',
    'Pulsar',
    'Magnetar',
    'Black Hole',
    'Red Giant',
    'Cataclysmic',
]

# Normalize effect names to standard format
EFFECT_NORMALIZE = {
    'Wolf-Rayet Star': 'Wolf-Rayet',
    'Pulsar': 'Pulsar',
    'Magnetar': 'Magnetar',
    'Black Hole': 'Black Hole',
    'Red Giant': 'Red Giant',
    'Cataclysmic': 'Cataclysmic Variable',
}


def parse_line(line):
    """Parse one line of the wormhole data file."""
    line = line.strip()
    if not line:
        return None

    # Extract system name (first word)
    parts = line.split()
    name = parts[0]

    # Check for effect
    effect = ''
    remaining = line[len(name):].strip()
    for eff in EFFECTS:
        if remaining.startswith(eff):
            effect = EFFECT_NORMALIZE.get(eff, eff)
            remaining = remaining[len(eff):].strip()
            break

    # Skip "const <X> region <Y>" part
    # Find everything after "region <region_id>"
    region_match = re.search(r'region\s+\S+\s*(.*)', remaining)
    statics_part = region_match.group(1).strip() if region_match else ''

    # Parse statics: groups of "Designation TargetClass Lifetime"
    statics = []
    if statics_part:
        # Pattern: designation (letters+digits), target (C1-C6/high/low/null), time (16h/24h/etc)
        static_pattern = re.findall(r'([A-Z]\d{3})\s+\S+\s+\d+h', statics_part)
        statics = static_pattern

    return {
        'name': name,
        'effect': effect,
        'statics': statics,
    }


def main():
    if not os.path.exists(INPUT_PATH):
        print(f'Input file not found: {INPUT_PATH}')
        print('Run: curl -sL "https://raw.githubusercontent.com/OkYk/eve-bookmarks/master/w-static-effect-life.txt" -o /tmp/wh_statics_raw.txt')
        sys.exit(1)

    systems = {}
    with open(INPUT_PATH, 'r') as f:
        for line in f:
            result = parse_line(line)
            if result:
                systems[result['name']] = {
                    'effect': result['effect'],
                    'statics': result['statics'],
                }

    print(f'Parsed {len(systems)} wormhole systems')

    # Stats
    effect_counts = {}
    for data in systems.values():
        e = data['effect'] or 'None'
        effect_counts[e] = effect_counts.get(e, 0) + 1

    print('\nEffect distribution:')
    for e, cnt in sorted(effect_counts.items(), key=lambda x: -x[1]):
        print(f'  {e}: {cnt}')

    static_counts = {}
    for data in systems.values():
        n = len(data['statics'])
        static_counts[n] = static_counts.get(n, 0) + 1

    print('\nStatics count distribution:')
    for n, cnt in sorted(static_counts.items()):
        print(f'  {n} statics: {cnt} systems')

    # Sample
    print('\nSample entries:')
    for name in ['J105434', 'J110145', 'Thera', 'J100040', 'J100009']:
        if name in systems:
            d = systems[name]
            print(f'  {name}: effect={d["effect"]!r}, statics={d["statics"]}')

    # Save
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(systems, f, ensure_ascii=False, indent=2)

    print(f'\nSaved to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
