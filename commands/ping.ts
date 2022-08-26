import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: CommandInteraction) {
    await interaction.editReply("pong");
}

export const data = new SlashCommandBuilder().setDescription(
    "Replies with pong! Ping pong!"
);
