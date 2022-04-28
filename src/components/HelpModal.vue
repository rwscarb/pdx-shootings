<template>
    <div id="help">
        <n-modal v-model:show="showHelpModal" :auto-focus="false" preset="card" style="max-width: 50em">
            <n-card>
                <template #header>
                    <div style="text-align: center">
                        Help
                        <icon size="18">
                            <help-outline-round/>
                        </icon>
                    </div>
                </template>
                <h3>Keyboard Shortcuts</h3>
                <n-table>
                    <thead>
                    <tr>
                        <th>Key</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="shortcut in shortcuts" :key="shortcut.key">
                        <td><n-tag>{{ shortcut.key }}</n-tag></td>
                        <td>{{ shortcut.description }}</td>
                    </tr>
                    </tbody>
                </n-table>
            </n-card>
        </n-modal>
    </div>
</template>
<script>
import { NCard, NModal, NTable, NTag } from 'naive-ui'
import { HelpOutlineRound } from '@vicons/material'
import { Icon } from '@vicons/utils'

export default {
    name: 'HelpModal',
    props: ['showHelpModal'],
    data() {
        return {
            shortcuts: [
                {key: 'z', description: 'Decrement Play Speed'},
                {key: 'x', description: 'Increment Play Speed'},
                {key: 'd', description: 'Set range to 1 day'},
                {key: 'w', description: 'Set range to 1 week'},
                {key: 'm', description: 'Set range to 1 month'},
                {key: 'q', description: 'Set range to 1 quarter'},
                {key: 'y', description: 'Set range to 1 year'},
                {key: '[space]', description: 'Toggle player'},
                {key: '[ctrl]+[up]', description: 'Increment filter up 1 year'},
                {key: '[ctrl]+[down]', description: 'Decrement filter down 1 year'},
            ]
        };
    },
    components: {
        NModal,
        NCard,
        NTable,
        NTag,
        Icon,
        HelpOutlineRound,
    }
}
</script>
<style lang="less">
</style>