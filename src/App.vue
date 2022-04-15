<template>
    <main>
        <div id="map"></div>
    </main>
    <nav>
        <n-card size="small" class="layer_control_card">
            <div>
                <n-switch v-model:value="showHeatMap" id="show_heatmap_switch"/>
                <div class="control_label">
                    <label for="show_heatmap_switch">Heatmap</label>
                </div>
            </div>
            <n-divider vertical />
            <div>
                <n-dropdown trigger="hover"
                    :options="yearOptions"
                    @select="setYear"
                    size="large"
                    id="select_year_dropdown">
                    <n-button>{{ year }}</n-button>
                </n-dropdown>
            </div>
        </n-card>
    </nav>
    <footer>
        <n-slider id="day_slider_input"
            range
            v-model="value"
            :format-tooltip="formatDateSliderTooltip"
            :step="1"
            :min="1"
            :max="365"
            :default-value="[1, 31]"
            @update:value="setMapFilter"
        />
    </footer>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css'
import _ from 'lodash'
import { createApp } from 'vue'
import moment from 'moment'
import {
    NSlider,
    NDropdown,
    NButton,
    NSwitch,
    NCard,
    NDivider,
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import { layers } from './constants'
import Popup from './components/Popup.vue'


export default {
    data() {
        return {
            mapLoaded: false,
            value: [1, 31],
            year: null,
            yearOptions: [],
            showHeatMap: false,
            items: [],
        };
    },
    watch: {
        showHeatMap(newVal) {
            const visibility = newVal ? 'visible' : 'none';
            window.$mapbox.setLayoutProperty(layers[1].id, 'visibility', visibility);
        },
    },
    methods: {
        async onMapLoaded() {
            await window.$mapbox.addSource('shootings', {
                type: 'geojson',
                data: '/shootings.geojson',
            });
            await Promise.all(_.map(layers, layer => window.$mapbox.addLayer(layer)));
            await window.$mapbox.once('sourcedata', () => this.setMapFilter(this.value));
            this.mapLoaded = true;
        },
        setYear(year) {
            this.year = year;
            this.setMapFilter(this.value);
        },
        getDateFromDayOfYear: function (value) {
            return moment.utc({year: this.year}).dayOfYear(value);
        },
        formatDateSliderTooltip(value) {
            const date = this.getDateFromDayOfYear(value);
            return date.format('MM/DD/YYYY');
        },
        setMapFilter(value) {
            let msMin = this.getDateFromDayOfYear(value[0]).unix() * 1000;
            let msMax = this.getDateFromDayOfYear(value[1]).unix() * 1000;
            _.forEach(layers, layer => {
                window.$mapbox.setFilter(layer.id, ['all',
                    ['>=', ['get', 'date'], msMin],
                    ['<=', ['get', 'date'], msMax],
                ]);
            });
            this.value = value;
        },
    },
    mounted() {
        mapboxgl.accessToken = 'pk.eyJ1IjoicnNjYXJiZXJ5IiwiYSI6ImNqbGd6Z3QyZjB0anQzcHAxdGZjMmQwMWEifQ.qoyVSKPnqnoS1_t9UIzlDQ';

        window.$mapbox = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v10',
            center: [-122.67598626624789, 45.51939452327494],
            zoom: 12,
        });
        window.$mapbox.addControl(new mapboxgl.NavigationControl(), 'top-left');
        window.$mapbox.addControl(new mapboxgl.FullscreenControl(), 'top-left');

        window.$mapbox.on('load', this.onMapLoaded);

        window.$mapbox.on('click', 'shootings-circles-hover', e => {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();

            /*
              Ensure that if the map is zoomed out such that multiple
              copies of the feature are visible, the popup appears
              over the copy being pointed to.
            */
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            this.popupVueInstance.setItems(_.map(e.features, 'properties'));
            window.$popup.setLngLat(coordinates).addTo(window.$mapbox);
        });

        window.$mapbox.on('mouseenter', 'shootings-circles-hover', e => {
            window.$mapbox.getCanvas().style.cursor = 'pointer';
        });

        window.$mapbox.on('mouseleave', 'shootings-circles-hover', () => {
            window.$mapbox.getCanvas().style.cursor = '';
        });


        window.$popup = new mapboxgl.Popup()
            .setLngLat([0, 0])
            .setHTML('<div id="popup"></div>')
            .addTo(window.$mapbox);

        this.popupVueInstance = createApp(Popup).mount('#popup')

        this.year = moment().year();
        this.yearOptions = _.map(_.range(0, 4), x => {
            const year = this.year - x;
            return {
                label: year,
                key: year,
            };
        });
    },
    created() {
        this.popupVueInstance = null;
    },
    components: {
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NCard,
        NDivider,
    },
};
</script>

<style lang="less">
body {
    margin: 0;
    padding: 0;
}

nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    position: fixed;
    right: 0;
    top: 0;
}

footer {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 10%;
}

#day_slider_input {
    margin: 0 20px;
}

#select_year_dropdown {
    border-radius: 8px;
}

.layer_control_card {
    max-width: 300px;
    justify-content: space-evenly;

    .control_label {
        text-align: center;
        font-size: 0.9em;
    }

    .n-card__content {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
    }
}

.n-card {
    background-color: rgba(255, 255, 255, .85);
}

#app, #map {
    width: 100vw;
    height: 100vh;
}
</style>