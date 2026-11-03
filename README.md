Campus Ride-Share Matching Platform 🚗🎓
An intelligent, full-stack campus ride-sharing platform designed for university students to share daily commutes, reduce travel costs, and optimize campus transit efficiency.

The system leverages geospatial indexing, custom heuristic scoring algorithms, real-time FastAPI endpoints, and modular subsystem integrations to pair ride seekers with compatible peer drivers based on proximity, drop-off routes, seat availability, and departure time windows.

🛠 Tech Stack & Architecture
Backend Framework: FastAPI (Python 3.13) / Node.js & Express

Matching Engine: Custom geospatial Haversine distance calculator, dynamic weighted constraint scoring, and departure time delta window filters

Testing Suite: Python unittest & pytest

Version Control & Management: Git, GitHub Flow, Jira Agile Sprints

🎯 Key Features & Requirements
FR-12 & FR-13 (Route Matching & Compatibility Ranking): Computes real-time compatibility scores (0–100) by evaluating pickup proximity, destination drop-off distance, and departure time discrepancies.

FR-15 & TC-07 (Seat & Status Filtering): Automatically excludes cancelled ride offers or vehicles with 0 available seats.

Dynamic Time Window Thresholds: Disqualifies candidate offers exceeding maximum departure tolerance windows (e.g., >30 minutes) to ensure tight schedules.

Clean Empty-State Handling: Seamlessly handles empty matching results ([]) when no valid offers meet safety and proximity constraints.


🚀 Getting Started Locally

1. Clone the Repository
git clone https://github.com/pavithrabanvari/Campus-Ride-Share-Matching.git
cd Campus-Ride-Share-Matching

2. Set Up Virtual Environment & Dependencies
Create virtual environment
python -m venv venv

Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

Activate virtual environment (macOS/Linux)
source venv/bin/activate

Install required dependencies
pip install fastapi uvicorn pytest

3. Run the Development Server
python -m uvicorn main:app --reload

The FastAPI backend server will start at http://127.0.0.1:8000.

🧪 Interactive API Documentation & Testing
Interactive Swagger UI
Once the server is running, open your browser and navigate to:

Swagger Documentation: http://127.0.0.1:8000/docs

ReDoc: http://127.0.0.1:8000/redoc

Test Endpoint Example
POST /api/matches/rank

Sample Request Payload:
{
"request": {
"pickup_lat": 12.9344,
"pickup_lon": 77.5345,
"dropoff_lat": 12.9716,
"dropoff_lon": 77.5946,
"desired_time_min": 540
},
"offers": [
{
"id": "offer-101",
"driver_name": "Alice",
"pickup_lat": 12.9350,
"pickup_lon": 77.5350,
"dropoff_lat": 12.9720,
"dropoff_lon": 77.5950,
"departure_time_min": 545,
"available_seats": 3,
"status": "active",
"pickup_name": "PES Main Gate",
"dropoff_name": "MG Road"
}
]
}

Running the Test Suite
Execute unit tests for the heuristic scoring engine:
python -m matching_engine.test_scorer

Alternatively, run with pytest:
python -m pytest
