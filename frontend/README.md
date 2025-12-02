# AR-F1 Frontend

WebXR application for viewing Formula 1 races in Augmented Reality on Meta Quest 3.

## Features

- 🎮 **WebXR Support**: Full AR experience on Meta Quest 3
- 🏁 **Race Replay**: Watch historical F1 races from God's Eye View
- 🎨 **Holographic Aesthetic**: Neon track path with color-coded cars
- 🎯 **AR Hit Test**: Tap your table to place the track
- ⚡ **Real-time Playback**: Play, pause, and speed controls

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **Three.js** - 3D graphics
- **React-Three-Fiber** - React renderer for Three.js
- **@react-three/xr** - WebXR support
- **@react-three/drei** - Useful helpers

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Ensure race data exists:**
   - The JSON file should be in `../public/race_data_2023_Bahrain_R.json`
   - Generate it by running the backend processing script

3. **Start development server:**
```bash
npm run dev
```

4. **Access on Meta Quest 3:**
   - The server will run on `https://0.0.0.0:5173`
   - Use your computer's local IP address (e.g., `https://192.168.1.100:5173`)
   - Open in Quest Browser
   - Enable WebXR when prompted

## Development Notes

### TypeScript Errors

If you see TypeScript errors about missing React types:
1. Restart your IDE/TypeScript server
2. Run `npm install` again
3. The types are installed correctly in `node_modules/@types/react`

### HTTPS Requirement

WebXR requires HTTPS. Vite is configured to use HTTPS in development. You may need to accept the self-signed certificate in your browser.

### File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ARScene.tsx    # Main AR scene with hit test
│   │   ├── Track.tsx      # Track visualization
│   │   ├── Cars.tsx       # Car spheres with telemetry
│   │   └── UI.tsx         # Control UI overlay
│   ├── hooks/
│   │   ├── useRaceData.ts      # Load race JSON
│   │   └── useRaceControls.ts  # Playback controls
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── public/                # Static assets (served from ../public)
└── package.json
```

## Usage

1. **Put on your Meta Quest 3 headset**
2. **Open the app in Quest Browser**
3. **Enable WebXR** when prompted
4. **Point at your table** and press the trigger to place the track
5. **Use the UI controls** to play/pause and adjust speed

## Color Coding

- **Mint Green (#03CEA4)**: Throttle applied (>50%)
- **Rose Red (#CA1551)**: Braking
- **White**: Neutral/coasting

## Design System

Following the AR-F1 design palette:
- **Primary Actions**: Crayola Orange (#FA8148)
- **Destructive Actions**: Rose Red (#CA1551)
- **Confirmations**: Mint (#03CEA4)
- **Background**: Vanilla (#FFF5B2)

## Troubleshooting

### WebXR not working
- Ensure you're using HTTPS
- Check that WebXR is enabled in Quest Browser settings
- Try a different browser or restart the headset

### Race data not loading
- Verify the JSON file exists in `../public/`
- Check browser console for fetch errors
- Ensure the file path in `useRaceData.ts` is correct

### Performance issues
- The JSON file is large (~374MB). Consider:
  - Streaming the data
  - Downsampling telemetry points
  - Loading data progressively

## Build for Production

```bash
npm run build
```

The output will be in `dist/` directory.

