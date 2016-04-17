# -*- coding: utf-8 -*-

'''
Script to compute the histogram of the series extracted from graph metrics.
'''

import redis
import numpy as np

try:
    import matplotlib.pyplot as plt
except:
    print('Matplotlib is not available')

import os
import math

METRICS = [
    'maintainability',
    'cyclomaticDensity',
    'firstOrderDensity',
    'cyclomatic',
    'totalLOC',
    'totalSLOC',
    'numberOfFunctions',
    'coreSize',
    'changeCost',
    'params',
    'numberOfFiles',
    'inDegree',
    'outDegree',
    'pageRank'
    ]

DISCRETE_VALUES = [
        'totalLOC',
        'totalSLOC',
        'numberOfFunctions',
        'numberOfFiles',
        'inDegree',
        'outDegree',
        'pageRank'
        ]

MOST_OUTLIERS = [
        'totalLOC',
        'totalSLOC',
        'numberOfFunctions'
        ]


def get_irq(data):
    q75, q25 = np.percentile(data, [75, 25])
    return (q75 - q25)


def get_bin_size(irq, n):
    '''
    Get the bin size of the historgram according to the Freedman–Diaconis rule.
    '''
    return 2 * (irq * pow(n, -1/3))


def reject_outliers(data, m=3.):
    temp = []
    median = np.median(data)
    std = np.std(data)

    for i in data:
        if abs(i - median) < m * std:
            temp.append(i)
    return temp


def plot(name, center, hist, width):
    plt.bar(center, hist, align='center', width=width)
    plt.title(name)
    plt.xlabel('Value')
    plt.ylabel('Frequence')
    plt.show()


if __name__ == '__main__':
    client = redis.StrictRedis(host=os.environ['REDIS_SERVER'])

    for metric in METRICS:
        series = client.lrange(metric + 'RawSeries', 0, -1)

        if not series:
            continue

        print('Metric::%s::%s' % (metric, len(series),))
        series = list(map(float, series))

        if metric in MOST_OUTLIERS:
            series = reject_outliers(series, m=1.8)
        else:
            series = reject_outliers(series)

        irq = get_irq(series)
        binSize = get_bin_size(irq, len(series))

        # Use 5 bins if the size is zero.
        if binSize == 0.00:
            mx = np.max(series)
            mn = np.min(series)
            binSize = abs(mx - mn) / 5

        if metric in DISCRETE_VALUES:
            binSize = math.ceil(binSize)

        numberOfBins = math.ceil((max(series) - min(series)) / binSize)

        # Compute the histogram
        hist, bins = np.histogram(series, bins=numberOfBins)
        width = 0.7 * (bins[1] - bins[0])
        center = (bins[:-1] + bins[1:]) / 2
        # plot(metric, center, hist, width)

        data = {}
        data['values'] = list(bins)
        data['frequency'] = list(hist)

        # Clear the keys
        client.delete(metric + 'Histogram:values')
        client.delete(metric + 'Histogram:frequency')

        # Save it back to Redis
        for v, f in zip(bins, hist):
            client.rpush(metric + 'Histogram:values', v)
            client.rpush(metric + 'Histogram:frequency', f)
