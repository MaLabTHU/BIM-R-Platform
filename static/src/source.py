#!/usr/bin/env python
# -*- coding: utf-8 -*-
def _chdir():
    from os import chdir
    from os.path import abspath, dirname
    from sys import argv
    chdir(dirname(abspath(argv[0])))
def main():
    _chdir()
    from os import walk
    from os.path import join
    i = 0
    with open('out.test.txt', 'w', encoding='utf-8') as out:
        for r, ds, fs in walk('.'):
            for f in fs:
                print(r, f)
                if r.count('\\')>1 or f.endswith('.png'):
                    continue
                i+=1
                if i>30:
                    return
                out.write(f)
                out.write('\n'+'-'*64+'\n')
                out.write(open(join(r, f), encoding='utf-8').read())
                out.write('\n'+'-'*64+'\n'*4)
    
if __name__ == '__main__':
    main()