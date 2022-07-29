// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";

export function run(client: NewClient, message: Message, args: string[]) {
    // Reply with invitation URl
    message.reply(
        `https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot`
    );
}

export const type = "Utility";
export const aliases = [];
export const description = "Invite the bot to your server";
