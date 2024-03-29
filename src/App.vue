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
                    <n-button @click="showHelpModal = !showHelpModal">
                        <icon size="18">
                            <help-outline-outlined/>
                        </icon>
                    </n-button>
                    <n-button @click="showDrawer = !showDrawer">
                        <icon size="18" :color="hasAppliedFilters ? 'rgb(42, 148, 125)' : undefined">
                            <filter-alt-twotone v-if="hasAppliedFilters"/>
                            <filter-alt-outlined v-else/>
                        </icon>
                    </n-button>
                    <n-popover placement="bottom" trigger="hover" @update:show="updateDeepLink">
                        <template #trigger>
                            <n-button>
                                <icon size="18">
                                    <share-outlined/>
                                </icon>
                            </n-button>
                        </template>
                        <span><a :href="deepLink" style="color: white">Sharable Link</a></span>
                    </n-popover>
                    <about-link/>
                </div>
                <div id="top_nav_stats" :style="`font-size: ${mq.lgPlus ? 14 : 12}px`">
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
                    <div>
                        Satellite <n-switch v-model:value="showSatellite"/>
                    </div>
                </div>
            </div>
            <div id="small_date_pickers" v-if="mq.mdMinus">
                <small-datepicker
                        @update:value="setStartFilterDate"
                        :value="startFilterDateDisplay"/>
                <icon style="margin: 0 1em">
                    <arrow-forward-filled/>
                </icon>
                <small-datepicker
                        @update:value="setEndFilterDate"
                        :value="endFilterDateDisplay"/>
            </div>
        </nav>
        <footer>
            <n-slider id="day_slider_input"
                      range
                      v-model:value="dateSliderValue"
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
                                <input type="number" pattern="\d*" min="0" v-model="minCasings" style="max-width: 2em" v-if="mq.smMinus">
                                <n-input-number v-model:value="minCasings" :min="0" style="width: 6em" v-else/>
                                Min Casings
                            </n-space>
                        </n-gi>
                        <n-gi>
                            <label for="hour_slider_input">Time of Day</label>
                            <n-slider id="hour_slider_input"
                                  range
                                  v-model:value="hourSliderValue"
                                  :format-tooltip="formatHourSliderTooltip"
                                  :min="0"
                                  :max="24"/>
                            <div v-if="mq.lgMinus" class="layer_toggles" style="justify-content: space-evenly">
                                <div>
                                    <n-switch v-model:value="showClustered"/> Cluster
                                </div>
                                <div>
                                    <n-switch v-model:value="showHeatMap"/> Heatmap
                                </div>
                                <div>
                                    <n-switch v-model:value="showSatellite"/> Satellite
                                </div>
                            </div>
                        </n-gi>
                    </n-grid>
                </n-drawer-content>
            </n-drawer>
        </footer>
        <help-modal :show-help-modal="showHelpModal" @show="showHelpModal = $event"/>
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
    NPopover,
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import {
    ArrowForwardFilled,
    FilterAltOutlined,
    FilterAltTwotone,
    ShareOutlined,
    HelpOutlineOutlined,
} from '@vicons/material'
import { Icon } from '@vicons/utils'


import Popup from './components/Popup.vue'
import AboutLink from './components/AboutLink.vue'
import HelpModal from './components/HelpModal.vue'
import SmallDatepicker from './components/SmallDatepicker.vue'
import PlayerControls from './components/PlayerControls.vue'

import {
    DARK_STYLE,
    DAY_MS,
    FILTERABLE_LAYERS,
    NON_FILTERABLE_LAYERS,
    SATELLITE_STYLE,
    SOURCES,
} from './constants'
import barrelImgUrl from './assets/street-barrel.png'


export default {
    name: 'App',
    inject: ['mq'],
    data() {
        const dataEndDate = moment().startOf('day').startOf('month').subtract(1, 'day');
        const start = dataEndDate.clone().subtract(1, 'year').unix() * 1000;
        const end = dataEndDate.unix() * 1000;

        const url = new URL(document.location.href);
        const params = new URLSearchParams(url.search);

        return {
            mapLoaded: false,
            params: params,
            dataStartDate: moment({year: 2019}).unix() * 1000,
            dataEndDate:  dataEndDate.unix() * 1000,
            dateSliderValue: [start, end],
            hourSliderValue: [0, 24],
            pickerDates: [start, end],
            showHeatMap: false,
            showHelpModal: false,
            items: [],
            shootingsCount: 0,
            showDrawer: false,
            injuryOnly: false,
            minCasings: 0,
            showClustered: !params.has('nocluster'),
            showBarrels: params.has('barrels'),
            showSatellite: params.has('satellite'),
            step: DAY_MS,
            playInterval: null,
            playIntervalSpeed: 400,
            deepLink: '',
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
        showSatellite(newVal) {
            const style = newVal ? SATELLITE_STYLE : DARK_STYLE;
            window.$mapbox.setStyle(style);
            window.$mapbox.once('styledata', async () => {
                await this.addSources();
                await this.addLayers();
                this.setClusterLayerVisibility(this.showClustered);
                this.setLayerVisibility('shootings-heatmap', this.showHeatMap);
                this.setLayerVisibility('barrels', this.showBarrels);
            });
        },
        showClustered(newVal) {
            if (newVal && this.showHeatMap) {
                this.showHeatMap = false;
            }
            this.setClusterLayerVisibility(newVal);
        },
        dateSliderValue(newVal) {
            const [start, end] = newVal;
            if (start > end) {
                this.dateSliderValue = [end, end];
            }
        },
    },
    computed: {
        allLayers() {
            return [...NON_FILTERABLE_LAYERS, ...FILTERABLE_LAYERS];
        },
        startFilterDateUtc() {
            return this.pickerDates ? moment(this.pickerDates[0]).utc(true) : moment.utc();
        },
        startFilterDateMs() {
            return this.startFilterDateUtc.unix() * 1000;
        },
        startFilterDateDisplay() {
            return moment(this.pickerDates[0]).format('YYYY-MM-DD');
        },
        endFilterDateUtc() {
            return this.pickerDates ? moment(this.pickerDates[1]).utc(true) : moment.utc();
        },
        endFilterDateMs() {
            return this.endFilterDateUtc.unix() * 1000;
        },
        endFilterDateDisplay() {
            return moment(this.pickerDates[1]).format('YYYY-MM-DD');
        },
        startSliderDate() {
            return moment.utc(this.dateSliderValue[0]);
        },
        startSliderMs() {
            return this.startSliderDate.unix() * 1000;
        },
        endSliderDate() {
            return moment.utc(this.dateSliderValue[1]);
        },
        endSliderMs() {
            return this.endSliderDate.unix() * 1000;
        },
        sliderDistanceMs() {
            return this.dateSliderValue[1] - this.dateSliderValue[0];
        },
        filteredFeatures() {
            return _.filter(this.sourceData.features, x => {
                return _.every([
                    x.properties.date >= this.startSliderMs && x.properties.date <= this.endSliderMs,
                    x.properties.start_hour <= this.hourSliderValue[1] && x.properties.end_hour >= this.hourSliderValue[0],
                    this.injuryOnly ? x.properties.injury : true,
                    this.minCasings ?  x.properties.casings >= this.minCasings : true,
                ]);
            });
        },
        isPlaying() {
            return !_.isNull(this.playInterval);
        },
        hasAppliedFilters() {
            return _.some([
                this.injuryOnly,
                this.minCasings,
                this.hourSliderValue[0],
                this.hourSliderValue[1] !== 24
            ]);
        },
    },
    methods: {
        setLayerVisibility(layerId, isVisible) {
            window.$mapbox.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        },
        setClusterLayerVisibility(isVisible) {
            this.setLayerVisibility('clusters', isVisible);
            this.setLayerVisibility('cluster-count', isVisible);
            this.setLayerVisibility('shootings-circles', !isVisible);
            this.setLayerVisibility('shootings-circles-hover', !isVisible);
        },
        incrementPlay() {
            this.setPlayInterval(this.playIntervalSpeed / 2);
        },
        decrementPlay() {
            this.setPlayInterval(this.playIntervalSpeed * 2);
        },
        moveToFilterStart() {
            this.dateSliderValue = [this.startFilterDateMs, this.startFilterDateMs + this.sliderDistanceMs];
        },
        moveToFilterEnd() {
            this.dateSliderValue = [this.endFilterDateMs - this.sliderDistanceMs, this.endFilterDateMs];
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
                case 'f':
                    this.showDrawer = true;
                    break;
                case 'i':
                    this.injuryOnly = !this.injuryOnly;
                    break;
                case 'b':
                    this.showBarrels = !this.showBarrels;
                    break;
                case 'c':
                    this.showClustered = !this.showClustered;
                    break;
                case 's':
                    this.showSatellite = !this.showSatellite;
                    break;
                case 'h':
                    this.showHeatMap = !this.showHeatMap;
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
            const newSliderEndDate = moment.utc(this.dateSliderValue[0]).add(1, duration);
            if (newSliderEndDate.isAfter(this.endFilterDateUtc)) {
                this.dateSliderValue[1] = this.endFilterDateMs;
            } else {
                this.dateSliderValue[1] = newSliderEndDate.unix() * 1000;
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
            this.dateSliderValue =  _.map(value, x => moment(x).utc(true).unix() * 1000);
        },
        dateIsInvalid(value) {
            const date = moment.utc(value);
            return date.isAfter(this.dataEndDate) || date.isBefore(this.dataStartDate);
        },
        incrementYear() {
            const nextYear = this.endFilterDateUtc.clone().add(1, 'year');
            if (nextYear.isBefore(this.dataEndDate)) {
                const value = _.map(this.pickerDates, x => moment.utc(x).add(1, 'year').unix() * 1000)
                this.applyDateRange(value);
            }
        },
        decrementYear() {
            const prevYear = this.startFilterDateUtc.clone().subtract(1, 'year');
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
                const nextStep = _this.dateSliderValue[1] + _this.step;
                if (nextStep < _this.endFilterDateMs) {
                    _this.dateSliderValue = _.map(_this.dateSliderValue, x => x + _this.step);
                } else {
                    _this.dateSliderValue[1] = this.endFilterDateMs;
                    clearInterval(_this.playInterval);
                    _this.playInterval = null;
                }
            }, this.playIntervalSpeed);
        },
        async onMapLoaded() {
            this.sourceData = await (await fetch('/shootings.geojson', {cache: 'no-cache'})).json();

            const features = _.sortBy(this.sourceData.features, 'properties.date');
            this.dataStartDate = moment.utc(_.head(features).properties.date)
                .local(true)
                .startOf('month');
            this.dataEndDate = moment.utc(_.last(features).properties.date)
                .local(true)
                .endOf('month').startOf('day');

            let start = moment(this.dataEndDate).subtract(1, 'year').unix() * 1000;
            if (this.params.has('start_date')) {
                const paramStartDate = moment(this.params.get('start_date'), 'YYYY-MM-DD');
                if (paramStartDate.isValid() && !this.dateIsInvalid(paramStartDate)) {
                    start = paramStartDate.unix() * 1000;
                }
            }

            let end = this.dataEndDate.local(true).unix() * 1000;
            if (this.params.has('end_date')) {
                const paramEndDate = moment(this.params.get('end_date'), 'YYYY-MM-DD');
                if (paramEndDate.isValid() && !this.dateIsInvalid(paramEndDate)) {
                    end = paramEndDate.unix() * 1000;
                }
            }

            let startHour = 0;
            if (this.params.has('start_hour')) {
                const paramStartHour = parseInt(this.params.get('start_hour'));
                if (paramStartHour >= 0 && paramStartHour <= 24) {
                    startHour = paramStartHour;
                }
            }
            let endHour = 24;
            if (this.params.has('end_hour')) {
                const paramEndHour = parseInt(this.params.get('end_hour'));
                if (paramEndHour >= 0 && paramEndHour <= 24) {
                    endHour = paramEndHour;
                }
            }
            this.hourSliderValue = [startHour, endHour];

            if (this.params.has('injury')) {
                this.injuryOnly = true;
            }

            if (this.params.has('casings')) {
                this.minCasings = parseInt(this.params.get('casings'));
            }

            if (this.params.has('lng') && this.params.has('lat')) {
                window.$mapbox.flyTo({
                    center: {
                        lat: parseFloat(this.params.get('lat')),
                        lng: parseFloat(this.params.get('lng')),
                    },
                    zoom: parseFloat(this.params.get('zoom')) ?? 14
                })
            }

            this.applyDateRange([start, end]);

            await this.addSources();
            await this.addLayers();

            if (this.params.has('nocluster')) {
                this.showClustered = false;
                this.setClusterLayerVisibility(false);
            }

            if (this.params.has('heatmap')) {
                this.showHeatMap = true;
                this.setClusterLayerVisibility(false);
            }

            if (this.params.has('barrels')) {
                this.setLayerVisibility('barrels', true);
            }

            window.$mapbox.resize();

            this.mapLoaded = true;
        },
        addLayers() {
            _.forEach(this.allLayers, layer => {
                if (!window.$mapbox.getLayer(layer.id)) {
                    window.$mapbox.addLayer(layer);
                }
            });
        },
        removeLayers() {
            _.forEach(this.allLayers, layer => {
                if (window.$mapbox.getLayer(layer.id)) {
                    window.$mapbox.removeLayer(layer.id);
                }
            });
        },
        removeSources() {
            _.forEach(SOURCES, source => {
                if (window.$mapbox.getSource(source.id)) {
                    window.$mapbox.removeSource(source.id);
                }
            });
        },
        async addSources() {
            if (!window.$mapbox.getSource('shootings-clustered')) {
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
            }
            if (!window.$mapbox.getSource('shootings')) {
                await window.$mapbox.addSource('shootings', {
                    type: 'geojson',
                    data: this.sourceData,
                });
            }
            if (!window.$mapbox.getSource('barrels')) {
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
            }
        },
        formatDateSliderTooltip(value) {
            return moment.utc(value).format('MM/DD/YYYY');
        },
        formatHourSliderTooltip(value) {
            return `${_.padStart(value, 2, '0')}:00`;
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
        updateDeepLink() {
            const url = new URL(document.location.origin);
            const coords = window.$mapbox.getCenter();
            const zoom = window.$mapbox.getZoom();
            url.searchParams.set('lng', _.toString(_.round(coords.lng, 6)));
            url.searchParams.set('lat', _.toString(_.round(coords.lat, 6)));
            url.searchParams.set('zoom', _.toString(_.round(zoom, 3)));
            url.searchParams.set('start_date', this.startSliderDate.format('YYYY-MM-DD'));
            url.searchParams.set('end_date', this.endSliderDate.format('YYYY-MM-DD'));
            if (!_.isEqual(this.hourSliderValue, [0, 24])) {
                url.searchParams.set('start_hour', _.toString(this.hourSliderValue[0]));
                url.searchParams.set('end_hour', _.toString(this.hourSliderValue[1]));
            }
            if (this.injuryOnly) {
                url.searchParams.set('injury', 'true');
            }
            if (this.showBarrels) {
                url.searchParams.set('barrels', 'true');
            }
            if (this.minCasings) {
                url.searchParams.set('casings', _.toString(this.minCasings));
            }
            if (this.showHeatMap) {
                url.searchParams.set('heatmap', 'true');
            }
            if (this.showSatellite) {
                url.searchParams.set('satellite', 'true');
            }
            if (!this.showClustered) {
                url.searchParams.set('nocluster', 'true');
            }
            this.deepLink = url.toString();
        },
    },
    mounted() {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

        window.$mapbox = new mapboxgl.Map({
            container: 'map',
            style: this.showSatellite ? SATELLITE_STYLE : DARK_STYLE,
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
        this.sourceData = {
            type: 'FeatureCollection',
            features: [],
        };
    },
    async unmounted() {
        this.removeLayers();
        this.removeSources();
    },
    components: {
        AboutLink,
        ArrowForwardFilled,
        FilterAltOutlined,
        FilterAltTwotone,
        ShareOutlined,
        HelpOutlineOutlined,
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
        NPopover,
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

label[for="hour_slider_input"] {
  display: block;
  margin-bottom: 1em;
  text-align: center;
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
