#!/usr/bin/env python
# -*- coding: utf-8 -*-
from flask import Flask, redirect

# from service.ifc.ifcblueprint import ifc

app = Flask(__name__)
# app.register_blueprint(ifc, url_prefix='/ifc')


@app.route('/')
def default():
    return redirect('/static/index.html')


def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))


def main():
    _chdir()

    app.run(host='localhost')


if __name__ == '__main__':
    main()
