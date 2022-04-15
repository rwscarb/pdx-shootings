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
            <div>
                <n-dropdown trigger="hover" :options="yearOptions" @select="setYear" size="medium" id="select_year_dropdown">
                    <n-button>{{ year }}</n-button>
                </n-dropdown>
                <div class="control_label">
                    <label for="select_year_dropdown">Year</label>
                </div>
            </div>
        </n-card>
        <n-slider id="day_slider_input"
            range
            show-tooltip
            v-model="value"
            :format-tooltip="formatDateSliderTooltip"
            :step="1"
            :min="1"
            :max="365"
            :default-value="[1, 31]"
            @update:value="setMapFilter"
        />
    </nav>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css'
import _ from 'lodash'
import moment from 'moment'
import {
    NSlider,
    NDropdown,
    NButton,
    NSwitch,
    NCard,
} from 'naive-ui';
import mapboxgl from 'mapbox-gl'
import { layers } from './constants'

export default {
    data() {
        return {
            mapLoaded: false,
            value: [1, 31],
            year: null,
            yearOptions: [],
            showHeatMap: false,
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
                data: '/shootings.geojson'
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
            zoom: 12
        });

        window.$mapbox.on('load', this.onMapLoaded);

        this.year = moment().year();
        this.yearOptions = _.map(_.range(0, 4), x => {
            const year = this.year - x;
            return {
                label: year,
                key: year
            };
        });
    },
    components: {
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NCard,
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
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 10%;
    padding: 10px;
}

#day_slider_input {
    margin: 0 20px;
}

.layer_control_card {
    max-width: 300px;
    justify-content: space-evenly;
    .control_label {
        text-align: center;
    }
    .n-card__content {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
    }
}

#app, #map {
    width: 100vw;
    height: 100vh;
}
</style>