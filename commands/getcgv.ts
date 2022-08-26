import * as fs from "fs";
import axios from "axios";
import process from "process";
import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { NewClient } from "../index";
import { City, Day, Film } from "../utils/CGVFetcher";

const MAX_PAGE_ENTRIES = 5;
const TEMP_IMAGE = "temp.png";
const CACHEDIR = process.env.CACHEDIR;

function get_cgv_cities_from_file(
    filepath: string = `${CACHEDIR}/cgv.json`
): City[] {
    let cities = JSON.parse(fs.readFileSync(filepath, "utf8"));
    return cities;
}

async function save_image(url: string): Promise<string> {
    let response = await axios.get(url, { responseType: "stream" });
    let file = fs.createWriteStream(TEMP_IMAGE);
    response.data.pipe(file);
    return new Promise((resolve, reject) => {
        file.on("finish", () => {
            resolve(TEMP_IMAGE);
        });
        file.on("error", (err) => {
            reject(err);
        });
    });
}

async function get_film_embed(film: Film, day: Day): Promise<MessageEmbed> {
    let schedule = "";
    for (let i = 0; i < film.showtimes.length; i++) {
        if (i % 5 == 0 && i != 0) {
            schedule = `${schedule}\n`;
        }
        schedule = `${schedule}\\| ${film.showtimes[i]} \\|`;
    }
    return new MessageEmbed()
        .setTitle(film.name)
        .setDescription(film.type)
        .setImage(`attachment://${film.poster.split("/").pop()}`)
        .addFields([{ name: `Film schedule on ${day.date}`, value: schedule }]);
}

function get_city_selection_row(
    cities: City[],
    page_num: number
): MessageActionRow {
    // Create city selection buttons for the current page
    let row = new MessageActionRow();
    let begin = page_num * MAX_PAGE_ENTRIES;
    let end = Math.min(begin + MAX_PAGE_ENTRIES, cities.length);
    for (let i = begin; i < end; i++) {
        row.addComponents(
            new MessageButton()
                .setCustomId(i.toString())
                .setLabel(cities[i].name)
                .setStyle("SUCCESS")
        );
    }
    return row;
}

function get_cinema_selection_row(
    city: City,
    page_num: number
): MessageActionRow {
    let row = new MessageActionRow();
    let begin = page_num * MAX_PAGE_ENTRIES;
    let end = Math.min(begin + MAX_PAGE_ENTRIES, city.cinemas.length);
    for (let i = begin; i < end; i++) {
        row.addComponents(
            new MessageButton()
                .setCustomId(i.toString())
                .setLabel(city.cinemas[i].name)
                .setStyle("SUCCESS")
        );
    }
    return row;
}

function get_day_selection_row(
    days: Day[],
    page_num: number
): MessageActionRow {
    let row = new MessageActionRow();
    let begin = page_num * MAX_PAGE_ENTRIES;
    let end = Math.min(begin + MAX_PAGE_ENTRIES, days.length);
    for (let i = begin; i < end; i++) {
        row.addComponents(
            new MessageButton()
                .setCustomId(i.toString())
                .setLabel(days[i].date)
                .setStyle("SUCCESS")
        );
    }
    return row;
}

function get_navigation_row(): MessageActionRow {
    let row = new MessageActionRow();
    row.addComponents(
        new MessageButton()
            .setCustomId("rset")
            .setLabel("Reset")
            .setStyle("DANGER")
    );
    row.addComponents(
        new MessageButton()
            .setCustomId("prev")
            .setLabel("Previous page")
            .setStyle("PRIMARY")
    );
    row.addComponents(
        new MessageButton()
            .setCustomId("next")
            .setLabel("Next page")
            .setStyle("PRIMARY")
    );
    return row;
}

export async function run(client: NewClient, interaction: CommandInteraction) {
    if (interaction.channel === null) {
        return;
    }

    // Get list of cities
    const cities = get_cgv_cities_from_file();

    // Get buttons
    const navrow = get_navigation_row();
    const selrow = get_city_selection_row(cities, 0);

    // Current state of selection (selecting city or cinema, film)
    let state = 0;
    let selected_city = cities[0];
    let page_count = Math.ceil(cities.length / MAX_PAGE_ENTRIES);
    let page_num = 0;
    let days: Day[] = [];
    let films: Film[] = [];
    let selected_day: Day;

    const embed_message = await interaction.channel!.send({
        embeds: [new MessageEmbed().setTitle("Please select a city")],
        components: [selrow, navrow],
    });

    const collector = embed_message.createMessageComponentCollector({
        filter: ({ user }) => {
            return user.id === interaction.user.id;
        },
        time: 60000,
    });

    async function buttonHandler(interaction: MessageComponentInteraction) {
        switch (interaction.customId) {
            case "rset":
                state = 0;
                selected_city = cities[0];
                page_count = Math.ceil(cities.length / MAX_PAGE_ENTRIES);
                page_num = 0;
                break;
            case "prev":
                page_num -= 1;
                if (page_num < 0) {
                    page_num += page_count;
                }
                break;
            case "next":
                page_num += 1;
                if (page_num >= page_count) {
                    page_num -= page_count;
                }
                break;
            default:
                let i = parseInt(interaction.customId);
                switch (state) {
                    case 0:
                        selected_city = cities[i];
                        page_count = Math.ceil(
                            selected_city.cinemas.length / MAX_PAGE_ENTRIES
                        );
                        page_num = 0;
                        state = 1;
                        break;
                    case 1:
                        days = selected_city.cinemas[i].days;
                        if (days.length > 0) {
                            page_count = Math.ceil(
                                days.length / MAX_PAGE_ENTRIES
                            );
                            page_num = 0;
                            state = 2;
                        }
                        break;
                    case 2:
                        films = days[i].films;
                        selected_day = days[i];
                        page_count = films.length;
                        page_num = 0;
                        state = 3;
                        break;
                }
                break;
        }

        switch (state) {
            case 0:
                interaction.update({
                    embeds: [
                        new MessageEmbed().setTitle("Please select a city"),
                    ],
                    components: [
                        get_city_selection_row(cities, page_num),
                        navrow,
                    ],
                    files: [],
                });
                break;
            case 1:
                interaction.update({
                    embeds: [
                        new MessageEmbed().setTitle("Please select a cinema"),
                    ],
                    components: [
                        get_cinema_selection_row(selected_city, page_num),
                        navrow,
                    ],
                    files: [],
                });
                break;
            case 2:
                interaction.update({
                    embeds: [
                        new MessageEmbed().setTitle("Please select a day"),
                    ],
                    components: [get_day_selection_row(days, page_num), navrow],
                    files: [],
                });
                break;
            case 3:
                let film_embed = await get_film_embed(
                    films[page_num],
                    selected_day
                );
                interaction.update({
                    embeds: [film_embed],
                    components: [navrow],
                    files: [films[page_num].poster],
                });
                break;
        }
    }

    collector.on("collect", buttonHandler).on("error", (err: any) => {
        console.log(err);
    });
}

export const data = new SlashCommandBuilder().setDescription(
    "Get CGV film schedule from https://www.cgv.vn/"
);

// async function test() {
//     let res = await get_in_theaters(
//         "https://www.cgv.vn/default/cinox/site/cgv-vincom-bac-tu-liem"
//     );
//     console.log(res);
// }

// test();
