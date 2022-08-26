import axios from "axios";
import * as fs from "fs";

import { Agent } from "https";
import { CommandInteraction } from "discord.js";

import * as dotenv from "dotenv";
dotenv.config();

const GETSETDB = process.env.GETSETDB!;

const AUTH_BASE_URL = "https://auth.riotgames.com";
const ENTITLEMENTS_BASE_URL = "https://entitlements.auth.riotgames.com";
const REGION_BASE_URL = {
    na: "https://pd.na.a.pvp.net",
    eu: "https://pd.eu.a.pvp.net",
    ap: "https://pd.ap.a.pvp.net",
    kr: "https://pd.kr.a.pvp.net",
};

export const ITEMTYPEID = {
    AGENTS: `01bb38e1-da47-4e6a-9b3d-945fe4655707`,
    CONTRACTS: `f85cb6f7-33e5-4dc8-b609-ec7212301948`,
    SPRAYS: `d5f120f8-ff8c-4aac-92ea-f2b5acbe9475`,
    BUDDIES: `dd3bf334-87f3-40bd-b043-682a57a8dc3a 	`,
    CARDS: `3f296c07-64c3-494c-923b-fe692a4fa1bd`,
    SKINS: `e7c63390-eda7-46e0-bb7a-a6abdacd2433`,
    SKINVARIANTS: `3ad1b2b2-acdb-4524-852f-954a76ddae0a`,
    TITLES: `de7caa6b-adf7-4588-bbd1-143831e786c6`,
    INVENTORY_SKINS: `4e60e748-bce6-4faa-9327-ebbe6089d5fe`,
};
export const CURRENCYID = {
    VP: `85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741`, // Valorant Point
    FA: `f08d4ae3-939c-4576-ab26-09ce1f23bb37`, // Free Agent
    RP: `e59aa87c-4cbf-517a-5983-6e81511be9b7`, // Radianite Point
};

// This piece of code is from https://github.com/liamcottle/valorant.js/pull/22
const ciphers = [
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256",
];
const agent = new Agent({
    ciphers: ciphers.join(":"),
    honorCipherOrder: true,
    minVersion: "TLSv1.2",
});
// This piece of code is from https://github.com/liamcottle/valorant.js/pull/22

export interface Skin {
    name: string;
    icon: string;
    price: number;
}

class AccessToken {
    token: string;
    type: string;

    constructor(token: string, type: string) {
        this.token = token;
        this.type = type;
    }
}

export class ValorantClient {
    access_token: AccessToken = new AccessToken("", "");
    rso_token: string = "";
    // sub is the user id
    sub: string = "";
    // jti is something I don't know
    jti: string = "";
    global_headers: {
        Authorization: string;
        "X-Riot-Entitlements-JWT": string;
    } = {
        Authorization: "",
        "X-Riot-Entitlements-JWT": "",
    };

    static all_skins: { [x: string]: Skin } = {};

    constructor() {}

    public static NOT_REGISTERED_MSG =
        "You don't have a riot account saved in the database. Please register using /setriotusername and /setriotpassword.";

    static async check_riot_account(
        interaction: CommandInteraction
    ): Promise<boolean> {
        // Check if user has a riot account in database
        const Client = require(GETSETDB);
        const client = new Client();
        const riot_username = await client.get(
            `riot_username_${interaction.user.id}`
        );
        const riot_password = await client.get(
            `riot_password_${interaction.user.id}`
        );
        if (riot_username != null && riot_password != null) {
            return true;
        }
        return false;
    }

    static async get_riot_username(
        interaction: CommandInteraction
    ): Promise<string> {
        // Get riot username from database
        const Client = require(GETSETDB);
        const client = new Client();
        const riot_username = await client.get(
            `riot_username_${interaction.user.id}`
        );
        return riot_username as string;
    }

    static async get_riot_password(
        interaction: CommandInteraction
    ): Promise<string> {
        // Get riot password from database
        const Client = require(GETSETDB);
        const client = new Client();
        const riot_password = await client.get(
            `riot_password_${interaction.user.id}`
        );
        return riot_password as string;
    }

    static async get_skin_name(id: string): Promise<string> {
        const url = `https://valorant-api.com/v1/weapons/skinlevels/${id}`;
        const response = await axios.get(url);
        return response.data.data.displayName;
    }

    async init(username: string, password: string) {
        await this.get_access_token(username, password);
        await this.get_rso_token();
        await this.get_user_info();
        this.make_global_headers();
    }

    split_query(query: string): string[] {
        return query.split("&").map((item) => item.split("=")[1]);
    }

    make_global_headers() {
        this.global_headers = {
            Authorization: `${this.access_token.type} ${this.access_token.token}`,
            "X-Riot-Entitlements-JWT": this.rso_token,
        };
    }

    async get_access_token(username: string, password: string) {
        // Get cookies
        const url = `${AUTH_BASE_URL}/api/v1/authorization`;
        const response1 = await axios.post(
            url,
            {
                client_id: "play-valorant-web-prod",
                nonce: "1",
                redirect_uri: "https://playvalorant.com/opt_in",
                response_type: "token id_token",
                scope: "account openid",
            },
            {
                headers: {
                    "User-Agent":
                        "RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)",
                },
                httpsAgent: agent,
            }
        );
        const cookies = response1.headers["set-cookie"]!.join("; ");

        // Get access token
        const response2 = await axios.put(
            `${AUTH_BASE_URL}/api/v1/authorization`,
            {
                type: "auth",
                username: username,
                password: password,
            },
            {
                headers: {
                    "User-Agent":
                        "RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)",
                    cookie: cookies,
                },
                httpsAgent: agent,
            }
        );

        if (!response2.data.error) {
            const uri = response2.data.response.parameters.uri;
            const query = this.split_query(uri.split("#")[1]);
            this.access_token = new AccessToken(query[0], query[4]);
        }
    }

    async get_rso_token() {
        // Check if access token is valid
        if (this.access_token.token === "" || this.access_token.type === "") {
            return;
        }
        const url = `${ENTITLEMENTS_BASE_URL}/api/token/v1`;
        const headers = {
            Authorization: `${this.access_token.type} ${this.access_token.token}`,
        };
        const response = await axios.post(url, {}, { headers: headers });
        this.rso_token = response.data.entitlements_token;
    }

    async get_user_info() {
        // Check if access token is valid
        if (this.access_token.token === "" || this.access_token.type === "") {
            return;
        }
        const url = `${AUTH_BASE_URL}/userinfo`;
        const headers = {
            Authorization: `${this.access_token.type} ${this.access_token.token}`,
        };
        const response = await axios.post(url, {}, { headers: headers });
        this.sub = response.data.sub;
        this.jti = response.data.jti;
    }

    async get_account() {
        // Check if sub is empty
        if (this.sub === "") {
            return null;
        }
        const url = `${REGION_BASE_URL.ap}/name-service/v2/players`;
        const data = [this.sub];
        const response = await axios.put(url, data, {
            headers: this.global_headers,
        });
        const account = {
            username: response.data[0].GameName,
            tagline: response.data[0].TagLine,
            id: response.data[0].Subject,
        };
        return account;
    }

    async get_storefront() {
        // Check if sub is empty
        if (this.sub === "") {
            return null;
        }
        const url = `${REGION_BASE_URL.ap}/store/v2/storefront/${this.sub}`;
        const response = await axios.get(url, {
            headers: this.global_headers,
        });
        return response.data;
    }

    async get_wallet() {
        // Check if sub is empty
        if (this.sub === "") {
            return null;
        }
        const url = `${REGION_BASE_URL.ap}/store/v1/wallet/${this.sub}`;
        const response = await axios.get(url, {
            headers: this.global_headers,
        });
        try {
            const wallet = {
                VP: response.data.Balances[
                    "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"
                ],
                RP: response.data.Balances[
                    "e59aa87c-4cbf-517a-5983-6e81511be9b7"
                ],
            };
            return wallet;
        } catch (error) {
            return null;
        }
    }

    static async get_all_skins() {
        const result = fs.readFileSync(`${process.env.CACHEDIR}/skins.json`);
        return JSON.parse(result.toString());
    }

    async get_inventory(): Promise<Skin[] | null> {
        // Check if sub is empty
        if (this.sub === "") {
            return null;
        }
        const url = `${REGION_BASE_URL.ap}/store/v1/entitlements/${this.sub}/${ITEMTYPEID.SKINS}`;
        const response = await axios.get(url, {
            headers: this.global_headers,
        });
        const items = response.data!.Entitlements!;
        const result: Skin[] = [];

        for (const item of items) {
            if (item.TypeID === ITEMTYPEID.INVENTORY_SKINS) {
                if (ValorantClient.all_skins[item.ItemID]) {
                    result.push(ValorantClient.all_skins[item.ItemID]);
                }
            }
        }

        return result;
    }

    static async get_item_prices() {
        const url = `https://api.henrikdev.xyz/valorant/v1/store-offers`;
        const response = await axios.get(url);
        return response.data!.data!.Offers!;
    }

    async get_single_item_offers() {
        const storefront = await this.get_storefront();
        // Check if storefront is null
        if (storefront === null) {
            return null;
        }

        const offers = {
            items: storefront.SkinsPanelLayout.SingleItemOffers,
            remaining_duration:
                storefront.SkinsPanelLayout
                    .SingleItemOffersRemainingDurationInSeconds,
        };
        return offers;
    }

    async get_bonus_offers() {
        const storefront = await this.get_storefront();
        // Check if storefront is null
        if (storefront === null) {
            return null;
        }

        // Check if there are bonus offers
        if (!("BonusStore" in storefront)) {
            return null;
        }

        const offers = {
            items: storefront.BonusStore.BonusStoreOffers,
            remaining_duration:
                storefront.BonusStore.BonusStoreRemainingDurationInSeconds,
        };
        return offers;
    }
}

(async () => {
    ValorantClient.all_skins = await ValorantClient.get_all_skins();
})();
