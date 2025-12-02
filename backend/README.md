# AR-F1 Backend

Data processing pipeline for converting F1 telemetry into AR-ready JSON format.

## Overview

This backend processes Formula 1 race telemetry from FastF1 and exports normalized coordinate data optimized for WebXR AR visualization.

## Features

- ✅ Fetches F1 telemetry data using FastF1
- ✅ Normalizes coordinates from ~5km scale to unit box (-0.5 to 0.5)
- ✅ Converts F1 coordinate system to Three.js coordinate system
- ✅ Includes throttle/brake data for color-coded car visualization
- ✅ Exports compressed JSON for frontend consumption

## Usage

### Test Connection

Test the FastF1 connection without processing full data:

```bash
python process_race.py test
```

### Process Race Data

Process a full race and export to JSON:

```bash
python process_race.py
```

This will:
1. Load the 2023 Bahrain Grand Prix (Race session)
2. Extract telemetry for all drivers
3. Normalize coordinates
4. Export to `../public/race_data_2023_Bahrain_R.json`

### Customize Race

Edit `process_race.py` to change the race:

```python
year = 2023
gp = 'Bahrain'  # Change to any Grand Prix name
session_type = 'R'  # 'R' for Race, 'Q' for Qualifying, etc.
```

## Output Format

The generated JSON contains:

```json
{
  "metadata": {
    "year": 2023,
    "grand_prix": "Bahrain",
    "coordinate_bounds": {...},
    "coordinate_system": {
      "description": "Normalized to -0.5 to 0.5 range, centered at (0,0,0)",
      "mapping": {
        "f1_x": "threejs_x",
        "f1_y": "threejs_z (depth)",
        "f1_z": "threejs_y (height)"
      }
    }
  },
  "drivers": {
    "1": {
      "number": "1",
      "name": "Max Verstappen",
      "team": "Red Bull Racing"
    }
  },
  "track": {
    "path": [[x, y, z], ...]
  },
  "telemetry": [
    {
      "driver": "1",
      "positions_normalized": [[x, y, z], ...],
      "times": [0.0, 0.1, ...],
      "throttle": [0.0, 100.0, ...],
      "brake": [false, false, ...],
      "speed": [0.0, 120.5, ...]
    }
  ]
}
```

## Coordinate System

### F1 → Three.js Mapping

- **F1 X** → **Three.js X** (left/right)
- **F1 Y** → **Three.js Z** (depth/forward)
- **F1 Z** → **Three.js Y** (height/up)

### Normalization

All coordinates are:
1. Converted from F1 system (1/10 meters) to meters
2. Mapped to Three.js coordinate system
3. Normalized to -0.5 to 0.5 range
4. Centered at (0, 0, 0)

This ensures the track fits in a 1x1 meter unit box, perfect for AR table placement.

## Requirements

- Python 3.10+
- fastf1 >= 3.1.0
- pandas >= 2.0.0
- numpy >= 1.24.0

## Notes

- First run will download data from FastF1 API (may take several minutes)
- Subsequent runs use cached data (much faster)
- Cache is stored in `./cache/` directory
- Output JSON files can be large (10-50MB depending on race length)

