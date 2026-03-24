#!/usr/bin/env python3
"""
Scrape wormhole system data (class, effect) from Ellatha.com
and statics data from Anoik.is, then output a JSON file.

Usage:
    python3 scripts/scrape_wormhole_data.py

Output:
    sde_data/wormhole_systems.json
"""
import json
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, 'sde_data', 'wormhole_systems.json')

ELLATHA_URL = 'https://www.ellatha.com/eve/WormholeSystemview.asp?Sort=0&Start={start}'


class EllathaTableParser(HTMLParser):
    """Parse Ellatha wormhole system list HTML table."""

    def __init__(self):
        super().__init__()
        self.systems = []
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.current_data = ''
        self.table_count = 0
        self.row_count = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.table_count += 1
        # The data table has sortable columns
        if tag == 'tr':
            self.in_row = True
            self.current_row = []
        if tag == 'td' and self.in_row:
            self.in_cell = True
            self.current_data = ''

    def handle_endtag(self, tag):
        if tag == 'td' and self.in_cell:
            self.in_cell = False
            self.current_row.append(self.current_data.strip())
        if tag == 'tr' and self.in_row:
            self.in_row = False
            if len(self.current_row) == 3:
                name, cls_str, effect = self.current_row
                # Validate it's a J-system or named WH system
                if re.match(r'^[A-Z]', name) and cls_str.isdigit():
                    self.systems.append({
                        'name': name,
                        'class': int(cls_str),
                        'effect': effect if effect and effect != '\xa0' else '',
                    })

    def handle_data(self, data):
        if self.in_cell:
            self.current_data += data


def fetch_ellatha_page(start):
    """Fetch one page of Ellatha wormhole system list."""
    url = ELLATHA_URL.format(start=start)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'EVETools-WormholeScraper/1.0 (educational use)',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')


def scrape_ellatha():
    """Scrape all wormhole systems from Ellatha (class + effect)."""
    all_systems = {}
    page = 0
    per_page = 20

    while True:
        start = page * per_page + 1
        print(f'  Fetching Ellatha page {page + 1} (start={start})...')

        try:
            html = fetch_ellatha_page(start)
        except Exception as e:
            print(f'  Error fetching page {page + 1}: {e}')
            break

        parser = EllathaTableParser()
        parser.feed(html)

        if not parser.systems:
            print(f'  No systems found on page {page + 1}, stopping.')
            break

        for sys_data in parser.systems:
            name = sys_data['name']
            all_systems[name] = {
                'class': sys_data['class'],
                'effect': sys_data['effect'],
            }

        print(f'  Got {len(parser.systems)} systems (total: {len(all_systems)})')

        if len(parser.systems) < per_page:
            break

        page += 1
        time.sleep(0.5)  # Be polite

    return all_systems


def main():
    print('=== Scraping wormhole system data from Ellatha ===')
    systems = scrape_ellatha()
    print(f'\nTotal systems scraped: {len(systems)}')

    # Effect stats
    effects = {}
    for data in systems.values():
        e = data['effect'] or 'None'
        effects[e] = effects.get(e, 0) + 1
    print('\nEffect distribution:')
    for e, cnt in sorted(effects.items(), key=lambda x: -x[1]):
        print(f'  {e}: {cnt}')

    # Class stats
    classes = {}
    for data in systems.values():
        c = data['class']
        classes[c] = classes.get(c, 0) + 1
    print('\nClass distribution:')
    for c, cnt in sorted(classes.items()):
        print(f'  C{c}: {cnt}')

    # Load existing region-class mapping to get system IDs
    # We need to map system names to IDs using the database
    # For now, output by name and let the import command handle the mapping
    output = {}
    for name, data in sorted(systems.items()):
        output[name] = {
            'class': data['class'],
            'effect': data['effect'],
            'statics': [],  # Will be populated later if statics data is available
        }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'\nSaved to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
