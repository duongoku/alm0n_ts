import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Events,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { NewClient } from "../index";
import { ValorantClient } from "../utils/ValorantClient";

function get_embed_message(skins: any[], index: number) {
    return new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${skins[index].name}`)
        .setDescription(
            `Price: ${skins[index].o_price}VP => ${skins[index].d_price}VP`
        )
        .setImage(`${skins[index].icon}`)
        .setFooter({ text: `Offer #${index + 1} in ${skins.length} offers` });
}

export async function run(
    client: NewClient,
    interaction: ChatInputCommandInteraction
) {
    if (interaction.channel === null) {
        return;
    }

    const has_riot_account = await ValorantClient.check_riot_account(
        interaction
    );
    if (!has_riot_account) {
        return await interaction.editReply(ValorantClient.NOT_REGISTERED_MSG);
    }

    // Get riot username and password from database
    const riot_username = await ValorantClient.get_riot_username(interaction);
    const riot_password = await ValorantClient.get_riot_password(interaction);

    // Get store offers
    const valorant_client = new ValorantClient();
    try {
        await valorant_client.init(riot_username, riot_password);
    } catch (err) {
        console.log(err);
        return await interaction.editReply(
            "Some errors occured while trying to login. Please try again later."
        );
    }
    const offers = await valorant_client.get_bonus_offers();

    // Check if offers is null
    if (offers == null) {
        return await interaction.editReply(
            "There was an error getting the offers, most likely because of wrong credentials or night market is not available yet. Please try again."
        );
    }

    const skins: {
        name: string;
        o_price: string;
        d_price: string;
        icon: string;
    }[] = [];
    for (const item of offers.items) {
        const skin = {
            name: await ValorantClient.get_skin_name(item.Offer.OfferID),
            o_price: String(Object.values(item.Offer.Cost)[0]),
            d_price: String(Object.values(item.DiscountCosts)[0]),
            icon: `https://media.valorant-api.com/weaponskinlevels/${item.Offer.OfferID}/displayicon.png`,
        };
        skins.push(skin);
    }

    // Create buttons row
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
        new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Primary)
    );
    row.addComponents(
        new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary)
    );

    // Make embed message with buttons
    var current_index = 0;
    await interaction.editReply("Below are your night market offers.");
    const embed_message = await interaction.channel!.send({
        embeds: [get_embed_message(skins, current_index)],
        components: [row],
    });

    const collector = embed_message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i: ButtonInteraction) => {
            return true;
            return i.user.id === interaction.user.id;
        },
        time: 60000,
    });

    collector.on(Events.InteractionCreate, (i) => {
        if (!i.isButton()) return;
        if (i.customId === "next") {
            current_index += 1;
            current_index %= skins.length;
        } else if (i.customId === "prev") {
            current_index -= 1;
            current_index += skins.length;
            current_index %= skins.length;
        }
        i.update({
            embeds: [get_embed_message(skins, current_index)],
        });
    });
}

export const data = new SlashCommandBuilder().setDescription(
    "Get Valorant night market offers"
);
