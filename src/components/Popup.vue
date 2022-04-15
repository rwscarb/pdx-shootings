<template>
    <div class="vue_popup">
        <div v-for="item in uniqueItems">
            <div class="vue_popup_header">
                <n-statistic label="Incident">
                    {{ item.id }}
                </n-statistic>
                <n-statistic label="Date">
                    {{ getDateString(item.date) }}
                </n-statistic>
            </div>
            <div class="vue_popup_main">
                <n-statistic label="Casings">
                    <n-number-animation
                        :from="0"
                        :to="item.casings"
                        :duration="1500"
                    />
                </n-statistic>
                <n-statistic label="Injury" v-if="item.injury">
                    <Icon>
                        <PersonalInjuryRound/>
                    </Icon>
                </n-statistic>
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'lodash'
import moment from 'moment'

import { NStatistic, NNumberAnimation } from 'naive-ui'
import { Icon } from '@vicons/utils'
import { PersonalInjuryRound } from '@vicons/material'

export default {
    data() {
        return {
            items: [],
        };
    },
    computed: {
        uniqueItems() {
            return _.uniqBy(this.items, 'id');
        }
    },
    methods: {
        setItems(items) {
            this.items = items;
        },
        getDateString(ms) {
            return moment.utc(ms).format('YYYY-MM-DD');
        },
    },
    components: {
        NStatistic,
        NNumberAnimation,
        PersonalInjuryRound,
        Icon,
    },
};
</script>

<style lang="less">
.vue_popup_header {
    display: flex;
    justify-content: space-between;
    .n-statistic:first-of-type {
        margin-right: 10px;
    }
    .n-statistic .n-statistic-value .n-statistic-value__content {
        font-size: 15px;
    }
}
.vue_popup_main {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    margin-top: 5px;
}
</style>