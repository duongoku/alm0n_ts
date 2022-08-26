import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: CommandInteraction) {
    // Reply with invitation URl
    await interaction.editReply(
        `https://discord.com/oauth2/authorize?client_id=${
            client.user!.id
        }&permissions=8&scope=bot`
    );
}

export const data = new SlashCommandBuilder().setDescription(
    "Get link to invite the bot to your server"
);
