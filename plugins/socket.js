import Vue from "vue";
import VueSocketIO from "vue-socket.io";

import constants from "../constants";

export default ({ app }) => {
    Vue.use(new VueSocketIO({ connection: constants.BACKEND_URL }));
};
