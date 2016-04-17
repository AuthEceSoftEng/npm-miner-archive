#!/usr/bin/env python3

import os
import datetime
import json

import pika
import requests
import pytz
import dateutil.parser as iso_parser

# 2014/9/1
START_DAY = 1435698000000
QUEUE = 'graph'

COUCHDB = 'http://' + os.environ['COUCH_HOST'] + ':5984'
RABBITMQ = os.environ['RABBIT_HOST']


def get_total_docs():
    res = requests.get(REG)
    data = json.loads(res.text)

    return data['doc_count']


def is_active(name):
    """ Check if a package is in active development. """

    res = requests.get(REG + name)
    package = json.loads(res.text)

    try:
        last_update = iso_parser.parse(package['time']['modified'])
    except KeyError as e:
        print('Missing property %s', e)
        return False

    now = datetime.datetime.now(pytz.utc)

    diff = now - last_update

    if diff.days <= 365:
        # print('Last update was %s days ago' % diff.days)
        return True

    return False


def extract_latest_doc(doc):
    latest = doc['dist-tags']['latest']

    latest_doc = doc['versions'][latest]

    if 'readme' in doc:
        latest_doc['readme'] = doc['readme']

    return latest_doc


def push_to_queue(channel, doc):
    msg = json.dumps(doc)

    channel.basic_publish(exchange='', routing_key=QUEUE, body=msg,
                          properties=pika.BasicProperties(delivery_mode=2,))


def fetch_docs(channel, limit=1000, times=1):
    step = 0
    count = 0
    total = 0

    for i in range(times):
        print('::Iteration %s' % i)
        options = {
                'startkey': START_DAY,
                'limit': limit,
                'skip': step,
                'stale': 'update_after'
                }
        res = requests.get(COUCHDB + '/registry/_design/app/_view/modified', params=options)
        data = json.loads(res.text)

        for row in data['rows']:
            doc = extract_latest_doc(row['value'])
            push_to_queue(channel, doc)
            channel.basic_publish(exchange='', routing_key='static_analysis',
                                  body=json.dumps({'name': row['value']['_id']}),
                                  properties=pika.BasicProperties(delivery_mode=2,))

        step += limit

    return count



if __name__ == '__main__':
    credentials = pika.PlainCredentials(os.environ['RABBIT_USER'], os.environ['RABBIT_PASS'])
    conn = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ, credentials=credentials))
    channel = conn.channel()
    channel.queue_declare(queue=QUEUE, durable=True)

    fetch_docs(channel, limit=1000, times=230)
