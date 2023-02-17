#!/usr/bin/env python

import calendar
import csv
import datetime
import json

import requests

url = 'https://public.tableau.com/views/PPBOpenDataDownloads/Shootings.csv?:showVizHome=no'


def main():
    response = requests.get(url)

    if response.ok:
        dr = csv.DictReader(response.content.decode('utf-8').splitlines())
        features = []
        for row in dr:
            if not all((row['Open Data Longitude'], row['Open Data Latitude'])):
                continue
            coordinates = [float(row['Open Data Longitude']), float(row['Open Data Latitude'])]
            uid = row['Incident Number']
            time = row.get('Occur 2hr Time', row.get('Occur 3hr Time')).replace(' ', '')

            start_hour = 0
            end_hour = 24
            if time:
                start_hour,  end_hour = map(int, [x[:2] for x in time.split('-')])

            incident = {
                'block_address': row['Block Address'],
                'id': uid,
                'date': calendar.timegm(datetime.datetime.strptime(row['Occurence Date'], '%m/%d/%Y').timetuple()) * 1000,
                'time': time,
                'start_hour': start_hour,
                'end_hour': end_hour,
                'injury': row['Shooting Type'] != 'No Injury',
                'precinct': row['Precinct'],
                'casings': int(row['Casings Recovered']),
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
            'features': sorted(features, key=lambda x: x['properties']['date']),
        }, open('./public/shootings.geojson', 'w'))
        return 0
    return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
