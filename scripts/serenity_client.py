"""Read indexed resources and schema-checked cFSD tables from a Serenity SharedCache."""

import configparser
import csv
import hashlib
import io
import pickle
import struct

U32 = struct.Struct('<I')
U64 = struct.Struct('<Q')


def client_resources(cache, paths):
    """Return the client build and requested resource index rows, keyed by resource URI."""
    client = cache / 'serenity'
    ini = configparser.ConfigParser()
    with (client / 'start.ini').open(encoding='utf-8-sig') as stream:
        ini.read_file(stream)
    if ini['main']['server'].casefold() != 'serenity':
        raise ValueError('Expected a Serenity client')
    wanted = {path.lower() for path in paths}
    resources = {}
    with (client / 'resfileindex.txt').open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.reader(stream):
            if row and row[0].lower() in wanted:
                key = row[0].lower()
                if key in resources:
                    raise ValueError(f'Duplicate resource {key}')
                resources[key] = row
    missing = wanted - resources.keys()
    if missing:
        raise ValueError(f'Missing client resources: {sorted(missing)}')
    return ini['main'].getint('build'), resources


def read_resource(cache, resource):
    name, path, digest, size, _ = resource
    data = (cache / 'ResFiles' / path).read_bytes()
    if len(data) != int(size) or hashlib.md5(data).hexdigest() != digest:
        raise ValueError(f'{name} does not match this client resource index')
    return data


def array(data, pointer, stride):
    # cFSD offsets are relative to byte 24, and each array begins with its length.
    start = 24 + U64.unpack_from(data, pointer)[0]
    count = U64.unpack_from(data, start)[0]
    end = start + 8 + count * stride
    if end > len(data):
        raise ValueError(f'Array at {pointer} extends beyond the cFSD payload')
    return range(start + 8, end, stride)


def read_table(cache, resource, name, schema, stride):
    """Check a native loader's schema fingerprint and index records by primary key."""
    data = read_resource(cache, resource)
    if data[:16].hex() != schema or U64.unpack_from(data, 24)[0] != len(data) - 32:
        raise ValueError(f'Unsupported {name} schema or payload size')
    root = 16 + U64.unpack_from(data, 32)[0]
    row_count, bucket_count = struct.unpack_from('<QQ', data, root)
    if not bucket_count or root + 16 + bucket_count * 8 > len(data):
        raise ValueError(f'Invalid {name} bucket directory')
    records = {}
    for bucket in range(bucket_count):
        for pos in array(data, root + 16 + bucket * 8, stride):
            key = U32.unpack_from(data, pos)[0]
            if key in records or key % bucket_count != bucket:
                raise ValueError(f'Invalid or duplicate {name} ID {key}')
            records[key] = pos
    if len(records) != row_count:
        raise ValueError(f'Incorrect {name} row count')
    return data, records


class LocalizationReader(pickle.Unpickler):
    # The localization bundle contains only built-in scalar/container values.
    def find_class(self, module, name):
        raise pickle.UnpicklingError(f'Unexpected class in localization data: {module}.{name}')


def localization(cache, resource, name_ids):
    contents = read_resource(cache, resource)
    messages = LocalizationReader(io.BytesIO(contents), encoding='bytes').load()[1]
    return {name_id: messages[name_id][0].strip() for name_id in name_ids}
