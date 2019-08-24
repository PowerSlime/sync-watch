<template>
    <v-card min-width="100%">
        <v-card-text>
            <v-autocomplete
                v-model="selectedItem"
                :items="searchResults"
                :loading="loading"
                :search-input.sync="searchInput"
                :item-text="getItemText"
                label="Название фильма / ID на кинопоиске"
                no-data-text="Ничего не найдено"
                no-filter
                return-object
            >
                <template v-slot:item="{ item }">
                    <div>
                        <span>{{ item.title }}</span>
                        <span class="caption grey--text">({{ item.title_orig }})</span>
                    </div>

                    <v-spacer />
                    <div :class="{ 'mr-4': item.year }" class="caption">
                        <span v-if="item.last_season" class="grey--text">
                            Сезонов: <span class="white--text">{{ item.last_season }}</span>
                        </span>

                        <span v-if="item.last_episode" class="grey--text">
                            Серий: <span class="white--text">{{ item.last_episode }}</span>
                        </span>
                    </div>
                    <div :class="{ 'mr-4': !item.camrip }" class="caption">
                        {{ item.year }}
                    </div>
                    <v-icon v-if="!item.camrip">
                        hd
                    </v-icon>
                </template>
            </v-autocomplete>
        </v-card-text>
    </v-card>
</template>

<script>
import qs from "qs";
import axios from "axios";
import debounce from "lodash/debounce";

export default {
    components: {},
    data() {
        return {
            searchInput: "",
            selectedItem: null,
            searchResponse: {},
            searchResults: [],
            loading: false,
        };
    },

    watch: {
        searchInput: debounce(function(value) {
            if (value) {
                this.fetchSearchResults(value);
            } else {
                this.searchResults = [];
            }
        }, 400),

        async selectedItem(item) {
            const response = await axios.post(
                `${this.$constants.BACKEND_URL}/room`,
                qs.stringify({
                    kinopoisk_id: item.kinopoisk_id,
                }),
            );

            const data = response.data;

            if (!data.error_code) {
                this.$router.push(`/room/${data.data.roomId}`);
            } else {
                alert(data.error_message);
            }
        },
    },

    methods: {
        getItemText(data) {
            return data.title;
        },

        async fetchSearchResults(searchString) {
            this.loading = true;
            try {
                const data = await axios.get(`${this.$constants.BACKEND_URL}/search`, {
                    params: {
                        title: searchString,
                    },
                });

                const response = data.data;
                if (response.error) {
                    this.error = response.error;
                }

                this.searchResponse = response;
                this.searchResults = response.results;
            } catch (e) {
                this.error = e;
            }

            this.loading = false;
        },
    },
};
</script>
