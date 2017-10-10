#!/usr/bin/env python
# -*- coding: utf-8 -*-
from ifcmodel import IfcAttributeExtractor, __EXTRACTOR_CLASSES__

__author__ = 'Luciferz2012'


class IfcMaterialExtractor(IfcAttributeExtractor):
    def __init__(self):
        self.materials = []

    def extract(self, instance, prefix, attributes):
        attrs = {':Materials': self.materials}
        if instance.type == 'IfcMaterial':
            self.materials.append(instance.name)
        elif instance.type == 'IfcPropertySingleValue' and instance.name == 'Structural Material':
            attrs[':StructuralMaterial'] = instance.attr('NominalValue')
        return attrs


__EXTRACTOR_CLASSES__.append(IfcMaterialExtractor)
