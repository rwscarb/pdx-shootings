#!/usr/bin/env python

import json

import requests

url = ('https://utility.arcgis.com/usrsvcs/servers/1bc5e2ebd3f54f8aac43fe792ae7545b/rest/services/Hosted/'
       'Slow_Streets_Installations/FeatureServer/0/query')


def main():
    response = requests.get(url, params={
        'f': 'geojson',
        'where': "(status = 'ACTIVE') AND (type = 'BARREL')",
        'returnGeometry': 'true',
        'spatialRel': 'esriSpatialRelIntersects',
        'outFields': '*',
        'orderByFields': 'objectid ASC',
        'resultOffset': 0,
        'returnIdsOnly': 'false',
        'returnCountOnly': 'false',
        'resultRecordCount': 1000,
    })

    if response.ok:
        features = []
        data = response.json()
        for feature in data['features']:
            feature['properties']['date'] = feature['properties']['created_date']
            features.append(feature)
        json.dump({
            'type': 'FeatureCollection',
            'features': features,
        }, open('./public/barrels.geojson', 'w'))
        return 0
    return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
