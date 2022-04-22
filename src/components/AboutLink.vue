<template>
    <n-button @click="showInfoModal = true">
        <n-modal v-model:show="showInfoModal" :auto-focus="false">
            <n-card style="max-width: 20em; text-align: center" size="huge">
                <template #header>
                    Info
                    <icon size="18">
                        <info-outlined/>
                    </icon>
                </template>
                <p>
                    Created with <a href="https://vuejs.org/" target="_blank">Vuejs</a>,
                    <a href="https://www.naiveui.com/" target="_blank">NaiveUI</a>,
                    and <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>.
                </p>
                <p>
                    Data sourced from:<br/>
                    <a
                        href="https://www.portlandoregon.gov/police/81203"
                        target="_blank">PPB</a> and
                    <a href="https://pdx.maps.arcgis.com/apps/webappviewer/index.html?id=08e3f719c5ec4be195f17c38cff8fce3"
                       target="_blank">PBOT</a>
                </p>
            </n-card>
        </n-modal>
        <icon size="24">
            <info-outlined/>
        </icon>
    </n-button>
</template>
<script>
import {
    NButton,
    NCard,
    NModal,
} from 'naive-ui'
import { Icon } from '@vicons/utils'
import { InfoOutlined } from '@vicons/material'


export default {
    name: 'AboutLink',
    data() {
        return {
            showInfoModal: false
        }
    },
    components: {
        NButton,
        Icon,
        InfoOutlined,
        NCard,
        NModal,
    },
}
</script>