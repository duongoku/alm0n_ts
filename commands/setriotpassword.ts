import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction } from "discord.js";
import { NewClient } from "../index";

import * as dotenv from "dotenv";
dotenv.config();

const GETSETDB = process.env.GETSETDB!;

async function save_riot_password(
    interaction: ChatInputCommandInteraction,
    password: string
): Promise<void> {
    const Client = require(GETSETDB);
    const client = new Client();
    await client.set(`riot_password_${interaction.user.id}`, password);
}

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    try {
        // Save password in database
        const password = interaction.options.getString("password")!;
        await save_riot_password(interaction, password);
        await interaction.editReply("Your password has been saved.");
    } catch (error) {
        return await interaction.editReply(
            "Something went wrong! Please try again later."
        );
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Set your Riot Games password")
    .addStringOption((option) =>
        option
            .setName("password")
            .setDescription("Enter your password")
            .setRequired(true)
    );
