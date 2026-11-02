// =======================================================================
// FILE: crew.js — lists every crew member and the picks they made
// =======================================================================
document.addEventListener("DOMContentLoaded", () => {

    const list = document.getElementById("crew-list");

    const getJSON = url => fetch(url).then(response => {
        if (!response.ok) throw new Error(`${url} not found.`);
        return response.json();
    });

    Promise.all([getJSON("/data/airports.json"), getJSON("/data/crew.json")])
        .then(([airports, crew]) =>
            Promise.all(airports.map(a => getJSON(`/data/${a.code.toLowerCase()}.json`)))
                .then(files => ({ crew, files }))
        )
        .then(({ crew, files }) => {
            // Collect each person's picks across all airports
            const picks = {};
            files.forEach(airport => {
                airport.places.forEach(place => {
                    if (!place.recommended_by) return;
                    (picks[place.recommended_by] ||= []).push({ code: airport.code, place });
                });
            });

            Object.entries(crew)
                .filter(([id]) => picks[id])
                .sort((a, b) => picks[b[0]].length - picks[a[0]].length || a[1].name.localeCompare(b[1].name))
                .forEach(([id, person]) => list.appendChild(renderPerson(person, picks[id])));
        })
        .catch(error => {
            console.error(error);
            list.outerHTML = `<p class="status-msg">Sorry, the crew list could not be loaded. Please refresh the page.</p>`;
        });

    function renderPerson(person, items) {
        const row = el("li", "crew-row");

        const who = el("div", "crew-who");
        const name = el("h2");
        if (person.linkedin) {
            const a = el("a", null, person.name);
            a.href = person.linkedin;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            name.appendChild(a);
        } else {
            name.textContent = person.name;
        }
        who.appendChild(name);
        const airportCount = new Set(items.map(i => i.code)).size;
        who.appendChild(el("p", "label",
            `${items.length} ${items.length === 1 ? "pick" : "picks"} · ${airportCount} ${airportCount === 1 ? "airport" : "airports"}`));
        row.appendChild(who);

        const ul = el("ul", "crew-picks");
        items.forEach(({ code, place }) => {
            const li = document.createElement("li");
            const a = el("a", null, place.name);
            a.href = `/airport.html?code=${code}#${place.id}`;
            li.appendChild(el("span", "crew-pick-code", code));
            li.appendChild(a);
            ul.appendChild(li);
        });
        row.appendChild(ul);

        return row;
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }
});
