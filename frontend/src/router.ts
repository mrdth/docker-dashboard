/**
 * Vue Router configuration
 * T113: Routes for Dashboard and ContainerDetail pages
 */

import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Dashboard from "./pages/Dashboard.vue";
import ContainerDetail from "./pages/ContainerDetail.vue";

const routes: RouteRecordRaw[] = [
    {
        path: "/",
        name: "Dashboard",
        component: Dashboard,
        meta: {
            title: "Docker Containers",
        },
    },
    {
        path: "/containers/:id",
        name: "ContainerDetail",
        component: ContainerDetail,
        meta: {
            title: "Container Details",
        },
        props: true,
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

/**
 * Update document title on route change
 */
router.afterEach((to) => {
    const title = to.meta.title as string | undefined;
    if (title) {
        document.title = `${title} - Docker Dashboard`;
    } else {
        document.title = "Docker Dashboard";
    }
});

export default router;
