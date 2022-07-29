import * as http from "http";

export function keepAlive() {
    http.createServer(function (
        req: any,
        res: { write: (arg0: string) => void; end: () => void }
    ) {
        res.write("Bot is alive");
        res.end();
    }).listen(3000);
}
