<template>
    <main @keyup.up.ctrl="incrementYear"
          @keyup.down.ctrl="decrementYear">
        <div id="map"></div>
    </main>
    <nav>
        <n-grid id="top_right_tools" cols="5">
            <n-gi>
                Heatmap <n-switch v-model:value="showHeatMap"/>
            </n-gi>
            <n-gi>
                Year
                <n-dropdown trigger="hover"
                            :options="yearOptions"
                            @select="e => year = e"
                            size="large"
                            id="select_year_dropdown">
                    <n-button>{{ year }}</n-button>
                </n-dropdown>
            </n-gi>
            <n-gi>
                Date:
                <div class="fixed_width_date">{{ startFilterDate.format('MMM Do') }}</div>
                to
                <div class="fixed_width_date">{{ endFilterDate.format('MMM Do') }}</div>
            </n-gi>
            <n-gi>
                Shootings:
                <n-number-animation
                        show-separator
                        :from="0"
                        :to="shootingsCount"
                        :duration="500"/>
            </n-gi>
            <n-gi id="nav_extra_icons">
                <n-button @click="showDrawer = !showDrawer">
                    <icon size="24">
                        <filter-alt-outlined/>
                    </icon>
                </n-button>
                <about-link/>
            </n-gi>
        </n-grid>
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
        <n-drawer v-model:show="showDrawer" placement="bottom">
            <n-drawer-content title="Filters">
                <n-space style="display: flex" vertical>
                    <n-checkbox v-model:checked="injuryOnly">
                        Injury Only
                    </n-checkbox>
                    <n-checkbox v-model:checked="showBarrels">
                        Show Traffic Barrels
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
    NSpace
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import { FilterAltOutlined } from '@vicons/material'
import { Icon } from '@vicons/utils'


import Popup from './components/Popup.vue'
import AboutLink from './components/AboutLink.vue'

import { filterableLayers, nonFilterableLayers } from './constants'
import barrelImgUrl from './assets/street-barrel.png'


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
            showDrawer: false,
            injuryOnly: false,
            showBarrels: false,
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
        year() {
            this.applyFilters();
        },
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
        injuryFilter() {
            return ['any', ['!', this.injuryOnly], ['get', 'injury']];
        },
        filter() {
            return ['all', this.dateFilter, this.injuryFilter];
        },
        filteredFeatures() {
            return _.filter(this.sourceData.features, x => {
                return _.every([
                    x.properties.date >= this.startFilterDateMs && x.properties.date <= this.endFilterDateMs,
                    this.injuryOnly ? x.properties.injury : true,
                ]);
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
            await Promise.all(_.map([...filterableLayers, ...nonFilterableLayers], layer => window.$mapbox.addLayer(layer)));
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
  display: inline-block;
  min-width: 4.3em;
}
</style>