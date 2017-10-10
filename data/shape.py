#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re

from ifcmodel import IfcAttributeExtractor, __EXTRACTOR_CLASSES__

__author__ = 'Luciferz2012'


class IfcShapeExtractor(IfcAttributeExtractor):
    __CROSS_SHAPE = re.compile('\.Representation\.Representations\[[0-9]*].Items\[[0-9]*]\.SweptArea')
    __AXIS_SHAPE = re.compile('\.Representation\.Representations\[[0-9]*].Items\[[0-9]*]')

    def extract(self, instance, prefix, attributes):
        attrs = {}
        if self.__CROSS_SHAPE.match(prefix):
            for super_type, cross_shape in {
                'IfcAsymmetricIShapeProfileDef': 'I-shape',
                'IfcCShapeProfileDef': 'C-shape',
                'IfcCircleProfileDef': 'Circle',
                'IfcEllipseProfileDef': 'Ellipse',
                'IfcIShapeProfileDef': 'I-shape',
                'IfcLShapeProfileDef': 'L-shape',
                'IfcRectangleProfileDef': 'Rectangle',
                'IfcTrapeziumProfileDef': 'Trapezium',
                'IfcTShapeProfileDef': 'T-shape',
                'IfcUShapeProfileDef': 'U-shape',
                'IfcZShapeProfileDef': 'Z-shape'
            }.items():
                if instance.instance_of(super_type):
                    assert ':CrossShape' not in attrs
                    attrs[':CrossShape'] = cross_shape
        if self.__AXIS_SHAPE.match(prefix):
            for super_type, axis_shape in {
                'IfcBSplineCurve': 'Curve',
                'IfcCompositeCurve': 'Curve',
                'IfcIndexedPolyCurve': 'Curve',
                'IfcPolyline': 'Line',
                'IfcTrimmedCurve': 'Curve',
                'IfcCircle': 'Circle',
                'IfcEllipse': 'Ellipse',
                'IfcLine': 'Line'
            }.items():
                if instance.instance_of(super_type):
                    assert ':AxisShape' not in attrs
                    attrs[':AxisShape'] = axis_shape
        return attrs


__EXTRACTOR_CLASSES__.append(IfcShapeExtractor)
