import { ChatInputCommandInteraction, GuildMember, VoiceBasedChannel } from "discord.js";
import { Readable } from "stream";
import { SlashCommandBuilder } from "@discordjs/builders";
import {
    AudioPlayer,
    AudioPlayerStatus,
    DiscordGatewayAdapterCreator,
    StreamType,
    VoiceConnection,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
} from "@discordjs/voice";
import { TextToSpeechClient, protos } from "@google-cloud/text-to-speech";
import { NewClient } from "../index";

const tts = new TextToSpeechClient();

const players_map = new Map();

function is_playing(player: AudioPlayer) {
    if (
        player.state.status == AudioPlayerStatus.Playing ||
        player.state.status == AudioPlayerStatus.Buffering
    ) {
        return true;
    } else {
        return false;
    }
}

async function get_tts_audio(text: string) {
    const request =
        protos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest.create({
            input: { text: text },
            voice: {
                languageCode: "vi-VN",
                ssmlGender:
                    protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
            },
            audioConfig: {
                audioEncoding:
                    protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
                speakingRate: 0.75,
            },
        });

    const [response] = await tts.synthesizeSpeech(request);
    return Readable.from(response.audioContent! as Uint8Array);
}

async function playTTS(
    interaction: ChatInputCommandInteraction,
    text: string,
    player: AudioPlayer
) {
    const audioContent = await get_tts_audio(text);

    const resource = createAudioResource(audioContent, {
        inputType: StreamType.Arbitrary,
    });

    if (is_playing(player)) {
        interaction.editReply("Wait for the previous tts to finish first!");
        return false;
    }

    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 10e3);
}

function checkUserCount(
    channel: VoiceBasedChannel,
    connection: VoiceConnection
) {
    const userCount = channel.members.size;
    if (userCount < 2) {
        try {
            connection.destroy();
        } catch (error) {
            console.log(error);
        }
    } else {
        setTimeout(() => {
            checkUserCount(channel, connection);
        }, 10e3);
    }
}

async function connectToChannel(
    channel: VoiceBasedChannel,
    player: AudioPlayer
) {
    if (is_playing(player)) {
        return false;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild
            .voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
        checkUserCount(channel, connection);
        return connection;
    } catch (error) {
        connection.destroy();
        throw error;
    }
}

function preCheck(text: String) {
    if (text.split(" ").length > 20) {
        return false;
    }
    return true;
}

export async function run(client: NewClient, interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const channel = member.voice.channel;
    const text = interaction.options.getString("text")!;

    if (!players_map.get(interaction.guildId)) {
        players_map.set(interaction.guildId, createAudioPlayer());
    }

    if (channel) {
        if (preCheck(text)) {
            interaction.editReply(`${member.displayName} said: ${text}`);
            var player = players_map.get(member.guild?.id);
            try {
                const connection = await connectToChannel(channel, player);
                if (!connection) {
                    await playTTS(interaction, text, player);
                } else {
                    connection.subscribe(player);
                    await playTTS(interaction, text, player);
                }
            } catch (error) {
                console.error(error);
            }
        } else {
            interaction.editReply("Too many words!");
        }
    } else {
        await interaction.editReply("Join a voice channel then try again!");
    }
}

export const data = new SlashCommandBuilder()
    .setDescription("Say something in Vietnamese")
    .addStringOption((option) =>
        option
            .setName("text")
            .setDescription("Enter the text you want to say here")
            .setRequired(true)
    );
