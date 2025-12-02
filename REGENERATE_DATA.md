# Regenerating Race Data with Time Normalization

## Why Regenerate?

The latest version of the backend includes **time normalization** - all cars' timestamps are normalized to start from 0, ensuring perfect synchronization between all cars during replay. This ensures cars move exactly as they did in the real race, synchronized to the same time.

## How to Regenerate

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the processing script:**
   ```bash
   python process_race.py
   ```

   This will:
   - Fetch the latest race data from FastF1
   - Process all drivers' telemetry
   - Normalize coordinates for AR viewing
   - **Normalize all timestamps to start from 0** (NEW!)
   - Export to `../public/race_data_YYYY_GrandPrix_S.json`

3. **The new JSON file will be saved in the `public/` directory**

4. **Refresh your browser** - the new race should appear in the race selector

## Processing Different Races

To process a different race, edit `backend/process_race.py` and change:

```python
year = 2023
gp = 'Bahrain'  # Change to any Grand Prix name
session_type = 'R'  # 'R' for Race, 'Q' for Qualifying, etc.
```

Then run `python process_race.py` again.

## File Naming Convention

Race files follow this pattern:
- `race_data_YYYY_GrandPrix_S.json`
- Example: `race_data_2023_Bahrain_R.json`
- Example: `race_data_2023_Monaco_Q.json`

The frontend will automatically discover and list all available race files in the `public/` directory.

## What's New in the Data?

- ✅ **Time normalization**: All cars' timestamps start from 0
- ✅ **Perfect synchronization**: All cars are synchronized to the same time
- ✅ **Accurate replay**: Cars move exactly as they did in the real race

