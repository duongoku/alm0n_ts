import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction } from "discord.js";
import { NewClient } from "../index";
import { ValorantClient } from "../utils/ValorantClient";

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    const has_riot_account = await ValorantClient.check_riot_account(
        interaction
    );
    if (!has_riot_account) {
        return await interaction.editReply(ValorantClient.NOT_REGISTERED_MSG);
    }

    // Get riot username and password from database
    const riot_username = await ValorantClient.get_riot_username(interaction);
    const riot_password = await ValorantClient.get_riot_password(interaction);

    // Get store offers
    const valorant_client = new ValorantClient();
    try {
        await valorant_client.init(riot_username, riot_password);
    } catch (err) {
        console.log(err);
        return await interaction.editReply(
            "Some errors occured while trying to login. Please try again later."
        );
    }
    const wallet = await valorant_client.get_wallet();

    // Check if offers is null
    if (wallet == null) {
        return await interaction.editReply(
            "There was an error getting your wallet, most likely because of wrong credentials. Please try again."
        );
    }

    // Send the message
    await interaction.editReply(
        `You have ${wallet.VP} Valorant Point(s) and ${wallet.RP} Radianite Point(s)`
    );
}

export const data = new SlashCommandBuilder().setDescription(
    "Get Valorant wallet"
);
