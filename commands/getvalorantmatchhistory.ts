// Load dependencies
import * as fs from "fs";
import * as process from "process";
import axios from "axios";
import { DateTime } from "luxon";
import { Canvas, createCanvas, loadImage, registerFont } from "canvas";
import {
    Message,
    MessageEmbed,
    MessageActionRow,
    MessageButton,
} from "discord.js";
import { NewClient } from "../index";

// Register canvas font
registerFont("./assets/fonts/Roboto-Regular.ttf", { family: "Roboto" });
registerFont("./assets/fonts/Roboto-Bold.ttf", {
    family: "Roboto",
    weight: "bold",
});
registerFont("./assets/fonts/Roboto-Italic.ttf", {
    family: "Roboto",
    style: "italic",
});
registerFont("./assets/fonts/Roboto-BoldItalic.ttf", {
    family: "Roboto",
    weight: "bold",
    style: "italic",
});

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

class Match {
    id: string;
    mode: string;
    map: string;
    mapName: string;
    result: string;
    timestamp: string;
    agent: string;
    agentName: string;
    kills: string;
    deaths: string;
    assists: string;

    constructor(
        id: string,
        mode: string,
        map: string,
        mapName: string,
        result: string,
        timestamp: string,
        agent: string,
        agentName: string,
        kills: string,
        deaths: string,
        assists: string
    ) {
        this.id = id;
        this.mode = mode;
        this.map = map;
        this.mapName = mapName;
        this.result = capitalizeFirstLetter(result);
        this.timestamp = timestamp;
        this.agent = agent;
        this.agentName = agentName;
        this.kills = kills;
        this.deaths = deaths;
        this.assists = assists;
    }
}

class Player {
    agent: string;
    assists: number;
    deaths: number;
    diff: string;
    headshots_percentage: string;
    id: string;
    kills: number;
    rank: number;
    ratio: number;
    score: number;
    team: string;

    constructor(
        name: string,
        tagline: string,
        rank: number,
        agent_url: string,
        score: number,
        kills: number,
        deaths: number,
        assists: number,
        headshots: number,
        bodyshots: number,
        legshots: number,
        team: string
    ) {
        this.id = `${name}#${tagline}`;
        let temp = agent_url.split("/");
        this.agent = temp[temp.length - 2];
        this.rank = rank;
        this.score = score;
        this.kills = kills;
        this.deaths = deaths;
        this.assists = assists;
        if (kills - deaths >= 0) {
            this.diff = `+${kills - deaths}`;
        } else {
            this.diff = `${kills - deaths}`;
        }
        this.ratio = Math.round((100 * kills) / deaths) / 100;
        this.headshots_percentage = `${Math.round(
            (headshots / (bodyshots + legshots + headshots)) * 100
        )}%`;
        this.team = team;
    }
}

interface Column {
    id: keyof Player;
    name: string;
    offset: number;
    width: number;
}

function init_canvas(columns: Column[]): Canvas {
    // First column's width is 280, rest are 80
    const width = 280 + 8 * 80;
    // Header row's height is 30, players rows height are 60
    const height = 30 + 60 * 10;

    // Fill background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(18, 29, 54, 255)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0, 85, 77, 255)";
    ctx.fillRect(0, 0, width, 30);

    // Draw dividers in table
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(280.5 + 80 * i, 0);
        ctx.lineTo(280.5 + 80 * i, height);
        ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 30.5 + 60 * i);
        ctx.lineTo(width, 30.5 + 60 * i);
        ctx.stroke();
    }

    // Draw first column's header
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0, 234, 177, 255)";
    ctx.font = `bold ${16 * 0.875}px Roboto`;
    ctx.fillText("Player", 15, 20);

    // Draw remaining columns headers
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.font = `bold ${16 * 0.875}px Roboto`;
    for (let i = 1; i < columns.length; i++) {
        ctx.fillText(
            columns[i].name,
            columns[i].offset + columns[i].width / 2,
            20
        );
    }

    return canvas;
}

function init_columns(): Column[] {
    const columns: Column[] = [];
    const columns_names = [
        "TEAM A",
        "RANK",
        "ACS",
        "K",
        "D",
        "A",
        "+/-",
        "K/D",
        "HS%",
    ];
    const columns_widths = [280, 80, 80, 80, 80, 80, 80, 80, 80];
    const columns_ids = [
        "id",
        "rank",
        "score",
        "kills",
        "deaths",
        "assists",
        "diff",
        "ratio",
        "headshots_percentage",
    ];
    let current_offset = 0;

    for (let i = 0; i < columns_names.length; i++) {
        columns.push({
            id: columns_ids[i] as keyof Player,
            name: columns_names[i],
            offset: current_offset,
            width: columns_widths[i],
        });
        current_offset += columns_widths[i];
    }

    return columns;
}

async function make_canvas_table(players: Player[]): Promise<Canvas> {
    const columns = init_columns();
    const canvas = init_canvas(columns);
    const ctx = canvas.getContext("2d");
    const header_row_height = 30;
    const rows_height = 60;

    const CACHEDIR = process.env.CACHEDIR;

    // Draw players ids and agent icons
    ctx.textAlign = "left";
    ctx.font = `bold ${16 * 1.125}px Roboto`;
    const agent_image_size = 40;
    for (let i = 0; i < players.length; i++) {
        const agent_image = await loadImage(
            `${CACHEDIR}/images/agent_${players[i].agent}.png`
        );
        ctx.drawImage(
            agent_image,
            10,
            header_row_height +
                i * rows_height +
                (rows_height - agent_image_size) / 2,
            agent_image_size,
            agent_image_size
        );
        if (players[i].team === "red") {
            ctx.fillStyle = "rgba(255, 41, 78, 255)";
        } else if (players[i].team === "blue") {
            ctx.fillStyle = "rgba(0, 234, 177, 255)";
        }
        ctx.fillText(
            players[i].id,
            agent_image_size + 20,
            header_row_height + i * rows_height + 36,
            columns[0].width - agent_image_size - 30
        );
        ctx.fillRect(0, header_row_height + i * rows_height, 10, rows_height);
    }

    // Draw rank icons
    const rank_image_size = 32;
    for (let i = 0; i < players.length; i++) {
        let rank_image = await loadImage(
            `${CACHEDIR}/images/tier_${players[i].rank}.png`
        );
        ctx.drawImage(
            rank_image,
            columns[1].offset + (columns[1].width - rank_image_size) / 2,
            header_row_height +
                i * rows_height +
                (rows_height - rank_image_size) / 2,
            rank_image_size,
            rank_image_size
        );
    }

    // Draw players stats
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 255)";
    ctx.font = `${16 * 1.125}px Roboto`;
    for (let i = 2; i < columns.length; i++) {
        for (let j = 0; j < players.length; j++) {
            ctx.fillText(
                players[j][columns[i].id].toString(),
                columns[i].offset + columns[i].width / 2,
                header_row_height + j * rows_height + 36
            );
        }
    }

    return canvas;
}

async function get_match_details_image(match_id: string): Promise<string> {
    // Get match details from api
    const url = `https://api.henrikdev.xyz/valorant/v2/match/${match_id}`;
    const res = await axios.get(url);
    console.log(`Getting ${url}`);

    if (res.data.status !== 200) {
        return "There was an error getting the match details.";
    }

    const match_details = res.data.data;

    // Get each player details
    const players: Player[] = [];

    // Red team players
    for (var i = 0; i < match_details.players.red.length; i++) {
        const player = match_details.players.red[i];
        players.push(
            new Player(
                player.name,
                player.tag,
                player.currenttier,
                player.assets.agent.small,
                Math.round(player.stats.score / match_details.rounds.length),
                player.stats.kills,
                player.stats.deaths,
                player.stats.assists,
                player.stats.headshots,
                player.stats.bodyshots,
                player.stats.legshots,
                "red"
            )
        );
    }

    // Blue team players
    for (var i = 0; i < match_details.players.blue.length; i++) {
        const player = match_details.players.blue[i];
        players.push(
            new Player(
                player.name,
                player.tag,
                player.currenttier,
                player.assets.agent.small,
                Math.round(player.stats.score / match_details.rounds.length),
                player.stats.kills,
                player.stats.deaths,
                player.stats.assists,
                player.stats.headshots,
                player.stats.bodyshots,
                player.stats.legshots,
                "blue"
            )
        );
    }

    // Sort players by score
    players.sort((a, b) => b.score - a.score);

    // Make and write canvas table to file
    const filePath = "match.png";
    const canvas = await make_canvas_table(players);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(filePath, buffer);

    return filePath;
}

function get_map_id(map_name: string): string {
    const mapstr = fs.readFileSync(`${process.env.CACHEDIR}/maps.json`, "utf8");
    const maps = JSON.parse(mapstr);
    if (map_name in maps) {
        return maps[map_name]["uuid"];
    } else {
        return "";
    }
}

function reformat_match(match: any, username: string, tagline: string): Match {
    // Reformat match to match Match class
    const player = match["players"]["all_players"].find((player: any) => {
        return (
            player["name"] == username &&
            player["tag"].toLowerCase() == tagline.toLowerCase()
        );
    });
    const team = player["team"].toLowerCase();
    const id = match["metadata"]["matchid"];
    const modeName = match["metadata"]["mode"];
    const map = get_map_id(match["metadata"]["map"]);
    const mapName = match["metadata"]["map"];
    const result = match["teams"][team]["has_won"] ? "victory" : "defeat";
    const timestamp = DateTime.fromSeconds(match["metadata"]["game_start"])
        .setZone("Asia/Ho_Chi_Minh")
        .toRFC2822();
    const agent = player["assets"]["agent"]["small"].split("/")[4];
    const agentName = player["character"];
    const kills = player["stats"]["kills"];
    const deaths = player["stats"]["deaths"];
    const assists = player["stats"]["assists"];
    return new Match(
        id,
        modeName,
        map,
        mapName,
        result,
        timestamp,
        agent,
        agentName,
        kills,
        deaths,
        assists
    );
}

async function get_match_history(
    username: string,
    tagline: string,
    match_type: string,
    match_count: number = 5,
    region: string = "ap",
    tries: number = 1
): Promise<Match[]> {
    try {
        const url = encodeURI(
            `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${username}/${tagline}?filter=${match_type}`
        );
        console.log(`Getting ${url}`);
        // Get match history with axios
        const res = await axios.get(url);
        // Check status
        if (res.data.status !== 200) {
            return [];
        }
        // Reformat matches
        const matches = res.data.data.map((match: any) => {
            return reformat_match(match, username, tagline);
        });
        // Slice matches
        const sliced_matches = matches.slice(0, match_count);
        return sliced_matches;
    } catch (error) {
        console.log((error as Error).message);
        if (tries > 0) {
            console.log(`Retrying...`);
            return await get_match_history(
                username,
                tagline,
                match_type,
                match_count,
                region,
                tries - 1
            );
        }
        return [];
    }
}

function get_match_embed_message(
    matches: Match[],
    current_match: number
): MessageEmbed {
    // Make embed message for a match
    const match = matches[current_match];
    const embed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle(`${match.mode} Game - Map ${match.mapName}`)
        .setDescription(
            `${match.result}\nAgent: ${match.agentName}\nKDA: ${match.kills}/${match.deaths}/${match.assists}\n${match.timestamp}`
        )
        .setThumbnail(
            `https://media.valorant-api.com/agents/${match.agent}/displayicon.png`
        )
        .setImage(
            `https://media.valorant-api.com/maps/${match.map}/listviewicon.png`
        )
        .setFooter({ text: `Match ${current_match + 1}/${matches.length}` });
    return embed;
}

function rename_match_type(match_type: string): string {
    if (match_type === "compe") {
        return "competitive";
    } else if (match_type === "normal") {
        return "unrated";
    } else if (match_type === "rush") {
        return "spikerush";
    }
    return match_type;
}

export async function run(client: NewClient, message: Message, args: string[]) {
    // Check if command is used correctly
    if (args.length < 3) {
        return message.channel.send(
            "Please use the following format: `$getvalorantmatchhistory <username> <tagline> <match_type>` or `$gvmh <username> <tagline> <match_type>`"
        );
    }
    const username = args[0];
    const tagline = args[1];
    const match_type = args[2];
    const match_types = [
        "competitive",
        "unrated",
        "compe",
        "normal",
        "spikerush",
        "rush",
        "custom",
    ];
    if (!match_types.includes(match_type)) {
        return message.channel.send(
            "Please use a valid match type: `competitive`, `unrated` or `spikerush`"
        );
    }
    try {
        // Get match history
        const matches = await get_match_history(
            username,
            tagline,
            rename_match_type(match_type)
        );
        if (matches.length === 0) {
            return message.channel.send(
                "No matches found with the given criteria"
            );
        }

        // Create row of buttons
        const row = new MessageActionRow();
        row.addComponents(
            new MessageButton()
                .setCustomId("prev")
                .setLabel("Previous")
                .setStyle("PRIMARY")
        );
        row.addComponents(
            new MessageButton()
                .setCustomId("next")
                .setLabel("Next")
                .setStyle("PRIMARY")
        );
        row.addComponents(
            new MessageButton()
                .setCustomId("details")
                .setLabel("Details")
                .setStyle("SUCCESS")
        );

        // Make embed message with buttons
        var current_match = 0;
        await message.channel.send(
            "Below is your match history (5 latest matches)"
        );
        const embed_message = await message.channel.send({
            embeds: [get_match_embed_message(matches, current_match)],
            components: [row],
        });
        const collector = embed_message.createMessageComponentCollector({
            // filter: ({ user }) => user.id === message.author.id,
            time: 60000,
        });
        collector.on("collect", async (interaction) => {
            if (interaction.customId === "next") {
                current_match += 1;
                current_match %= matches.length;
                interaction.update({
                    embeds: [get_match_embed_message(matches, current_match)],
                });
            } else if (interaction.customId === "prev") {
                current_match -= 1;
                current_match += matches.length;
                current_match %= matches.length;
                interaction.update({
                    embeds: [get_match_embed_message(matches, current_match)],
                });
            } else if (interaction.customId === "details") {
                interaction.deferReply();
                const details_image = await get_match_details_image(
                    matches[current_match].id
                );
                interaction.editReply({
                    content: "Below are details about the match",
                    files: [details_image],
                });
                // message.channel.send({ files: [details_image] });
            }
        });
        return null;
    } catch (error) {
        console.log("Error: ", (error as Error).message);
        return message.channel.send(
            "There was an error trying to execute that command!"
        );
    }
}

export const type = "Valorant";
export const aliases = ["gvmh"];
export const description = "Get a list of Valorant matches for a given user";
