export const state = () => ({
    isSocketConnected: false,
});

export const mutations = {
    setSocketConnection(state, value) {
        state.isSocketConnected = value;
    },
};

export const actions = {
    socketConnected(context) {
        context.commit("setSocketConnection", true);
    },

    socketDisconnected(context) {
        context.commit("setSocketConnection", false);
    },
};
