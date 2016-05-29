#!/usr/bin/python3

import os
import sys
import json
import requests

REGISTRY = 'http://' + os.environ['COUCH_HOST'] + ':5984/'


def delete_document(db, name):
    print("Deleting %s from %s" % (name, db,))
    url = REGISTRY + db

    # Get the latest revision
    res = requests.get(url + '/' + name)
    doc = json.loads(res.text)

    if '_rev' not in doc:
        print(doc)
        sys.exit(1)

    rev = doc['_rev']

    # Delete the document
    res = requests.delete(url + '/' + name, params={'rev': rev})
    print(json.loads(res.text))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Not enough arguments: database document.")
        sys.exit(1)

    database = sys.argv[1]
    document = sys.argv[2]

    delete_document(database, document)
