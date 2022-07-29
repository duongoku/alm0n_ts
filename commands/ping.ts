// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";

export function run(client: NewClient, message: Message, args: string[]) {
    // Reply with pong
    message.reply("pong");
}

export const type = "Utility";
export const aliases = [];
export const description = "Ping Pong";