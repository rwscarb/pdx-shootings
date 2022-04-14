#!/usr/bin/env python

import csv
import datetime
import json

import requests

url = 'https://public.tableau.com/views/PPBOpenDataDownloads/Shootings.csv?:showVizHome=no'
response = requests.get(url)

if response.ok:
    dr = csv.DictReader(response.content.decode('utf-8').splitlines())
    features = []
    for row in dr:
        incident = {
            'block_address': row['Block Address'],
            'id': row['Incident Number'],
            'date': datetime.datetime.strptime(row['Occurence Date'], '%m/%d/%Y').timestamp() * 1000,
            'injury': row['Person Injury'].strip().lower() == 'true',
            'precinct': row['Precinct'],
            'casings': int(row['CasingsRecovered']),
        }
        coordinates = [float(row['Open Data Longitude']), float(row['Open Data Latitude'])]
        if any(coordinates):
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': coordinates
                },
                'properties': incident
            })
    json.dump({
        'type': 'FeatureCollection',
        'features': features,
    }, open('../public/shootings.geojson', 'w'))
