// Load dependencies
import stringArgv from "string-argv";
import { Message } from "discord.js";
import { NewClient } from "../index";

export function run(client: NewClient, message: Message) {
    // Ignore message if it's from a bot or if it's not a command
    if (message.author.bot || !message.content.startsWith(client.prefix)) {
        return;
    }

    // Check if message contains command
    if (message.content.length === client.prefix.length) {
        return;
    }

    // Our standard argument/command name definition.
    const args = stringArgv(message.content.slice(client.prefix.length));
    const command_name = args.shift()!.toLowerCase();

    // Grab the command data from the client.commands collection.
    const command = client.commands.get(command_name);

    // Check if command exists
    if (!command) return;

    // Run the command
    try {
        if (command.run[Symbol.toStringTag] === "AsyncFunction") {
            message.channel.send(
                "Please wait for a moment while I process your request..."
            );
        }
        command.run(client, message, args);
    } catch (error) {
        console.log("Error: ", (error as Error).message);
        message.channel.send(
            "There was an error trying to execute that command!"
        );
    }
}
