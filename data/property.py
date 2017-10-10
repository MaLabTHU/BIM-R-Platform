#!/usr/bin/env python
# -*- coding: utf-8 -*-
from ifcmodel import IfcAttributeExtractor, __EXTRACTOR_CLASSES__

__author__ = 'Luciferz2012'


class IfcPropertyExtractor(IfcAttributeExtractor):
    def extract(self, instance, prefix, attributes):
        attrs = {}
        if instance.type == 'IfcPropertySingleValue':
            # name = '#{name}({unit}'.format(name=instance.name, unit=instance.attr('Unit'))
            name = '#{name}'.format(name=instance.name)
            assert name not in attrs
            attrs[name] = instance.attr('NominalValue')
        return attrs


__EXTRACTOR_CLASSES__.append(IfcPropertyExtractor)
