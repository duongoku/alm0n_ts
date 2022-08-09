import * as fs from "fs";

import * as dotenv from "dotenv";
dotenv.config();

class Client {
    dbfile = "local.db";

    constructor() {
        if (process.env.DBFILE) {
            this.dbfile = process.env.DBFILE;
        }
        // Check if the file exists
        if (!fs.existsSync(this.dbfile)) {
            fs.writeFileSync(this.dbfile, "{}");
        }
    }

    async set(key: string, value: string): Promise<void> {
        const db = JSON.parse(fs.readFileSync(this.dbfile, "utf8"));
        db[key] = value;
        fs.writeFileSync(this.dbfile, JSON.stringify(db, null, 4));
    }

    async get(key: string): Promise<string> {
        const db = JSON.parse(fs.readFileSync(this.dbfile, "utf8"));
        return db[key];
    }
}

module.exports = Client;