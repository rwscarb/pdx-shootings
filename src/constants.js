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
        visibility: 'visible'
    },
    paint: {
        'circle-radius': 3,
        'circle-color': ['case', ['get', 'injury'], '#D03050', '#1F70D3']
    }
};

export const CIRCLE_LAYER_HOVER = {
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
            0.07,
            15,
            0.1,
            16,
            0.3,
        ]
    }
};

export const FILTERABLE_LAYERS = [HEATMAP_LAYER, CIRCLE_LAYER, CIRCLE_LAYER_HOVER];
export const NON_FILTERABLE_LAYERS = [BARREL_LAYER];
export const SOURCES = [{id: 'shootings'}, {id: 'barrels'}];
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 15.66;
