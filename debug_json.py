import json

try:
    with open('/Users/us1ndiso/Desktop/AR-F1/public/race_data_2023_Bahrain_R.json', 'r') as f:
        # Read a chunk to find the start of telemetry
        data = json.load(f)
        
        print("Metadata:", data.get('metadata'))
        
        if data.get('telemetry') and len(data['telemetry']) > 0:
            first_car = data['telemetry'][0]
            positions = first_car.get('positions_normalized')
            times = first_car.get('times')
            
            print(f"\nDriver: {first_car.get('driver')}")
            
            start_pos = positions[0]
            print(f"Start Pos: {start_pos}")
            
            for i, pos in enumerate(positions):
                # Check if position has changed significantly
                dist = sum([(a-b)**2 for a, b in zip(pos, start_pos)])
                if dist > 0.000001:
                    print(f"First movement at index {i}, Time: {times[i]}s")
                    print(f"New Pos: {pos}")
                    break
            else:
                print("Car never moves!")
            
except Exception as e:
    print(f"Error: {e}")

