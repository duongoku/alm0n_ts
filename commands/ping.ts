import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction } from "discord.js";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    await interaction.editReply("pong");
}

export const data = new SlashCommandBuilder().setDescription(
    "Replies with pong! Ping pong!"
);
