document.addEventListener("DOMContentLoaded", () => {
    
    // --- UPDATED GEOMETRIC ART ---
    const geometricArt = {
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

        "lga-bridge": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="30" width="15" height="30" fill="#a1a1aa"/>
            <rect x="80" y="20" width="15" height="40" fill="#a1a1aa"/>
            <path d="M 0 45 Q 50 25 100 35 L 100 20 Q 50 10 0 30 Z" fill="#d4d4d8" stroke="#71717a" stroke-width="1"/>
            <path d="M 10 40 L 10 25 M 20 37 L 20 22 M 30 34 L 30 19 M 40 31 L 40 16 M 50 30 L 50 15 M 60 30 L 60 15 M 70 31 L 70 16 M 80 32 L 80 17 M 90 33 L 90 18" stroke="#f4f4f5" stroke-width="1.5"/>
            <line x1="0" y1="58" x2="100" y2="58" stroke="#e4e4e7" stroke-width="2"/>
        </svg>`,

        "nyc-empire": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="35" y="50" width="30" height="10" fill="#a1a1aa"/>
            <rect x="40" y="40" width="20" height="10" fill="#d4d4d8"/>
            <rect x="43" y="15" width="14" height="25" fill="#e4e4e7"/>
            <polygon points="43,15 47,10 53,10 57,15" fill="#d4d4d8"/>
            <line x1="50" y1="10" x2="50" y2="0" stroke="#71717a" stroke-width="2"/>
            <line x1="46" y1="17" x2="46" y2="38" stroke="#f4f4f5" stroke-width="1"/>
            <line x1="50" y1="17" x2="50" y2="38" stroke="#f4f4f5" stroke-width="1"/>
            <line x1="54" y1="17" x2="54" y2="38" stroke="#f4f4f5" stroke-width="1"/>
        </svg>`,

        "default": `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="60" height="40" fill="#e4e4e7"/><polygon points="10,20 50,0 90,20" fill="#d4d4d8"/></svg>`
    };

    // --- GLOBAL STATE ---
    let allActivities = [];
    let activeTypes = new Set();
    let activeTerminal = "All";

    const params = new URLSearchParams(window.location.search);
    const airportCode = params.get("code")?.toLowerCase();
    const timeLimit = parseInt(params.get("time")) || 999; 

    if (!airportCode) {
        window.location.href = "index.html";
        return;
    }

    // --- DATA FETCHING ---
    fetch(`data/${airportCode}.json`)
        .then(response => {
            if (!response.ok) throw new Error("Data file not found.");
            return response.json();
        })
        .then(airport => {
            // Header Population
            document.title = `${airportCode.toUpperCase()} | Make My Layover Fun`;
            document.getElementById("airport-name").innerText = airport.name;
            document.getElementById("airport-city").innerText = airport.city;
            
            if (airport.landmarks) {
                document.getElementById("landmarks-container").style.display = "flex";
                document.getElementById("landmark-airport-text").innerText = airport.landmarks.airport.name;
                document.getElementById("landmark-city-text").innerText = airport.landmarks.city.name;
                
                document.getElementById("art-airport").innerHTML = geometricArt[airport.landmarks.airport.id] || geometricArt["default"];
                document.getElementById("art-city").innerHTML = geometricArt[airport.landmarks.city.id] || geometricArt["default"];
            }

            // Filter out events that fall outside the user's selected layover duration
            allActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (allActivities.length === 0) {
                showError("No guides fit within your selected time limit. Try extending your layover duration.");
                return;
            }

            // Parse Terminals by Comma to build the Dropdown
            const terminalDropdown = document.getElementById("terminal-filter");
            let allLocationTags = [];
            
            allActivities.forEach(a => {
                if (a.terminal) {
                    // Split the string by comma and trim any extra spaces
                    const tags = a.terminal.split(',').map(s => s.trim());
                    allLocationTags.push(...tags);
                }
            });
            
            // Remove duplicates and sort alphabetically
            const uniqueTerminals = [...new Set(allLocationTags)].sort();
            
            uniqueTerminals.forEach(term => {
                const opt = document.createElement("option");
                opt.value = term;
                opt.innerText = term.toUpperCase(); 
                terminalDropdown.appendChild(opt);
            });
            terminalDropdown.style.display = "block";

            renderGrid();
        })
        .catch(error => {
            console.error(error);
            document.getElementById("airport-name").innerText = airportCode.toUpperCase();
            document.getElementById("airport-city").innerText = "Module Unavailable";
            showError("We do not have layover modules compiled for this hub yet.");
        });

    // --- RENDERING & FILTER LOGIC ---
    function renderGrid() {
        const grid = document.getElementById("activities-grid");
        grid.innerHTML = ""; 

        const filtered = allActivities.filter(activity => {
            const matchesType = activeTypes.size === 0 || activeTypes.has(activity.type);
            
            // Check if the card's terminal string INCLUDES the selected dropdown tag
            const matchesTerminal = activeTerminal === "All" || (activity.terminal && activity.terminal.includes(activeTerminal));
            
            return matchesType && matchesTerminal;
        });

        if (filtered.length === 0) {
            grid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; padding: 40px; color: #71717a;'>No activities match your current filters.</p>";
            return;
        }

        filtered.forEach(activity => {
            const card = document.createElement("div");
            card.className = "card";
            const colorClass = `bg-${activity.type}`;
            
            card.innerHTML = `
                <div class="card-tag ${colorClass}">${activity.category}</div>

                ${activity.image_path ? `
                    <img class="card-image" src="${activity.image_path}" alt="${activity.title}" loading="lazy" onerror="this.style.display='none'; this.classList.add('broken-image')">
                ` : ''}

                <div class="terminal-loc">${activity.terminal}</div>
                <h3>${activity.title}</h3>
                <p>${activity.description}</p>
                
                ${activity.hours ? `
                    <div class="card-hours">🕒 ${activity.hours}</div>
                ` : ''}
                
                <div class="card-footer">
                    <span class="duration">⏱️ ${activity.duration_text}</span>
                    
                    ${activity.action_link ? `<a href="${activity.action_link}" target="_blank" class="action-btn">${activity.action_text || 'View ↗'}</a>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function showError(msg) {
        document.getElementById("error-msg").innerText = msg;
        document.getElementById("error-state").style.display = "block";
    }

    // --- EVENT LISTENERS ---
    
    // Top Category Filters
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const type = e.currentTarget.dataset.type;
            if (activeTypes.has(type)) {
                activeTypes.delete(type);
                e.currentTarget.classList.remove("active");
            } else {
                activeTypes.add(type);
                e.currentTarget.classList.add("active");
            }
            renderGrid();
        });
    });

    // Terminal Dropdown Filter
    document.getElementById("terminal-filter").addEventListener("change", (e) => {
        activeTerminal = e.target.value;
        renderGrid();
    });
});