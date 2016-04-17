#!/usr/bin/env python3

import re
import os
import json
import colorlog
import semver
import random
import logging
import datetime
import pytz
import functools

import pika
import dateutil.parser as iso_parser
import requests


# Logging configuration
formatter = colorlog.ColoredFormatter(
    "%(asctime)s %(log_color)s%(levelname)s [%(name)s]: %(reset)s %(message)s",
    datefmt=None,
    reset=True,
    log_colors={
        'DEBUG':    'cyan',
        'INFO':     'green',
        'WARNING':  'yellow',
        'ERROR':    'red',
        'CRITICAL': 'red,bg_white',
    },
    secondary_log_colors={},
    style='%'
)
log = logging.getLogger('dispatcher')
log.setLevel(logging.INFO)

console = logging.StreamHandler()
console.setLevel(logging.INFO)
console.setFormatter(formatter)
log.addHandler(console)


QUEUE = 'static_analysis'
REGISTRY = 'http://' + os.environ['COUCH_HOST'] + ':5984/registry/'

# Queues that will be served
ESCOMPLEX_QUEUE = 'escomplex'
ESLINT_QUEUE = 'eslint'
TODO_QUEUE = 'todo'
COPY_PASTE_QUEUE = 'copy_paste'

TOTAL_VERSIONS = 10
SEMVER_REG = re.compile('^(?P<major>(?:0|[1-9][0-9]*))'
                        '\.(?P<minor>(?:0|[1-9][0-9]*))'
                        '\.(?P<patch>(?:0|[1-9][0-9]*))'
                        '(\-(?P<prerelease>[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?'
                        '(\+(?P<build>[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$')


def get_major_versions(versions):
    """
    Return only the major version (i.e x.0.0)

    :param versions: A list of valid semver strings.
    """

    majors = []
    for version in versions:
        major, minor, patch = version.split('.')
        if minor == '0' and patch == '0':
            majors.append(version)

    return majors


def sample_minor_versions(versions, sample):
    """
    Pick randomly a sample from the given versions.

    :param versions: A list of valid semver strings.
    :param sample: The number of versions to choose from the available versions.
    """

    minors = []
    for version in versions:
        major, minor, patch = version.split('.')
        if minor != '0' or patch != '0':
            minors.append(version)

    random.shuffle(minors)

    return minors[-sample:]


def is_stable(version):
    """
    Check if a version is stable. e.g doesn't include letters like 1.0.0-alpha.

    :param version: A valid semver string.
    """

    match = SEMVER_REG.match(version)
    if match:
        info = match.groupdict()
    else:
        return False

    return not (info['prerelease'] or info['build'])


def is_active(package):
    """
    Check if a package is in active development. (e.g updated in the last year)

    :param package: The name of a npm package.
    """

    try:
        last_update = iso_parser.parse(package['time']['modified'])
    except KeyError as e:
        log.warn('package: %s, exception: %s' % (package, e,))
        return True

    now = datetime.datetime.now(pytz.utc)
    diff = now - last_update

    if diff.days <= 365:
        return True

    log.warn("Aborting. %s's updated %s days ago" % (package['name'], diff.days))
    return False


def get_versions(name):
    """
    Return the stable version tags in ascending order.

    :param name: A npm package.
    """

    res = requests.get(REGISTRY + name)
    doc = res.json()

    if not is_active(doc):
        return []

    if 'versions' not in doc:
        log.error('Package %s does not have version property' % name)
        return []

    versions = [i for i in doc['versions'].keys()]

    versions = list(filter(is_stable, versions))
    versions = sorted(versions, key=functools.cmp_to_key(semver.compare))

    return versions


def filter_versions(name):
    """
    Filter out the most important versions.
    Decides which versions will be analyzed:
        - At most TOTAL_VERSIONS.
        - The latest version.
        - All the major versions.
        - Any other random version to reach the number of TOTAL_VERSIONS.

    :param name: A npm package.
    """

    versions = get_versions(name)

    if len(versions) < TOTAL_VERSIONS:
        return versions

    to_analyze = []

    # Add the latest version.
    to_analyze.append(versions.pop())
    to_analyze.extend(get_major_versions(versions))

    if len(to_analyze) < TOTAL_VERSIONS:
        diff = TOTAL_VERSIONS - len(to_analyze)
        to_analyze.extend(sample_minor_versions(versions, diff))

    to_analyze = sorted(to_analyze, key=functools.cmp_to_key(semver.compare))

    return to_analyze[-TOTAL_VERSIONS:]


def send_to_queue(ch, queue, msg):
    ch.basic_publish(exchange='', routing_key=queue, body=json.dumps(msg),
                     properties=pika.BasicProperties(delivery_mode=2,))


def filter_escomplex(name, versions):
    """
    Removes versions that are already analyzed.

    :param name: A npm package.
    :param versions: A list of candidate versions to analyze.
    """
    url = 'http://' + os.environ['COUCH_HOST'] + \
          ':5984/escomplex/_design/metrics/_view/availableVersions?key=["' + name + '"]'

    res = requests.get(url)
    doc = res.json()

    if doc['rows']:
        analyzed = doc['rows'][0]['value']
        log.debug('Analyzed %s', analyzed)

        if len(analyzed) >= TOTAL_VERSIONS:

            # Keep only the latest
            return [versions[-1]]
        else:

            # Keep the difference
            remaining = TOTAL_VERSIONS - len(analyzed)
            return list(set(versions) - set(analyzed))[-remaining:]

    return versions


def worker(ch, method, properties, body):

    versions = []
    task = json.loads(body.decode())

    if 'name' not in task:
        log.error('Task is missing the name property')
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    package_name = task['name']
    log.info('Processing %s' % package_name)

    versions = filter_versions(package_name)
    log.debug('Versions %s', versions)

    if not versions:
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    msg = {}
    msg['name'] = package_name
    msg['versions'] = filter_escomplex(package_name, versions)

    log.debug('Using %s', msg['versions'])

    # Use all the versions for escomplex
    log.debug('Sending task to %s' % ESCOMPLEX_QUEUE)
    send_to_queue(ch, ESCOMPLEX_QUEUE, msg)

    # Use the last version for the rest
    del msg['versions']
    msg['version'] = versions[-1]

    log.debug('Sending task to %s' % ESLINT_QUEUE)
    send_to_queue(ch, ESLINT_QUEUE, msg)

    log.debug('Sending task to %s' % TODO_QUEUE)
    send_to_queue(ch, TODO_QUEUE, msg)

    log.debug('Sending task to %s' % COPY_PASTE_QUEUE)
    send_to_queue(ch, COPY_PASTE_QUEUE, msg)

    ch.basic_ack(delivery_tag=method.delivery_tag)


if __name__ == '__main__':
    conn = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = conn.channel()

    # Declare the analyzers.
    channel.queue_declare(queue=ESCOMPLEX_QUEUE, durable=True)
    channel.queue_declare(queue=ESLINT_QUEUE, durable=True)
    channel.queue_declare(queue=TODO_QUEUE, durable=True)
    channel.queue_declare(queue=COPY_PASTE_QUEUE, durable=True)

    # The queue that this service listens to.
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(worker, queue=QUEUE)

    log.info('Waiting for messages in queue [%s]', QUEUE)

    channel.start_consuming()
