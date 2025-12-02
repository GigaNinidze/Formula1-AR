# AR-F1

A WebXR application for Meta Quest 3 that allows users to replay historical Formula 1 races on their coffee table using Augmented Reality.

## Project Overview

This project provides a "God's Eye View" of Formula 1 races, projected into the real world via AR. Users can tap their table to place the track and watch cars represented as moving spheres replay historical race data.

## Architecture

### Backend (Python)
- Fetches raw F1 telemetry using FastF1
- Normalizes geographic coordinates (5km wide) into a 1x1 meter unit box
- Exports compressed JSON files for frontend consumption

### Frontend (React + Vite)
- Web application that loads race data JSON
- Renders 3D track and cars using React-Three-Fiber
- Handles WebXR AR "Hit Test" for table placement

## Directory Structure

```
AR-F1/
├── backend/          # Python data processing pipeline
├── frontend/         # React + Vite application
└── public/           # Generated race data JSON files
```

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Test the FastF1 connection:
```bash
python process_race.py
```

## Technical Notes

### Coordinate System Mapping

- **F1 Data**: (X, Y) for ground position, Z for altitude
- **Three.js**: (X, Y, Z) where Y is UP
- **Mapping**:
  - F1 X → Three.js X
  - F1 Y → Three.js Z (Depth)
  - Three.js Y (Height) = 0 (or slightly elevated for cars)

### Data Normalization

All coordinates are normalized to a 0.0 to 1.0 range and centered at (0,0,0) for optimal AR placement.

## License

MIT

