document.addEventListener("DOMContentLoaded", () => {
    
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
                
                // INJECTING ART DIRECTLY FROM JSON
                document.getElementById("art-airport").innerHTML = airport.landmarks.airport.svg || "";
                document.getElementById("art-city").innerHTML = airport.landmarks.city.svg || "";
            }

            // Filter out events that fall outside the user's selected layover duration
            allActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (allActivities.length === 0) {
                showError("No guides fit within your selected time limit. Try extending your layover duration.");
                return;
            }

            // --- SMART TERMINAL PARSING ---
            const terminalDropdown = document.getElementById("terminal-filter");
            let allLocationTags = [];
            
            allActivities.forEach(a => {
                if (a.terminal) {
                    const tags = a.terminal.split(',').map(s => s.trim());
                    
                    // Only keep tags that start with "Terminal" or "T" (like T1, T2)
                    tags.forEach(tag => {
                        if (/^(Terminal|T\d|T[A-Z])/i.test(tag)) {
                            allLocationTags.push(tag);
                        }
                    });
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

        // Define your exact hex colors here to power the multi-color tags
        const typeColors = {
            "art": "#8b5cf6",
            "aviation": "#0ea5e9",
            "food": "#f43f5e",
            "explore": "#10b981"
        };

        const filtered = allActivities.filter(activity => {
            // Force the type into an array to support multi-category events
            const activityTypes = Array.isArray(activity.type) ? activity.type : [activity.type];
            
            // Check if the active filters intersect with the activity's types
            const matchesType = activeTypes.size === 0 || activityTypes.some(t => activeTypes.has(t));
            
            // Check the terminal location
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
            
            // --- NEW: DYNAMIC MULTI-COLOR TAG LOGIC ---
            const activityTypes = Array.isArray(activity.type) ? activity.type : [activity.type];
            let tagHTML = "";

            if (activityTypes.length === 1) {
                // Standard single color
                tagHTML = `<div class="card-tag bg-${activityTypes[0]}">${activity.category}</div>`;
            } else {
                // It has multiple categories! Build a seamless CSS gradient
                const color1 = typeColors[activityTypes[0]] || "#111111";
                const color2 = typeColors[activityTypes[1]] || "#111111";
                const gradientStyle = `background: linear-gradient(135deg, ${color1}, ${color2});`;
                
                tagHTML = `<div class="card-tag" style="${gradientStyle}">${activity.category}</div>`;
            }
            // ------------------------------------------
            
            card.innerHTML = `
                ${tagHTML}

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
                    
                    <div class="button-group">
                        ${activity.map_link ? `<a href="${activity.map_link}" target="_blank" class="map-btn">Map 📍</a>` : ''}
                        ${activity.action_link ? `<a href="${activity.action_link}" target="_blank" class="action-btn">${activity.action_text || 'View ↗'}</a>` : ''}
                    </div>
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

    document.getElementById("terminal-filter").addEventListener("change", (e) => {
        activeTerminal = e.target.value;
        renderGrid();
    });
});