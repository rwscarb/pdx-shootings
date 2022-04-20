<template>
    <main @keyup.up.ctrl="incrementYear"
          @keyup.down.ctrl="decrementYear"
          @keyup.space.ctrl="togglePlayer">
        <div id="map"></div>
    </main>
    <nav>
        <div id="top_right_tools">
            <div>
                Heatmap <n-switch v-model:value="showHeatMap"/>
            </div>
            <div id="filter_date_picker">
                <n-date-picker type="daterange"
                    :value="[startFilterDateMs, endFilterDateMs]"
                    @update:value="applyDateRange"
                    :is-date-disabled="isDateDisabled"
                    format="E. MMM do yyyy"
                />
            </div>
            <div id="top_nav_stats">
                <div class="fixed_width_date">
                    Displaying: {{ startSliderDate.format('YYYY-MM-DD') }} to {{ endSliderDate.format('YYYY-MM-DD') }}
                </div>
                Shootings:
                <n-number-animation
                        show-separator
                        :from="0"
                        :to="shootingsCount"
                        :duration="500"/>
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
                  :max="endFilterDateMs"
        />
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
import { FilterAltOutlined } from '@vicons/material'
import { Icon } from '@vicons/utils'


import Popup from './components/Popup.vue'
import AboutLink from './components/AboutLink.vue'

import { filterableLayers, nonFilterableLayers, MAX_ZOOM, MIN_ZOOM } from './constants'
import barrelImgUrl from './assets/street-barrel.png'


export default {
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
            step: 1000 * 60 * 60 * 24,
            playInterval: null,
            playIntervalSpeed: 400,
        };
    },
    watch: {
        showHeatMap(newVal) {
            const visibility = newVal ? 'visible' : 'none';
            window.$mapbox.setLayoutProperty('shootings-heatmap', 'visibility', visibility);
        },
        showBarrels(newVal) {
            const visibility = newVal ? 'visible' : 'none';
            window.$mapbox.setLayoutProperty('barrels', 'visibility', visibility);
        },
        filter() {
            this.applyFilters();
        },
    },
    computed: {
        allLayers() {
            return [...nonFilterableLayers, ...filterableLayers];
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
        endFilterDate() {
            return moment(this.dates[1]);
        },
        endFilterDateMs() {
            return this.endFilterDate.unix() * 1000;
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
    },
    methods: {
        applyDateRange(value) {
            this.dates = value;
            this.value = value;
        },
        isDateDisabled(value) {
            const year = moment(value).year();
            return year > this.maxYear || year < this.minYear;
        },
        togglePlayer() {
            if (!_.isNull(this.playInterval)) {
                clearInterval(this.playInterval);
                this.playInterval = null;
            } else {
                this.playInterval = setInterval(() => {
                    const nextStep = this.value[1] + this.step;
                    if (nextStep < this.endFilterDateMs) {
                        this.value = _.map(this.value, x => x + this.step);
                    } else {
                        clearInterval(this.playInterval);
                        this.playInterval = null;
                    }
                }, this.playIntervalSpeed);
            }

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
        await Promise.all(_.map(['shootings', 'barrels'], layer => window.$mapbox.removeSource(layer.id)));
    },
    components: {
        Icon,
        AboutLink,
        NSlider,
        NDropdown,
        NButton,
        NSwitch,
        NNumberAnimation,
        FilterAltOutlined,
        NDrawer,
        NDrawerContent,
        NCheckbox,
        NGrid,
        NGi,
        NSpace,
        NDatePicker,
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

.fixed_width_date {
  min-width: 19em;
}

@media only screen and (max-width: 600px) {
    #filter_date_picker {
        order: 3;
    }
    #top_nav_stats {
        order: 2;
    }
}
@media only screen and (max-width: 1000px) {
    #top_nav_stats {
        order: 1;
    }
}
</style>