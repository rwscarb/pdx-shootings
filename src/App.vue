<template>
    <v-map :options="options"
        @loaded="onMapLoaded">
        <template v-if="mapLoaded">
            <v-layer-mapbox-geojson
                source="/shootings.geojson"
                :layer="layer"
            ></v-layer-mapbox-geojson>
            <v-control-geolocate
                :options="{
                    positionOptions: {
                      enableHighAccuracy: true,
                    },
                    trackUserLocation: true,
                    showUserHeading: true,
                }"
            />
            <v-control-fullscreen/>
            <v-control-navigation/>
            <v-control-scale/>
        </template>
    </v-map>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css'
import { VMap, VMarker, VPopup, VControlNavigation, VControlGeolocate, VControlFullscreen, VControlScale, VLayerMapboxGeojson } from 'v-mapbox'

export default {
    data() {
        return {
            options: {
                accessToken: 'pk.eyJ1IjoicnNjYXJiZXJ5IiwiYSI6ImNqbGd6Z3QyZjB0anQzcHAxdGZjMmQwMWEifQ.qoyVSKPnqnoS1_t9UIzlDQ',
                style: 'mapbox://styles/mapbox/dark-v10',
                center: {lng: -122.67598626624789, lat: 45.51939452327494},
                zoom: 12,
            },
            mapLoaded: false,
        };
    },
    computed: {
        layer() {
            return {
                type: 'circle',
                paint: {
                    'circle-radius': 3,
                    'circle-color': '#1F70D3'
                }
            }
        },
        layers() {
            return {
                circleLayer: {
                    id: 'shootings',
                    type: 'heatmap',
                    source: 'shootings',
                    paint: {
                        // increase weight as diameter breast height increases
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ['get', 'point_count'],
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
                            'rgb(208,209,230)',
                            0.4,
                            'rgb(166,189,219)',
                            0.6,
                            'rgb(103,169,207)',
                            0.8,
                            'rgb(28,144,153)',
                        ],
                        // increase radius as zoom increases
                        'heatmap-radius': {
                            stops: [
                                [11, 15],
                                [15, 20],
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
                    layout: {
                        visibility: 'visible',
                    },
                }
            }
        }
    },
    methods: {
        onMapLoaded(map) {
            window.$mapbox = map;
            this.mapLoaded = true;
        },
    },
    components: {
        VLayerMapboxGeojson,
        VControlNavigation,
        VControlGeolocate,
        VControlFullscreen,
        VControlScale,
        VMap,
        VMarker,
        VPopup,
    },
};
</script>

<style lang="less">
body {
    margin: 0;
    padding: 0;
}

#app, #map {
    width: 100vw;
    height: 100vh;
}
</style>