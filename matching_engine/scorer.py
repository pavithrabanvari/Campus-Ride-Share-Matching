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

def compute_compatibility_score(
    request: Dict[str, Any], 
    offer: Dict[str, Any],
    weight_dist: float = 5.0,
    weight_time: float = 0.5
) -> float:
    """
    Computes a route compatibility score (0-100) based on weighted distance 
    and departure time discrepancies.
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
    
    # Weighted penalty calculation formula
    dist_penalty = (pickup_dist + dropoff_dist) * weight_dist
    time_penalty = time_diff * weight_time
    total_penalty = dist_penalty + time_penalty
    
    score = max(0.0, 100.0 - total_penalty)
    return round(score, 2)

def rank_matches(
    request: Dict[str, Any], 
    offers: List[Dict[str, Any]], 
    max_time_window_min: float = 30.0
) -> List[Dict[str, Any]]:
    """
    Ranks candidate offers for a ride request.
    
    Advanced Heuristics (Sprint 2):
    - Filters out cancelled posts and offers with 0 available seats (FR-15 / TC-07).
    - Filters out offers exceeding the maximum time window threshold (e.g., >30 mins time diff).
    - Returns an empty list [] if no candidate offers pass all filters.
    """
    ranked_results = []
    
    for offer in offers:
        # Exclude invalid/cancelled/full offers
        if offer.get('status') == 'cancelled' or offer.get('available_seats', 0) <= 0:
            continue
            
        # Exclude offers exceeding the maximum allowable time window tolerance
        time_diff = abs(request['desired_time_min'] - offer['departure_time_min'])
        if time_diff > max_time_window_min:
            continue
            
        score = compute_compatibility_score(request, offer)
        
        # Only include offers with a positive compatibility score
        if score > 0:
            ranked_results.append({
                'offer_id': offer['id'],
                'driver_name': offer.get('driver_name', 'Student'),
                'score': score,
                'available_seats': offer['available_seats'],
                'pickup': offer['pickup_name'],
                'dropoff': offer['dropoff_name'],
                'time_delta_min': time_diff
            })
            
    # Sort descending by compatibility score
    ranked_results.sort(key=lambda x: x['score'], reverse=True)
    return ranked_results