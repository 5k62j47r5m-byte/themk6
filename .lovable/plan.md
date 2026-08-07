# Export all logged data to CSV

Pull everything currently stored in The Mk16 and hand it back as spreadsheet files. No app changes — this is a one-time export.

## What's in there now

- 29 workout days
- 18 sleep nights
- 1 tasks day
- 1 metrics day
- Max-weight records (currently empty)

## Files produced

Four CSVs, one per section, each with a `date` column so they can be joined or filtered:

- `workouts.csv` — one row per logged exercise: date, exercise, sets, reps, weight, and any other fields recorded
- `sleep.csv` — one row per night: date, bed/wake times, duration, quality, notes
- `tasks.csv` — one row per task: date, task name, completed
- `metrics.csv` — one row per day: date, body weight and other tracked metrics

Columns are derived from the actual stored records so nothing gets dropped. Rows sorted oldest to newest.

## Delivery

Files land in your documents area as downloadable artifacts. Each one opens directly in Excel or Google Sheets.

## Technical notes

Read the `mk_state` singleton row, flatten each JSON section keyed by date into tabular rows via a Python script, union the key sets per section so every field becomes a column, and write to `/mnt/documents/`. Read-only — no schema or app code changes.
