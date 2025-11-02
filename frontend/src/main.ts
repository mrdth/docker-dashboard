import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

// T113-T114: Register router
app.use(router);

app.mount("#app");
