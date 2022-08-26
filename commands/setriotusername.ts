import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { NewClient } from "../index";

import * as dotenv from "dotenv";
dotenv.config();

const GETSETDB = process.env.GETSETDB!;

async function save_riot_username(
    interaction: CommandInteraction,
    username: string
): Promise<void> {
    const Client = require(GETSETDB);
    const client = new Client();
    await client.set(`riot_username_${interaction.user.id}`, username);
}

export async function run(client: NewClient, interaction: CommandInteraction) {
    try {
        // Save username in database
        const username = interaction.options.getString("username")!;
        await save_riot_username(interaction, username);
        await interaction.editReply("Your username has been saved.");
    } catch (error) {
        return await interaction.editReply(
            "Something went wrong! Please try again later."
        );
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Set your Riot Games username")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("Enter your username")
            .setRequired(true)
    );
