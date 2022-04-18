#!/usr/bin/env python

import calendar
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
        coordinates = [float(row['Open Data Longitude']), float(row['Open Data Latitude'])]
        uid = row['Incident Number']
        incident = {
            'block_address': row['Block Address'],
            'id': uid,
            'date': calendar.timegm(datetime.datetime.strptime(row['Occurence Date'], '%m/%d/%Y').timetuple()) * 1000,
            'injury': row['Person Injury'].strip().lower() == 'true',
            'precinct': row['Precinct'],
            'casings': int(row['CasingsRecovered']),
            'location': coordinates,
        }
        if any(coordinates):
            features.append({
                'id': uid,
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
    }, open('./public/shootings.geojson', 'w'))
