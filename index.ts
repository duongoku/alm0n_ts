import * as fs from "fs";
import * as process from "process";
import { Client, Partials, Collection } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Set up cli
import { program } from "commander";
program
    .option("-u, --username <username>", "Your Riot username")
    .option("-p, --password <password>", "Your Riot password")
    .parse();
const options = program.opts();
if (options.username !== undefined && options.password !== undefined) {
    process.env.RIOT_USERNAME = options.username;
    process.env.RIOT_PASSWORD = options.password;
} else if (!(options.username === undefined && options.password === undefined)) {
    console.error("You must provide both username and password");
    process.exit(1);
}

import * as ValorantFetcher from "./utils/ValorantFetcher";


// Create new client
export class NewClient extends Client {
    prefix: string = "$";
    commands: Collection<string, any> = new Collection();
}
const client = new NewClient({
    intents: [32767],
    partials: [Partials.Channel],
});

// Check if prefix is defined in .env file and assign it
if (process.env.PREFIX) {
    client.prefix = process.env.PREFIX;
}

// Load events
const events = fs
    .readdirSync("./events")
    .filter((file) => file.endsWith(".ts"));
for (const file of events) {
    console.log(`Loading event in ${file}`);
    const event = require(`./events/${file}`);
    const event_name = file.slice(0, -3);
    client.on(event_name, event.run.bind(null, client));
}

// Load commands
const commands = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".ts"));
for (const file of commands) {
    console.log(`Loading command in ${file}`);
    const command = require(`./commands/${file}`);
    command.data.setName(file.slice(0, -3));
    client.commands.set(command.data.name, command);
}

// Check for token
if (!process.env.DISCORD_BOT_TOKEN) {
    console.log("No token found!");
    process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN
);

client.on("ready", async () => {
    // Check if client user is available
    if (client.user === null) {
        console.log("Client user is not available!");
        process.exit(1);
    }
    console.log(`Logged in as ${client.user.tag}!`);

    // Register commands
    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationCommands(client.user.id), {
            body: client.commands.map((cmd) => cmd.data.toJSON()),
        });

        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }

    // Start data fetchers
    // setInterval(CGVFetcher.fetch, 1000 * 60 * 60 * 2);
    setInterval(ValorantFetcher.fetch, 1000 * 60 * 60 * 3);
});

client.on("debug", console.log);

client.login(process.env.DISCORD_BOT_TOKEN);
