import * as fs from "fs";
import axios from "axios";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
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
        const embed = new EmbedBuilder()
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

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    if (interaction.options.getString("region") === null) {
        // Get MMR with default region (ap)
        const mmr = await get_mmr_embed_message(
            interaction.options.getString("username")!,
            interaction.options.getString("tagline")!
        );
        if (mmr === null) {
            return await interaction.editReply("Can't get MMR for some reason");
        }
        return await interaction.editReply({
            embeds: [mmr],
        });
    } else {
        // Get MMR with regions
        const mmr = await get_mmr_embed_message(
            interaction.options.getString("username")!,
            interaction.options.getString("tagline")!,
            interaction.options.getString("region")!
        );
        if (mmr === null) {
            return await interaction.editReply("Can't get MMR for some reason");
        }
        return await interaction.editReply({
            embeds: [mmr],
        });
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Get Valorant MMR for a player (default region is ap)")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("Enter your username")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("tagline")
            .setDescription("Enter your tagline")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("region")
            .setDescription("Enter your tagline")
            .addChoices(
                { name: "Asia Pacific server", value: "ap" },
                { name: "Korea server", value: "kr" },
                { name: "North America server", value: "na" },
                { name: "Europe server", value: "eu" }
            )
    );
