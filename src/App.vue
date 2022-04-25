<template>
    <n-config-provider :theme="theme">
        <main @keydown.ctrl.up.exact="incrementYear"
              @keydown.ctrl.down.exact="decrementYear"
              @keydown="handleKeyDown"
              @keyup.space="togglePlayer">
            <div id="map"></div>
        </main>
        <nav>
            <div id="top_right_tools">
                <div>
                    Cluster <n-switch v-model:value="showClustered"/>
                </div>
                <div>
                    Heatmap <n-switch v-model:value="showHeatMap"/>
                </div>
                <div id="filter_date_picker">
                    <div class="small_date_pickers">
                        <small-datepicker
                                @update:value="setStartFilterDate"
                                :value="startFilterDate.format('YYYY-MM-DD')"/>
                        <icon style="margin: 0 1em">
                            <arrow-forward-filled/>
                        </icon>
                        <small-datepicker
                                @update:value="setEndFilterDate"
                                :value="endFilterDate.format('YYYY-MM-DD')"/>
                    </div>
                    <div class="range_picker">
                        <n-date-picker type="daterange"
                               :value="pickerDates"
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
            <player-controls
                    @skip-previous="moveToFilterStart"
                    @rewind="decrementPlay"
                    @play="togglePlayer"
                    @fast-forward="incrementPlay"
                    @skip-next="moveToFilterEnd"
                    :is-playing="isPlaying"/>
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
    </n-config-provider>
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
    NDropdown,
    NGi,
    NGrid,
    NConfigProvider,
    NNumberAnimation,
    NSlider,
    NSwitch,
    NSpace,
    NDatePicker,
    NButtonGroup,
    darkTheme,
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
import PlayerControls from './components/PlayerControls.vue';

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
        const dataEndDate = moment().startOf('day').startOf('month').subtract(1, 'day');
        const start = dataEndDate.clone().subtract(1, 'year').unix() * 1000;
        const end = dataEndDate.unix() * 1000;
        return {
            mapLoaded: false,
            dataStartDate: moment.utc({year: 2019}).unix() * 1000,
            dataEndDate:  dataEndDate.unix() * 1000,
            value: [start, end],
            pickerDates: [start, end],
            showHeatMap: false,
            showClustered: true,
            items: [],
            shootingsCount: 0,
            showDrawer: false,
            injuryOnly: false,
            showBarrels: false,
            step: DAY_MS,
            playInterval: null,
            playIntervalSpeed: 400,
            theme: darkTheme,
        };
    },
    watch: {
        showHeatMap(newVal) {
            if (newVal) {
                this.showClustered = false;
            }
            this.setLayerVisibility('shootings-heatmap', newVal);
        },
        showBarrels(newVal) {
            this.setLayerVisibility('barrels', newVal);
        },
        showClustered(newVal) {
            if (newVal && this.showHeatMap) {
                this.showHeatMap = false;
            }
            this.setLayerVisibility('clusters', newVal);
            this.setLayerVisibility('cluster-count', newVal);
            this.setLayerVisibility('shootings-circles', !newVal);
            this.setLayerVisibility('shootings-circles-hover', !newVal);
        },
        filter() {
            this.applyFilters();
        },
        value(newVal) {
            const [start, end] = newVal;
            if (start > end) {
                this.value = [end, end];
            }
        },
    },
    computed: {
        allLayers() {
            return [...NON_FILTERABLE_LAYERS, ...FILTERABLE_LAYERS];
        },
        startFilterDate() {
            return this.utcDates[0];
        },
        startFilterDateMs() {
            return this.startFilterDate.unix() * 1000;
        },
        endFilterDate() {
            return this.utcDates[1];
        },
        endFilterDateMs() {
            return this.endFilterDate.unix() * 1000;
        },
        startSliderDate() {
            return moment.utc(this.value[0]);
        },
        startSliderMs() {
            return this.startSliderDate.unix() * 1000;
        },
        endSliderDate() {
            return moment.utc(this.value[1]);
        },
        endSliderMs() {
            return this.endSliderDate.unix() * 1000;
        },
        sliderDistanceMs() {
            return this.value[1] - this.value[0];
        },
        dateFilter() {
            return ['all',
                ['>=', ['get', 'date'], this.startSliderMs],
                ['<=', ['get', 'date'], this.endSliderMs],
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
                    x.properties.date >= this.startSliderMs && x.properties.date <= this.endSliderMs,
                    this.injuryOnly ? x.properties.injury : true,
                ]);
            });
        },
        isPlaying() {
            return !_.isNull(this.playInterval);
        },
        utcDates() {
            return _.map(this.pickerDates, x => moment(x).utc(true));
        },
    },
    methods: {
        setLayerVisibility(layerId, isVisible) {
            window.$mapbox.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        },
        incrementPlay() {
            this.setPlayInterval(this.playIntervalSpeed - 50);
        },
        decrementPlay() {
            this.setPlayInterval(this.playIntervalSpeed + 50);
        },
        moveToFilterStart() {
            this.value = [this.startFilterDateMs, this.startFilterDateMs + this.sliderDistanceMs];
        },
        moveToFilterEnd() {
            this.value = [this.endFilterDateMs - this.sliderDistanceMs, this.endFilterDateMs];
        },
        handleKeyDown($e) {
            switch ($e.key) {
                case 'z':
                    this.decrementPlay();
                    break;
                case 'x':
                    this.incrementPlay();
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
            this.playIntervalSpeed = _.max([ms, 0]);
            if (playing) {
                this.startPlayer();
            }
        },
        setEndSlider(duration) {
            const newSliderEndDate = moment.utc(this.value[0]).add(1, duration);
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
            const newRange = [date.unix() * 1000, this.pickerDates[1]];
            this.applyDateRange(newRange);
        },
        setEndFilterDate(value) {
            const date = moment(value, 'YYYY-MM-DD');
            if (this.dateIsInvalid(date)) {
                return;
            }
            const newRange = [this.pickerDates[0], date.unix() * 1000];
            this.applyDateRange(newRange);
        },
        applyDateRange(value) {
            this.pickerDates = value;
            const [start, end]  = this.value;
            if (start < this.pickerDates[0] || end > this.pickerDates[1]) {
                this.value =  _.map(this.utcDates, x => x.unix() * 1000);
            }
        },
        dateIsInvalid(value) {
            const date = moment.utc(value);
            return date.isAfter(this.dataEndDate) || date.isBefore(this.dataStartDate);
        },
        incrementYear() {
            const nextYear = this.endFilterDate.clone().add(1, 'year');
            if (nextYear.isBefore(this.dataEndDate)) {
                const value = _.map(this.pickerDates, x => moment.utc(x).add(1, 'year').unix() * 1000)
                this.applyDateRange(value);
            }
        },
        decrementYear() {
            const prevYear = this.startFilterDate.clone().subtract(1, 'year');
            if (prevYear.isAfter(this.dataStartDate)) {
                const value = _.map(this.pickerDates, x => moment.utc(x).subtract(1, 'year').unix() * 1000)
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
                    _this.value[1] = this.endFilterDateMs;
                    clearInterval(_this.playInterval);
                    _this.playInterval = null;
                }
            }, this.playIntervalSpeed);
        },
        async onMapLoaded() {
            this.sourceData = await (await fetch('/shootings.geojson')).json()
            await window.$mapbox.addSource('shootings-clustered', {
                type: 'geojson',
                data: this.sourceData,
                cluster: true,
            });
            await window.$mapbox.addSource('shootings', {
                type: 'geojson',
                data: this.sourceData,
            });
            await window.$mapbox.addSource('barrels', {
                'type': 'geojson',
                'data': '/barrels.geojson',
            });
            window.$mapbox.loadImage(
                barrelImgUrl,
                (error, image) => {
                    if (error) throw error;
                    window.$mapbox.addImage('barrel', image);
                },
            );
            await Promise.all(_.map(this.allLayers, layer => window.$mapbox.addLayer(layer)));
            this.applyFilters();
            this.mapLoaded = true;
        },
        formatDateSliderTooltip(value) {
            return moment.utc(value).format('MM/DD/YYYY');
        },
        applyFilters() {
            if (!this.mapLoaded) return
            _.forEach(['shootings-clustered', 'shootings'], source => {
                window.$mapbox.getSource(source).setData({
                    type: 'FeatureCollection',
                    features: this.filteredFeatures,
                });
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

        window.$mapbox.on('click', 'clusters', e => {
            const features = $mapbox.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });

            const clusterId = features[0].properties.cluster_id;
            const pointCount = features[0].properties.point_count;

            $mapbox.getSource('shootings-clustered').getClusterLeaves(clusterId, pointCount, 0, (error, features) => {
                if (!error) {
                    this.popupVueInstance.setItems(_.map(features, 'properties'));
                    window.$popup.setLngLat(e.lngLat).addTo(window.$mapbox);
                }
            });
        });

        window.$mapbox.on('mouseenter', 'shootings-circles-hover', e => {
            window.$mapbox.getCanvas().style.cursor = 'pointer';
        });

        window.$mapbox.on('mouseleave', 'shootings-circles-hover', () => {
            window.$mapbox.getCanvas().style.cursor = '';
        });

        window.$mapbox.on('mouseenter', 'clusters', e => {
            window.$mapbox.getCanvas().style.cursor = 'pointer';
        });

        window.$mapbox.on('mouseleave', 'clusters', () => {
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
        PlayerControls,
        AboutLink,
        Icon,
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NConfigProvider,
        NNumberAnimation,
        NDrawer,
        NDrawerContent,
        NCheckbox,
        NGrid,
        NGi,
        NSpace,
        NDatePicker,
        NButtonGroup,
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
  flex-flow: column;
  justify-content: space-evenly;
  align-items: center;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 13%;
  padding: 10px;
}

#day_slider_input {
  max-width: 80%;
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
  padding: 5px 5px 5px 10px;
  align-items: center;
  justify-items: center;
  text-align: center;
  color: white;
  backdrop-filter: blur(2px);

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

#top_nav_stats {
  min-width: 18em;
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