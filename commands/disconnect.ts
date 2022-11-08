import { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { getVoiceConnection } from "@discordjs/voice";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    const connection = getVoiceConnection(interaction.guildId!);
    if (connection) {
        connection.destroy();
        interaction.editReply("Disconnected from voice channel!");
    } else {
        interaction.editReply("I'm not connected to a voice channel!");
    }
}

export const data = new SlashCommandBuilder().setDescription(
    "Disconnect from voice channel"
);
