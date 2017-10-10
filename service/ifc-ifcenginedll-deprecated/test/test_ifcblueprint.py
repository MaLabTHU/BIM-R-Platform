#!/usr/bin/env python
# -*- coding: utf-8 -*-
from json import loads, dumps
from unittest import TestCase, main

from python_server import app
from service.ifc.ifcutil import Iterator


class IfcBlueprintTestCase(TestCase):
    def setUp(self):
        self.app = app.test_client()

    def tearDown(self):
        pass

    def _parse_json(self, result):
        return loads(result.data.decode())

    def get_json(self, url, data=None):
        result = self.app.get(url, query_string=data)
        return self._parse_json(result)

    def post_json(self, url, data=None):
        result = self.app.post(url, data=data)
        return self._parse_json(result)

    def test_open_and_close(self):
        json1 = self.get_json('/ifc/open', {'path': 'data/no_model.ifc'})
        self.assertIn('error', json1)
        json2 = self.get_json('/ifc/close', {'model_id': 1})
        self.assertIn('error', json2)
        json3 = self.get_json('/ifc/open', {'path': 'data/wall.ifc'})
        # print(json3)
        self.assertIn('model_id', json3)
        json4 = self.get_json('/ifc/close', {'model_id': json3['model_id']})
        self.assertIn('del', json4)

    def test_list(self):
        json1 = self.get_json('/ifc/list')
        self.assertEqual(len(json1), 0)
        json2 = self.get_json('/ifc/open', {'path': 'data/wall.ifc'})
        self.assertIn('model_id', json2)
        json3 = self.get_json('/ifc/list')
        # print(json3)
        self.assertEqual(len(json3), 1)
        json4 = self.get_json('/ifc/close', {'model_id': json2['model_id']})
        self.assertIn('del', json4)
        json5 = self.get_json('/ifc/list')
        self.assertEqual(len(json5), 0)

    def test_hierarchy(self):
        json1 = self.get_json('/ifc/hierarchy', {'model_id': 1})
        self.assertIn('error', json1)
        json2 = self.get_json('/ifc/open', {'path': 'data/wall.ifc'})
        self.assertIn('model_id', json2)
        model_id = json2['model_id']
        json3 = self.get_json('/ifc/hierarchy', {'model_id': model_id})
        # print(json3)
        self.assertIn('globalId', json3)
        self.get_json('/ifc/close_all')

    def test_geometry(self):
        json1 = self.get_json('/ifc/open', {'path': 'data/wall.ifc'})
        self.assertIn('model_id', json1)
        model_id = json1['model_id']
        json2 = self.get_json('/ifc/hierarchy', {'model_id': model_id})
        self.assertIn('globalId', json2)
        json3 = self.get_json('/ifc/geometry', {'model_id': model_id})
        self.assertIn('error', json3)
        json4 = self.get_json('/ifc/geometry', {'id': 0, 'model_id': model_id})
        self.assertIn('error', json4)

        class JsonSearcher(Iterator):
            def __init__(self, case, model_id):
                self.case = case
                self.model_id = model_id

            def for_instance(self, json):
                if json['type'] == 'IfcWall':
                    data = {'id': json['id'], 'model_id': self.model_id}
                    json5 = self.case.get_json('/ifc/geometry', data)
                    # print(json5)
                    self.case.assertIn(str(json['id']), json5)

        JsonSearcher(self, model_id).iter(json2)
        self.get_json('/ifc/close_all')


if __name__ == '__main__':
    main()
