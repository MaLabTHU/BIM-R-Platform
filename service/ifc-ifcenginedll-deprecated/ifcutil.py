#!/usr/bin/env python
# -*- coding: utf-8 -*-
def relations(instance, rel, attr):
    for r in instance.instances(rel):
        for i in r.instances(attr):
            yield i


def info(instance):
    return {'id': instance.id,
            'globalId': instance.global_id,
            'type': instance.type,
            'name': instance.name}


def hierarchy(instance):
    json = info(instance)
    temp = []
    for i in relations(instance, 'isDecomposedBy', 'relatedObjects'):
        temp.append(hierarchy(i))
    if temp:
        json['isDecomposedBy'] = temp
    temp = []
    for i in relations(instance, 'containsElements', 'relatedElements'):
        temp.append(hierarchy(i))
    if temp:
        json['contains'] = temp
    return json


class Iterator:
    def for_instance(self, json):
        raise NotImplementedError

    def iter(self, json):
        if 'isDecomposedBy' in json:
            for i in json['isDecomposedBy']:
                self.iter(i)
        if 'contains' in json:
            for i in json['contains']:
                self.iter(i)
        self.for_instance(json)


def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))


def main():
    _chdir()

    from service.ifc.ifcmodel import IfcModel
    from service.ifc.ifcschema import IfcSchema
    from json import dumps
    model = IfcModel(IfcSchema.init('test'))
    model.open('test/house.ifc')
    json = hierarchy(model.project)
    print(dumps(json, ensure_ascii=False, sort_keys=True, indent=2))

    class JsonSearcher(Iterator):
        def for_instance(self, json):
            if json['type'] == 'IfcWall':
                print(json)

    JsonSearcher().iter(json)


if __name__ == '__main__':
    main()
