// Load dependencies
import * as fs from "fs";
import axios from "axios";
import { Message, MessageEmbed } from "discord.js";
import { NewClient } from "../index";

async function get_mmr(
    username: string,
    tagline: string,
    region: string = "ap"
) {
    const url = encodeURI(
        `https://api.henrikdev.xyz/valorant/v1/mmr/${region}/${username}/${tagline}`
    );
    console.log(`Getting ${url}`);
    // Get mrr with axios
    try {
        const res = await axios.get(url);
        // Check status
        if (res.data.status !== 200) {
            return null;
        }
        const elo = res.data.data.elo;
        const rank = res.data.data.currenttierpatched;
        return `Elo: ${elo}\nRank: ${rank}`;
    } catch (error) {
        console.log((error as Error).message);
        return null;
    }
}

function get_comp_tier_icon(tier: number): string {
    const tiers = JSON.parse(
        fs.readFileSync(`${process.env.CACHEDIR}/comp_tiers.json`).toString()
    );
    return tiers[tier].largeIcon;
}

async function get_mmr_embed_message(
    username: string,
    tagline: string,
    region: string = "ap"
) {
    const url = encodeURI(
        `https://api.henrikdev.xyz/valorant/v1/mmr/${region}/${username}/${tagline}`
    );
    console.log(`Getting ${url}`);
    // Get mrr with axios
    try {
        const res = await axios.get(url);
        // Check status
        if (res.data.status !== 200) {
            return null;
        }
        const elo = res.data.data.elo;
        const rank = res.data.data.currenttierpatched;
        const tier = res.data.data.currenttier;
        const embed = new MessageEmbed()
            .setColor("#7a8181")
            .setTitle(`${username}#${tagline}`)
            .setDescription(`Elo: ${elo}\nRank: ${rank}`)
            .setThumbnail(get_comp_tier_icon(tier));
        return embed;
    } catch (error) {
        console.log((error as Error).message);
        return null;
    }
}

export async function run(client: NewClient, message: Message, args: string[]) {
    // Check if command is used correctly
    if (args.length < 2) {
        return message.channel.send(
            "Please use the following format: `$getvalorantmmr <username> <tagline> [region]` or `$gvmmr <username> <tagline> [region]`"
        );
    }

    // Get MMR
    if (args.length === 2) {
        const mmr = await get_mmr_embed_message(args[0], args[1]);
        if (mmr === null) {
            return message.channel.send("Can't get MMR for some reason");
        }
        return message.channel.send({
            embeds: [mmr],
        });
    }

    // Get MMR with region
    if (args.length === 3) {
        const regions = ["ap", "kr", "na", "eu"];
        if (!regions.includes(args[2])) {
            return message.channel.send(
                "Please use a valid region: `ap`, `kr`, `na` or `eu`"
            );
        }
        const mmr = await get_mmr_embed_message(args[0], args[1], args[2]);
        if (mmr === null) {
            return message.channel.send("Can't get MMR for some reason");
        }
        return message.channel.send({
            embeds: [mmr],
        });
    }
}

export const type = "Valorant";
export const aliases = ["gvmmr"];
export const description = "Get Valorant MMR for a player";
