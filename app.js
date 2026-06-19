document.addEventListener("DOMContentLoaded", () => {
    
    // --- GLOBAL STATE ---
    let allActivities = [];
    let activeTypes = new Set();
    let activeTerminal = "All";
    let activeSecurity = "All"; 

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
            document.title = `${airportCode.toUpperCase()} | Make My Layover Fun`;
            document.getElementById("airport-name").innerText = airport.name;
            document.getElementById("airport-city").innerText = airport.city;
            
            if (airport.landmarks) {
                document.getElementById("landmarks-container").style.display = "flex";
                document.getElementById("landmark-airport-text").innerText = airport.landmarks.airport.name;
                document.getElementById("landmark-city-text").innerText = airport.landmarks.city.name;
                document.getElementById("art-airport").innerHTML = airport.landmarks.airport.svg || "";
                document.getElementById("art-city").innerHTML = airport.landmarks.city.svg || "";
            }

            allActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (allActivities.length === 0) {
                showError("No guides fit within your selected time limit. Try extending your layover duration.");
                return;
            }

            // --- SMARTER TERMINAL PARSING ---
            const terminalDropdown = document.getElementById("terminal-filter");
            const securityDropdown = document.getElementById("security-filter");
            let allLocationTags = [];
            
            allActivities.forEach(a => {
                if (a.terminal) {
                    const primaryTerminal = a.terminal.split(',')[0].trim();
                    if (primaryTerminal.toLowerCase() !== "all terminals" && primaryTerminal.length < 35) {
                        allLocationTags.push(primaryTerminal);
                    }
                }
            });
            
            const uniqueTerminals = [...new Set(allLocationTags)].sort();
            
            uniqueTerminals.forEach(term => {
                const opt = document.createElement("option");
                opt.value = term;
                opt.innerText = term.toUpperCase(); 
                terminalDropdown.appendChild(opt);
            });
            
            terminalDropdown.style.display = "block";
            securityDropdown.style.display = "block";

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

        const typeColors = {
            "art": "#8b5cf6",
            "aviation": "#0ea5e9",
            "food": "#f43f5e",
            "explore": "#10b981"
        };
        
        const typeLabels = {
            "art": "VISUALS",
            "aviation": "AVIATION",
            "food": "FOOD",
            "explore": "EXPLORING"
        };

        // 1. FILTERING
        let filtered = allActivities.filter(activity => {
            const activityTypes = Array.isArray(activity.type) ? activity.type : [activity.type];
            
            const matchesType = activeTypes.size === 0 || activityTypes.some(t => activeTypes.has(t));
            const matchesTerminal = activeTerminal === "All" || (activity.terminal && activity.terminal.includes(activeTerminal));
            const matchesSecurity = activeSecurity === "All" || activity.security === activeSecurity || activity.security === "both";
            
            return matchesType && matchesTerminal && matchesSecurity;
        });

        // 2. SORTING BY RANK
        filtered.sort((a, b) => {
            const rankA = a.rank || 999;
            const rankB = b.rank || 999;
            return rankA - rankB;
        });

        if (filtered.length === 0) {
            grid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; padding: 40px; color: #71717a;'>No activities match your current filters.</p>";
            return;
        }

        // 3. HTML GENERATION
        filtered.forEach(activity => {
            const card = document.createElement("div");
            
            card.className = activity.specialty === "dropdown" ? "card specialty-card" : "card";
            
            const activityTypes = Array.isArray(activity.type) ? activity.type : [activity.type];
            let tagHTML = "";
            
            const displayTagText = activityTypes.map(t => typeLabels[t]).join(" & ");

            if (activityTypes.length === 1) {
                tagHTML = `<div class="card-tag" style="background-color: ${typeColors[activityTypes[0]]};">${displayTagText}</div>`;
            } else {
                const color1 = typeColors[activityTypes[0]] || "#111111";
                const color2 = typeColors[activityTypes[1]] || "#111111";
                const gradientStyle = `background: linear-gradient(135deg, ${color1}, ${color2});`;
                tagHTML = `<div class="card-tag" style="${gradientStyle}">${displayTagText}</div>`;
            }
            
            // LOUNGE / SPECIALTY DROPDOWN HTML
            let specialtyHTML = "";
            if (activity.specialty === "dropdown" && activity.dropdown_options) {
                specialtyHTML = `
                    <p style="color: inherit;">${activity.description}</p>
                    <select class="specialty-dropdown">
                        <option value="" disabled selected>Choose a Lounge to view details...</option>
                        ${activity.dropdown_options.map((opt, i) => `<option value="${i}">${opt.name}</option>`).join('')}
                    </select>
                    <div class="specialty-details"></div>
                `;
            } else {
                specialtyHTML = `<p>${activity.description}</p>`;
            }

            let secLabel = "";
            if (activity.security === "pre") secLabel = " • PRE-SECURITY";
            if (activity.security === "post") secLabel = " • POST-SECURITY";

            card.innerHTML = `
                ${activity.rank ? `<div class="rank-badge">#${activity.rank}</div>` : ''}
                ${tagHTML}

                ${activity.image_path ? `
                    <img class="card-image" src="${activity.image_path}" alt="${activity.title}" loading="lazy" onerror="this.style.display='none'; this.classList.add('broken-image')">
                ` : ''}

                <div class="terminal-loc">${activity.terminal}${secLabel}</div>
                <h3>${activity.title}</h3>
                
                ${specialtyHTML}
                
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

            // --- DYNAMIC CARD COLOR & BUTTON INJECTION LOGIC ---
            if (activity.specialty === "dropdown" && activity.dropdown_options) {
                const selectElement = card.querySelector(".specialty-dropdown");
                const detailsElement = card.querySelector(".specialty-details");
                
                selectElement.addEventListener("change", (e) => {
                    const selectedIndex = e.target.value;
                    const optionData = activity.dropdown_options[selectedIndex];
                    
                    // Injecting details and custom lounge-specific buttons
                    let injectedHTML = `<div style="margin-bottom: 16px;">${optionData.details}</div>`;
                    injectedHTML += `<div class="button-group">`;
                    if (optionData.map_link) {
                        injectedHTML += `<a href="${optionData.map_link}" target="_blank" class="map-btn" style="color:#111; background:#fff; border:none;">Map 📍</a>`;
                    }
                    if (optionData.action_link) {
                        injectedHTML += `<a href="${optionData.action_link}" target="_blank" class="action-btn" style="background:rgba(255,255,255,0.25); color:#fff; border:1px solid rgba(255,255,255,0.4);">${optionData.action_text || 'View ↗'}</a>`;
                    }
                    injectedHTML += `</div>`;
                    
                    detailsElement.innerHTML = injectedHTML;
                    
                    // Repaint the entire card to match the Airline's brand
                    if (optionData.brand_color) {
                        card.style.backgroundColor = optionData.brand_color;
                        card.style.borderColor = optionData.brand_color;
                        card.style.color = "#ffffff";
                        card.querySelector("h3").style.color = "#ffffff";
                        
                        const termLoc = card.querySelector(".terminal-loc");
                        if(termLoc) termLoc.style.color = "rgba(255, 255, 255, 0.8)";
                        
                        const dur = card.querySelector(".duration");
                        if(dur) {
                            dur.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
                            dur.style.color = "#ffffff";
                            dur.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        }
                        
                        selectElement.style.backgroundColor = "rgba(0, 0, 0, 0.25)";
                        selectElement.style.color = "#ffffff";
                        selectElement.style.borderColor = "rgba(255, 255, 255, 0.3)";
                    }
                });
            }

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

    document.getElementById("security-filter").addEventListener("change", (e) => {
        activeSecurity = e.target.value;
        renderGrid();
    });
});