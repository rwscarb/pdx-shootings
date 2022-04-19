export const heatmapLayer = {
    id: 'shootings-heatmap',
    type: 'heatmap',
    source: 'shootings',
    layout: {
        visibility: 'none'
    },
    paint: {
        // increase weight as diameter breast height increases
        'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'casings'],
            0,
            0,
            6,
            1,
        ],
        // increase intensity as zoom level increases
        'heatmap-intensity': {
            stops: [
                [11, 1],
                [15, 3],
            ],
        },
        // assign color values be applied to points depending on their density
        'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(236,222,239,0)',
            0.2,
            'rgb(206,85,0)',
            0.4,
            'rgb(255,106,27)',
            0.6,
            'rgb(211,114,227)',
            0.8,
            'rgb(158,234,130)',
        ],
        // increase radius as zoom increases
        'heatmap-radius': {
            stops: [
                [11, 15],
                [15, 40],
            ],
        },
        // decrease opacity to transition into the circle layer
        'heatmap-opacity': {
            default: 1,
            stops: [
                [14, 1],
                [15, 0],
            ],
        },
    },
};

export const circleLayer = {
    id: 'shootings-circles',
    type: 'circle',
    source: 'shootings',
    layout: {
        visibility: 'visible'
    },
    paint: {
        'circle-radius': 3,
        'circle-color': ['case', ['get', 'injury'], '#D03050', '#1F70D3']
    }
};

export const circleLayerHover = {
    id: 'shootings-circles-hover',
    type: 'circle',
    source: 'shootings',
    layout: {
        visibility: 'visible'
    },
    paint: {
        'circle-radius': 10,
        'circle-opacity': 0
    }
};

export const barrelLayer = {
    id: 'barrels',
    type: 'symbol',
    source: 'barrels',
    layout: {
        visibility: 'none',
        'icon-image': 'barrel',
        'icon-size': [
            'interpolate',
            ['exponential', 0.5],
            ['zoom'],
            12,
            0.05,
            13,
            0.07,
            15,
            0.1,
            16,
            0.3,
        ]
    }
};

export const filterableLayers = [circleLayer, circleLayerHover, heatmapLayer];
export const nonFilterableLayers = [barrelLayer];
export const MIN_ZOOM = 11.40;
export const MAX_ZOOM = 15.66;
