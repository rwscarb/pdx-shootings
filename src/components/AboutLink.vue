<template>
    <n-button @click="showInfoModal = true">
        <n-modal v-model:show="showInfoModal">
            <n-card style="max-width: 20em; text-align: center" size="huge">
                <template #header style="vertical-align: middle">
                    Info
                    <Icon size="18" style="vertical-align: middle; margin-top: -3px">
                        <InfoOutlined/>
                    </Icon>
                </template>
                <p>
                    Created with <a href="https://vuejs.org/" target="_blank">Vuejs</a>,
                    <a href="https://www.naiveui.com/" target="_blank">NaiveUI</a>,
                    and <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>.
                </p>
                <p>Data sourced from: <a
                        href="https://public.tableau.com/views/PPBOpenDataDownloads/Shootings.csv?:showVizHome=no"
                        target="_blank">PPB</a></p>
                <template #footer>
                    Author: <a href="mailto:ryan.scarbery@gmail.com">Ryan Scarbery</a>
                </template>
            </n-card>
        </n-modal>
        <Icon size="24" style="vertical-align: middle">
            <InfoOutlined/>
        </Icon>
    </n-button>
</template>
<script>
import {
    NButton,
    NDivider,
    NNumberAnimation,
    NSpace,
    NCard,
    NModal,
} from 'naive-ui'
import { Icon } from '@vicons/utils'
import { InfoOutlined } from '@vicons/material'


export default {
    name: 'About',
    data() {
        return {
            showInfoModal: false
        }
    },
    components: {
        NButton,
        Icon,
        InfoOutlined,
        NSpace,
        NDivider,
        NNumberAnimation,
        NCard,
        NModal,
    },
}
</script>
<style lang="less">
</style>