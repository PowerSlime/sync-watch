<template>
    <v-app dark>
        <v-app-bar :clipped-left="clipped" fixed app>
            <v-btn text icon @click="$router.push('/')">
                <v-icon>
                    home
                </v-icon>
            </v-btn>
            <v-toolbar-title v-text="title" />
            <v-spacer />
            <v-btn text icon :href="githubRepository" target="_blank">
                <v-icon>mdi-git</v-icon>
            </v-btn>
        </v-app-bar>
        <v-content>
            <v-container fill-height>
                <v-layout align-center justify-center>
                    <nuxt />
                </v-layout>
            </v-container>
        </v-content>
    </v-app>
</template>

<script>
export default {
    data() {
        return {
            clipped: false,
            drawer: false,
            fixed: false,
            miniVariant: false,
            right: true,
            rightDrawer: false,
        };
    },

    sockets: {
        connect() {
            this.$store.dispatch("socketConnected");
        },

        reconnect() {
            this.$store.dispatch("socketConnected");
        },

        error() {
            this.$store.dispatch("socketDisconnected");
        },

        disconnect() {
            this.$store.dispatch("socketDisconnected");
        },
    },

    computed: {
        title() {
            return "Sync watch";
        },

        githubRepository() {
            return "https://github.com/PowerSlime/sync-watch";
        },
    },
};
</script>
