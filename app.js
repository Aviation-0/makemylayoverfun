// =======================================================================
// FILE: app.js
// =======================================================================
/**
 * @file app.js
 * @description Core client-side logic for rendering and filtering airport activities.
 * Handles data fetching, dynamic DOM generation, and multidimensional filtering (time, terminal, security, category).
 * @author Zhibang (Lucas) Pan
 * @project Make My Layover Fun
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Global Application State ---
    let allActivities = [];
    let activeTypes = new Set();
    let activeTerminal = "All";
    let activeSecurity = "All"; 
    let activeFoodType = "All"; 
    
    // --- AUTO-DETECT LOCAL SYSTEM TIME ---
    const now = new Date();
    let activeDay = String(now.getDay()); // 0 = Sun, 1 = Mon...
    
    // Ensure hours and minutes format nicely as "HH:MM" (e.g. "09:05")
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    let activeTime = `${currentHours}:${currentMinutes}`;
    // -------------------------------------

    // --- Initialization & URL Parsing ---
    const params = new URLSearchParams(window.location.search);
    const airportCode = params.get("code")?.toLowerCase();
    const timeLimit = parseInt(params.get("time")) || 999; 

    if (!airportCode) {
        window.location.href = "index.html";
        return;
    }

    // --- Data Fetching & UI Hydration ---
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

            if (airport.footer_citation) {
                const footer = document.getElementById("site-footer");
                footer.innerHTML = airport.footer_citation;
                footer.style.display = "block";
            }

            // Filter activities strictly by user's available layover duration
            allActivities = airport.activities.filter(activity => activity.duration_mins <= timeLimit);

            if (allActivities.length === 0) {
                showError("No guides fit within your selected time limit. Try extending your layover duration.");
                return;
            }

            // Populate Filter Dropdowns dynamically based on available data
            const terminalDropdown = document.getElementById("terminal-filter");
            const securityDropdown = document.getElementById("security-filter");
            const dayDropdown = document.getElementById("day-filter");
            const timeDropdown = document.getElementById("time-filter");
            
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
            
            // --- INJECT TIME INTO THE UI ---
            dayDropdown.value = activeDay;
            timeDropdown.value = activeTime;
            // -------------------------------

            terminalDropdown.style.display = "block";
            securityDropdown.style.display = "block";
            dayDropdown.style.display = "block";
            timeDropdown.style.display = "block";

            // Initialize the dynamic food type dropdown
            updateFoodTypeDropdown();

            renderGrid();
        })
        .catch(error => {
            console.error(error);
            document.getElementById("airport-name").innerText = airportCode.toUpperCase();
            document.getElementById("airport-city").innerText = "Module Unavailable";
            showError("We do not have layover modules compiled for this hub yet.");
        });

    // --- Filter Helper Functions ---

    /**
     * @description Dynamically updates the "Food Type" dropdown options based on the currently active Terminal and Security filters.
     * Extracts unique `food_type` arrays from the remaining valid dataset.
     * @returns {void} Mutates the DOM elements for the food-type-filter select box.
     */
    function updateFoodTypeDropdown() {
        const foodTypeDropdown = document.getElementById("food-type-filter");
        let availableFoodTypes = new Set();

        allActivities.forEach(a => {
            // FIX: Treat "All Terminals" as a wildcard
            const matchesTerminal = activeTerminal === "All" || (a.terminal && (a.terminal.includes(activeTerminal) || a.terminal.toLowerCase() === "all terminals"));
            const matchesSecurity = activeSecurity === "All" || a.security === activeSecurity || a.security === "both";
            const activityTypes = Array.isArray(a.type) ? a.type : [a.type];

            if (matchesTerminal && matchesSecurity && activityTypes.includes("food")) {
                if (a.food_type && Array.isArray(a.food_type)) {
                    a.food_type.forEach(ft => availableFoodTypes.add(ft));
                }
            }
        });

        const sortedFoodTypes = [...availableFoodTypes].sort();
        const currentSelection = activeFoodType;

        foodTypeDropdown.innerHTML = '<option value="All">All Cuisines</option>';
        let selectionStillValid = false;

        sortedFoodTypes.forEach(ft => {
            const opt = document.createElement("option");
            opt.value = ft;
            opt.innerText = ft.toUpperCase();
            foodTypeDropdown.appendChild(opt);
            if (ft === currentSelection) selectionStillValid = true;
        });

        if (selectionStillValid && currentSelection !== "All") {
            foodTypeDropdown.value = currentSelection;
        } else {
            foodTypeDropdown.value = "All";
            activeFoodType = "All";
        }
    }
    // ----------------------------------------

    /**
     * @description Determines if a specific location is currently open based on a complex string of operating hours.
     * Evaluates against the user-selected Day index and Time (in minutes).
     * @param {string} hoursString - The raw string detailing opening/closing times (e.g. "Daily: 5:00 AM - 11:30 PM").
     * @param {number} selectedDayIdx - Integer representing the day of the week (0-6).
     * @param {number} selectedTimeMins - Time of day converted into total minutes since midnight.
     * @returns {boolean} True if the activity is open at the evaluated time, false otherwise.
     */
    function isActivityOpen(hoursString, selectedDayIdx, selectedTimeMins) {
        if (!hoursString) return true; 

        let str = hoursString.toLowerCase();
        if (str.includes('24/7') || str.includes('24 hours') || str.includes('continuous')) return true;

        let daysOpen = [0,1,2,3,4,5,6];
        if (str.includes('fri-mon') || str.includes('fri - mon')) {
            daysOpen = [5,6,0,1];
        } else if (str.includes('mon-fri') || str.includes('mon - fri')) {
            daysOpen = [1,2,3,4,5];
        }

        if (selectedDayIdx !== -1 && !daysOpen.includes(selectedDayIdx)) return false;
        if (selectedTimeMins === -1) return true; 

        const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)/g;
        let match;
        let isOpen = false;
        let foundTimes = false;

        while ((match = timeRegex.exec(str)) !== null) {
            foundTimes = true;
            let openHour = parseInt(match[1]);
            let openMin = match[2] ? parseInt(match[2]) : 0;
            if (match[3] === 'pm' && openHour !== 12) openHour += 12;
            if (match[3] === 'am' && openHour === 12) openHour = 0;
            let openMins = openHour * 60 + openMin;

            let closeHour = parseInt(match[4]);
            let closeMin = match[5] ? parseInt(match[5]) : 0;
            if (match[6] === 'pm' && closeHour !== 12) closeHour += 12;
            if (match[6] === 'am' && closeHour === 12) closeHour = 0;
            let closeMins = closeHour * 60 + closeMin;

            if (closeMins <= openMins) {
                if (selectedTimeMins >= openMins || selectedTimeMins <= closeMins) isOpen = true;
            } else {
                if (selectedTimeMins >= openMins && selectedTimeMins <= closeMins) isOpen = true;
            }
        }
        return foundTimes ? isOpen : true; 
    }

    /**
     * @description Helper to convert a HH:MM time string to an integer of total minutes.
     * @param {string} timeStr - The time formatted as "HH:MM".
     * @returns {number} The time represented in minutes from midnight, or -1 if invalid.
     */
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return -1;
        const [hours, mins] = timeStr.split(':').map(Number);
        return hours * 60 + mins;
    };

    // --- Core Render Logic ---

    /**
     * @description Core rendering loop for mapping filtered activities to the DOM grid.
     * Evaluates all global filters (Terminal, Security, Category, Day, Time) and generates the HTML nodes.
     * Contains fallback logic for generating a detailed "Empty State" if locations are currently closed.
     * @returns {void} Modifies the innerHTML of the #activities-grid.
     */
    function renderGrid() {
        const grid = document.getElementById("activities-grid");
        grid.innerHTML = ""; 

        const typeColors = { "art": "#8b5cf6", "aviation": "#0ea5e9", "food": "#f43f5e", "shop": "#f59e0b", "explore": "#10b981" };
        const typeLabels = { "art": "VISUALS", "aviation": "AVIATION", "food": "FOOD", "shop": "SHOPPING", "explore": "EXPLORING" };

        const selectedDay = activeDay !== "All" ? parseInt(activeDay) : -1;
        const selectedTime = activeTime !== "All" && activeTime !== "" ? timeToMinutes(activeTime) : -1;

        let filtered = [];
        let currentlyClosedMatches = []; // Holds items that match categories/terminals but are closed

        // Split activities into "Open & Matching" and "Closed but Matching"
        allActivities.forEach(activity => {
            const activityTypes = Array.isArray(activity.type) ? activity.type : [activity.type];
            
            const matchesType = activeTypes.size === 0 || activityTypes.some(t => activeTypes.has(t));
            // FIX: Treat "All Terminals" as a wildcard
            const matchesTerminal = activeTerminal === "All" || (activity.terminal && (activity.terminal.includes(activeTerminal) || activity.terminal.toLowerCase() === "all terminals"));
            const matchesSecurity = activeSecurity === "All" || activity.security === activeSecurity || activity.security === "both";
            const matchesFoodType = activeFoodType === "All" || 
                                    (!activityTypes.includes("food")) || 
                                    (activityTypes.includes("food") && activity.food_type && activity.food_type.includes(activeFoodType));

            const matchesCoreFilters = matchesType && matchesTerminal && matchesSecurity && matchesFoodType;

            let matchesSchedule = true;
            if (selectedDay !== -1 || selectedTime !== -1) {
                if (activity.specialty === "dropdown" && activity.dropdown_options) {
                    const anyOptionOpen = activity.dropdown_options.some(opt => {
                        const hoursMatch = opt.details.match(/<strong>(Hours|Dates):<\/strong>\s*([^<]+)/i);
                        return isActivityOpen(hoursMatch ? hoursMatch[2] : "", selectedDay, selectedTime);
                    });
                    matchesSchedule = anyOptionOpen;
                } else {
                    matchesSchedule = isActivityOpen(activity.hours, selectedDay, selectedTime);
                }
            }

            if (matchesCoreFilters) {
                if (matchesSchedule) {
                    filtered.push(activity);
                } else {
                    currentlyClosedMatches.push(activity);
                }
            }
        });

        filtered.sort((a, b) => {
            const rankA = a.rank || 999;
            const rankB = b.rank || 999;
            return rankA - rankB;
        });

        // --- NEW SMART EMPTY STATE LOGIC ---
        if (filtered.length === 0) {
            let emptyStateMsg = "No activities match your current filters.";
            
            if (currentlyClosedMatches.length > 0) {
                emptyStateMsg = `<div style="margin-bottom: 16px;"><strong>Everything matching your filters is currently closed.</strong><br>Here is what will open later:</div>`;
                emptyStateMsg += `<div style="text-align: left; max-width: 450px; margin: 0 auto; background: #ffffff; padding: 16px 20px; border: 1px solid #d4d4d8; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px;">`;
                
                const listHTML = currentlyClosedMatches.map((item, index) => {
                    let openTimeStr = "";
                    if (item.specialty === "dropdown") {
                         openTimeStr = "Check directory for specific hours.";
                    } else if (item.hours) {
                         // Uses Regex to extract just the opening time (e.g. "6:30 AM")
                         const match = item.hours.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
                         openTimeStr = match ? `Opens at ${match[1].toUpperCase()}` : `Hours: ${item.hours}`;
                    } else {
                         openTimeStr = "Hours unavailable";
                    }
                    
                    const borderStyle = index === currentlyClosedMatches.length - 1 ? "" : "border-bottom: 1px solid #f4f4f5; padding-bottom: 12px;";
                    
                    return `
                        <div style="${borderStyle}">
                            <strong style="color: #111111; font-size: 0.95rem;">${item.title}</strong>
                            <div style="font-size: 0.8rem; color: #71717a; margin-top: 4px;">🕒 ${openTimeStr}</div>
                        </div>`;
                }).join("");
                
                emptyStateMsg += listHTML + `</div>`;
                
            } else if (selectedTime !== -1 || selectedDay !== -1) {
                emptyStateMsg += "<br><br><em>💡 Tip: Try adjusting your selected time or resetting your filters.</em>";
            }

            grid.innerHTML = `<div style='grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #3f3f46; line-height: 1.6;'>${emptyStateMsg}</div>`;
            return;
        }
        // -----------------------------------

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
            
            let specialtyHTML = "";
            if (activity.specialty === "dropdown" && activity.dropdown_options) {
                
                let validOptions = activity.dropdown_options;
                if (selectedDay !== -1 || selectedTime !== -1) {
                    validOptions = validOptions.filter(opt => {
                        const hoursMatch = opt.details.match(/<strong>(Hours|Dates):<\/strong>\s*([^<]+)/i);
                        return isActivityOpen(hoursMatch ? hoursMatch[2] : "", selectedDay, selectedTime);
                    });
                }

                specialtyHTML = `
                    <p style="color: inherit;">${activity.description}</p>
                    <select class="specialty-dropdown">
                        <option value="" disabled selected>Choose an Open Option to view details...</option>
                        ${validOptions.map(opt => `<option value="${activity.dropdown_options.indexOf(opt)}">${opt.name}</option>`).join('')}
                    </select>
                    <div class="specialty-details"></div>
                `;
            } else {
                specialtyHTML = `<p>${activity.description}</p>`;
            }

            let secLabel = "";
            if (activity.security === "pre") secLabel = " • PRE-SECURITY";
            if (activity.security === "post") secLabel = " • POST-SECURITY";

            let mapButtonsHTML = '';
            
            if (activity.map_link) {
                mapButtonsHTML += `<a href="${activity.map_link}" target="_blank" class="map-btn">Map 📍</a>`;
            }
            
            if (activity.maps && Array.isArray(activity.maps)) {
                activity.maps.forEach(mapObj => {
                    if (mapObj.link) {
                        const btnText = mapObj.text ? mapObj.text : "Map 📍";
                        mapButtonsHTML += `<a href="${mapObj.link}" target="_blank" class="map-btn">${btnText}</a>`;
                    }
                });
            }

            card.innerHTML = `
                ${activity.rank ? `<div class="rank-badge">#${activity.rank}</div>` : ''}
                ${tagHTML}

                ${activity.image_path ? `
                    <img class="card-image" style="margin-bottom: ${activity.image_attribution ? '4px' : '12px'};" src="${activity.image_path}" alt="${activity.title}" loading="lazy" onerror="this.style.display='none'; this.classList.add('broken-image')">
                    ${activity.image_attribution ? `<div class="image-attribution">${activity.image_attribution}</div>` : ''}
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
                        ${mapButtonsHTML}
                        ${activity.action_link ? `<a href="${activity.action_link}" target="_blank" class="action-btn">${activity.action_text || 'View ↗'}</a>` : ''}
                    </div>
                </div>
            `;

            if (activity.specialty === "dropdown" && activity.dropdown_options) {
                const selectElement = card.querySelector(".specialty-dropdown");
                const detailsElement = card.querySelector(".specialty-details");
                
                selectElement.addEventListener("change", (e) => {
                    const selectedIndex = e.target.value;
                    const optionData = activity.dropdown_options[selectedIndex];
                    
                    let injectedHTML = `<div style="margin-bottom: 16px;">${optionData.details}</div>`;
                    injectedHTML += `<div class="button-group">`;
                    
                    if (optionData.map_link) {
                        injectedHTML += `<a href="${optionData.map_link}" target="_blank" class="map-btn" style="color:#111; background:#fff; border:none;">Map 📍</a>`;
                    }
                    
                    if (optionData.maps && Array.isArray(optionData.maps)) {
                        optionData.maps.forEach(mapObj => {
                            if (mapObj.link) {
                                const btnText = mapObj.text ? mapObj.text : "Map 📍";
                                injectedHTML += `<a href="${mapObj.link}" target="_blank" class="map-btn" style="color:#111; background:#fff; border:none;">${btnText}</a>`;
                            }
                        });
                    }

                    if (optionData.action_link) {
                        injectedHTML += `<a href="${optionData.action_link}" target="_blank" class="action-btn" style="background:rgba(255,255,255,0.25); color:#fff; border:1px solid rgba(255,255,255,0.4);">${optionData.action_text || 'View ↗'}</a>`;
                    }
                    injectedHTML += `</div>`;
                    
                    detailsElement.innerHTML = injectedHTML;
                    
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

    /**
     * @description Displays a fallback UI error state if the requested hub data is missing or corrupted.
     * @param {string} msg - The text to be injected into the error element.
     * @returns {void}
     */
    function showError(msg) {
        document.getElementById("error-msg").innerText = msg;
        document.getElementById("error-state").style.display = "block";
    }

    // --- DOM Event Listeners ---

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
            
            const foodTypeDropdown = document.getElementById("food-type-filter");
            if (activeTypes.has("food")) {
                foodTypeDropdown.style.display = "inline-block";
            } else {
                foodTypeDropdown.style.display = "none";
                activeFoodType = "All"; 
                foodTypeDropdown.value = "All"; 
            }
            
            renderGrid();
        });
    });

    document.getElementById("terminal-filter").addEventListener("change", (e) => { 
        activeTerminal = e.target.value; 
        updateFoodTypeDropdown(); 
        renderGrid(); 
    });
    
    document.getElementById("security-filter").addEventListener("change", (e) => { 
        activeSecurity = e.target.value; 
        updateFoodTypeDropdown(); 
        renderGrid(); 
    });
    
    document.getElementById("food-type-filter").addEventListener("change", (e) => { 
        activeFoodType = e.target.value; 
        renderGrid(); 
    });
    
    document.getElementById("day-filter").addEventListener("change", (e) => { 
        activeDay = e.target.value; 
        renderGrid(); 
    });
    
    document.getElementById("time-filter").addEventListener("change", (e) => { 
        activeTime = e.target.value; 
        renderGrid(); 
    });
});