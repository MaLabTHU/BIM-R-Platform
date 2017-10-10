#!/usr/bin/env python
# -*- coding: utf-8 -*-
from service.ifc.ifcschema import IfcSchema
from service.ifc.pyifcengine import ifc

__ATTR__ = {
    'NUMBER': ifc.getAttrBNAsInteger,
    'INTEGER': ifc.getAttrBNAsInteger,
    'REAL': ifc.getAttrBNAsDouble,
    'FLOAT': ifc.getAttrBNAsDouble,
    'DOUBLE': ifc.getAttrBNAsDouble,
    'STRING': ifc.getAttrBNAsUnicode
}
__ATTRS__ = {
    'NUMBER': ifc.getAggrElementAsInteger,
    'INTEGER': ifc.getAggrElementAsInteger,
    'REAL': ifc.getAggrElementAsDouble,
    'FLOAT': ifc.getAggrElementAsDouble,
    'DOUBLE': ifc.getAggrElementAsDouble,
    'STRING': ifc.getAggrElementAsUnicode
}
__EXTRACTOR_CLASSES__ = []


def _instances(model, instances):
    if instances:
        for i in range(ifc.getMemberCount(instances)):
            yield _IfcObject(model, ifc.getAggrElementAsInstance(instances, i))
    return []


class _IfcObject:
    def __new__(cls, model, instance):
        self = model.objects.get(instance)
        if not self:
            self = super(_IfcObject, cls).__new__(cls)
        return self

    def __init__(self, model, instance):
        if not hasattr(self, 'model'):
            self.model = model
            model.objects[instance] = self
            self._instance = instance
            self._tri = None

    @property
    def type(self):
        return ifc.getInstanceClassInfo(self._instance)

    @property
    def global_id(self):
        return self.attr('globalId')

    @property
    def local_id(self):
        return ifc.getInstanceLocalId(self._instance)

    @property
    def id(self):
        return self._instance

    @property
    def name(self):
        return self.attr('name')

    @property
    def description(self):
        return self.attr('description')

    @property
    def tri(self):
        if not self._tri:
            self._tri = self.model.tri(self._instance)
        return self._tri

    def __str__(self):
        return '{type}({id}, {line}, {name}, {description})'.format(
            type=self.type,
            id=self.global_id,
            line=self.local_id,
            name=self.name,
            description=self.description)

    @property
    def schema(self):
        return self.model.schema

    def instance_of(self, super_type):
        return self.schema.cast(self.type, super_type)

    def attr(self, attr_name, attr_type='STRING'):
        attr_func = __ATTR__.get(attr_type, ifc.getAttrBNAsUnicode)
        return attr_func(self._instance, attr_name)

    def attrs(self, attrs_name, attrs_type='STRING'):
        func = __ATTRS__.get(attrs_type, ifc.getAggrElementAsUnicode)
        attrs = ifc.getAttrBNAsAggr(self._instance, attrs_name)
        if attrs:
            return [func(attrs, i) for i in range(ifc.getMemberCount(attrs))]
        return []

    def instance(self, instance_name):
        instance = ifc.getAttrBNAsInstance(self._instance, instance_name)
        if instance:
            return _IfcObject(self.model, instance)

    def instances(self, instances_name):
        instances = ifc.getAttrBNAsAggr(self._instance, instances_name)
        return _instances(self.model, instances)

    @property
    def dict(self):
        items = {}
        for key, key_type in self.schema.attrs(self.type).items():
            if isinstance(key_type, list):
                key_type = self.schema.types.get(key_type[0], key_type[0])
                if key_type in self.schema.hierarchy or key_type == 'SELECT':
                    items[key] = self.instances(key)
                else:
                    items[key] = self.attrs(key, key_type)
            else:
                key_type = self.schema.types.get(key_type, key_type)
                if key_type in self.schema.hierarchy or key_type == 'SELECT':
                    items[key] = self.instance(key)
                else:
                    items[key] = self.attr(key, key_type)
        return items


class IfcModel:
    def __init__(self, schemas=None):
        self.schemas = schemas
        if not self.schemas:
            self.schemas = IfcSchema.init()
        self._model = 0
        self.schema = None
        self.path = None
        self.objects = {}

    def open(self, path):
        for schema in self.schemas.values():
            model = ifc.openModelBN(path, schema.path)
            if model:
                # tag = ifc.getSPFFHeaderItemAsString(model, 9, 0)
                tag = ifc.getSPFFHeaderItemAsUnicode(model, 9, 0)
                if tag and tag.lower() in schema.tags:
                    self.close()
                    self._model = model
                    if not schema.hierarchy:
                        schema.parse()
                    self.schema = schema
                    self.path = path
                    return True
        return False

    def close(self):
        if self.valid:
            ifc.closeModel(self._model)
        self._model = 0
        self.schema = None
        self.path = None
        self.objects = {}

    @property
    def valid(self):
        return self._model > 0

    @property
    def name(self):
        return ifc.getSPFFHeaderItemAsUnicode(self._model, 2, 0)

    def instances(self, instances_name):
        instances = ifc.getEntityExtentBN(self._model, instances_name)
        return _instances(self, instances)

    def tri(self, _instance):
        geo = ifc.getGeo(self._model, _instance)
        indices = list(range(geo.primitiveCount * 3))
        positions = []
        normals = []
        for i in indices:
            index = ifc.getGeoIndicesInt(geo, i) * 6
            for j in range(3):
                positions.append(ifc.getGeoVerticesFloat(geo, index + j))
                normals.append(ifc.getGeoVerticesFloat(geo, index + j + 3))
        ifc.delGeo(geo)
        return {'positions': positions, 'indices': indices, 'normals': normals}

    @property
    def project(self):
        return list(self.instances('IfcProject'))[0]

    def __str__(self):
        return '%s@%s' % (self.name, self.path)


class IfcAttributeExtractor:
    def extract(self, instance, prefix, attributes):
        raise NotImplementedError


def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))


def main():
    _chdir()

    from types import GeneratorType
    model = IfcModel(IfcSchema.init('test'))
    model.open('test/wall.ifc')
    print(model.name)
    print(model.schema.version)
    for wall in model.instances('IfcWall'):
        print(wall.tri)
        for p, v in wall.dict.items():
            print(p)
            if isinstance(v, GeneratorType):
                for i in v:
                    print('\t-', i)
            else:
                print('\t', v)


if __name__ == '__main__':
    main()
