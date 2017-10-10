#!/usr/bin/env python
# -*- coding: utf-8 -*-
from os import listdir
from os.path import abspath, isfile, join
from sys import argv


def main(env_path):
    target_path = abspath(env_path).lower()
    if ' ' in target_path:
        target_path = '"%s"' % target_path
    target = b'#!%s\\python.exe' % target_path.encode()
    print('searching:', target.decode())
    for item in listdir(env_path):
        path = join(env_path, item)
        if isfile(path) and path.endswith('.exe'):
            print('in:', path)
            with open(path, 'rb') as infile:
                content = infile.read()
                infile.close()
                if content.find(target) != -1:
                    print('found:', path)
                    content = content.replace(target, b'#!python.exe')
                    with open(path, 'wb') as outfile:
                        outfile.write(content)


if __name__ == '__main__':
    if len(argv) > 1:
        main(argv[1])
    else:
        print('Error: require env_path')
