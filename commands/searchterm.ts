import axios from "axios";
import cheerio from "cheerio";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
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

export async function run(client: NewClient, interaction: CommandInteraction) {
    const term = interaction.options.getString("term")!;
    const result = await get_definition_and_example(term);
    if (result === "Error") {
        return await interaction.editReply("Error");
    }
    return await interaction.editReply(
        `**${term}**\n\n**Definition:**\n${result[0]}\n\n**Example:**\n${result[1]}`
    );
}

export const data = new SlashCommandBuilder()
    .setDescription("Search for a term using urban dictionary")
    .addStringOption((option) =>
        option
            .setName("term")
            .setDescription("Enter a search term")
            .setRequired(true)
    );
