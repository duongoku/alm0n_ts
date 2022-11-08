import * as fs from "fs";
import axios, { AxiosResponse } from "axios";
import process from "process";
import { HTMLElement, parse } from "node-html-parser";

import * as dotenv from "dotenv";
dotenv.config();

export class Film {
    name: string = "";
    poster: string = "";
    type: string = "";
    showtimes: string[] = [];
}

export class Day {
    id: string = "";
    date: string = "";
    films: Film[] = [];
}

export class Cine {
    name: string = "";
    id: string = "";
    url: string = "";
    days: Day[] = [];
}

export class City {
    name: string = "";
    id: string = "";
    cinemas: Cine[] = [];
}

const CACHEDIR = process.env.CACHEDIR;

const GLOBAL_HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US",
    "Content-Type": "application/x-www-form-urlencoded",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
};

const HEADER_WITH_COOKIE = {
    "Accept": `*/*`,
    "Accept-Language": `en-US`,
    "Accept-Encoding": `gzip, deflate, br`,
    "Content-Type": `application/x-www-form-urlencoded; charset=UTF-8`,
    "X-Requested-With": `XMLHttpRequest`,
    "Content-Length": `21`,
    "Origin": `https://www.cgv.vn`,
    "DNT": `1`,
    "Connection": `keep-alive`,
    "Referer": `https://www.cgv.vn/default/cinox/site/cgv-hung-vuong-plaza`,
    "Cookie": `frontend=svk7ursj6e1sm2ka6b086tqds5; frontend_cid=MJBEoI1LCnvPUjMz; TS015ef8cd=018ea3cdda577d4096a2580524af486f70e9146f7cbbbc7fe5b0216d7be50826e8d6e91d1a; TS01faf9b1=018ea3cddae11ebca9a154af1a7d2bfea87047c4c8315a344268b228bd65a8f1046efe704adff18f105aee6d17c5854aa5d5677c55f131b36f1df916821037423652ed1532; __stp={"visit":"new","uuid":"a97b20ce-6792-446d-a6aa-66c376e33c44"}; __sts={"sid":1667891729044,"tx":1667891729044,"url":"https%3A%2F%2Fwww.cgv.vn%2Fdefault%2Fcinox%2Fsite%2Fcgv-hung-vuong-plaza","pet":1667891729044,"set":1667891729044}; _gcl_au=1.1.1336078805.1667891729; __stgeo="0"; __admUTMtime=1667891729; __iid=6083; __iid=6083; __su=0; __su=0; __stdf=0`,
    "Sec-Fetch-Dest": `empty`,
    "Sec-Fetch-Mode": `cors`,
    "Sec-Fetch-Site": `same-origin`,
}

const GLOBAL_BODY = {
    TS015ef8cd_id: 3,
    TS015ef8cd_cr: "f3d37297fe98489e8acd87badf945932:jkij:q9GPLSI7:254114835",
    TS015ef8cd_76: 0,
    TS015ef8cd_md: 1,
    TS015ef8cd_rf: 0,
    TS015ef8cd_ct: 0,
    TS015ef8cd_pd: 0
};

async function save_image(url: string): Promise<string> {
    let filepath = `${CACHEDIR}/images/${url.split("/").pop()}`;
    if (fs.existsSync(filepath)) {
        return filepath;
    }
    let response = await axios.get(url, { responseType: "stream" });
    console.log(` Saving image ${url} to ${filepath}`);
    let file = fs.createWriteStream(filepath);
    response.data.pipe(file);
    return new Promise((resolve, reject) => {
        file.on("finish", () => {
            console.log(`  Saved image ${url} to ${filepath}`);
            resolve(filepath);
        });
        file.on("error", (err) => {
            reject(err);
        });
    });
}

async function get_cgv_cities(): Promise<City[]> {
    let url = "https://www.cgv.vn/default/cinox/site/cgv-vivo-city";
    let response: AxiosResponse;
    try {
        response = await axios.post(url, GLOBAL_BODY, {
            headers: GLOBAL_HEADER,
        });
    } catch (err) {
        console.log(err);
        console.log("Couldn't get CGV cities");
        return [];
    }
    let root = parse(response.data);

    // Get list of cities in <span>
    let area: null | HTMLElement;
    let cities_span: any[];
    try {
        area = root.querySelector(".cinemas-area");
        cities_span = area!
            .querySelectorAll("li")
            .map((x) => x.querySelector("span"));
    } catch (err) {
        console.log(err);
        console.log("Couldn't get CGV cities");
        return [];
    }

    let cities: City[] = [];

    // Add cinemas to each city
    for (let i = 0; i < cities_span.length; i++) {
        let city = cities_span[i];
        let city_name = city!.textContent;
        let city_id = city!.id;
        let cinema_elems = root
            .querySelector(".cinemas-list")!
            .querySelectorAll(`li.${city_id}`);
        let cinemas: Cine[] = [];
        for (let cinema_elem of cinema_elems) {
            let name = cinema_elem.querySelector("span")!.textContent;
            let id = cinema_elem.querySelector("span")!.id;
            let url = cinema_elem
                .querySelector("span")!
                .attributes["onclick"].split("'")[1];
            let days = await get_in_theaters(url);
            cinemas.push({
                name: name,
                id: id,
                url: url,
                days: days,
            });
        }
        cities.push({
            name: city_name,
            id: city_id,
            cinemas: cinemas,
        });
    }

    return cities;
}

async function get_in_theaters(url: string): Promise<Day[]> {
    try {
        console.log(`Getting in theaters from ${url}`);
        let response = await axios.post(url, GLOBAL_BODY, {
            headers: GLOBAL_HEADER,
        });
        let root = parse(response.data);
        let table = root.querySelector("#collateral-tabs");
        let day_elems = table!.querySelectorAll(".day");
        let days: Day[] = [];
        let prev = "";

        // Get film schedule for each day
        for (let i = 0; i < day_elems.length; i++) {
            let weekday = day_elems[i].querySelector("em")!.textContent.trim();
            let monthday = day_elems[i]
                .querySelector("strong")!
                .textContent.trim();
            let month = day_elems[i].querySelector("span")!.textContent.trim();

            let day = new Day();
            day.id = day_elems[i].id.replace("cgv", "").trim();
            day.date = `${weekday} ${monthday}/${month}`;

            let film_list = parse((await axios.post(url, `selecteddate=${day.id}`, {
                headers: HEADER_WITH_COOKIE,
            })).data);
            let film_elems = film_list!.querySelectorAll(".film-list");

            if (prev == film_list.rawText) {
                console.log("Equals lmao!");
            } else {
                console.log("Different!");
                prev = film_list.rawText;
            }
            console.log(`${day.date} -> ${film_elems.length}`);

            let films: Film[] = [];
            for (let film_elem of film_elems) {
                // Get film info elements
                let efilmlabel = film_elem.querySelector(".film-label");
                let efilmposter = film_elem.querySelector(".film-poster");
                let efilmright = film_elem.querySelector(".film-right");

                // Parse film info from above elements
                let filmlabel = efilmlabel!
                    .querySelector("a")!
                    .textContent.trim()
                    .replace(/\s\s+/g, " - ");
                let filmposterurl =
                    efilmposter!.querySelector("img")!.attributes["src"];
                let filmposter = await save_image(filmposterurl);
                let filmtype = efilmright!
                    .querySelector(".film-screen")!
                    .textContent.trim();
                let filmshowtimes = efilmright!
                    .querySelectorAll("span")!
                    .map((x) => {
                        return x.textContent.trim();
                    });

                films.push({
                    name: filmlabel,
                    poster: filmposter,
                    type: filmtype,
                    showtimes: filmshowtimes,
                });
            }
            day.films = films;

            days.push(day);
        }

        console.log(`  Done ${url}`);
        return days;
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function fetch() {
    // Fetch data from website
    console.log("Fetching data from CGV...");
    console.time("Cache data from CGV");
    let cities = await get_cgv_cities();

    // Cache data
    console.log("Caching data...");
    let data = JSON.stringify(cities);
    let path = `${CACHEDIR}/cgv.json`;
    fs.writeFileSync(path, data);
    console.timeEnd("Cache data from CGV");
    console.log(`Cached data to ${path}`);

    return cities;
}

// fetch();