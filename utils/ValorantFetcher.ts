import * as fs from "fs";
import axios from "axios";

import { ValorantClient, ITEMTYPEID, CURRENCYID, Skin } from "./ValorantClient";

import * as dotenv from "dotenv";
dotenv.config();

const CACHEDIR = process.env.CACHEDIR!;
const RIOTUSERNAME = process.env.RIOTUSERNAME!;
const RIOTPASSWORD = process.env.RIOTPASSWORD!;

async function cache_competitive_tiers_icons() {
    const url = "https://valorant-api.com/v1/competitivetiers";
    const response = await axios.get(url);
    const data = response.data!.data;
    const tier_data = data[data.length - 1]!.tiers;
    
    fs.writeFileSync(`${CACHEDIR}/comp_tiers.json`, JSON.stringify(tier_data));
    for (let tier of tier_data) {
        const icon_url = tier!.smallIcon;
        if (icon_url === null) {
            continue;
        }
        console.log(`  Getting icon ${icon_url}`);
        const icon_buffer = await axios.get(icon_url, {
            responseType: "arraybuffer",
        });
        const filepath = `${CACHEDIR}/images/tier_${tier.tier}.png`;
        fs.writeFileSync(filepath, icon_buffer.data);
        console.log(`  Saved icon ${icon_url} to ${filepath}`);
    }
}

async function cache_agents_icon() {
    const url = "https://valorant-api.com/v1/agents/";
    const response = await axios.get(url);
    const agent_data = response.data!.data;
    for (let agent of agent_data) {
        const icon_url = agent!.displayIcon;
        console.log(`  Getting icon ${icon_url}`);
        const icon_buffer = await axios.get(icon_url, {
            responseType: "arraybuffer",
        });
        const filepath = `${CACHEDIR}/images/agent_${agent.uuid}.png`;
        fs.writeFileSync(filepath, icon_buffer.data);
        console.log(`  Saved icon ${icon_url} to ${filepath}`);
    }
}

async function cache_maps() {
    const url = "https://valorant-api.com/v1/maps/";
    const response = await axios.get(url);
    const map_data = response.data!.data;
    const maps: any = {};
    for (let map of map_data) {
        maps[map.displayName] = map;
    }
    fs.writeFileSync(`${CACHEDIR}/maps.json`, JSON.stringify(maps));
    console.log(`  Saved maps to ${CACHEDIR}/maps.json`);
}

async function cache_items() {
    // Get skin prices
    const client = new ValorantClient();
    await client.init(RIOTUSERNAME, RIOTPASSWORD);
    const raw_price = await client.get_item_prices();
    const price: Record<string, number> = {};
    for (let i = 0; i < raw_price.length; i++) {
        if (raw_price[i].Rewards[0].ItemTypeID === ITEMTYPEID.SKINS) {
            price[raw_price[i].Rewards[0].ItemID] =
                raw_price[i].Cost[CURRENCYID.VP];
        }
    }

    // Get skin data
    const url = "https://valorant-api.com/v1/weapons/skins/";
    const response = await axios.get(url);
    const skin_data = response.data!.data;
    const result: Record<string, Skin> = {};

    // Map price to skin data
    for (let skin of skin_data) {
        const id = skin.levels[0].uuid;
        if (price[id] === undefined) {
            continue;
        }
        for (let level of skin.levels) {
            result[level.uuid] = {
                name: skin.displayName,
                icon: skin.levels[0].displayIcon
                    ? skin.levels[0].displayIcon
                    : skin.displayIcon,
                price: price[id],
            };
            if (result[level.uuid].icon === null) {
                console.log(`  ${level.uuid} has no icons!`);
                result[
                    level.uuid
                ].icon = `https://media.valorant-api.com/weaponskins/12cc9ed2-4430-d2fe-3064-f7a19b1ba7c7/displayicon.png`;
            }

            // Only takes level 0 for now
            break;
        }
    }

    fs.writeFileSync(`${CACHEDIR}/skins.json`, JSON.stringify(result, null, 4));
}

export async function fetch() {
    // Fetch maps
    console.log("Fetching maps...");
    console.time("Cache maps");
    await cache_maps();
    console.timeEnd("Cache maps");

    // Fetch items
    console.log("Fetching items...");
    console.time("Cache items");
    await cache_items();
    console.timeEnd("Cache items");

    // Fetch competitive tiers icons
    console.log("Fetching competitive tiers icons...");
    console.time("Cache competitive tiers icons");
    await cache_competitive_tiers_icons();
    console.timeEnd("Cache competitive tiers icons");

    // Fetch agents icons
    console.log("Fetching agents icons...");
    console.time("Cache agents icons");
    await cache_agents_icon();
    console.timeEnd("Cache agents icons");
}

fetch();
