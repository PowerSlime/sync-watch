<template>
    <v-flex xs12 lg10>
        <v-progress-circular v-if="loading" indeterminate color="primary" />
        <v-card v-else min-width="100%">
            <v-card-text>
                <div class="card-header">
                    <v-icon :color="$store.state.isSocketConnected ? 'green' : 'red'" small>
                        brightness_1
                    </v-icon>
                    <v-spacer />
                    <v-badge v-if="room" overlap>
                        <template v-slot:badge>
                            <span class="caption">{{ room.users }}</span>
                        </template>
                        <v-icon>
                            people
                        </v-icon>
                    </v-badge>
                </div>
            </v-card-text>
            <iframe v-if="room" id="player" name="player" :src="room.link" allowfullscreen></iframe>
            <v-card-text v-else>
                Комната не существует
            </v-card-text>
        </v-card>
    </v-flex>
</template>

<script>
class Player {
    constructor() {
        this._isPlaying = false;
        this._currentTime = null;

        this.methods = {
            play: this._play.bind(this),
            pause: this._pause.bind(this),
            seek: this._seek.bind(this),
        };

        console.warn(this);
    }

    _sendPostMessage(method, params) {
        this.playerFrame.postMessage(
            {
                key: "kodik_player_api",
                value: {
                    method: method,
                    ...params,
                },
            },
            "*",
        );
    }

    _play() {
        this._sendPostMessage("play");
    }

    _pause() {
        this._sendPostMessage("pause");
    }

    _seek(time) {
        this._sendPostMessage("seek", { seconds: time });
    }

    get isPlaying() {
        return this._isPlaying;
    }

    set isPlaying(bool) {
        this._isPlaying = bool;
    }

    get playerFrame() {
        return window.frames.player;
    }

    get currentTime() {
        return this._currentTime;
    }

    set currentTime(value) {
        this._currentTime = value;
    }
}

export default {
    data() {
        return {
            loading: true,
            room: null,
            player: new Player(),
        };
    },

    sockets: {
        reconnect() {
            this.$socket.emit("room/get", { id: this.currentRoom }, (data) => {
                this.loading = false;
                this.room = data;
            });
        },
    },

    computed: {
        currentRoom() {
            return this.$route.params.id;
        },
    },

    mounted() {
        this.$socket.emit("room/get", { id: this.currentRoom }, (data) => {
            this.loading = false;
            this.room = data;
        });

        this.sockets.subscribe(`room/${this.currentRoom}/update`, this.onRoomUpdate);
        this.sockets.subscribe(`room/${this.currentRoom}/player/play`, this.onPlayerPlay);
        this.sockets.subscribe(`room/${this.currentRoom}/player/stop`, this.onPlayerStop);
        this.sockets.subscribe(`room/${this.currentRoom}/player/seek`, this.onPlayerSeek);
    },
    beforeMount() {
        window.addEventListener("message", this.handlePlayerMessages);
    },

    beforeDestroy: function() {
        this.$socket.emit("room/get", { id: this.currentRoom });
        this.sockets.unsubscribe(`room/${this.currentRoom}/update`);
        this.sockets.unsubscribe(`room/${this.currentRoom}/player/play`);
        this.sockets.unsubscribe(`room/${this.currentRoom}/player/stop`);
        this.sockets.unsubscribe(`room/${this.currentRoom}/player/seek`);
        window.removeEventListener("message", this.handlePlayerMessages);
    },

    methods: {
        onRoomUpdate(data) {
            this.room = data;
        },

        // Handle server events
        onPlayerPlay(data) {
            this.player.methods.play();
        },

        onPlayerStop(data) {
            this.player.methods.pause();
        },

        onPlayerSeek(time) {
            this.player.methods.seek(time);
        },

        // Handle user events
        handlePlayerMessages(message) {
            const method = message.data.key;
            const value = message.data.value;

            console.log(method);
            // console.log(this.player.methods);

            switch (method) {
                case "kodik_player_time_update": {
                    if (this.player.currentTime === null) {
                        this.player.methods.pause();
                        this.player.methods.seek(0);
                    }

                    this.player.currentTime = value;
                    break;
                }

                case "kodik_player_play": {
                    this.$socket.emit(`room/player/play`, {
                        room: this.currentRoom,
                        time: this.player.currentTime,
                    });
                    break;
                }

                case "kodik_player_pause": {
                    this.$socket.emit(`room/player/stop`, {
                        room: this.currentRoom,
                        time: this.player.currentTime,
                    });
                    break;
                }
            }
        },
    },
};
</script>

<style lang="sass" scoped>
.card-header
    display: flex
    flex-wrap: wrap

#player
    width: 100%
    height: 582px
    border: none
    margin: -2px 0 -7px
</style>
