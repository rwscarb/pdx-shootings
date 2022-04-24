<template>
    <n-space class="player">
        <n-button text @click="$emit('skipPrevious')">
            <template #icon>
                <icon size="32">
                    <skip-previous-outlined/>
                </icon>
            </template>
        </n-button>
        <n-button text @click="$emit('rewind')">
            <template #icon>
                <icon size="32">
                    <keyboard-double-arrow-left-outlined/>
                </icon>
            </template>
        </n-button>
        <n-button text circle @click="$emit('play')">
            <template #icon>
                <icon size="32">
                    <pause-circle-outline-filled v-if="isPlaying"/>
                    <play-circle-outline-filled v-else/>
                </icon>
            </template>
        </n-button>
        <n-button text @click="$emit('fastForward')">
            <template #icon>
                <icon size="32">
                    <keyboard-double-arrow-right-outlined/>
                </icon>
            </template>
        </n-button>
        <n-button text @click="$emit('skipNext')">
            <template #icon>
                <icon size="32">
                    <skip-next-outlined/>
                </icon>
            </template>
        </n-button>
    </n-space>
</template>

<script>
import {
    KeyboardDoubleArrowLeftOutlined,
    KeyboardDoubleArrowRightOutlined,
    PauseCircleOutlineFilled,
    PlayCircleOutlineFilled,
    SkipNextOutlined,
    SkipPreviousOutlined,
} from '@vicons/material';
import {
    NButton,
    NSpace,
} from 'naive-ui'
import { Icon } from '@vicons/utils'

export default {
    name: 'PlayerControls',
    props: ['isPlaying'],
    components: {
        Icon,
        PlayCircleOutlineFilled,
        PauseCircleOutlineFilled,
        KeyboardDoubleArrowLeftOutlined,
        KeyboardDoubleArrowRightOutlined,
        SkipPreviousOutlined,
        SkipNextOutlined,
        NButton,
        NSpace,
    },
}
</script>

<style lang="less">
.player {
  display: flex;
  padding: .24em;
  backdrop-filter: blur(1px);
  > div {
    display: flex;
    margin: 0 1em;
  }
}
</style>