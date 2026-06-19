document.addEventListener("DOMContentLoaded", () => {
    // Highly detailed, geometric SVG blueprints using lightish grays
    // DECLARED ONLY ONCE
    const geometricArt = {
        // --- EXISTING ORD ART ---
        "ord-tunnel": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 60 A 45 45 0 0 1 95 60" fill="none" stroke="#e4e4e7" stroke-width="6"/>
            <path d="M 20 60 A 30 30 0 0 1 80 60" fill="none" stroke="#d4d4d8" stroke-width="6"/>
            <path d="M 35 60 A 15 15 0 0 1 65 60" fill="none" stroke="#a1a1aa" stroke-width="6"/>
            <line x1="0" y1="60" x2="100" y2="60" stroke="#d4d4d8" stroke-width="2"/>
            <polygon points="45,60 55,60 52,45 48,45" fill="#f4f4f5"/>
        </svg>`,
        
        "ord-bean": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 50 C 10 10, 90 10, 90 50 C 90 60, 70 55, 50 55 C 30 55, 10 60, 10 50 Z" fill="#a1a1aa"/>
            <path d="M 20 45 C 20 20, 80 20, 80 45 C 80 50, 65 48, 50 48 C 35 48, 20 50, 20 45 Z" fill="#d4d4d8"/>
            <ellipse cx="50" cy="28" rx="20" ry="6" fill="#f4f4f5"/>
        </svg>`,

        // --- NEW LGA ART ---
        "lga-bridge": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="25" width="80" height="35" fill="#f4f4f5"/>
            <polygon points="10,60 25,60 25,20 15,20" fill="#a1a1aa"/>
            <polygon points="90,60 75,60 75,20 85,20" fill="#d4d4d8"/>
            <path d="M 25 35 C 40 45, 60 45, 75 35 L 75 42 C 60 52, 40 52, 25 42 Z" fill="#e4e4e7"/>
            <path d="M 28 38 C 42 47, 58 47, 72 38" fill="none" stroke="#71717a" stroke-width="2" stroke-dasharray="2 2"/>
            <polygon points="45,55 55,55 52,48" fill="#d4d4d8"/>
            <polygon points="50,48 52,48 52,44" fill="#a1a1aa"/>
        </svg>`,

        "nyc-empire": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="30" r="25" fill="#f4f4f5"/>
            <rect x="30" y="50" width="40" height="10" fill="#a1a1aa"/>
            <rect x="35" y="40" width="30" height="10" fill="#d4d4d8"/>
            <rect x="40" y="15" width="20" height="25" fill="#e4e4e7"/>
            <polygon points="40,15 45,15 45,10 55,10 55,15 60,15" fill="#d4d4d8"/>
            <polygon points="48,10 52,10 50,0" fill="#71717a"/>
            <line x1="44" y1="18" x2="44" y2="38" stroke="#f4f4f5" stroke-width="1.5"/>
            <line x1="50" y1="18" x2="50" y2="38" stroke="#f4f4f5" stroke-width="1.5"/>
            <line x1="56" y1="18" x2="56" y2="38" stroke="#f4f4f5" stroke-width="1.5"/>
        </svg>`,

        // --- FALLBACK ---
        "default": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="20" width="60" height="40" fill="#e4e4e7"/>
            <polygon points="10,20 50,0 90,20" fill="#d4d4d8"/>
        </svg>`
    };

    const params = new URLSearchParams(window.location.search);
    const airportCode = params.get("code")?.toLowerCase();
    const timeLimit = parseInt(params.get("time")) || 999; 

    if (!airportCode) {
        window.location.href = "index.html";
        return;
    }

    fetch(`data/${airportCode}.json`)
        .then(response => {
            if (!response.ok) throw new Error("Data file not found.");
            return response.json();
        })
        .then(airport => {
            const grid = document.getElementById("activities-grid");
            
            // Header
            document.title = `${airportCode.toUpperCase()} | Make My Layover Fun`;
            document.getElementById("airport-name").innerText = airport.name;
            document.getElementById("airport-city").innerText = airport.city;
            
            // Inject Geometric Landmarks
            if (airport.landmarks) {
                document.getElementById("landmarks-container").style.display = "flex";
                
                // Inject Text
                document.getElementById("landmark-airport-text").innerText = airport.landmarks.airport.name;
                document.getElementById("landmark-city-text").innerText = airport.landmarks.city.name;
                
                // Inject SVG Math
                const airportSVG = geometricArt[airport.landmarks.airport.id] || geometricArt["default"];
                const citySVG = geometricArt[airport.landmarks.city.id] || geometricArt["default"];
                
                document.getElementById("art-airport").innerHTML = airportSVG;
                document.getElementById("art-city").innerHTML = citySVG;
            }

            // Cards
            const validActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (validActivities.length === 0) {
                grid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; padding: 40px;'>No guides fit within your selected time limit. Try extending your layover duration.</p>";
                return;
            }

            validActivities.forEach(activity => {
                const card = document.createElement("div");
                card.className = "card";
                const colorClass = `bg-${activity.type}`;
                
                card.innerHTML = `
                    <div class="card-tag ${colorClass}">${activity.category}</div>

                    ${activity.image_path ? `
                        <img class="card-image" src="${activity.image_path}" alt="${activity.title}" onerror="this.style.display='none'; this.classList.add('broken-image')">
                    ` : ''}

                    <div class="terminal-loc" style="margin-top: 12px;">${activity.terminal}</div>
                    <h3>${activity.title}</h3>
                    <p>${activity.description}</p>
                    <div>
                        <span class="duration">⏱️ ${activity.duration_text}</span>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        })
        .catch(error => {
            console.error(error);
            document.getElementById("airport-name").innerText = airportCode.toUpperCase();
            document.getElementById("airport-city").innerText = "Module Unavailable";
            document.getElementById("error-state").style.display = "block";
        });
});