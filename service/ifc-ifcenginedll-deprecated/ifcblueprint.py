#!/usr/bin/env python
# -*- coding: utf-8 -*-
from functools import wraps
from os.path import abspath

from flask import Blueprint, jsonify, request

from service.ifc.ifcmodel import IfcModel
from service.ifc.ifcschema import IfcSchema
from service.ifc.ifcutil import hierarchy

ifc = Blueprint('ifc', __name__)
models = {}


@ifc.route('/open')  # put
def ifc_open():
    path = request.args.get('path')
    if path:
        path = abspath(path)
        model = IfcModel(IfcSchema.init('data'))
        if model.open(path):
            model_id = str(id(model))
            models[model_id] = model
            return jsonify({'path': path, 'model_id': model_id})
        return jsonify({'error': 'path %s not opened' % path}), 403
    return jsonify({'error': 'missing path'}), 403


def check_model_id(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        model_id = request.values.get('model_id')
        if model_id:
            if model_id in models:
                return f(model_id, *args, **kwargs)
            return jsonify({'error': 'model %s not found' % model_id}), 403
        return jsonify({'error': 'missing model_id'}), 403

    return decorated


@ifc.route('/close')  # delete
@check_model_id
def ifc_close(model_id):
    models[model_id].close()
    del models[model_id]
    return jsonify({'del': model_id})


@ifc.route('/close_all')  # for test only
def ifc_close_all():
    ids = list(models.keys())
    for model in models.values():
        model.close()
    for i in ids:
        del models[i]
    return jsonify({'del': ids})


@ifc.route('/list')  # get without id
def ifc_list():
    data = {}
    for k, v in models.items():
        data[k] = str(v)
    return jsonify(data)


@ifc.route('/hierarchy')  # get with id
@check_model_id
def ifc_hierarchy(model_id):
    return jsonify(hierarchy(models[model_id].project))


def check_instance_ids(f):
    @wraps(f)
    def decorated(model_id, *args, **kwargs):
        model = models[model_id]
        instance_ids = request.values.get('ids', [])  # fixme
        instance_id = request.values.get('id')
        if instance_id:
            instance_ids.append(instance_id)
        ids = []
        for i in instance_ids:
            if int(i) not in model.objects:
                return jsonify({'error': 'instance %s not found' % i}), 403
            ids.append(int(i))
        if ids:
            return f(model_id, ids, *args, **kwargs)
        return jsonify({'error': 'missing id(s)'}), 403

    return decorated


@ifc.route('/geometry', methods=['GET', 'POST'])
@check_model_id
@check_instance_ids
def ifc_geometry(model_id, ids):
    model = models[model_id]
    data = {}
    for i in ids:
        data[i] = model.objects[i].tri
    return jsonify(data)


@ifc.route('/material')
def ifc_material():
    raise NotImplementedError


@ifc.route('/property')
def ifc_property():
    raise NotImplementedError


@ifc.route('/estimate')
def ifc_estimate():
    raise NotImplementedError


@ifc.route('/quantity')
def ifc_quantity():
    raise NotImplementedError
