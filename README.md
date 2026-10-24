# Classical Music Concert Log

A CSV-based performance log — concerts, opera, and ballet — with a clean **front-end / back-end** separation.

## Architecture

```
concert-log/
├── server.js               # Backend: Node.js (built-in http, no dependencies)
│                           #   - serves the frontend from docs/
│                           #   - serves /api/dataset, /api/concerts,
│                           #     /api/programmes, /api/stats, /api/health
├── lib/
│   ├── parse.js            # Parses the CSV sources into row objects
│   └── dataset.js          # Builds the dataset (concerts + programmes + stats)
│                           #   shared by the server (API) and the build script
├── data/
│   ├── concerts.csv        # Source of truth — one row per event
│   └── programmes.csv      # Source of truth — one row per piece
├── scripts/
│   ├── build-data.js       # Generates docs/data/concert.json for static hosting
│   └── validate-data.js    # Checks encoding, columns, dates, referential integrity
├── docs/                   # Frontend (static, deployable to GitHub Pages)
│   ├── index.html
│   ├── css/
│   │   ├── themes.css      # All theming (5 themes)
│   │   └── styles.css      # Components; reads only theme variables
│   ├── js/
│   │   ├── charts.js       # Inline SVG bar / donut builders
│   │   └── app.js          # Renders the dataset, theme switching, search
│   └── data/
│       └── concert.json    # Precomputed dataset the frontend fetches
├── serve.cmd               # One-click launcher (runs server.js)
└── .gitattributes          # Normalizes CSV line endings to LF
```

**Backend** — `server.js` reads the CSVs via `lib/parse.js`, builds the dataset
in `lib/dataset.js`, and serves it as JSON. **Frontend** — `docs/` is a static
page that fetches `data/concert.json` and renders it. The same dataset is
produced for both: the server serves it live, and `scripts/build-data.js` writes
it to disk for static hosts.

## Run

Requires Node.js (no dependencies, no internet needed).

```bash
node server.js            # open the printed URL (usually http://localhost:3000)
```

On Windows you can double-click **`serve.cmd`** instead.

If port 3000 is unavailable (some Windows setups reserve 2948-3047 for Hyper-V/WSL),
the server automatically tries `8080`, `8081`, `5173`, `4321`, `9000` and prints the
port it picked. Set the `PORT` environment variable to force a specific port.

- `GET /api/dataset` — the full dataset
- `GET /api/concerts` — concerts only
- `GET /api/programmes` — programmes only
- `GET /api/stats` — counts, stats, chart series, repeated works
- `GET /api/health` — health check

## Deploy to a static host

```bash
node scripts/build-data.js   # writes docs/data/concert.json
# then publish the docs/ folder (e.g. copy it to your Pages repo)
```

The frontend is fully static; the only requirement is that `docs/data/concert.json`
is regenerated whenever the CSVs change.

## Theming

Five themes ship by default — **Everforest** (default, the original dark look),
**Light**, **Dark**, **Nord**, and **Gruvbox** — switchable from the **Theme**
dropdown in the top-right corner. The choice is remembered in the browser.

All theming lives in `docs/css/themes.css`. Each theme is a block of CSS custom
properties:

```css
[data-theme="mytheme"] {
  --bg-page: #101418;
  --bg-card: #1a2029;
  --text: #e6e6e6;
  --accent: #7aa2f7;
  /* ... */
  --chart-1: #7aa2f7;
  /* ... */
}
```

To add a theme:

1. Copy an existing block in `themes.css` and rename the selector.
2. Change the values.
3. Add `<option value="mytheme">My Theme</option>` to the `<select id="themeSelect">`
   in `docs/index.html`.

`styles.css` contains no hardcoded colors — it only references the variables, so
a new theme automatically applies everywhere, including the charts.

## Data entry

Edit `data/concerts.csv` and `data/programmes.csv`, then:

```bash
node scripts/validate-data.js   # check encoding, columns, dates, links
node scripts/build-data.js      # regenerate docs/data/concert.json
node server.js                  # or restart the running server
```

### CSV format & Excel

CSV has no single standard, and spreadsheet editors rewrite the whole file, which
makes Git merges painful (every line shows as changed). To keep the files
merge-safe:

- **Encoding:** UTF-8 **with BOM**, **LF** line endings. `.gitattributes` pins the
  line endings (`*.csv text eol=lf`), overriding Git-for-Windows' `core.autocrlf`.
- **Dates:** ISO `YYYY-MM-DD`. The backend also accepts `2025/5/8` and normalizes it.
- **Columns:** no trailing empty columns; quote only fields that contain a comma,
  quote, or newline.

If you edit in **Excel**, save with **File → Save As → CSV UTF-8 (Comma delimited)**
and set the `date` column format to **Text** before typing dates — otherwise Excel
rewrites `2026-09-10` as `2026/9/10` and reformats quoting. After any Excel edit,
run `node scripts/validate-data.js`.

One-time, after `.gitattributes` is committed, normalize the existing history so
the line-ending rule takes effect:

```bash
git add --renormalize .
git commit -m "Normalize CSV line endings"
```

## Schema

### concerts.csv

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `concert_id` | integer | Unique ID (auto-increment, starts at 1) | `1` |
| `date` | date | Concert date (YYYY-MM-DD) | `2026-09-10` |
| `venue` | text | Concert hall / location name | `Musikverein` |
| `city` | text | City | `Vienna` |
| `orchestra` | text | Orchestra name | `Vienna Philharmonic` |
| `conductor` | text | Conductor name (leave empty if none) | `Andris Nelsons` |
| `soloists` | text | Soloists, semicolon-separated (if any) | `Hilary Hahn; Lang Lang` |
| `event_type` | text | Event type: `Concert`, `Opera`, `Ballet` (empty = `Concert`) | `Concert` |
| `ticket_price` | number | Ticket cost (numeric only) | `90` |
| `currency` | text | Currency code | `EUR` |
| `companion` | text | Who you went with (leave empty if solo) | `Wife` |
| `notes` | text | Personal notes, memories, highlights | `Incredible Beethoven 7th` |

### programmes.csv

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `concert_id` | integer | Links to `concerts.csv` | `1` |
| `piece_order` | integer | Order in the programme (starts at 1) | `1` |
| `composer` | text | Composer surname | `Beethoven` |
| `composer_full` | text | Full name | `Ludwig van Beethoven` |
| `work_title` | text | Work name | `Symphony No. 7` |
| `opus` | text | Opus number (if applicable) | `Op. 102` |
| `catalog` | text | Catalog number: K. (Mozart), BWV (Bach), RV (Vivaldi), etc. | `K. 525` |
| `period` | text | One of: `Classical`, `Romantic`, `Post-Romantic`, `20th Century`, `Contemporary` | `Romantic` |
| `conductor` | text | Conductor name (duplicated from concerts.csv for easy querying) | `Andris Nelsons` |
| `soloists` | text | Featured soloists for this piece (leave empty for symphonies, etc.) | `Lang Lang (piano)` |
| `performers` | text | Ensemble / chorus specific to this piece (if any) | `Hong Kong Philharmonic Chorus` |
| `rating` | number | Your rating for this piece: `0` to `5` (0.5 steps recommended; empty = unrated, `0` = unacceptable) | `4.5` |
| `notes` | text | Notes on this particular piece | `First time hearing live` |
| `tag` | text | Optional badge shown next to the work, e.g. `Opera` for opera excerpts | `Opera` |
| `section` | text | `Encore` (or `Encore 1`, `Encore 2`) for encore pieces; blank for the announced programme | `Encore` |

## Rating rubric

Ratings are **per piece**, on a **0–5** scale (0.5 steps are enough; `0` = unacceptable).
Leave a rating **empty when you have no clear impression**.

A rating is for **one specific performance**, not a verdict on the work itself: it
includes how it was played on the night and the concert environment (hall, seat, mood),
so the same work can score very differently across hearings. It also reflects **how much
you personally enjoy the work** — some contemporary pieces are hard to grasp, so they
rarely score high. The goal is consistency in your own terms, not precision.

### What to weigh (five lenses)

1. **Technical execution** — accuracy, intonation, ensemble, coordination.
2. **Interpretation & style** — phrasing, tempo, dynamics, structure, stylistic fit.
3. **Sound & balance** — tone, blend, dynamic range, hall/acoustics.
4. **Communication & presence** — soloist charisma, conductor's control, risk, spontaneity.
5. **Impact & memorability** — did it move you? would you seek it out again? did it change how you hear the work?

*Optional:* **programme/context** (rarity, new work, comparison with reference recordings) —
this is more about the event; note it in the piece's `notes` if it matters.

### Anchors

| Score | Meaning |
|---|---|
| **5.0** | Reference-level: among the best you have heard live; nothing you would change; worth travelling for |
| **4.5** | Outstanding: clearly above routine, memorable, only tiny flaws; would strongly recommend |
| **4.0** | Very good: satisfying and well executed, but not transcendent; minor reservations |
| **3.5** | Good: competent and pleasant, with a clear weak spot (routine reading, uneven ensemble); glad you went, wouldn't rush back |
| **3.0** | Adequate: passes, no highlights, flaws present but not ruinous |
| **2.5** | Below par: problems start to interfere; would not recommend |
| **2.0** | Poor: clear technical or interpretive failures; hard to enjoy |
| **1.0–1.5** | Bad: serious problems; you wanted it to end |
| **0** | Unacceptable / failed |

### Calibration

- **3.0 is neutral**, not "bad". Most "it was fine" performances belong at **3–3.5**.
- Reserve **4.5–5** for roughly the top **10%** of experiences.
- Anchor **relative to your best live hearing or a reference recording**, not to the rest of the same evening.
- Score the five lenses first; if two are clearly weak, the total should not be 4.5+.
- Re-check the next day, when the buzz has faded.
- If more than half your scores are ≥4, you are probably being generous.

## Data Entry

### Manual Entry

1. Add one row to `concerts.csv` with the concert details
2. Add N rows to `programmes.csv` (one per piece), all sharing the same `concert_id`

### Event types (concert / opera / ballet)

`concerts.csv` holds every kind of event. Set `event_type` to `Concert`, `Opera`,
or `Ballet` (blank is treated as `Concert`). Since an opera or a ballet is a
single work, it gets **one row** in `programmes.csv` — put principals (singers or
dancers) in `soloists`, and production credits (choreographer, stage director,
librettist) in `notes`.

For a **gala or recital** made of excerpts, use `event_type = Concert` and give
each excerpt its own row titled `Opera: Excerpt` (e.g. `La Cenerentola: Overture`).
The rows stay separate so you can rate each, but two excerpts from the same opera
are counted as **one work** in the statistics. Set `tag = Opera` on those rows to
show an `OPERA` badge next to each excerpt.

### Encores

Record encores as extra rows with `section = Encore` (or `Encore 1`, `Encore 2`).
Set `piece_order` to the real performance order — encores keep their actual place
in the programme, including between halves.

- Encores are **display-only**: they never affect the statistics (pieces heard,
  composers, periods, ratings, unique works).
- Encore rows carry a dashed `ENCORE` badge and are otherwise listed like any other
  piece (no separate section).
- The **Encores** checkbox above the table shows/hides them (remembered per browser).
- If you can't remember a concert's encores, just leave them out — the log makes no
  claim that a concert had none.

An opera:

```csv
# concerts.csv
15,2026-10-02,Hong Kong Cultural Centre Grand Theatre,Hong Kong,Hong Kong Philharmonic Orchestra,Conductor Name,,Opera,,,,,
# programmes.csv
15,1,Verdi,Giuseppe Verdi,La traviata,,,Romantic,Conductor Name,"Singer A (Violetta); Singer B (Alfredo)",,4.5,
```

A ballet:

```csv
# concerts.csv
16,2026-11-05,Hong Kong Cultural Centre Grand Theatre,Hong Kong,Hong Kong Ballet,,Ballet,,,,,
# programmes.csv
16,1,Tchaikovsky,Pyotr Ilyich Tchaikovsky,Swan Lake,Op. 20,,Romantic,Conductor Name,"Dancer A (Odette); Dancer B (Siegfried)",,5,Choreography by Choreographer Name.
```

### Via URL (Automated)

Paste a concert URL and I will:
1. Fetch the page and extract concert details
2. Append one row to `concerts.csv`
3. Append the programme rows to `programmes.csv`
4. Ask you to fill in the per-piece ratings, plus companion and notes

## Statistics

### Most Listened Composers

Open `programmes.csv` in Excel/Google Sheets, then:

**Excel:** Use `=COUNTIF(B:B, "Beethoven")` or PivotTable on `composer` column.

**Google Sheets:** Use `=COUNTIF(B:B, "Beethoven")` or Pivot Table.

**SQL (if imported to a DB):**
```sql
SELECT composer, COUNT(*) AS times_heard
FROM programmes
GROUP BY composer
ORDER BY times_heard DESC;
```

### Most Performed Works

```sql
SELECT composer, work_title, COUNT(*) AS times_heard
FROM programmes
GROUP BY composer, work_title
ORDER BY times_heard DESC;
```

### Period Distribution

```sql
SELECT period, COUNT(*) AS count
FROM programmes
GROUP BY period
ORDER BY count DESC;
```

### Most Visited Venues

```sql
SELECT venue, city, COUNT(*) AS visits
FROM concerts
GROUP BY venue, city
ORDER BY visits DESC;
```

### Concerts Per Year

```sql
SELECT strftime('%Y', date) AS year, COUNT(*) AS concerts
FROM concerts
GROUP BY year
ORDER BY year;
```

### Spending by Year

```sql
SELECT strftime('%Y', date) AS year, SUM(ticket_price) AS total_spent, currency
FROM concerts
WHERE ticket_price > 0
GROUP BY year, currency;
```

### Average Rating by Composer

```sql
SELECT composer, AVG(rating) AS avg_rating
FROM programmes
WHERE rating > 0
GROUP BY composer
ORDER BY avg_rating DESC;
```

### Frequent Conductors

```sql
SELECT conductor, COUNT(*) AS times
FROM concerts
WHERE conductor != ''
GROUP BY conductor
ORDER BY times DESC;
```

### Frequent Soloists

```sql
SELECT soloists, COUNT(*) AS times
FROM concerts
WHERE soloists != ''
GROUP BY soloists
ORDER BY times DESC;
```

## Sample Data

The CSV files include sample data to demonstrate the format. Delete or keep as reference when you start logging your own concerts.
