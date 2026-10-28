import math
from typing import List, Dict, Any

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates straight-line distance (in km) between two geospatial coordinates."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_compatibility_score(request: Dict[str, Any], offer: Dict[str, Any]) -> float:
    """
    Computes a route compatibility score (0-100) based on:
    1. Distance between pickup points (km)
    2. Distance between drop-off points (km)
    3. Time difference (minutes)
    """
    # 1. Pickup & Dropoff Distance Penalties
    pickup_dist = calculate_haversine_distance(
        request['pickup_lat'], request['pickup_lon'],
        offer['pickup_lat'], offer['pickup_lon']
    )
    dropoff_dist = calculate_haversine_distance(
        request['dropoff_lat'], request['dropoff_lon'],
        offer['dropoff_lat'], offer['dropoff_lon']
    )
    
    # 2. Departure Time Delta Penalty (in minutes)
    time_diff = abs(request['desired_time_min'] - offer['departure_time_min'])
    
    # Base score of 100 minus weighted penalties
    # Deduct 5 points per km for pickup/dropoff, deduct 1 point per 2 mins time diff
    penalty = (pickup_dist * 5.0) + (dropoff_dist * 5.0) + (time_diff * 0.5)
    score = max(0.0, 100.0 - penalty)
    
    return round(score, 2)

def rank_matches(request: Dict[str, Any], offers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks active candidate offers for a ride request.
    Filters out cancelled posts and offers with 0 available seats (FR-15 / TC-07).
    """
    ranked_results = []
    
    for offer in offers:
        # Exclude invalid/cancelled/full offers
        if offer.get('status') == 'cancelled' or offer.get('available_seats', 0) <= 0:
            continue
            
        score = compute_compatibility_score(request, offer)
        ranked_results.append({
            'offer_id': offer['id'],
            'driver_name': offer.get('driver_name', 'Student'),
            'score': score,
            'available_seats': offer['available_seats'],
            'pickup': offer['pickup_name'],
            'dropoff': offer['dropoff_name']
        })
        
    # Sort descending by score
    ranked_results.sort(key=lambda x: x['score'], reverse=True)
    return ranked_results