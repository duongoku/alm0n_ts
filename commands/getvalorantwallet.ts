// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";
import { ValorantClient } from "../utils/ValorantClient";

export async function run(client: NewClient, message: Message, args: string[]) {
    // Don't need to check for arguments because this command is used without arguments
    // Check if user has a riot account in database
    const has_riot_account = await ValorantClient.check_riot_account(message);
    if (!has_riot_account) {
        return message.channel.send(
            "You don't have a riot account saved in the database. Please use the following format: `$setriotusername <username>` or `$sru <username>` to save your username and `$setriotpassword <password>` or `$srp <password>` to save your password."
        );
    }

    // Get riot username and password from database
    const riot_username = await ValorantClient.get_riot_username(message);
    const riot_password = await ValorantClient.get_riot_password(message);

    // Get store offers
    const valorant_client = new ValorantClient();
    await valorant_client.init(riot_username, riot_password);
    const wallet = await valorant_client.get_wallet();

    // Check if offers is null
    if (wallet == null) {
        return message.channel.send(
            "There was an error getting your wallet, most likely because of wrong credentials. Please try again."
        );
    }

    // Send the message
    await message.channel.send(
        `You have ${wallet.VP} Valorant Point(s) and ${wallet.RP} Radianite Point(s)`
    );
}

export const type = "Valorant";
export const aliases = ["gvw"];
export const description = "Get valorant wallet";
