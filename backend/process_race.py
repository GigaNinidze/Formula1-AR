"""
AR-F1 Data Processing Pipeline
Processes F1 telemetry data and exports normalized coordinates for AR visualization.
"""

import os
import json
import fastf1
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

# Create cache directory if it doesn't exist, then enable caching
cache_dir = './cache'
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

def test_connection():
    """
    Test connection to FastF1 by loading 2023 Bahrain Grand Prix metadata.
    """
    print("=" * 60)
    print("AR-F1 Data Pipeline - Connection Test")
    print("=" * 60)
    
    try:
        # Load the 2023 Bahrain Grand Prix (Race Session)
        year = 2023
        gp = 'Bahrain'
        session_type = 'R'  # Race session
        
        print(f"\n📡 Connecting to FastF1 API...")
        print(f"   Year: {year}")
        print(f"   Grand Prix: {gp}")
        print(f"   Session: Race")
        
        # Load the session
        session = fastf1.get_session(year, gp, session_type)
        
        print(f"\n✅ Session loaded successfully!")
        print(f"\n📊 Session Metadata:")
        print(f"   Session Name: {session.name}")
        print(f"   Event Date: {session.date}")
        
        # Access event information for location/country
        try:
            event = session.event
            # Try different possible attribute names
            location = getattr(event, 'Location', getattr(event, 'location', gp))
            country = getattr(event, 'Country', getattr(event, 'country', 'N/A'))
            print(f"   Location: {location}")
            print(f"   Country: {country}")
        except (AttributeError, TypeError):
            print(f"   Event: {gp}")
        
        # Get session info (this loads telemetry data)
        session.load()
        
        print(f"\n🏁 Race Information:")
        try:
            print(f"   Total Laps: {session.total_laps}")
            print(f"   Track Length: {session.track_length:.3f} km")
        except AttributeError:
            print(f"   (Race info available after full session load)")
        
        # Get driver list
        try:
            drivers = session.drivers
            print(f"\n👥 Drivers ({len(drivers)} total):")
            for driver in drivers[:5]:  # Show first 5
                try:
                    driver_info = session.get_driver(driver)
                    print(f"   {driver}: {driver_info.get('FullName', 'N/A')}")
                except:
                    print(f"   {driver}: (Info not available)")
            if len(drivers) > 5:
                print(f"   ... and {len(drivers) - 5} more")
        except (AttributeError, TypeError):
            print(f"\n👥 Drivers: (Available after full session load)")
        
        print(f"\n✅ Connection test successful!")
        print(f"   FastF1 API is accessible and working correctly.")
        print("=" * 60)
        
        return session
        
    except Exception as e:
        print(f"\n❌ Error connecting to FastF1:")
        print(f"   {type(e).__name__}: {str(e)}")
        print("\n💡 Troubleshooting tips:")
        print("   - Check your internet connection")
        print("   - FastF1 may be rate-limited, try again in a moment")
        print("   - Ensure fastf1 is installed: pip install fastf1")
        print("=" * 60)
        raise

def normalize_coordinates(coords, center_at_zero=True):
    """
    Normalize coordinates from real-world scale (~5km) to 0.0-1.0 range.
    
    Args:
        coords: numpy array of shape (N, 3) with X, Y, Z coordinates
        center_at_zero: If True, center coordinates at (0,0,0) after normalization
    
    Returns:
        normalized_coords: numpy array in 0.0-1.0 range, centered at (0,0,0) if requested
        bounds: dict with min/max values for each axis
    """
    coords = np.array(coords)
    
    # Calculate bounds
    min_vals = coords.min(axis=0)
    max_vals = coords.max(axis=0)
    ranges = max_vals - min_vals
    
    # Avoid division by zero
    ranges = np.where(ranges == 0, 1, ranges)
    
    # Normalize to 0.0-1.0
    normalized = (coords - min_vals) / ranges
    
    if center_at_zero:
        # Center at (0,0,0) by shifting to -0.5 to 0.5 range
        normalized = normalized - 0.5
    
    bounds = {
        'min': min_vals.tolist(),
        'max': max_vals.tolist(),
        'ranges': ranges.tolist()
    }
    
    return normalized, bounds


def f1_to_threejs_coords(f1_coords):
    """
    Convert F1 coordinate system to Three.js coordinate system.
    
    F1: (X, Y) = ground position, Z = altitude
    Three.js: (X, Y, Z) where Y is UP
    
    Mapping:
    - F1 X → Three.js X
    - F1 Y → Three.js Z (Depth)
    - F1 Z → Three.js Y (Height, but we'll use 0 for track)
    
    Args:
        f1_coords: numpy array of shape (N, 3) with F1 X, Y, Z
    
    Returns:
        threejs_coords: numpy array of shape (N, 3) with Three.js X, Y, Z
    """
    f1_coords = np.array(f1_coords)
    
    # F1 coordinates are in 1/10 meters, convert to meters
    f1_coords = f1_coords / 10.0
    
    # Map F1 → Three.js
    threejs_coords = np.zeros_like(f1_coords)
    threejs_coords[:, 0] = f1_coords[:, 0]  # F1 X → Three.js X
    threejs_coords[:, 2] = f1_coords[:, 1]  # F1 Y → Three.js Z (Depth)
    threejs_coords[:, 1] = f1_coords[:, 2]  # F1 Z → Three.js Y (Height)
    
    return threejs_coords


def process_race_data(year, gp, session_type='R', output_dir='../public'):
    """
    Process F1 race data and export normalized coordinates for AR visualization.
    
    Args:
        year: Race year (e.g., 2023)
        gp: Grand Prix name (e.g., 'Bahrain')
        session_type: Session type ('R' for Race, 'Q' for Qualifying, etc.)
        output_dir: Directory to save the output JSON file
    
    Returns:
        output_path: Path to the generated JSON file
    """
    print("=" * 60)
    print("AR-F1 Data Processing Pipeline")
    print("=" * 60)
    
    # Load session
    print(f"\n📡 Loading {year} {gp} {session_type} session...")
    session = fastf1.get_session(year, gp, session_type)
    session.load()
    
    print(f"✅ Session loaded: {session.name}")
    print(f"   Total Laps: {session.total_laps}")
    print(f"   Drivers: {len(session.drivers)}")
    
    # Get all drivers
    drivers = session.drivers
    all_telemetry = []
    driver_info_map = {}
    
    print(f"\n📊 Processing telemetry for {len(drivers)} drivers...")
    
    # Process each driver's telemetry
    for driver in drivers:
        try:
            # Get driver info
            driver_data = session.get_driver(driver)
            driver_info_map[driver] = {
                'number': driver,
                'name': driver_data.get('FullName', f'Driver {driver}'),
                'abbreviation': driver_data.get('Abbreviation', driver),
                'team': driver_data.get('TeamName', 'Unknown')
            }
            
            # Get car telemetry (includes position data)
            print(f"   Processing driver {driver} ({driver_info_map[driver]['name']})...")
            
            # Get position data (X, Y, Z coordinates)
            pos_data = session.pos_data[driver]
            
            # Get car data (for throttle/brake)
            car_data = session.car_data[driver]
            
            # Merge position and car data on time
            telemetry = pos_data.merge_channels(car_data)
            
            # Extract relevant columns
            # Position: X, Y, Z (in 1/10 meters)
            # Car data: Throttle, Brake, Speed
            required_cols = ['X', 'Y', 'Z', 'SessionTime']
            optional_cols = ['Throttle', 'Brake', 'Speed']
            
            # Check which columns exist
            available_cols = [col for col in required_cols + optional_cols if col in telemetry.columns]
            
            if not all(col in available_cols for col in required_cols):
                print(f"   ⚠️  Warning: Missing required columns for driver {driver}")
                continue
            
            # Extract data
            positions = telemetry[['X', 'Y', 'Z']].values
            session_times = telemetry['SessionTime']
            
            # Get throttle/brake if available
            throttle = telemetry['Throttle'].values if 'Throttle' in available_cols else np.zeros(len(positions))
            brake = telemetry['Brake'].values if 'Brake' in available_cols else np.zeros(len(positions))
            speed = telemetry['Speed'].values if 'Speed' in available_cols else np.zeros(len(positions))
            
            # Convert session time to seconds for easier frontend handling
            # Handle both pandas Timedelta and numpy timedelta64
            if isinstance(session_times.iloc[0], pd.Timedelta):
                time_seconds = session_times.dt.total_seconds().values
            else:
                # Convert numpy timedelta64 to seconds
                time_seconds = session_times.values.astype('timedelta64[s]').astype(np.float64)
            
            all_telemetry.append({
                'driver': driver,
                'positions': positions.tolist(),
                'times': time_seconds.tolist(),
                'throttle': throttle.tolist() if isinstance(throttle, np.ndarray) else throttle,
                'brake': brake.tolist() if isinstance(brake, np.ndarray) else brake,
                'speed': speed.tolist() if isinstance(speed, np.ndarray) else speed
            })
            
        except Exception as e:
            print(f"   ❌ Error processing driver {driver}: {str(e)}")
            continue
    
    if not all_telemetry:
        raise ValueError("No telemetry data could be processed!")
    
    print(f"\n🔄 Normalizing coordinates...")
    
    # Collect all positions for normalization (calculate bounds from all data)
    all_positions_f1 = []
    for driver_data in all_telemetry:
        all_positions_f1.extend(driver_data['positions'])
    
    all_positions_f1 = np.array(all_positions_f1)
    
    # Convert F1 coordinates to Three.js coordinates
    all_positions_threejs = f1_to_threejs_coords(all_positions_f1)
    
    # Calculate normalization bounds from all data
    min_vals = all_positions_threejs.min(axis=0)
    max_vals = all_positions_threejs.max(axis=0)
    ranges = max_vals - min_vals
    ranges = np.where(ranges == 0, 1, ranges)
    
    bounds = {
        'min': min_vals.tolist(),
        'max': max_vals.tolist(),
        'ranges': ranges.tolist()
    }
    
    # Find the minimum time across all drivers to normalize time to start from 0
    all_min_times = [min(driver_data['times']) for driver_data in all_telemetry if driver_data['times']]
    global_min_time = min(all_min_times) if all_min_times else 0
    
    # Apply normalization to each driver's positions using the same bounds
    for driver_data in all_telemetry:
        positions_f1 = np.array(driver_data['positions'])
        positions_threejs = f1_to_threejs_coords(positions_f1)
        
        # Normalize times to start from 0 (subtract the global minimum)
        if driver_data['times']:
            driver_data['times'] = [t - global_min_time for t in driver_data['times']]
        
        # Normalize using the global bounds
        normalized = (positions_threejs - min_vals) / ranges
        normalized = normalized - 0.5  # Center at zero
        
        driver_data['positions_normalized'] = normalized.tolist()
    
    # Create track path from first driver (assuming they complete the track)
    # Use the first driver's normalized positions as the track reference
    track_path = all_telemetry[0]['positions_normalized'] if all_telemetry else []
    
    # Prepare output data structure
    output_data = {
        'metadata': {
            'year': year,
            'grand_prix': gp,
            'session_type': session_type,
            'session_name': session.name,
            'event_date': str(session.date),
            'total_laps': int(session.total_laps) if hasattr(session, 'total_laps') else None,
            'track_length_km': float(session.track_length) if hasattr(session, 'track_length') else None,
            'num_drivers': len(all_telemetry),
            'coordinate_bounds': bounds,
            'coordinate_system': {
                'description': 'Normalized to -0.5 to 0.5 range, centered at (0,0,0) for AR placement',
                'range': '[-0.5, 0.5] for each axis',
                'mapping': {
                    'f1_x': 'threejs_x',
                    'f1_y': 'threejs_z (depth)',
                    'f1_z': 'threejs_y (height)'
                }
            }
        },
        'drivers': driver_info_map,
        'track': {
            'path': track_path,
            'description': 'Reference track path from first driver'
        },
        'telemetry': all_telemetry
    }
    
    # Create output directory if it doesn't exist
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Generate output filename
    filename = f"race_data_{year}_{gp}_{session_type}.json"
    filepath = output_path / filename
    
    print(f"\n💾 Saving to {filepath}...")
    
    # Save as JSON
    with open(filepath, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    file_size_mb = filepath.stat().st_size / (1024 * 1024)
    print(f"✅ Saved! File size: {file_size_mb:.2f} MB")
    
    # Calculate total data points
    total_points = sum(len(driver_data['positions']) for driver_data in all_telemetry)
    
    print(f"\n📈 Summary:")
    print(f"   Total data points: {total_points:,}")
    print(f"   Drivers processed: {len(all_telemetry)}")
    print(f"   Coordinate range: X[{bounds['min'][0]:.1f}, {bounds['max'][0]:.1f}], "
          f"Y[{bounds['min'][1]:.1f}, {bounds['max'][1]:.1f}], "
          f"Z[{bounds['min'][2]:.1f}, {bounds['max'][2]:.1f}]")
    print("=" * 60)
    
    return str(filepath)


if __name__ == "__main__":
    import sys
    
    # Check if running as test or full processing
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        # Just test the connection
        session = test_connection()
    else:
        # Process the full race data
        year = 2023
        gp = 'Bahrain'
        session_type = 'R'
        
        try:
            output_path = process_race_data(year, gp, session_type)
            print(f"\n🎉 Success! Race data exported to: {output_path}")
        except Exception as e:
            print(f"\n❌ Error processing race data:")
            print(f"   {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

