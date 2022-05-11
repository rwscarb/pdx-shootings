export const HEATMAP_LAYER = {
    id: 'shootings-heatmap',
    type: 'heatmap',
    source: 'shootings',
    layout: {
        visibility: 'none'
    },
    paint: {
        // increase intensity as zoom level increases
        'heatmap-intensity': {
            stops: [
                [11, 1],
                [15, 3],
            ],
        },
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

export const CIRCLE_LAYER = {
    id: 'shootings-circles',
    type: 'circle',
    source: 'shootings',
    layout: {
        visibility: 'none'
    },
    paint: {
        'circle-radius': [
            'interpolate',
            ['exponential', 0.5],
            ['zoom'],
            12,
            3,
            18,
            5
        ],
        'circle-color': ['case', ['get', 'injury'], '#D03050', '#1F70D3']
    }
};

export const CIRCLE_LAYER_HOVER = {
    id: 'shootings-circles-hover',
    type: 'circle',
    source: 'shootings',
    layout: {
        visibility: 'none'
    },
    paint: {
        'circle-radius': [
            'interpolate',
            ['exponential', 0.5],
            ['zoom'],
            12,
            10,
            18,
            15
        ],
        'circle-opacity': 0
    }
};

export const CLUSTER_LAYER = {
    id: 'clusters',
    type: 'circle',
    source: 'shootings-clustered',
    filter: ['has', 'point_count'],
    layout: {
        visibility: 'visible'
    },
    paint: {
        'circle-color': [
            'step',
            ['get', 'point_count'],
            '#337d8f',
            10,
            '#b5c238',
            30,
            'rgba(242,140,177,0.76)'
        ],
        'circle-radius': [
            'step',
            ['get', 'point_count'],
            10,
            5, 15,
            10, 20,
            50, 25,
            100, 30,
        ]
    }
};

export const CLUSTER_COUNT_LAYER = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'shootings-clustered',
    filter: ['has', 'point_count'],
    layout: {
        'visibility': 'visible',
        'text-field': '{point_count_abbreviated}',
        'text-size': 12
    }
};

export const CLUSTER_POINT_LAYER = {
    id: 'cluster-point',
    type: 'circle',
    source: 'shootings-clustered',
    filter: ['!', ['has', 'point_count']],
    paint: {
        'circle-radius': [
            'interpolate',
            ['exponential', 0.5],
            ['zoom'],
            12,
            3,
            18,
            5
        ],
        'circle-color': ['case', ['get', 'injury'], '#D03050', '#1F70D3']
    },
    layout: {
        'visibility': 'visible',
    }
};

export const CLUSTER_POINT_LAYER_HOVER = {
    id: 'cluster-point-hover',
    type: 'circle',
    source: 'shootings',
    filter: ['!', ['has', 'point_count']],
    layout: {
        visibility: 'visible'
    },
    paint: {
        'circle-radius': [
            'interpolate',
            ['exponential', 0.5],
            ['zoom'],
            12,
            10,
            18,
            15
        ],
        'circle-opacity': 0
    }
};

export const BARREL_LAYER = {
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
            0.08,
            15,
            0.1,
            16,
            0.2,
            18,
            0.3
        ]
    }
};

export const FILTERABLE_LAYERS = [
    CLUSTER_LAYER,
    CLUSTER_COUNT_LAYER,
    CLUSTER_POINT_LAYER,
    CLUSTER_POINT_LAYER_HOVER,
    HEATMAP_LAYER,
    CIRCLE_LAYER,
    CIRCLE_LAYER_HOVER
];
export const NON_FILTERABLE_LAYERS = [BARREL_LAYER];
export const SOURCES = [{id: 'shootings'}, {id: 'barrels'}];
export const DAY_MS = 1000 * 60 * 60 * 24;
export const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v11';
export const DARK_STYLE = 'mapbox://styles/mapbox/dark-v10';
