// Load dependencies
import axios from "axios";
import cheerio from "cheerio";
import { Message } from "discord.js";
import { NewClient } from "../index";

async function get_definition_and_example(word: string) {
    const url = "https://www.urbandictionary.com/define.php";
    return axios
        .get(url, { params: { term: word } })
        .then((response) => {
            if (response.status === 200) {
                const data = response.data;
                const $ = cheerio.load(data);
                // Replace br with newline
                $(".meaning").find("br").replaceWith("\n");
                $(".example").find("br").replaceWith("\n");
                // Get definition and example using first meaning class element
                var definition = $(".meaning").first().text();
                var example = $(".example").first().text();
                // Replace multiple newline with single newline
                definition = definition.replace(/\n\n+/g, "\n");
                example = example.replace(/\n\n+/g, "\n");
                // Return definition and example
                return [definition, example];
            }
            return "No definition found";
        })
        .catch((err) => {
            console.log("Error: ", err.message);
            return "Error";
        });
}

export async function run(client: NewClient, message: Message, args: string[]) {
    if (args.length < 1) {
        return message.channel.send("Please specify a word to search");
    }
    const word = args.join(" ");
    const result = await get_definition_and_example(word);
    if (result === "Error") {
        return message.channel.send("Error");
    }
    return message.channel.send(
        `**${word}**\n\n**Definition:**\n${result[0]}\n\n**Example:**\n${result[1]}`
    );
}

export const type = "Utility";
export const aliases = ["sw"];
export const description = "Search for a word using urban dictionary";
