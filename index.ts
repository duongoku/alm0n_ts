// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Load dependencies
import * as CGVFetcher from "./utils/CGVFetcher";
import * as ValorantFetcher from "./utils/ValorantFetcher";
import * as fs from "fs";
import * as process from "process";
import { Client, Intents, Collection } from "discord.js";

// Create new client
export class NewClient extends Client {
    prefix: string = "$";
    commands: Collection<string, any> = new Collection();
}
const client = new NewClient({
    intents: [new Intents(32767)],
    partials: ["CHANNEL"],
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
// Remove help command to add later
if (commands.includes("help.ts")) {
    commands.splice(commands.indexOf("help.ts"), 1);
}
for (const file of commands) {
    console.log(`Loading command in ${file}`);
    const command = require(`./commands/${file}`);
    const command_name = file.slice(0, -3);
    client.commands.set(command_name, command);
    for (const alias of command.aliases) {
        client.commands.set(alias, command);
    }
}

// Add help command if exists
if (fs.existsSync("./commands/help.ts")) {
    console.log(`Loading command in help.ts`);
    const command = require("./commands/help.ts");
    client.commands.set("help", command);
    for (const alias of command.aliases) {
        client.commands.set(alias, command);
    }
}

// On client ready
client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    setInterval(CGVFetcher.fetch, 1000 * 60 * 60 * 2);
    setInterval(ValorantFetcher.fetch, 1000 * 60 * 60 * 3);
});

// On debug
client.on("debug", console.log);

// Login
client.login(process.env.DISCORD_BOT_TOKEN);
