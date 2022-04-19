<template>
    <div class="vue_popup">
        <n-grid cols="2" style="margin-left: 1em">
            <n-gi>
                <n-statistic label="Casings">
                    <n-number-animation
                            :from="0"
                            :to="totalCasings"
                            :duration="1000"/>
                </n-statistic>
            </n-gi>
            <n-gi>
                <n-statistic>
                    <template #label>
                        <span :class="{injury: hasInjury}">
                            Incidents
                        </span>
                    </template>
                    <n-number-animation
                            :from="0"
                            :to="sortedUniqueItems.length"
                            :duration="1000"/>
                </n-statistic>
            </n-gi>
        </n-grid>
        <n-divider></n-divider>
        <n-collapse v-if="!loading">
            <n-collapse-item v-for="item in sortedUniqueItems">
                <template #header>
                    <div class="collapse_header">
                        <div>
                            {{ getDateString(item.date) }}
                        </div>
                        <div style="flex-grow: 1">
                            <span style="margin: 0 10px">Casings: {{ item.casings }}</span>
                        </div>
                        <div style="text-align: right">
                            <icon class="injury">
                                <personal-injury-round v-if="item.injury"/>
                            </icon>
                        </div>
                    </div>
                </template>
                <n-table class="incident_table">
                    <tbody>
                    <tr>
                        <th>Incident:</th>
                        <td>{{ item.id }}</td>
                    </tr>
                    <tr>
                        <th>Date:</th>
                        <td>{{ getDateString(item.date) }}</td>
                    </tr>
                    <tr>
                        <th>Personal Injury:</th>
                        <td>{{ item.injury ? 'Yes' : 'No' }}</td>
                    </tr>
                    <tr>
                        <th>Casings:</th>
                        <td>{{ item.casings }}</td>
                    </tr>
                    <tr>
                        <th>Precinct:</th>
                        <td>{{ item.precinct }}</td>
                    </tr>
                    <tr>
                        <th :title="item.block_address" colspan="2">
                             <a target="_blank" :href="getGoogleStreetViewUrl(item)">Google Street View &copy;</a>
                        </th>
                    </tr>
                    </tbody>
                </n-table>
            </n-collapse-item>
        </n-collapse>
    </div>
</template>

<script>
import _ from 'lodash'
import moment from 'moment'

import {
    NStatistic,
    NNumberAnimation,
    NCollapse,
    NCollapseItem,
    NTable,
    NDivider,
    NBadge,
    NGrid,
    NGi,
} from 'naive-ui'
import { Icon } from '@vicons/utils'
import { PersonalInjuryRound } from '@vicons/material'

export default {
    data() {
        return {
            items: [],
            loading: false,
        };
    },
    watch: {
        loading() {
            this.$el.scrollTo(0, 0);
        }
    },
    computed: {
        uniqueItems() {
            return _.uniqBy(this.items, 'id');
        },
        sortedUniqueItems() {
            return _.orderBy(this.uniqueItems, 'date');
        },
        hasInjury() {
            return _.some(this.uniqueItems, x => x.injury);
        },
        totalCasings() {
            return _.sumBy(this.uniqueItems, 'casings');
        },
    },
    methods: {
        async setItems(items) {
            // loading is done due to no programmatic control of NCollapseItem
            this.loading = true;
            await this.$nextTick();
            this.items = items;
            this.loading = false;
        },
        getDateString(ms) {
            return moment.utc(ms).format('YYYY-MM-DD');
        },
        getGoogleStreetViewUrl(item) {
            const location = JSON.parse(item.location);
            return `//maps.google.com/maps?q=&layer=c&cbll=${location[1]},${location[0]}`;
        },
    },
    components: {
        NStatistic,
        NNumberAnimation,
        PersonalInjuryRound,
        Icon,
        NCollapse,
        NCollapseItem,
        NTable,
        NDivider,
        NBadge,
        NGrid,
        NGi,
    },
};
</script>

<style lang="less" scoped>
.vue_popup {
  max-height: 15em;
  min-width: 217px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 13px;
  padding-top: 10px;
}

.collapse_header {
  display: flex;
  justify-content: space-between;
  min-width: 13em;
}

.n-table td {
  white-space: nowrap;
}

.n-table {
  margin: 0;
}

.injury {
  color: #D03050;
}
</style>