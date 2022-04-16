<template>
    <div class="vue_popup">
        <n-badge>
            <template #value>
                <Icon v-if="hasInjury">
                    <PersonalInjuryRound/>
                </Icon>
            </template>
            <n-statistic label="Casings Recovered">
                <n-number-animation
                        :from="0"
                        :to="totalCasings"
                        :duration="2000"/>
            </n-statistic>
        </n-badge>
        <n-divider></n-divider>
        <n-collapse v-if="!loading">
            <n-collapse-item v-for="item in uniqueItems">
                <template #header>
                    {{ getDateString(item.date) }}
                    <span style="margin: 0 10px">Casings: {{ item.casings }}</span>
                    <Icon v-if="item.injury">
                        <PersonalInjuryRound/>
                    </Icon>
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

import { NStatistic, NNumberAnimation, NCollapse, NCollapseItem, NTable, NDivider, NBadge } from 'naive-ui'
import { Icon } from '@vicons/utils'
import { PersonalInjuryRound } from '@vicons/material'

export default {
    data() {
        return {
            items: [],
            loading: false,
        };
    },
    computed: {
        uniqueItems() {
            return _.uniqBy(this.items, 'id');
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
    },
};
</script>

<style lang="less">
.vue_popup {
  max-height: 15em;
  min-width: 217px;
  overflow-y: auto;
  padding-right: 13px;
  padding-top: 10px;
}

.incident_table {
  margin-left: -12px;
}

.n-table td {
  white-space: nowrap;
}
</style>