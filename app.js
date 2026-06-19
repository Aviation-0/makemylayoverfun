document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const airportCode = params.get("code")?.toUpperCase();
    const timeLimit = parseInt(params.get("time")) || 999; // Defaults to high number if missing

    if (!airportCode) {
        window.location.href = "index.html";
        return;
    }

    fetch("airports.json")
        .then(response => {
            if (!response.ok) throw new Error("Failed to load database.");
            return response.json();
        })
        .then(data => {
            const airport = data[airportCode];
            const grid = document.getElementById("activities-grid");
            
            if (!airport) {
                document.getElementById("airport-name").innerText = airportCode;
                document.getElementById("airport-city").innerText = "Module Unavailable";
                document.getElementById("error-state").style.display = "block";
                return;
            }

            // Populate Header & Landmarks
            document.title = `${airportCode} | Make My Layover Fun`;
            document.getElementById("airport-name").innerText = airport.name;
            document.getElementById("airport-city").innerText = airport.city;
            
            if (airport.landmarks) {
                document.getElementById("landmark-airport").innerText = airport.landmarks.airport;
                document.getElementById("landmark-city").innerText = airport.landmarks.city;
            }

            // Filter activities based on user's time limit
            const validActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (validActivities.length === 0) {
                grid.innerHTML = "<p>No guides fit within your selected time limit. Try extending your layover duration.</p>";
                return;
            }

            // Generate Cards
            validActivities.forEach(activity => {
                const card = document.createElement("div");
                card.className = "card";
                
                // Map the JSON "type" to the CSS background color class (e.g., "bg-art")
                const colorClass = `bg-${activity.type}`;
                
                card.innerHTML = `
                    <div class="card-tag ${colorClass}">${activity.category}</div>
                    <div class="terminal-loc">${activity.terminal}</div>
                    <h3>${activity.title}</h3>
                    <p>${activity.description}</p>
                    
                    <!-- Space reserved for future image tag -->
                    <!-- <img src="${activity.image}" alt="" style="width:100%; margin-bottom:15px;"> -->

                    <div>
                        <span class="duration">⏱️ ${activity.duration_text}</span>
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