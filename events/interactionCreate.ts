import { Interaction } from "discord.js";
import { NewClient } from "../index";

export async function run(client: NewClient, interaction: Interaction) {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    const command = client.commands.get(commandName);

    if (!command) return;

    interaction.deferReply();

    try {
        command.run(client, interaction);
    } catch (error) {
        console.log("Error: ", (error as Error).message);
        await interaction.editReply("There was an error trying to execute that command!");
    }
}
