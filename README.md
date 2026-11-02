# Make My Layover Fun

Layover spots recommended by airline pilots and crew. A static site: plain HTML, CSS, and JavaScript, no build step, no cookies, no analytics.

## Files

| File | What it is |
| --- | --- |
| `index.html` + `home.js` | Home page; lists every airport in `data/airports.json` |
| `airport.html` + `airport.js` | One airport's guide, e.g. `airport.html?code=SFO` |
| `about.html` | About, privacy policy, disclaimer |
| `404.html` | Not-found page |
| `styles.css` | Shared styles for every page |
| `data/airports.json` | The list of airports that have a guide |
| `data/crew.json` | Pilots and crew who made recommendations |
| `data/<code>.json` | The places for one airport |
| `images/` | Photos used on cards |

## Adding an airport

1. Add an entry to `data/airports.json`: `{ "code": "LGA", "name": "New York LaGuardia", "city": "New York, NY" }`
2. Create `data/lga.json` (lowercase code) with `{ "code": "LGA", "places": [ ... ] }`
3. Add `https://makemylayoverfun.com/airport.html?code=LGA` to `sitemap.xml`

## Adding a crew member

Add them to `data/crew.json` under a short id, then use that id in a place's `recommended_by`:

```json
"curtis-r": { "name": "Captain Curtis R.", "linkedin": "https://www.linkedin.com/in/..." }
```

## Adding a place

Every place needs **either** a photo **or** a crew recommendation (with a LinkedIn link). Places without one of these don't belong on the site. Only places inside the airport are listed.

```json
{
  "id": "kleins-deli",
  "name": "Klein's Deli",
  "location": ["Terminal 3, near Gate F14", "Terminal 3, near Gate E10"],
  "description": "What makes it worth the walk. <strong>Simple HTML</strong> is allowed.",
  "recommended_by": "curtis-r",
  "photo": { "src": "images/kleins.jpg", "credit": "Photo courtesy of Klein's Deli" },
  "link": { "label": "Menu", "url": "https://..." }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique, lowercase-with-dashes. Also works as a link anchor: `airport.html?code=SFO#kleins-deli` |
| `name` | yes | |
| `location` | yes | Text, or a list of strings for several locations |
| `description` | yes | May contain simple HTML |
| `recommended_by` | one of these two | An id from `data/crew.json` |
| `photo` | one of these two | `src` (path in `images/`), optional `credit` (HTML), optional `alt` |
| `link` | no | `{ label, url }` for the button. Link to the place's own page or menu, not an airport homepage, and check it still works |

Places show up in the order they're listed in the file. If a photo needs a Creative Commons credit, also add it to the airport's `credits` field, which is shown in the page footer.

## Running locally

The pages load data with `fetch`, so open them through a local server rather than double-clicking the file:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.
