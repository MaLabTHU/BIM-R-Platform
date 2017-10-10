#!/usr/bin/env python
# -*- coding: utf-8 -*-
from os.path import join


def init_schema(schema_dir=''):
    return {
        'ifc4': IfcSchema('ifc4', join(schema_dir, 'ifc4.exp'), ['ifc2x4']),
        'ifc2x3': IfcSchema('ifc2x3', join(schema_dir, 'ifc2x3_tc1.exp'),
                            ['ifc2x3', 'ifc2x2', 'ifc2x_', 'ifc20'])
    }


class IfcSchema:
    def __init__(self, version, path, tags):
        self.version = version
        self.path = path
        self.tags = tags
        self.types = {}
        self.enums = {}
        self.hierarchy = {}
        self.definition = {}

    @staticmethod
    def init(schema_dir=''):
        return init_schema(schema_dir)

    def parse(self):
        with open(self.path) as f:
            name = None
            enum = None
            is_root = False
            attrs = {}
            types = {}
            for line in f:
                line = line[:-1].strip('; \t')
                if line.startswith('TYPE '):
                    elements = line[5:].split()
                    real_type = elements[2].split('(')[0]
                    types[elements[0]] = real_type
                    if real_type == 'ENUMERATION':
                        enum = elements[0]
                        self.enums[enum] = []
                elif line.startswith('END_TYPE'):
                    enum = None
                elif line.startswith('ENTITY '):
                    name = line[7:]
                    is_root = True
                    attrs = {}
                    self.definition[name] = attrs
                elif line.startswith('END_ENTITY'):
                    if is_root:
                        self.hierarchy[name] = 'IfcRoot'
                    name = None
                elif enum:
                    self.enums[enum].append(line.strip('(),'))
                elif name:
                    if line.startswith('SUBTYPE OF ('):
                        is_root = False
                        self.hierarchy[name] = line[12:-1]
                    elif line in ['WHERE', 'UNIQUE']:
                        attrs = None
                    elif attrs is not None:
                        if ':' in line:
                            elements = line.split()
                            if elements[2] == 'OPTIONAL':
                                del elements[2]
                            if elements[2] in ['SET', 'LIST', 'ARRAY']:
                                attrs[elements[0]] = [elements[5]]
                            else:
                                attrs[elements[0]] = elements[2]
            self.hierarchy['IfcRoot'] = None
            for key, key_type in types.items():
                real_type = key_type
                while real_type:
                    key_type = real_type
                    real_type = types.get(key_type)
                self.types[key] = key_type
        return self

    def spell(self, type_name):
        if not type_name:
            return None
        if type_name in self.hierarchy:
            return type_name
        for name in self.hierarchy.keys():
            if name.lower() == type_name.lower():
                return name
        return None

    def _cast(self, sub_type, super_type):
        if not sub_type:
            return False
        if sub_type == super_type:
            return True
        return self._cast(self.hierarchy.get(sub_type), super_type)

    def cast(self, sub_type, super_type):
        return self._cast(sub_type, super_type)

    def _attrs(self, type_name):
        attrs = {}
        while type_name:
            attrs.update(self.definition.get(type_name, {}))
            type_name = self.hierarchy.get(type_name)
        return attrs

    def attrs(self, type_name, inherit=True):
        if inherit:
            return self._attrs(type_name)
        return self.definition.get(type_name)


def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))


def main():
    _chdir()

    for schema in init_schema('test').values():
        schema.parse()
        print(schema.version, len(schema.hierarchy))


if __name__ == '__main__':
    main()
