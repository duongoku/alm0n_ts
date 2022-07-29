// Load dependencies
import {
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from "discord.js";
import { NewClient } from "../index";
import { ValorantClient } from "../utils/ValorantClient";

function get_embed_message(skins: any[], index: number) {
    return new MessageEmbed()
        .setColor("#0099ff")
        .setTitle(`${skins[index].name}`)
        .setImage(`${skins[index].icon}`)
        .setFooter({ text: `Offer #${index + 1} in ${skins.length} offers` });
}

export async function run(client: NewClient, message: Message, args: string[]) {
    // Don't need to check for arguments because this command is used without arguments
    // Check if user has a riot account in database
    const has_riot_account = await ValorantClient.check_riot_account(message);
    if (!has_riot_account) {
        return message.channel.send(
            "You don't have a riot account saved in the database. Please use the following format: `$setriotusername <username>` or `$sru <username>` to save your username and `$setriotpassword <password>` or `$srp <password>` to save your password."
        );
    }

    // Get riot username and password from database
    const riot_username = await ValorantClient.get_riot_username(message);
    const riot_password = await ValorantClient.get_riot_password(message);

    // Get store offers
    const valorant_client = new ValorantClient();
    await valorant_client.init(riot_username, riot_password);
    const offers = await valorant_client.get_single_item_offers();

    // Check if offers is null
    if (offers == null) {
        return message.channel.send(
            "There was an error getting the offers, most likely because of wrong credentials. Please try again."
        );
    }

    const skins: {
        name: string;
        icon: string;
    }[] = [];
    for (const item of offers.items) {
        const skin = {
            name: await ValorantClient.get_skin_name(item),
            icon: `https://media.valorant-api.com/weaponskinlevels/${item}/displayicon.png`,
        };
        skins.push(skin);
    }

    // Create buttons row
    const row = new MessageActionRow();
    row.addComponents(
        new MessageButton()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle("PRIMARY")
    );
    row.addComponents(
        new MessageButton()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle("PRIMARY")
    );

    // Make embed message with buttons
    var current_index = 0;
    await message.channel.send("Below are your store offers.");
    const embed_message = await message.channel.send({
        embeds: [get_embed_message(skins, current_index)],
        components: [row],
    });
    const collector = embed_message.createMessageComponentCollector({
        // filter: ({ user }) => user.id === message.author.id,
        time: 60000,
    });
    collector.on("collect", async (interaction) => {
        if (interaction.customId === "next") {
            current_index += 1;
            current_index %= skins.length;
        } else if (interaction.customId === "prev") {
            current_index -= 1;
            current_index += skins.length;
            current_index %= skins.length;
        }
        interaction.update({
            embeds: [get_embed_message(skins, current_index)],
        });
    });
}

export const type = "Valorant";
export const aliases = ["gvs"];
export const description = "Get valorant store offers";

// async function test() {
//     const skin_name = await ValorantClient.get_skin_name(
//         "78776175-4040-282f-07a1-0199b1fdcf58"
//     );
//     console.log(skin_name);
// }
// test();
