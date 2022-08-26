import axios from "axios";
import process from "process";
import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { NewClient } from "../index";

async function check_currency(currency: string): Promise<boolean> {
    // Load api key
    const api_key = process.env.CURRCONV_APIKEY;

    // Endpoint
    const url = "https://free.currconv.com/api/v7/currencies";

    // Make request
    return axios
        .get(url, { params: { apiKey: api_key } })
        .then((response) => {
            if (response.status === 200) {
                const currencies = Object.keys(response.data.results);
                if (currencies.includes(currency.toUpperCase())) {
                    return true;
                }
            }
            return false;
        })
        .catch((err) => {
            console.log("Error: ", err.message);
            return false;
        });
}

async function get_converted_currency(
    src_curr: string,
    dst_curr: string,
    amount: number
): Promise<string> {
    // Load api key
    const api_key = process.env.CURRCONV_APIKEY;

    // Endpoint
    const url = "https://free.currconv.com/api/v7/convert";

    // Check if amount is valid
    if (amount <= 0) {
        return "Invalid amount";
    }

    // Convert input into uppercase
    src_curr = src_curr.toUpperCase();
    dst_curr = dst_curr.toUpperCase();

    // Make request
    return axios
        .get(url, {
            params: {
                apiKey: api_key,
                q: `${src_curr}_${dst_curr}`,
                compact: "ultra",
            },
        })
        .then((response) => {
            const converted_amount =
                response.data[`${src_curr}_${dst_curr}`] * amount;
            return `${amount} ${src_curr} = ${converted_amount.toFixed(
                2
            )} ${dst_curr}`;
        })
        .catch((err) => {
            console.log("Error: ", err.message);
            return "Error";
        });
}

export async function run(client: NewClient, interaction: CommandInteraction) {
    try {
        // Check if currencies are valid
        const src_curr = interaction.options.getString("source_currency")!;
        const dst_curr = interaction.options.getString("destination_currency")!;
        const amount = interaction.options.getNumber("amount")!;
        if (
            !(await check_currency(src_curr)) ||
            !(await check_currency(dst_curr))
        ) {
            return await interaction.editReply(
                "Invalid currency. Please use the following format: `$convert <src_curr> <dst_curr> <amount>`"
            );
        }

        // Get converted currency
        const converted_currency = await get_converted_currency(
            src_curr,
            dst_curr,
            amount
        );

        // Send message
        return await interaction.editReply(converted_currency);
    } catch (error) {
        console.log("Error: ", (error as Error).message);
        return await interaction.editReply(
            "There was an error trying to execute that command!"
        );
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Convert currencies")
    .addStringOption((option) =>
        option
            .setName("source_currency")
            .setDescription("Enter your source currency")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("destinatio_currency")
            .setDescription("Enter your destination currency")
            .setRequired(true)
    )
    .addNumberOption((option) =>
        option
            .setName("amount")
            .setDescription("Enter the amount to convert")
            .setRequired(true)
    );
