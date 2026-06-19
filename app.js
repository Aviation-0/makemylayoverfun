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

            // Parse Terminals by Comma to build the Dropdown
            const terminalDropdown = document.getElementById("terminal-filter");
            let allLocationTags = [];
            
            allActivities.forEach(a => {
                if (a.terminal) {
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