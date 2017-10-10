#!/usr/bin/env python
# -*- coding: utf-8 -*-
def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))


def main():
    _chdir()

    from ifc import openModelBN, closeModel, getSPFFHeaderItemAsUnicode
    model = openModelBN("test.ifc", "test.exp")
    print(model)
    print(getSPFFHeaderItemAsUnicode(model, 9, 0))
    closeModel(model)


if __name__ == '__main__':
    main()