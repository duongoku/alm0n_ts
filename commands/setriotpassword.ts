// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";

import * as dotenv from "dotenv";
dotenv.config();

const GETSETDB = process.env.GETSETDB!;

async function save_riot_password(
    message: Message,
    password: string
): Promise<void> {
    const Client = require(GETSETDB);
    const client = new Client();
    await client.set(`riot_password_${message.author.id}`, password);
}

export async function run(client: NewClient, message: Message, args: string[]) {
    // Check if message is direct message to bot
    if (message.channel.type != "DM") {
        return message.channel.send("You can only set your Riot Games password in DM (Direct Message).");
    }

    // Check if command is used correctly
    if (args.length < 1) {
        return message.channel.send(
            "Please use the following format: `$setriotpassword <password>` or `$srp <password>`"
        );
    }

    // Save password in database
    const password = args[0];
    await save_riot_password(message, password);
    message.channel.send("Your password has been saved.");
}

export const type = "Utility";
export const aliases = ["srp"];
export const description = "Set your Riot Games password";