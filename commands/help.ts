// Load dependencies
import { Message } from "discord.js";
import { NewClient } from "../index";

export function run(client: NewClient, message: Message, args: string[]) {
    const commands = client.commands;
    const command_types = new Map<string, string[]>();
    const command_descriptions = new Map<string, string>();

    // Add commands to command_types and command_descriptions
    for (const [command_name, command] of commands) {
        if (!command.aliases.includes(command_name)) {
            if (!command_types.has(command.type)) {
                command_types.set(command.type, []);
            }
            command_types.get(command.type)!.push(command_name);
            if (!command_descriptions.has(command_name)) {
                command_descriptions.set(command_name, command.description);
            }
        }
    }

    // Add commands to message
    var msg = `**Prefix**: ${client.prefix}\n**List of commands:**\n`;
    for (const [type, command_names] of command_types) {
        msg += `\t**${type}:**\n`;
        for (const command_name of command_names) {
            msg += `\t\t**${command_name}**: ${command_descriptions.get(
                command_name
            )}\n`;
        }
    }
    message.channel.send(msg);
}

export const type = "Utility";
export const aliases = ["h"];
export const description = "List of commands";
