import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { getVoiceConnection } from "@discordjs/voice";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: CommandInteraction) {
    const connection = getVoiceConnection(interaction.guildId!);
    if (connection) {
        connection.destroy();
        interaction.reply("Disconnected from voice channel!");
    } else {
        interaction.reply("I'm not connected to a voice channel!");
    }
}

export const data = new SlashCommandBuilder().setDescription(
    "Disconnect from voice channel"
);
