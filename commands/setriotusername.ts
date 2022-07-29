// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";

async function save_riot_username(
    message: Message,
    username: string
): Promise<void> {
    const Client = require("@replit/database");
    const client = new Client();
    await client.set(`riot_username_${message.author.id}`, username);
}

export async function run(client: NewClient, message: Message, args: string[]) {
    // Check if message is direct message to bot
    if (message.channel.type != "DM") {
        return message.channel.send("You can only set your Riot Games username in DM (Direct Message).");
    }

    // Check if command is used correctly
    if (args.length < 1) {
        return message.channel.send(
            "Please use the following format: `$setriotusername <username>` or `$sru <username>`"
        );
    }

    // Save username in database
    const username = args[0];
    await save_riot_username(message, username);
    message.channel.send("Your username has been saved.");
}

export const type = "Utility";
export const aliases = ["sru"];
export const description = "Set your Riot Games username";
