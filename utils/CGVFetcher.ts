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
        response = await axios.get(url);
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
    console.log(` Getting ${url}`);

    try {
        let response = await axios.get(url);
        let root = parse(response.data);
        let table = root.querySelector(".collateral-tabs");
        if (table == null) {
            return [];
        }
        let day_elems = table!.querySelectorAll(".day");
        let film_day_elems = table!.querySelectorAll(".cgv-sites-schedule");
        let days: Day[] = [];

        // Get film schedule for each day
        for (let i = 0; i < day_elems.length; i++) {
            let day = new Day();

            let weekday = day_elems[i].querySelector("em")!.textContent.trim();
            let monthday = day_elems[i]
                .querySelector("strong")!
                .textContent.trim();
            let month = day_elems[i].querySelector("span")!.textContent.trim();
            day.date = `${weekday} ${monthday}/${month}`;

            let film_list = film_day_elems[i];
            let film_elems = film_list!.querySelectorAll(".film-list");
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

fetch();
