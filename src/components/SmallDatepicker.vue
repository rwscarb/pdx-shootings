<template>
    <input type="date" ref="input" @blur="checkAndEmit">
</template>

<script>
import moment from 'moment'

export default {
    name: 'SmallDatepicker',
    props: ['value'],
    watch: {
        value(val) {
            this.$refs.input.value = val;
        }
    },
    methods: {
        checkAndEmit($e) {
            const value = $e.target.value;
            if (moment(value, 'YYYY-MM-DD').isValid()) {
                this.$emit('update:value', value)
            }
        }
    },
    mounted() {
        if (this.value) {
            this.$refs.input.value = this.value;
        }
    }
};
</script>

<style scoped>
input[type="date"] {
    text-align: center;
}
</style>