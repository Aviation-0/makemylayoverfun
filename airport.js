// =======================================================================
// FILE: airport.js — renders one airport's guide from data/<code>.json
// =======================================================================
document.addEventListener("DOMContentLoaded", () => {

    const main = document.getElementById("main");
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
            setPageInfo(info);

            if (airport.credits) {
                const credits = document.getElementById("credits");
                credits.innerHTML = airport.credits;
                credits.hidden = false;
            }

            main.innerHTML = "";
            const inside = airport.places.filter(p => p.area !== "outside");
            const outside = airport.places.filter(p => p.area === "outside");

            if (inside.length > 0) {
                main.appendChild(renderSection("In the airport", null, inside, crew));
            }
            if (outside.length > 0) {
                main.appendChild(renderSection(
                    "Outside the airport",
                    "For long layovers only. Leave plenty of time to get back and clear security again.",
                    outside, crew
                ));
            }
        })
        .catch(error => {
            console.error(error);
            document.getElementById("airport-name").textContent = airportCode;
            document.getElementById("airport-city").textContent = "Guide not available";
            document.title = `${airportCode} | Make My Layover Fun`;
            main.innerHTML = `
                <div class="status-msg">
                    <h2>No guide yet</h2>
                    <p>We don't have crew picks for this airport yet.</p>
                    <p><a class="button-link" href="/">See all airports</a></p>
                </div>`;
        });

    function setPageInfo(info) {
        const title = `${info.code} Layover Guide: ${info.name} | Make My Layover Fun`;
        const description = `Pilot and crew recommended layover spots at ${info.name} (${info.code}) in ${info.city}.`;
        const url = `https://makemylayoverfun.com/airport.html?code=${info.code}`;

        document.title = title;
        document.getElementById("airport-name").textContent = info.name;
        document.getElementById("airport-city").textContent = `${info.code} · ${info.city}`;
        document.querySelector('meta[name="description"]').content = description;
        document.querySelector('link[rel="canonical"]').href = url;
        document.querySelector('meta[property="og:url"]').content = url;
        document.querySelector('meta[property="og:title"]').content = title;
        document.querySelector('meta[name="twitter:title"]').content = title;
    }

    function renderSection(title, note, places, crew) {
        const section = document.createElement("section");
        section.className = "places-section";
        const headingId = `section-${title.toLowerCase().replace(/\W+/g, "-")}`;
        section.setAttribute("aria-labelledby", headingId);

        const heading = el("h2", "section-title", title);
        heading.id = headingId;
        section.appendChild(heading);
        if (note) section.appendChild(el("p", "section-note", note));

        const grid = el("div", "grid");
        places.forEach(place => grid.appendChild(renderCard(place, crew)));
        section.appendChild(grid);
        return section;
    }

    function renderCard(place, crew) {
        const card = el("article", "card");
        card.id = place.id;

        // Crew recommendation badge (links to their LinkedIn)
        const person = place.recommended_by && crew[place.recommended_by];
        if (person) {
            const badge = person.linkedin
                ? externalLink(person.linkedin, "crew-badge", `✈️ Recommended by ${person.name} ↗`)
                : el("div", "crew-badge", `✈️ Recommended by ${person.name}`);
            card.appendChild(badge);
        }

        if (place.photo) {
            const img = document.createElement("img");
            img.className = "card-image";
            img.src = `/${place.photo.src}`;
            img.alt = place.photo.alt || place.name;
            img.loading = "lazy";
            img.decoding = "async";
            img.width = 600;
            img.height = 360;
            img.addEventListener("error", () => img.remove());
            card.appendChild(img);
            if (place.photo.credit) {
                const credit = el("div", "image-attribution");
                credit.innerHTML = place.photo.credit;
                card.appendChild(credit);
            }
        }

        if (place.area !== "outside" && place.terminal) {
            const security = { pre: " • Pre-security", post: " • Post-security" }[place.security] || "";
            card.appendChild(el("div", "terminal-loc", place.terminal + security));
        }

        card.appendChild(el("h3", null, place.name));

        if (place.location) {
            card.appendChild(labeledList("card-location", "📍 ", place.location));
        }

        const description = el("p", "card-description");
        description.innerHTML = place.description;
        card.appendChild(description);

        if (place.getting_there) {
            const box = el("div", "getting-there");
            box.appendChild(el("strong", null, "🚆 Getting there"));
            box.appendChild(document.createTextNode(place.getting_there));
            card.appendChild(box);
        }

        if (place.hours) {
            card.appendChild(labeledList("card-hours", "🕒 ", place.hours));
        }

        const buttons = el("div", "button-group");
        (place.maps || []).forEach(map => {
            buttons.appendChild(externalLink(map.url, "map-btn", `${map.label} 📍`));
        });
        if (place.link) {
            buttons.appendChild(externalLink(place.link.url, "action-btn", `${place.link.label} ↗`));
        }
        if (buttons.children.length > 0) card.appendChild(buttons);

        return card;
    }

    // A string renders inline after the prefix; an array renders as a bullet list.
    function labeledList(className, prefix, value) {
        const wrap = el("div", className);
        if (Array.isArray(value)) {
            wrap.appendChild(document.createTextNode(prefix.trim()));
            const list = document.createElement("ul");
            value.forEach(line => list.appendChild(el("li", null, line)));
            wrap.appendChild(list);
        } else {
            wrap.textContent = prefix + value;
        }
        return wrap;
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
