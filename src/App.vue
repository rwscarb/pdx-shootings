<template>
    <main @keyup.up.ctrl="incrementYear"
          @keyup.down.ctrl="decrementYear">
        <div id="map"></div>
    </main>
    <nav>
        <n-space id="top_right_tools" align="center" justify="end">
            <div>Heatmap</div>
            <n-switch v-model:value="showHeatMap"/>
            <n-divider vertical/>
            <div>
                Year:
                <n-dropdown trigger="hover"
                            :options="yearOptions"
                            @select="e => year = e"
                            size="large"
                            id="select_year_dropdown">
                    <n-button>{{ year }}</n-button>
                </n-dropdown>
            </div>
            <n-divider vertical/>
            <div style="width: 12em">
                Date: {{ startFilterDate.format('MMM Do') }}
                to {{ endFilterDate.format('MMM Do') }}
            </div>
            <n-divider vertical/>
            <div style="width: 7.6em">Shootings: {{ shootingsCountDisplay }}</div>
            <n-divider vertical/>
            <div></div>
        </n-space>
    </nav>
    <footer>
        <n-slider id="day_slider_input"
                  range
                  v-model:value="value"
                  :format-tooltip="formatDateSliderTooltip"
                  :step="1"
                  :min="1"
                  :max="365"
                  :default-value="[1, 31]"
        />
    </footer>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import {createApp} from 'vue';
import moment from 'moment';
import {
    NSlider,
    NDropdown,
    NButton,
    NSwitch,
    NCard,
    NSpace,
    NForm,
    NFormItem,
    NFormItemRow,
    NDivider,
} from 'naive-ui';
import mapboxgl from 'mapbox-gl';
import {barrelCoords, barrelLayer, filterableLayers} from './constants';
import Popup from './components/Popup.vue';
import barrelImgUrl from './assets/street-barrel.png';


export default {
    data() {
        return {
            mapLoaded: false,
            value: [1, 31],
            year: null,
            yearOptions: [],
            showHeatMap: false,
            items: [],
            shootingsCount: 0,
        };
    },
    watch: {
        showHeatMap(newVal) {
            const visibility = newVal ? 'visible' : 'none';
            window.$mapbox.setLayoutProperty('shootings-heatmap', 'visibility', visibility);
        },
        filter() {
            this.applyFilters();
        },
        year() {
            this.applyFilters();
        }
    },
    computed: {
        availableYears() {
            return _.map(this.yearOptions, 'key');
        },
        maxYear() {
            return _.first(this.availableYears);
        },
        minYear() {
            return _.last(this.availableYears);
        },
        startFilterDate() {
            return moment.utc({year: this.year}).dayOfYear(this.value[0]);
        },
        startFilterDateMs() {
            return this.startFilterDate.unix() * 1000;
        },
        endFilterDate() {
            return moment.utc({year: this.year}).dayOfYear(this.value[1]).endOf('day');
        },
        endFilterDateMs() {
            return this.endFilterDate.unix() * 1000;
        },
        dateFilter() {
            return ['all',
                ['>=', ['get', 'date'], this.startFilterDateMs],
                ['<=', ['get', 'date'], this.endFilterDateMs],
            ];
        },
        filter() {
            return this.dateFilter;
        },
        shootingsCountDisplay() {
            return this.shootingsCount ? this.shootingsCount.toLocaleString() : '...';
        },
        filteredFeatures() {
            return _.filter(this.sourceData.features, x => {
                return x.properties.date >= this.startFilterDateMs && x.properties.date <= this.endFilterDateMs;
            });
        },
    },
    methods: {
        incrementYear() {
            if (this.year < this.maxYear) {
                this.setYear(this.year + 1);
            }
        },
        decrementYear() {
            if (this.year > this.minYear) {
                this.setYear(this.year - 1);
            }
        },
        async onMapLoaded() {
            this.sourceData = await (await fetch('/shootings.geojson')).json()
            await window.$mapbox.addSource('shootings', {
                type: 'geojson',
                data: this.sourceData,
            });
            await Promise.all(_.map(filterableLayers, layer => window.$mapbox.addLayer(layer)));
            await window.$mapbox.on('sourcedata', e => {
                if (e.sourceId === 'shootings' && e.isSourceLoaded) {
                    this.applyFilters();
                }
            });
            window.$mapbox.loadImage(
                barrelImgUrl,
                (error, image) => {
                    if (error) throw error;

                    window.$mapbox.addImage('barrel', image);

                    window.$mapbox.addSource('barrels', {
                        'type': 'geojson',
                        'data': {
                            'type': 'FeatureCollection',
                            'features': _.map(barrelCoords, x => ({
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': x,
                                },
                            })),
                        },
                    });

                    window.$mapbox.addLayer(barrelLayer);
                },
            );
            this.mapLoaded = true;
        },
        setYear(year) {
            this.year = year;
        },
        getDateFromDayOfYear: function (value) {
            return moment.utc({year: this.year}).dayOfYear(value);
        },
        formatDateSliderTooltip(value) {
            const date = this.getDateFromDayOfYear(value);
            return date.format('MM/DD/YYYY');
        },
        applyFilters() {
            if (!this.mapLoaded) return

            const _this = this;
            _.forEach(filterableLayers, layer => {
                window.$mapbox.setFilter(layer.id, _this.filter);
            });
            this.shootingsCount = this.filteredFeatures.length;
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
            .addTo(window.$mapbox)

        this.popupVueInstance = createApp(Popup).mount('#popup');

        window.$popup.remove();

        this.year = moment().year();
        this.yearOptions = _.map(_.range(0, 4), x => {
            const year = this.year - x;
            return {
                label: year,
                key: year,
            };
        });
        this.year--;
    },
    created() {
        this.popupVueInstance = null;
        this.sourceData = [];
    },
    components: {
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NCard,
        NSpace,
        NForm,
        NFormItem,
        NFormItemRow,
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
  max-width: calc(100vw - 50px);
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
  margin: 0 5em;
}

#select_year_dropdown {
  border-radius: 8px;
}

#app, #map {
  width: 100vw;
  height: 100vh;
}

#top_right_tools {
  background-color: white;
  padding: 5px 5px 5px 10px;
}
</style>