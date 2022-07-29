import * as fs from "fs";
import axios from "axios";

import * as dotenv from "dotenv";
dotenv.config();

const CACHEDIR = process.env.CACHEDIR;

async function cache_competitive_tiers_icons() {
    const url = "https://valorant-api.com/v1/competitivetiers";
    const response = await axios.get(url);
    const data = response.data!.data;
    const tier_data = data[data.length - 1]!.tiers;
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

export async function fetch() {
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

    // Fetch maps
    console.log("Fetching maps...");
    console.time("Cache maps");
    await cache_maps();
    console.timeEnd("Cache maps");
}

fetch();
