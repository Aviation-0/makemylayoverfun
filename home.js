// =======================================================================
// FILE: home.js — builds the airport list on the home page
// =======================================================================
document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("airport-list");

    fetch("/data/airports.json")
        .then(response => {
            if (!response.ok) throw new Error("Airport list not found.");
            return response.json();
        })
        .then(airports => {
            airports
                .slice()
                .sort((a, b) => a.code.localeCompare(b.code))
                .forEach(airport => {
                    const item = document.createElement("li");
                    const link = document.createElement("a");
                    link.className = "airport-row";
                    link.href = `/airport.html?code=${encodeURIComponent(airport.code)}`;

                    [["airport-code", airport.code], ["airport-name", airport.name], ["airport-city", airport.city]]
                        .forEach(([cls, text]) => {
                            const span = document.createElement("span");
                            span.className = cls;
                            span.textContent = text;
                            link.appendChild(span);
                        });

                    item.appendChild(link);
                    list.appendChild(item);
                });
        })
        .catch(error => {
            console.error(error);
            list.outerHTML = `<p class="status-msg">Sorry, the airport list could not be loaded. Please refresh the page.</p>`;
        });
});
