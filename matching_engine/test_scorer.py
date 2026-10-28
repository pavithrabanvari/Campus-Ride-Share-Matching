from matching_engine.scorer import rank_matches

def test_matching_ranking():
    request = {
        'pickup_lat': 12.9344, 'pickup_lon': 77.5345,
        'dropoff_lat': 12.9716, 'dropoff_lon': 77.5946,
        'desired_time_min': 540  # 9:00 AM
    }
    
    offers = [
        {
            'id': 'offer-1',
            'driver_name': 'Alice',
            'pickup_lat': 12.9350, 'pickup_lon': 77.5350,  # Very close
            'dropoff_lat': 12.9720, 'dropoff_lon': 77.5950,
            'departure_time_min': 545,
            'available_seats': 3,
            'status': 'active',
            'pickup_name': 'PES Main Gate', 'dropoff_name': 'MG Road'
        },
        {
            'id': 'offer-2',
            'driver_name': 'Bob',
            'pickup_lat': 12.9000, 'pickup_lon': 77.5000,  # Far away
            'dropoff_lat': 12.9500, 'dropoff_lon': 77.5500,
            'departure_time_min': 600,
            'available_seats': 2,
            'status': 'active',
            'pickup_name': 'Banashankari', 'dropoff_name': 'Koramangala'
        },
        {
            'id': 'offer-3',
            'driver_name': 'Charlie',
            'pickup_lat': 12.9344, 'pickup_lon': 77.5345,
            'dropoff_lat': 12.9716, 'dropoff_lon': 77.5946,
            'departure_time_min': 540,
            'available_seats': 0,  # No seats available - should be excluded!
            'status': 'active',
            'pickup_name': 'PES Main Gate', 'dropoff_name': 'MG Road'
        }
    ]
    
    results = rank_matches(request, offers)
    print("Ranked Matching Results:\n", results)
    
    # Assertions
    assert len(results) == 2  # Offer 3 should be excluded (0 seats)
    assert results[0]['offer_id'] == 'offer-1'  # Highest match score first

if __name__ == "__main__":
    test_matching_ranking()
    print("\nAll Matching Engine Tests Passed Successfully!")