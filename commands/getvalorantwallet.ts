import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { NewClient } from "../index";
import { ValorantClient } from "../utils/ValorantClient";

export async function run(client: NewClient, interaction: CommandInteraction) {
    const has_riot_account = await ValorantClient.check_riot_account(
        interaction
    );
    if (!has_riot_account) {
        return await interaction.editReply(
            "You don't have a riot account saved in the database. Please use the following format: `$setriotusername <username>` or `$sru <username>` to save your username and `$setriotpassword <password>` or `$srp <password>` to save your password."
        );
    }

    // Get riot username and password from database
    const riot_username = await ValorantClient.get_riot_username(interaction);
    const riot_password = await ValorantClient.get_riot_password(interaction);

    // Get store offers
    const valorant_client = new ValorantClient();
    await valorant_client.init(riot_username, riot_password);
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
