import axios from "axios";
import moment from "moment-timezone";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { NewClient } from "../index";

type MCServer = {
    available: boolean;
    hostname: string;
    last_update: number;
    max_players: number;
    motd: string;
    online: boolean;
    player_count: number;
    players: string[];
    version: string;
};

async function get_server_status(server_ip: string) {
    // API url
    const url = "https://api.mcsrvstat.us/2/" + server_ip;

    // Server object
    let server: MCServer = {
        available: false,
        hostname: "",
        last_update: -1,
        max_players: 0,
        motd: "",
        online: false,
        player_count: 0,
        players: [],
        version: "",
    };

    try {
        await axios.get(url).then((response) => {
            if (response.status === 200) {
                if ("motd" in response.data) {
                    try {
                        const data = response.data;
                        server.available = true;
                        server.hostname = data.hostname ? data.hostname : data.ip;
                        server.max_players = data.players.max;
                        server.motd = data.motd.clean[0];
                        server.online = data.online;
                        server.player_count = data.players.online;
                        if ("list" in data.players) {
                            server.players = data.players.list;
                        }
                        server.version = data.version;
                        if ("cachetime" in data.debug) {
                            server.last_update = data.debug.cachetime;
                        }
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        });
    } catch (err) {
        console.log(err);
    }

    return server;
}

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    const server = await get_server_status(
        interaction.options.getString("server")!
    );

    if (server.available) {
        const embed = new EmbedBuilder()
            .setTitle(server.hostname)
            .setColor(0x5b8731)
            .setDescription(
                `Status: ${server.online ? "Online" : "Offline"}\n` +
                `Version: ${server.version}\n` +
                `Players: ${server.player_count}/${server.max_players}\n` +
                `MOTD: ${server.motd}`
            )
            .setFooter({
                text: `Last updated: ${server.last_update == 0
                    ? "Now"
                    : moment
                        .unix(server.last_update)
                        .tz("Asia/Ho_Chi_Minh")
                        .format("hh:mm:ss DD/MM/YYYY")
                    }`,
            });
        if (server.players.length > 0) {
            embed.addFields([
                { name: "Players", value: server.players.join(", ") },
            ]);
        }
        return await interaction.editReply({ embeds: [embed] });
    } else {
        return await interaction.editReply("Server not found :smiling_face_with_tear:");
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Get Minecraft server status")
    .addStringOption((option) =>
        option
            .setName("server")
            .setDescription("Enter your server IP")
            .setRequired(true)
    );
