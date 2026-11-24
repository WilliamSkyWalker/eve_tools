#!/usr/bin/env python3
"""Refresh the checked-in complex access data from an installed Serenity SharedCache.

Run: python3 scripts/export-serenity-complex-access.py /path/to/SharedCache
The existing site's dungeonIDs identify all matched stages and variants. Add new
title mappings there before refreshing. Read-only access to the client suffices.
"""
import argparse
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from serenity_gate_access import colossus_lists, gate_tables, site_access

OUTPUT = Path(__file__).parent / 'data' / 'serenity-complex-access.json'


def export(cache, existing):
    build, tables = gate_tables(cache)
    allowed = colossus_lists(tables)
    sites = {}
    for title, previous in sorted(existing['sites'].items()):
        sites[title] = site_access(previous['dungeonIDs'], tables['dungeons'], allowed)
    if not sites:
        raise ValueError('Empty site mapping')
    return build, sites


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('shared_cache', type=Path)
    parser.add_argument('--mapping', type=Path, default=OUTPUT)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    with args.mapping.open(encoding='utf-8') as stream:
        build, sites = export(args.shared_cache, json.load(stream))
    lines = [f'    {json.dumps(title)}: {json.dumps(site, separators=(",", ":"))}'
             for title, site in sites.items()]
    result = '{\n  "build": %d,\n  "sites": {\n%s\n  }\n}\n' % (build, ',\n'.join(lines))
    with NamedTemporaryFile(mode='w', dir=args.output.parent, encoding='utf-8',
                           delete=False) as tmp:
        tmp.write(result)
    Path(tmp.name).replace(args.output)
    print(f'Exported {len(sites)} sites from Serenity build {build}')


if __name__ == '__main__':
    main()
