#!/usr/bin/python3

""" Copy data from CouchDB databases into Titan through RabbitMQ. """

import os
import json
import math

import pika
import requests
import pytz
import datetime
import dateutil.parser as iso_parser

from tqdm import tqdm

ENV = [
    'COUCH_HOST',
    'RABBIT_HOST',
    'RABBIT_USER',
    'RABBIT_PASS'
]

COUCHDB = ''
PROPERTIES = pika.BasicProperties(delivery_mode=2,)
DBs = {}


def handle_undefined(variable):
    print('Define', variable)
    exit(1)


def setup_environment():
    global COUCHDB
    global DBs

    for var in ENV:
        if os.environ[var] == '':
            handle_undefined(var)

    COUCHDB = 'http://' + os.environ['COUCH_HOST'] + ':5984'

    DBs['registry'] = COUCHDB + '/registry'
    DBs['escomplex'] = COUCHDB + '/escomplex'
    DBs['eslint'] = COUCHDB + '/eslint'


def is_active(doc):
    try:
        last_update = iso_parser.parse(doc['time']['modified'])
    except KeyError as e:
        print(doc['name'], 'is missing property', e)
        return False

    now = datetime.datetime.now(pytz.utc)
    diff = now - last_update

    return diff.days <= 365


def extract_latest_doc(doc):
    latest = doc['dist-tags']['latest']
    latest_doc = doc['versions'][latest]

    if 'readme' in doc:
        latest_doc['readme'] = doc['readme']

    return latest_doc


def get_splits(db):
    response = requests.get(DBs[db])
    info = json.loads(response.text)
    return math.ceil(info['doc_count']/1000)


def get_package(name):
    doc = json.loads(requests.get(DBs['registry'] + '/' + name).text)

    if 'name' not in doc:
        print(doc['_id'], 'is missing property name.')
        return False

    if not is_active(doc):
        return False

    if 'dist-tags' in doc and 'latest' in doc['dist-tags']:
        latest = doc['dist-tags']['latest']

        if latest not in doc['versions']:
            print(name, 'is missing the latest version [%s]' % latest)
            return False

        latestVersion = doc['versions'][latest]

        if 'time' in doc:
            latestVersion['time'] = doc['time']

        if 'readme' not in latestVersion and 'readme' in doc:
            latestVersion['readme'] = doc['readme']

        return json.dumps(latestVersion)

    print(name, 'is missing dist tags')
    return False


def load_packages(channel, db, limit=1000):
    times = get_splits(db)

    print(':: Saving', db, 'data.')

    step = 0
    for time in tqdm(range(times)):
        options = {'limit': limit, 'skip': step}
        res = requests.get(DBs[db] + '/_all_docs', params=options)
        data = json.loads(res.text)

        for row in data['rows']:
            name = row['id']
            channel.basic_publish(exchange='', routing_key='graph_update',
                                  body=json.dumps({'name': name, 'type': db}),
                                  properties=PROPERTIES)
        step += limit


def populate_graphdb(channel, limit=1000):
    times = get_splits('registry')

    print('Populating dependency graph')

    step = 0
    for time in tqdm(range(times)):
        options = {'limit': limit, 'skip': step}
        res = requests.get(DBs['registry'] + '/_all_docs', params=options)
        data = json.loads(res.text)
        for row in data['rows']:
            name = row['id']
            doc = get_package(name)
            if not doc:
                continue
            channel.basic_publish(exchange='', routing_key='graph', body=doc,
                                  properties=PROPERTIES)
        step += limit


if __name__ == '__main__':
    setup_environment()

    credentials = pika.PlainCredentials(os.environ['RABBIT_USER'],
                                        os.environ['RABBIT_PASS'])
    conn = pika.BlockingConnection(
        pika.ConnectionParameters(os.environ['RABBIT_HOST'],
                                  credentials=credentials))

    channel = conn.channel()
    channel.queue_declare(queue='graph', durable=True)
    channel.queue_declare(queue='graph_update', durable=True)

    populate_graphdb(channel)
    # load_packages(channel, 'escomplex')
    # load_packages(channel, 'eslint')
