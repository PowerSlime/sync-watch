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
import EventEmitter from "eventemitter3";

class Player extends EventEmitter {
    constructor() {
        super();

        this._isPlaying = false;
        this._currentTime = null;
        this._isLoaded = false;

        this.methods = {
            play: this._play.bind(this),
            pause: this._pause.bind(this),
            seek: this._seek.bind(this),
        };

        this._handleLoadingIntervalId = null;

        console.warn(this);
    }

    _sendWindowMessage(method, params) {
        window.postMessage({ key: method, value: params });
    }

    _sendPostMessage(method, params) {
        this.playerFrame.postMessage(
            {
                key: "kodik_player_api",
                value: {
                    method,
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

    _seek(time, sendWindowMessage = true) {
        this._currentTime = time;
        this._sendPostMessage("seek", { seconds: time });

        if (sendWindowMessage) {
            this._sendWindowMessage("kodik_player_seek", { seconds: time });
        }
    }

    _handleEndOfLoading() {
        // For explanation check `set isLoaded` method
        if (!this._handleLoadingIntervalId) {
            this._handleLoadingIntervalId = setInterval(() => {
                this.methods.pause();
            }, 200);
        }
    }

    get isLoaded() {
        return this._isLoaded;
    }

    set isLoaded(bool) {
        // To handle loaded event we start sending to player `pause` commands.
        // When it starts react to it (we receive `kodik_player_pause` event)
        // It means that player is loaded and ready to listen our commands.
        this._isLoaded = bool;

        if (this._isLoaded === false) {
            this.emit("loading");
            this._handleEndOfLoading();
        } else {
            clearInterval(this._handleLoadingIntervalId);
            this.emit("loaded");
            this._handleLoadingIntervalId = null;
            this.methods.pause();
            this.methods.seek(this.currentTime || 0);
        }
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
        if (this._currentTime > 0) {
            console.log(this._currentTime - value);
            const wasSeeked = Math.abs(this._currentTime - value) > 1;
            if (wasSeeked) {
                this.methods.pause();
                this.methods.seek(value);
            }
        }

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

    beforeDestroy() {
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
            this.player.methods.pause();
            this.player.methods.seek(time, false);
        },

        // Handle user events
        handlePlayerMessages(message) {
            const method = message.data.key;
            const value = message.data.value;

            console.log(method, value);
            // console.log(this.player.methods);

            switch (method) {
                case "kodik_player_duration_update":
                case "kodik_player_video_started": {
                    this.player.isLoaded = false;
                    break;
                }

                case "kodik_player_time_update": {
                    this.player.currentTime = value;
                    break;
                }

                case "kodik_player_current_episode": {
                    this.player = new Player();
                    break;
                }

                case "kodik_player_play": {
                    if (this.player.isLoaded) {
                        this.$socket.emit(`room/player/play`, {
                            room: this.currentRoom,
                            time: this.player.currentTime,
                        });
                    }
                    break;
                }

                case "kodik_player_pause": {
                    if (this.player.isLoaded) {
                        this.$socket.emit(`room/player/stop`, {
                            room: this.currentRoom,
                            time: this.player.currentTime,
                        });
                    } else {
                        // For explanation check the player's `set isLoaded` method
                        this.player.isLoaded = true;
                    }
                    break;
                }

                case "kodik_player_seek": {
                    this.$socket.emit(`room/player/seek`, {
                        room: this.currentRoom,
                        time: value.seconds,
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
