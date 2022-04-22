<template>
    <main @keydown.ctrl.up.exact="incrementYear"
          @keydown.ctrl.down.exact="decrementYear"
          @keydown="handleKeyDown"
          @keyup.space="togglePlayer">
        <div id="map"></div>
    </main>
    <nav>
        <div id="top_right_tools">
            <div>
                Heatmap <n-switch v-model:value="showHeatMap"/>
            </div>
            <div id="filter_date_picker">
                <div class="small_date_pickers">
                    <small-datepicker
                        :value="startFilterDateIso"
                        @update:value="setStartFilterDate"/>
                    <icon>
                        <arrow-forward-filled/>
                    </icon>
                    <small-datepicker
                        :value="endFilterDateIso"
                        @update:value="setEndFilterDate"/>
                </div>
                <div class="range_picker">
                    <n-date-picker type="daterange"
                        :value="[startFilterDateMs, endFilterDateMs]"
                        @update:value="applyDateRange"
                        :is-date-disabled="dateIsInvalid"
                        format="E. MMM do yyyy"/>
                </div>
            </div>
            <div id="top_nav_stats">
                <div>
                    Displaying: {{ startSliderDate.format('YYYY-MM-DD') }} to {{ endSliderDate.format('YYYY-MM-DD') }}
                </div>
                <div>
                    Shootings: {{ shootingsCount }}
                </div>
            </div>
            <div id="nav_extra_icons">
                <n-button @click="showDrawer = !showDrawer">
                    <icon size="24">
                        <filter-alt-outlined/>
                    </icon>
                </n-button>
                <about-link/>
            </div>
        </div>
    </nav>
    <footer>
        <n-slider id="day_slider_input"
                  range
                  v-model:value="value"
                  :format-tooltip="formatDateSliderTooltip"
                  :step="step"
                  :min="startFilterDateMs"
                  :max="endFilterDateMs"/>
        <n-drawer v-model:show="showDrawer" placement="bottom">
            <n-drawer-content title="Filters">
                <n-space style="display: flex" vertical>
                    <n-checkbox v-model:checked="injuryOnly">
                        Injury Only
                    </n-checkbox>
                    <n-checkbox v-model:checked="showBarrels" title="Most recently fetched and marked active">
                        Traffic Barrels
                    </n-checkbox>
                </n-space>
            </n-drawer-content>
        </n-drawer>
    </footer>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css'
import _ from 'lodash'
import { createApp } from 'vue'
import moment from 'moment'
import {
    NButton,
    NCheckbox,
    NDrawer,
    NDrawerContent,
    NDropdown, NGi, NGrid,
    NNumberAnimation,
    NSlider,
    NSwitch,
    NSpace,
    NDatePicker,
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import {
    ArrowForwardFilled,
    FilterAltOutlined,
} from '@vicons/material'
import { Icon } from '@vicons/utils'


import Popup from './components/Popup.vue'
import AboutLink from './components/AboutLink.vue'
import SmallDatepicker from './components/SmallDatepicker.vue';

import {
    FILTERABLE_LAYERS,
    NON_FILTERABLE_LAYERS,
    MAX_ZOOM,
    MIN_ZOOM,
    SOURCES,
    DAY_MS,
} from './constants'
import barrelImgUrl from './assets/street-barrel.png'


export default {
    name: 'App',
    data() {
        const today = moment().startOf('day');
        const start = today.clone().subtract(1, 'year').unix() * 1000;
        const end = today.unix() * 1000;
        return {
            mapLoaded: false,
            value: [start, end],
            dates: [start, end],
            showHeatMap: false,
            items: [],
            shootingsCount: 0,
            showDrawer: false,
            injuryOnly: false,
            showBarrels: false,
            step: DAY_MS,
            playInterval: null,
            playIntervalSpeed: 400,
        };
    },
    watch: {
        showHeatMap(newVal) {
            this.setLayerVisibility('shootings-heatmap', newVal);
        },
        showBarrels(newVal) {
            this.setLayerVisibility('barrels', newVal);
        },
        filter() {
            this.applyFilters();
        },
    },
    computed: {
        allLayers() {
            return [...NON_FILTERABLE_LAYERS, ...FILTERABLE_LAYERS];
        },
        availableYears() {
            // todo:
            return [2019, 2020, 2021, 2022];
        },
        maxYear() {
            return _.last(this.availableYears);
        },
        minYear() {
            return _.first(this.availableYears);
        },
        startFilterDate() {
            return moment(this.dates[0]);
        },
        startFilterDateMs() {
            return this.startFilterDate.unix() * 1000;
        },
        startFilterDateIso() {
            return this.startFilterDate.format('YYYY-MM-DD');
        },
        endFilterDate() {
            return moment(this.dates[1]);
        },
        endFilterDateMs() {
            return this.endFilterDate.unix() * 1000;
        },
        endFilterDateIso() {
            return this.endFilterDate.format('YYYY-MM-DD');
        },
        startSliderDate() {
            return moment(this.value[0]);
        },
        endSliderDate() {
            return moment(this.value[1]);
        },
        dateFilter() {
            return ['all',
                ['>=', ['get', 'date'], this.value[0]],
                ['<=', ['get', 'date'], this.value[1]],
            ];
        },
        injuryFilter() {
            return ['any', ['!', this.injuryOnly], ['get', 'injury']];
        },
        filter() {
            return ['all', this.dateFilter, this.injuryFilter];
        },
        filteredFeatures() {
            return _.filter(this.sourceData.features, x => {
                return _.every([
                    x.properties.date >= this.value[0] && x.properties.date <= this.value[1],
                    this.injuryOnly ? x.properties.injury : true,
                ]);
            });
        },
        isPlaying() {
            return !_.isNull(this.playInterval);
        },
    },
    methods: {
        setLayerVisibility(layerId, isVisible) {
            window.$mapbox.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        },
        handleKeyDown($e) {
            switch ($e.key) {
                case 'z':
                    this.setPlayInterval(this.playIntervalSpeed + 50);
                    break;
                case 'x':
                    this.setPlayInterval(this.playIntervalSpeed - 50);
                    break;
                case 'd':
                    this.setEndSlider('day');
                    break;
                case 'w':
                    this.setEndSlider('week');
                    break;
                case 'm':
                    this.setEndSlider('month');
                    break;
                case 'q':
                    this.setEndSlider(moment.duration(3, 'months'));
                    break;
                case 'y':
                    this.setEndSlider('year');
                    break;
            }
        },
        setPlayInterval(ms) {
            const playing = this.isPlaying;
            if (playing) {
                this.stopPlayer();
            }
            this.playIntervalSpeed = ms;
            if (playing) {
                this.startPlayer();
            }
        },
        setEndSlider(duration) {
            const newSliderEndDate = moment(this.value[0]).add(1, duration);
            if (newSliderEndDate.isAfter(this.endFilterDate)) {
                this.value[1] = this.endFilterDateMs;
            } else {
                this.value[1] = newSliderEndDate.unix() * 1000;
            }
        },
        setStartFilterDate(value) {
            const date = moment(value, 'YYYY-MM-DD');
            if (this.dateIsInvalid(date)) {
                return;
            }
            const newRange = [date.unix() * 1000, this.dates[1]];
            this.applyDateRange(newRange);
        },
        setEndFilterDate(value) {
            const date = moment(value, 'YYYY-MM-DD');
            if (this.dateIsInvalid(date)) {
                return;
            }
            const newRange = [this.dates[0], date.unix() * 1000];
            this.applyDateRange(newRange);
        },
        applyDateRange(value) {
            this.dates = value;
            const [start, end]  = this.value;
            if (start < this.dates[0] || end > this.dates[1]) {
                this.value =  [...this.dates];
            }
        },
        dateIsInvalid(value) {
            const year = moment(value).year();
            return year > this.maxYear || year < this.minYear;
        },
        incrementYear() {
            const nextYear = this.endFilterDate.year() + 1;
            if (nextYear <= this.maxYear) {
                const value = _.map(this.dates, x => moment(x).add(1, 'year').unix() * 1000)
                this.applyDateRange(value);
            }
        },
        decrementYear() {
            const prevYear = this.startFilterDate.year() - 1;
            if (prevYear >= this.minYear) {
                const value = _.map(this.dates, x => moment(x).subtract(1, 'year').unix() * 1000)
                this.applyDateRange(value);
            }
        },
        togglePlayer() {
            if (this.isPlaying) {
                this.stopPlayer();
            } else {
                this.startPlayer();
            }
        },
        stopPlayer() {
            clearInterval(this.playInterval);
            this.playInterval = null;
        },
        startPlayer() {
            const _this = this;
            this.playInterval = setInterval(() => {
                const nextStep = _this.value[1] + _this.step;
                if (nextStep < _this.endFilterDateMs) {
                    _this.value = _.map(_this.value, x => x + _this.step);
                } else {
                    clearInterval(_this.playInterval);
                    _this.playInterval = null;
                }
            }, this.playIntervalSpeed);
        },
        async onMapLoaded() {
            this.sourceData = await (await fetch('/shootings.geojson')).json()
            await window.$mapbox.addSource('shootings', {
                type: 'geojson',
                data: this.sourceData,
            });
            await window.$mapbox.addSource('barrels', {
                'type': 'geojson',
                'data': '/barrels.geojson',
            });
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
                },
            );
            await Promise.all(_.map(this.allLayers, layer => window.$mapbox.addLayer(layer)));
            this.mapLoaded = true;
        },
        formatDateSliderTooltip(value) {
            return moment(value).format('MM/DD/YYYY');
        },
        applyFilters() {
            if (!this.mapLoaded) return

            const _this = this;
            _.forEach(FILTERABLE_LAYERS, layer => {
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
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM
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
    },
    created() {
        this.popupVueInstance = null;
        this.sourceData = [];
    },
    async unmounted() {
        await Promise.all(_.map(this.allLayers, layer => window.$mapbox.removeLayer(layer.id)));
        await Promise.all(_.map(SOURCES, layer => window.$mapbox.removeSource(layer.id)));
    },
    components: {
        Icon,
        AboutLink,
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NNumberAnimation,
        NDrawer,
        NDrawerContent,
        NCheckbox,
        NGrid,
        NGi,
        NSpace,
        NDatePicker,
        FilterAltOutlined,
        ArrowForwardFilled,
        SmallDatepicker,
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
  display: flex;
  justify-content: center;
  flex-flow: row wrap;
  background-color: white;
  padding: 5px 5px 5px 10px;
  align-items: center;
  justify-items: center;
  text-align: center;

  > div {
    margin: 0 .5em;
  }
}

#nav_extra_icons {
  justify-self: flex-end;

  > button {
    margin: 0 .5em;
  }
}

.small_date_pickers {
    display: flex;
    align-items: center;
    margin: .5em;
}

@media only screen and (max-width: 600px) {
    #filter_date_picker {
        order: 3;
    }
    #top_nav_stats {
        order: 2;
    }
    .range_picker {
        display: none;
    }
}
@media only screen and (min-width: 600px) {
    .small_date_pickers {
        display: none;
    }
}
@media only screen and (max-width: 1000px) {
    #top_nav_stats {
        order: 1;
    }
}
</style>