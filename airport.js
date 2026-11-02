// =======================================================================
// FILE: airport.js — renders one airport's guide from data/<code>.json
// =======================================================================
document.addEventListener("DOMContentLoaded", () => {

    const FORM_URL = "https://forms.gle/SNTCURVieqTGjWRBA";
    const placesEl = document.getElementById("places");
    const params = new URLSearchParams(window.location.search);
    const airportCode = (params.get("code") || "").trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(airportCode)) {
        window.location.replace("/");
        return;
    }

    const getJSON = url => fetch(url).then(response => {
        if (!response.ok) throw new Error(`${url} not found.`);
        return response.json();
    });

    Promise.all([
        getJSON("/data/airports.json"),
        getJSON("/data/crew.json"),
        getJSON(`/data/${airportCode.toLowerCase()}.json`)
    ])
        .then(([airports, crew, airport]) => {
            const info = airports.find(a => a.code === airportCode) || { code: airportCode, name: airportCode, city: "" };
            const count = airport.places.length;
            setPageInfo(info, `${info.city} · ${count} ${count === 1 ? "pick" : "picks"}`);

            if (airport.credits) {
                const credits = document.getElementById("credits");
                credits.innerHTML = airport.credits;
                credits.hidden = false;
            }

            const list = el("ul", "places");
            airport.places.forEach(place => list.appendChild(renderPlace(place, crew)));
            placesEl.replaceChildren(list, renderCta(
                `Fly through ${airportCode}?`,
                "If you're crew and have a go-to spot here, send it in. Your name and LinkedIn go on the pick."
            ));
        })
        .catch(error => {
            console.error(error);
            setPageInfo({ code: airportCode, name: "No guide yet", city: "" }, "");
            document.title = `${airportCode} | Make My Layover Fun`;
            placesEl.replaceChildren(renderCta(
                `No crew picks for ${airportCode} yet.`,
                "If you fly through here for work, you could be the first. Your name and LinkedIn go on the pick."
            ));
        });

    function renderCta(heading, body) {
        const cta = el("div", "cta");
        cta.appendChild(el("h2", null, heading));
        cta.appendChild(el("p", null, body));
        cta.appendChild(externalLink(FORM_URL, "button", "Add a pick ↗"));
        return cta;
    }

    function setPageInfo(info, meta) {
        const title = `${info.code} Layover Guide: ${info.name} | Make My Layover Fun`;
        const url = `https://makemylayoverfun.com/airport.html?code=${info.code}`;

        document.getElementById("airport-code").textContent = info.code;
        document.getElementById("airport-name").textContent = info.name;
        document.getElementById("airport-meta").textContent = meta;

        if (!info.city) return;
        document.title = title;
        document.querySelector('meta[name="description"]').content =
            `Pilot and crew recommended places at ${info.name} (${info.code}) in ${info.city}.`;
        document.querySelector('link[rel="canonical"]').href = url;
        document.querySelector('meta[property="og:url"]').content = url;
        document.querySelector('meta[property="og:title"]').content = title;
        document.querySelector('meta[name="twitter:title"]').content = title;
    }

    function renderPlace(place, crew) {
        const item = el("li", place.photo ? "place" : "place no-photo");
        item.id = place.id;

        const text = el("div", "place-text");

        if (place.location) {
            const location = el("p", "place-location label");
            [].concat(place.location).forEach(line => location.appendChild(el("span", null, line)));
            text.appendChild(location);
        }

        text.appendChild(el("h2", null, place.name));

        const description = el("p", "place-description");
        description.innerHTML = place.description;
        text.appendChild(description);

        const footer = el("div", "place-footer");
        const person = place.recommended_by && crew[place.recommended_by];
        if (person) {
            const credit = el("p", "crew", "Recommended by ");
            credit.appendChild(person.linkedin ? externalLink(person.linkedin, null, person.name) : el("span", null, person.name));
            footer.appendChild(credit);
        }
        if (place.link) {
            footer.appendChild(externalLink(place.link.url, "button", `${place.link.label} ↗`));
        }
        if (footer.children.length > 0) text.appendChild(footer);

        item.appendChild(text);

        if (place.photo) {
            const figure = el("figure", "place-photo");
            const img = document.createElement("img");
            img.src = `/${place.photo.src}`;
            img.alt = place.photo.alt || place.name;
            img.loading = "lazy";
            img.decoding = "async";
            img.width = 680;
            img.height = 510;
            img.addEventListener("error", () => {
                figure.remove();
                item.classList.add("no-photo");
            });
            figure.appendChild(img);
            if (place.photo.credit) {
                const caption = document.createElement("figcaption");
                caption.innerHTML = place.photo.credit;
                figure.appendChild(caption);
            }
            item.appendChild(figure);
        }

        return item;
    }

    function externalLink(href, className, text) {
        const a = el("a", className, text);
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        return a;
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }
});
