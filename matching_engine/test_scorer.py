from matching_engine.scorer import rank_matches, compute_compatibility_score

def test_matching_ranking():
    sample_request = {
        "pickup_lat": 12.9344,
        "pickup_lon": 77.5345,
        "dropoff_lat": 12.9716,
        "dropoff_lon": 77.5946,
        "desired_time_min": 540  # 9:00 AM
    }

    sample_offers = [
        {
            "id": "offer-1",
            "driver_name": "Alice",
            "pickup_lat": 12.9350,
            "pickup_lon": 77.5350,
            "dropoff_lat": 12.9720,
            "dropoff_lon": 77.5950,
            "departure_time_min": 545,  # 5 min difference (Valid)
            "available_seats": 3,
            "status": "active",
            "pickup_name": "PES Main Gate",
            "dropoff_name": "MG Road"
        },
        {
            "id": "offer-2",
            "driver_name": "Bob",
            "pickup_lat": 12.9400,
            "pickup_lon": 77.5400,
            "dropoff_lat": 12.9800,
            "dropoff_lon": 77.6000,
            "departure_time_min": 555,  # 15 min difference (Valid, < 30 mins)
            "available_seats": 2,
            "status": "active",
            "pickup_name": "PES Back Gate",
            "dropoff_name": "Indiranagar"
        },
        {
            "id": "offer-3",
            "driver_name": "Charlie",
            "pickup_lat": 12.9344,
            "pickup_lon": 77.5345,
            "dropoff_lat": 12.9716,
            "dropoff_lon": 77.5946,
            "departure_time_min": 540,
            "available_seats": 0,  # 0 seats -> Must be filtered (TC-07 / FR-15)
            "status": "active",
            "pickup_name": "PES Main Gate",
            "dropoff_name": "MG Road"
        },
        {
            "id": "offer-4",
            "driver_name": "David",
            "pickup_lat": 12.9344,
            "pickup_lon": 77.5345,
            "dropoff_lat": 12.9716,
            "dropoff_lon": 77.5946,
            "departure_time_min": 600,  # 60 min difference -> Exceeds max 30 min window
            "available_seats": 2,
            "status": "active",
            "pickup_name": "PES Main Gate",
            "dropoff_name": "MG Road"
        }
    ]

    results = rank_matches(sample_request, sample_offers, max_time_window_min=30.0)
    print("\nRanked Matching Results:")
    print(results)

    # 1. Verify offer-3 (0 seats) and offer-4 (>30 mins time delta) are excluded
    assert len(results) == 2, f"Expected 2 matches, got {len(results)}"
    
    # 2. Verify sorting (highest score first)
    assert results[0]['offer_id'] == 'offer-1'
    assert results[1]['offer_id'] == 'offer-2'
    assert results[0]['score'] >= results[1]['score']
    
    print("\n[SUCCESS] All matching engine tests passed!")

if __name__ == "__main__":
    test_matching_ranking()