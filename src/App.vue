<template>
    <n-config-provider
            :theme="theme"
            @keydown.ctrl.up.exact="incrementYear"
            @keydown.ctrl.down.exact="decrementYear"
            @keydown="handleKeyDown"
            @keyup.space="togglePlayer">
        <main>
            <div id="map"></div>
        </main>
        <nav>
            <div id="header">
                <div id="nav_extra_icons">
                    <n-button @click="showDrawer = !showDrawer">
                        <icon size="18">
                            <filter-alt-outlined/>
                        </icon>
                    </n-button>
                    <about-link/>
                </div>
                <div id="top_nav_stats">
                    <div>
                        Displaying: {{ startSliderDate.format('YYYY-MM-DD') }} to {{ endSliderDate.format('YYYY-MM-DD') }}
                    </div>
                    <div id="shootings_count">
                        Shootings: {{ shootingsCount.toLocaleString('en-US') }}
                    </div>
                </div>
                <div id="large_date_picker" v-if="mq.lgPlus">
                    <n-date-picker type="daterange"
                                   :value="pickerDates"
                                   @update:value="applyDateRange"
                                   :is-date-disabled="dateIsInvalid"
                                   format="E. MMM do yyyy"/>
                </div>
                <div class="layer_toggles" v-if="mq.lgPlus">
                    <div>
                        Cluster <n-switch v-model:value="showClustered"/>
                    </div>
                    <div>
                        Heatmap <n-switch v-model:value="showHeatMap"/>
                    </div>
                </div>
            </div>
            <div id="small_date_pickers" v-if="mq.mdMinus">
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
        </nav>
        <footer>
            <n-slider id="day_slider_input"
                      range
                      v-model:value="sliderValue"
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
                    <n-grid cols="2" id="filters_grid">
                        <n-gi>
                            <div>
                                <n-checkbox v-model:checked="injuryOnly">
                                    Injury Only
                                </n-checkbox>
                            </div>
                            <div>
                                <n-checkbox v-model:checked="showBarrels" title="Most recently fetched and marked active">
                                    Traffic Barrels
                                </n-checkbox>
                            </div>
                            <n-space align="center">
                                <input type="number" min="0" v-model="minCasings" style="max-width: 2em" v-if="mq.smMinus">
                                <n-input-number v-model:value="minCasings" :min="0" style="width: 6em" v-else/>
                                Min Casings
                            </n-space>
                        </n-gi>
                        <n-gi>
                            <div v-if="mq.lgMinus" class="layer_toggles" style="flex-flow: column">
                                <div>
                                    <n-switch v-model:value="showClustered"/> Cluster
                                </div>
                                <div>
                                    <n-switch v-model:value="showHeatMap"/> Heatmap
                                </div>
                            </div>
                        </n-gi>
                    </n-grid>
                </n-drawer-content>
            </n-drawer>
        </footer>
        <help-modal :show-help-modal="showHelpModal"/>
    </n-config-provider>
</template>

<script>
import 'mapbox-gl/dist/mapbox-gl.css'
import _ from 'lodash'
import { createApp } from 'vue'
import moment from 'moment'
import {
    darkTheme,
    NButton,
    NCheckbox,
    NConfigProvider,
    NDatePicker,
    NDrawer,
    NDrawerContent,
    NSlider,
    NSpace,
    NGrid,
    NGi,
    NSwitch,
    NInputNumber,
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import { ArrowForwardFilled, FilterAltOutlined } from '@vicons/material'
import { Icon } from '@vicons/utils'


import Popup from './components/Popup.vue'
import AboutLink from './components/AboutLink.vue'
import HelpModal from './components/HelpModal.vue'
import SmallDatepicker from './components/SmallDatepicker.vue'
import PlayerControls from './components/PlayerControls.vue'

import { DAY_MS, FILTERABLE_LAYERS, NON_FILTERABLE_LAYERS, SOURCES, } from './constants'
import barrelImgUrl from './assets/street-barrel.png'


export default {
    name: 'App',
    inject: ['mq'],
    data() {
        const dataEndDate = moment().startOf('day').startOf('month').subtract(1, 'day');
        const start = dataEndDate.clone().subtract(1, 'year').unix() * 1000;
        const end = dataEndDate.unix() * 1000;
        return {
            mapLoaded: false,
            dataStartDate: moment.utc({year: 2019}).unix() * 1000,
            dataEndDate:  dataEndDate.unix() * 1000,
            sliderValue: [start, end],
            pickerDates: [start, end],
            showHeatMap: false,
            showClustered: true,
            showHelpModal: false,
            items: [],
            shootingsCount: 0,
            showDrawer: false,
            injuryOnly: false,
            minCasings: 0,
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
        sliderValue(newVal) {
            const [start, end] = newVal;
            if (start > end) {
                this.sliderValue = [end, end];
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
            return moment.utc(this.sliderValue[0]);
        },
        startSliderMs() {
            return this.startSliderDate.unix() * 1000;
        },
        endSliderDate() {
            return moment.utc(this.sliderValue[1]);
        },
        endSliderMs() {
            return this.endSliderDate.unix() * 1000;
        },
        sliderDistanceMs() {
            return this.sliderValue[1] - this.sliderValue[0];
        },
        filteredFeatures() {
            return _.filter(this.sourceData.features, x => {
                return _.every([
                    x.properties.date >= this.startSliderMs && x.properties.date <= this.endSliderMs,
                    this.injuryOnly ? x.properties.injury : true,
                    this.minCasings ?  x.properties.casings >= this.minCasings : true,
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
            this.setPlayInterval(this.playIntervalSpeed / 2);
        },
        decrementPlay() {
            this.setPlayInterval(this.playIntervalSpeed * 2);
        },
        moveToFilterStart() {
            this.sliderValue = [this.startFilterDateMs, this.startFilterDateMs + this.sliderDistanceMs];
        },
        moveToFilterEnd() {
            this.sliderValue = [this.endFilterDateMs - this.sliderDistanceMs, this.endFilterDateMs];
        },
        handleKeyDown($e) {
            switch ($e.key) {
                case '?':
                    this.showHelpModal = true;
                    break;
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
            const newSliderEndDate = moment.utc(this.sliderValue[0]).add(1, duration);
            if (newSliderEndDate.isAfter(this.endFilterDate)) {
                this.sliderValue[1] = this.endFilterDateMs;
            } else {
                this.sliderValue[1] = newSliderEndDate.unix() * 1000;
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
            const [start, end]  = this.sliderValue;
            if (start < this.pickerDates[0] || end > this.pickerDates[1]) {
                this.sliderValue =  _.map(this.utcDates, x => x.unix() * 1000);
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
                const nextStep = _this.sliderValue[1] + _this.step;
                if (nextStep < _this.endFilterDateMs) {
                    _this.sliderValue = _.map(_this.sliderValue, x => x + _this.step);
                } else {
                    _this.sliderValue[1] = this.endFilterDateMs;
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
            window.$mapbox.on('sourcedata', e => {
                if (e.sourceId === 'shootings-clustered' && e.isSourceLoaded) {
                    this.applyFilters();
                }
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
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

        window.$mapbox = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v10',
            center: [-122.67598626624789, 45.51939452327494],
            zoom: 12,
        });

        window.$mapbox.on('load', this.onMapLoaded);

        const onClickSetItems = (e) => {
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
        }

        window.$mapbox.on('click', 'shootings-circles-hover', onClickSetItems);
        window.$mapbox.on('click', 'cluster-point-hover', onClickSetItems);

        window.$mapbox.on('click', 'clusters', e => {
            const features = window.$mapbox.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });

            const clusterId = features[0].properties.cluster_id;
            const pointCount = features[0].properties.point_count;

            window.$mapbox.getSource('shootings-clustered').getClusterLeaves(clusterId, pointCount, 0, (error, features) => {
                if (!error) {
                    this.popupVueInstance.setItems(_.map(features, 'properties'));
                    window.$popup.setLngLat(e.lngLat).addTo(window.$mapbox);
                }
            });
        });

        _.forEach(['shootings-circles-hover', 'clusters', 'cluster-point-hover'], layerId => {
            window.$mapbox.on('mouseenter', layerId, e => {
                window.$mapbox.getCanvas().style.cursor = 'pointer';
            });
            window.$mapbox.on('mouseleave', layerId, () => {
                window.$mapbox.getCanvas().style.cursor = '';
            });
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
        AboutLink,
        ArrowForwardFilled,
        FilterAltOutlined,
        HelpModal,
        Icon,
        NButton,
        NCheckbox,
        NConfigProvider,
        NDatePicker,
        NDrawer,
        NDrawerContent,
        NSlider,
        NSpace,
        NGrid,
        NGi,
        NSwitch,
        NInputNumber,
        PlayerControls,
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
  flex-flow: column;
  justify-content: space-around;
  align-items: center;
  position: fixed;
  right: 0;
  top: 0;
  width: 100%;
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

#app, #map {
  width: 100vw;
  height: 100vh;
}

#header {
  display: flex;
  flex-flow: row wrap;
  flex-direction: row-reverse;
  padding: 5px 5px 5px 10px;
  align-items: center;
  text-align: center;
  color: white;
  backdrop-filter: blur(2px) brightness(60%);
  -webkit-backdrop-filter: blur(2px) brightness(60%);

  > div {
    margin: .25em;
    font-weight: 500;
  }
}

.layer_toggles {
  display: flex;
  > div {
    margin: .5em;
  }
}

#nav_extra_icons {
  justify-self: flex-end;

  > button {
    margin: 0 .5em;
  }
}

#small_date_pickers {
    display: flex;
    align-items: center;
    margin: 1em;
}

#top_nav_stats {
  display: flex;
  flex-flow: row wrap;
  font-size: 13px;
  > div {
    margin: .5em;
  }
}

#shootings_count {
  min-width: 8em;
}

#filters_grid {
  > div > div {
    margin-bottom: 1em;
  }
}
</style>
