#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import glob
import hashlib

def gethash(local):
    if os.path.exists(local):
        fd = open(local, 'r')
        txt = fd.read()
        fd.close()
        return hashlib.md5(txt).hexdigest()
    return ''

def main():

    files = glob.glob("*.js") + glob.glob("*.css")

    for html in glob.glob("*.html"):
        for f in files:
            ver = gethash(f)
            os.system('sed -i -r \'s/%s([^"]*)/%s\?v=%s/g\' %s' %(f, f, ver, html))

    return

if __name__ == '__main__':
    main()
