"""Decode acceleration-gate restrictions from the Serenity client tables."""

import struct

from serenity_client import U32, array, client_resources, read_table

# Schema fingerprints embedded in Serenity's native cFSD loaders. A different
# schema needs a layout review before reading records using these field offsets.
LAYOUTS = {
    'dungeons': ('6a6b5b71d5e78cfd3c61f952ffa1c58d', 80),
    'typelist': ('72f87d9a7bdaad1533852559a2afcc02', 88),
    'types': ('4f25d0f64115864bd8c4f58da09c1758', 152),
    'groups': ('122e735a97700cf0466ace3d16063643', 32),
}


def colossus_lists(tables):
    group_id = 4622
    groups, group_records = tables['groups']
    category = U32.unpack_from(groups, group_records[group_id] + 4)[0]
    types, type_records = tables['types']
    hulls = {key for key, pos in type_records.items()
             if U32.unpack_from(types, pos + 84)[0] == group_id}
    if category != 6 or not hulls:
        raise ValueError('Expected ships in the Serenity Colossus group')

    data, records = tables['typelist']
    result = {}
    for key, pos in records.items():
        # CCP typeList precedence: type overrides group, group overrides category,
        # and exclusions win ties at each level.
        def ids(offset):
            return {U32.unpack_from(data, p)[0] for p in array(data, pos + offset, 4)}

        include_group = category in ids(40) and category not in ids(16)
        include_group = (include_group or group_id in ids(48)) and group_id not in ids(24)
        included = hulls.copy() if include_group else set()
        included.update(hulls & ids(56))
        included.difference_update(ids(32))
        if included == hulls:
            result[key] = 'allowedLists'
        elif included:
            result[key] = 'mixedLists'
        else:
            result[key] = 'blockedLists'
    return result


def site_access(ids, dungeons, allowed):
    data, records = dungeons
    if not isinstance(ids, list) or not ids or any(type(i) is not int or i <= 0 for i in ids):
        raise ValueError(f'Invalid dungeonIDs: {ids}')
    if len(set(ids)) != len(ids):
        raise ValueError(f'Duplicate dungeonIDs: {ids}')
    site = {'dungeonIDs': sorted(ids)}
    lists = {}
    for dungeon_id in ids:
        if dungeon_id not in records:
            raise ValueError(f'Client has no dungeon with ID {dungeon_id}')
        gates = array(data, records[dungeon_id] + 8, 24)
        if not gates:
            site['direct'] = True
        for gate in gates:
            list_id, excluded_fittings = struct.unpack_from('<II', data, gate + 8)
            if excluded_fittings or array(data, gate, 4):
                site['conditional'] = True
            if not list_id:
                site['unlisted'] = True
            else:
                key = allowed.get(list_id, 'unknownLists')
                lists.setdefault(key, set()).add(list_id)
    site.update((key, sorted(values)) for key, values in lists.items() if values)
    return site


def gate_tables(cache, additional=None):
    layouts = {**LAYOUTS, **(additional or {})}
    paths = {name: f'res:/staticdata/{name}.fsdbinary' for name in layouts}
    build, resources = client_resources(cache, paths.values())
    return build, {name: read_table(cache, resources[paths[name]], name, *layout)
                   for name, layout in layouts.items()}
