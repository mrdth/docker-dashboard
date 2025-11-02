<script setup lang="ts">
// T113-T114: Use router-view for page routing
</script>

<template>
    <div id="app" class="min-h-screen bg-gray-50">
        <router-view />
    </div>
</template>

<style scoped>
#app {
    font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
        Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
</style>
