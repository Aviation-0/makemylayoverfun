document.addEventListener("DOMContentLoaded", () => {
    // 1. Get the 3-letter code from the URL
    const params = new URLSearchParams(window.location.search);
    const airportCode = params.get("code")?.toUpperCase();

    // Kick them back to the home page if there's no code
    if (!airportCode) {
        window.location.href = "index.html";
        return;
    }

    // 2. Fetch the JSON database
    fetch("airports.json")
        .then(response => {
            if (!response.ok) throw new Error("Failed to load database.");
            return response.json();
        })
        .then(data => {
            const airport = data[airportCode];
            const grid = document.getElementById("activities-grid");
            const errorState = document.getElementById("error-state");
            
            // If the user searches an airport you haven't added yet
            if (!airport) {
                document.getElementById("airport-name").innerText = airportCode;
                document.getElementById("airport-city").innerText = "Module Unavailable";
                errorState.style.display = "block";
                return;
            }

            // 3. Inject the header data
            document.title = `${airportCode} | Make My Layover Fun`;
            document.getElementById("airport-name").innerText = airport.name;
            document.getElementById("airport-city").innerText = airport.city;

            // 4. Build and inject the cards
            if (airport.activities.length === 0) {
                grid.innerHTML = "<p>Guides for this hub are currently in development.</p>";
                return;
            }

            airport.activities.forEach(activity => {
                const card = document.createElement("div");
                card.className = "card";
                
                card.innerHTML = `
                    <div class="card-meta">
                        <span>${activity.category}</span>
                        <span>${activity.terminal}</span>
                    </div>
                    <h3>${activity.title}</h3>
                    <p>${activity.description}</p>
                    <div>
                        <span class="duration">${activity.duration}</span>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        })
        .catch(error => {
            console.error("System Error:", error);
            document.getElementById("error-state").style.display = "block";
        });
});