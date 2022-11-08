import { Interaction } from "discord.js";
import { NewClient } from "../index";

const hiddenCommands = ["setriotusername", "setriotpassword"];

export async function run(client: NewClient, interaction: Interaction) {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    const command = client.commands.get(commandName);

    if (!command) return;

    if (hiddenCommands.includes(commandName)) {
        await interaction.deferReply({ ephemeral: true });
    } else {
        await interaction.deferReply();
    }

    try {
        await command.run(client, interaction);
    } catch (error) {
        console.log("Error: ", (error as Error).message);
        await interaction.editReply(
            "There was an error trying to execute that command!"
        );
    }
}
