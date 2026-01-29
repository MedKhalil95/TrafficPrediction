# routes.py - Free version using OpenStreetMap
from flask import Blueprint, render_template, request, jsonify, current_app
from datetime import datetime, timedelta
import json
import os
import requests
import numpy as np
from math import radians, sin, cos, sqrt, atan2

main = Blueprint('main', __name__)

# Load all Tunisian cities from JSON
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
CITIES_FILE = os.path.join(DATA_DIR, 'tunisia_cities.json')

# Load cities data
CITIES = {}
try:
    if os.path.exists(CITIES_FILE):
        with open(CITIES_FILE, 'r', encoding='utf-8') as f:
            raw = json.load(f)
            for k, v in raw.items():
                try:
                    CITIES[int(k)] = v
                except:
                    pass
    else:
        CITIES = {}
except Exception as e:
    print(f"Warning: unable to load cities file: {e}")
    CITIES = {}

# Group cities by governorate for dropdown
GOVERNORATES = {}
for city_id, city_data in CITIES.items():
    governorate = city_data.get('governorate', 'Unknown')
    if governorate not in GOVERNORATES:
        GOVERNORATES[governorate] = []
    GOVERNORATES[governorate].append({
        'id': city_id,
        'name': city_data['name'],
        'lat': city_data['lat'],
        'lng': city_data['lng']
    })

WEATHER_CONDITIONS = {
    0: {"name": "Clear", "emoji": "☀️", "impact": 0},
    1: {"name": "Rain", "emoji": "🌧️", "impact": 1},
    2: {"name": "Fog", "emoji": "🌫️", "impact": 0.5}
}

# Configuration for free APIs
USE_OPENROUTE_SERVICE = True  # Set to True for routing
OPENROUTE_API_KEY = os.environ.get('OPENROUTE_API_KEY', '')  # Get free key from openrouteservice.org

# Helper functions
def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km using Haversine formula"""
    R = 6371.0  # Earth radius in km
    
    lat1 = radians(lat1)
    lon1 = radians(lng1)
    lat2 = radians(lat2)
    lon2 = radians(lng2)
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    return R * c

def calculate_eta_with_speed(distance_km, avg_speed_kmh, traffic_factor):
    """Calculate ETA based on distance, speed, and traffic"""
    # Base time without traffic
    base_hours = distance_km / avg_speed_kmh
    base_minutes = base_hours * 60
    
    # Apply traffic factor
    adjusted_minutes = base_minutes * (1 + traffic_factor)
    
    # Calculate arrival time
    departure_time = datetime.now()
    arrival_time = departure_time + timedelta(minutes=adjusted_minutes)
    
    return {
        'distance_km': round(distance_km, 1),
        'base_minutes': int(base_minutes),
        'adjusted_minutes': int(adjusted_minutes),
        'traffic_delay': int(adjusted_minutes - base_minutes),
        'departure_time': departure_time.strftime("%H:%M"),
        'arrival_time': arrival_time.strftime("%H:%M"),
        'avg_speed_kmh': int(avg_speed_kmh)
    }

def get_avg_speed_for_road_type(distance_km, road_type="urban"):
    """Get average speed based on road type and distance"""
    speed_profiles = {
        "highway": 90,  # Highways
        "primary": 70,  # Primary roads
        "secondary": 50,  # Secondary roads
        "urban": 40,  # Urban roads
        "rural": 60   # Rural roads
    }
    
    # Determine road type based on distance
    if distance_km > 100:
        road_type = "highway"
    elif distance_km > 50:
        road_type = "primary"
    elif distance_km > 20:
        road_type = "secondary"
    else:
        road_type = "urban"
    
    return speed_profiles.get(road_type, 40)

def calculate_traffic_impact(traffic_level, weather_impact, hour):
    """Calculate traffic impact factor based on various conditions"""
    # Base impact from traffic level
    traffic_impacts = {0: 0.1, 1: 0.3, 2: 0.6}
    base_impact = traffic_impacts.get(traffic_level, 0.3)
    
    # Time of day multiplier
    if 7 <= hour <= 9 or 16 <= hour <= 19:  # Rush hours
        time_multiplier = 1.5
    elif 12 <= hour <= 14:  # Lunch time
        time_multiplier = 1.2
    else:
        time_multiplier = 1.0
    
    # Weather impact
    weather_multiplier = 1 + (weather_impact * 0.3)
    
    return base_impact * time_multiplier * weather_multiplier

def format_duration(minutes):
    """Format minutes to human-readable string"""
    hours = int(minutes // 60)
    mins = int(minutes % 60)
    
    if hours > 0:
        return f"{hours}h {mins}m"
    return f"{mins}m"

def get_prediction(hour, day, city_id, weather):
    """Enhanced prediction function"""
    score = 0
    
    # Time impact
    if 7 <= hour <= 9:  # Morning rush
        score += 2
    elif 16 <= hour <= 19:  # Evening rush
        score += 2.5
    elif 12 <= hour <= 14:  # Lunch time
        score += 1
    
    # Day impact
    if day == 4:  # Friday prayer time impact
        score += 1.5
    elif day >= 5:  # Weekend
        score -= 0.5
    
    # City size impact
    city = CITIES.get(city_id, {})
    if city.get('population', 0) > 200000:
        score += 1.5
    elif city.get('population', 0) > 100000:
        score += 1
    
    # Weather impact
    if weather == 1:  # Rain
        score += 1.5
    elif weather == 2:  # Fog
        score += 1
    
    # Determine traffic level
    if score >= 4:
        return 2  # High
    elif score >= 2:
        return 1  # Medium
    else:
        return 0  # Low

def get_recommendations(prediction, hour, city_id):
    """Generate traffic recommendations"""
    recommendations = []
    
    city = CITIES.get(city_id, {})
    city_name = city.get('name', 'Unknown City')
    
    if prediction == 2:  # High traffic
        recommendations.append(f"🚨 Heavy traffic expected in {city_name}")
        recommendations.append("⏰ Allow 30-45 minutes extra travel time")
        recommendations.append("🚗 Consider carpooling or public transport")
        if hour in [7, 8, 9]:
            recommendations.append("🕗 Avoid morning rush hours if possible")
        elif hour in [16, 17, 18]:
            recommendations.append("🕔 Evening peak - plan accordingly")
    
    elif prediction == 1:  # Medium traffic
        recommendations.append(f"⚠️ Moderate traffic in {city_name}")
        recommendations.append("📱 Check real-time updates before departure")
        recommendations.append("⏱️ Normal travel time + 15 minutes")
    
    else:  # Low traffic
        recommendations.append(f"✅ Smooth traffic conditions in {city_name}")
        recommendations.append("🚘 Normal travel time expected")
        recommendations.append("🟢 Good time for travel")
    
    # Add governorate-specific tips
    governorate = city.get('governorate', '')
    if governorate in ['Tunis', 'Ariana', 'Ben Arous', 'Manouba']:
        recommendations.append("📍 Grand Tunis area - watch for main arteries")
    
    return recommendations

# === ROUTES ===

@main.route("/", methods=["GET", "POST"])
def index():
    """Main page with enhanced ETA functionality"""
    return render_template("index.html",
                         cities=CITIES,
                         governorates=GOVERNORATES,
                         current_time=datetime.now())

@main.route("/api/traffic-prediction", methods=["POST"])
def api_traffic_prediction():
    """API endpoint for traffic prediction"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        hour = int(data.get("hour", datetime.now().hour))
        day = int(data.get("day", datetime.now().weekday()))
        city_id = int(data.get("city", 0))
        weather = int(data.get("weather", 0))
        
        prediction = get_prediction(hour, day, city_id, weather)
        
        # Define traffic level info dictionary
        traffic_levels = {
            0: {"level": "Low", "color": "#28a745", "emoji": "✅"},
            1: {"level": "Medium", "color": "#ffc107", "emoji": "⚠️"},
            2: {"level": "High", "color": "#dc3545", "emoji": "🚨"}
        }
        
        # Get traffic level info with safe default
        traffic_level_info = traffic_levels.get(prediction, traffic_levels[0])
        
        # Get city info
        city_info = CITIES.get(city_id, CITIES.get(0))
        
        # Generate recommendations
        recommendations = get_recommendations(prediction, hour, city_id)
        
        return jsonify({
            "success": True,
            "prediction": prediction,
            "traffic_level": traffic_level_info,
            "city": city_info,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"API error: {e}")
        return jsonify({"success": False, "error": str(e)}), 400
# routes.py - Add this new endpoint

@main.route("/api/traffic-for-city/<int:city_id>", methods=["GET"])
def get_traffic_for_city(city_id):
    """Get traffic data for a specific city"""
    try:
        city = CITIES.get(city_id)
        if not city:
            return jsonify({"success": False, "error": "City not found"}), 404
        
        now = datetime.now()
        hour = now.hour
        day = now.weekday()
        
        # Get traffic prediction for this city
        prediction = get_prediction(hour, day, city_id, 0)  # Default weather
        
        # Simulate real-time traffic data
        traffic_levels = {
            0: {"level": "Low", "color": "#28a745", "speed": "40-60 km/h"},
            1: {"level": "Medium", "color": "#ffc107", "speed": "20-40 km/h"},
            2: {"level": "High", "color": "#dc3545", "speed": "<20 km/h"}
        }
        
        traffic_info = traffic_levels.get(prediction, traffic_levels[0])
        
        # Add time-based factors
        if 7 <= hour <= 9 or 16 <= hour <= 19:
            congestion = "Rush Hour"
            extra_time = "Add 30+ mins"
        elif 12 <= hour <= 14:
            congestion = "Lunch Time"
            extra_time = "Add 15 mins"
        else:
            congestion = "Normal"
            extra_time = "Normal time"
        
        # Weather impact
        weather_conditions = ["Clear", "Rain", "Fog"]
        weather_emoji = ["☀️", "🌧️", "🌫️"]
        
        return jsonify({
            "success": True,
            "city": city,
            "traffic": {
                "level": prediction,
                "level_text": traffic_info["level"],
                "color": traffic_info["color"],
                "speed": traffic_info["speed"],
                "congestion": congestion,
                "extra_time": extra_time
            },
            "time": {
                "current": now.strftime("%H:%M"),
                "day": now.strftime("%A"),
                "rush_hour": (7 <= hour <= 9 or 16 <= hour <= 19)
            },
            "recommendations": get_recommendations(prediction, hour, city_id)
        })
        
    except Exception as e:
        print(f"City traffic error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
@main.route("/api/calculate-eta", methods=["POST"])
def api_calculate_eta():
    """
    Calculate ETA using free method - No API key required!
    """
    try:
        data = request.get_json()
        origin = data.get("origin")
        city_id = int(data.get("city_id"))
        hour = data.get("hour", datetime.now().hour)
        day = data.get("day", datetime.now().weekday())
        weather = data.get("weather", 0)
        
        if not origin or city_id is None:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
        
        # Get city info
        city = CITIES.get(city_id)
        if not city:
            return jsonify({"success": False, "error": "City not found"}), 404
        
        # Calculate straight-line distance
        distance_km = calculate_distance(
            origin['lat'], origin['lng'],
            city['lat'], city['lng']
        )
        
        # Add 20% for road curvature (roads aren't straight)
        road_distance_km = distance_km * 1.2
        
        # Get traffic prediction
        traffic_prediction = get_prediction(hour, day, city_id, weather)
        weather_impact = WEATHER_CONDITIONS.get(weather, WEATHER_CONDITIONS[0])["impact"]
        
        # Calculate traffic impact
        traffic_impact = calculate_traffic_impact(traffic_prediction, weather_impact, hour)
        
        # Get average speed based on distance
        avg_speed = get_avg_speed_for_road_type(road_distance_km)
        
        # Calculate ETA
        eta_result = calculate_eta_with_speed(road_distance_km, avg_speed, traffic_impact)
        
        # Generate route coordinates (simplified - straight line with intermediate points)
        route_coords = generate_route_coordinates(origin, city, steps=10)
        
        return jsonify({
            "success": True,
            "route": {
                "distance": {"text": f"{int(road_distance_km)} km", "value": road_distance_km * 1000},
                "duration": {"text": format_duration(eta_result['base_minutes']), "value": eta_result['base_minutes'] * 60},
                "adjusted_duration": {"text": format_duration(eta_result['adjusted_minutes']), "value": eta_result['adjusted_minutes'] * 60},
                "coordinates": route_coords,
                "start_location": {"lat": origin['lat'], "lng": origin['lng']},
                "end_location": {"lat": city['lat'], "lng": city['lng']}
            },
            "eta": {
                "departure_time": eta_result['departure_time'],
                "arrival_time": eta_result['arrival_time'],
                "total_travel_time": format_duration(eta_result['adjusted_minutes']),
                "traffic_impact": f"+{traffic_impact*100:.0f}%",
                "delay_minutes": eta_result['traffic_delay'],
                "distance_km": eta_result['distance_km'],
                "avg_speed": f"{avg_speed} km/h"
            },
            "traffic": {
                "level": traffic_prediction,
                "level_text": ["Low", "Medium", "High"][traffic_prediction],
                "impact_factor": round(traffic_impact, 2)
            },
            "city": city
        })
        
    except Exception as e:
        print(f"ETA calculation error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

def generate_route_coordinates(origin, destination, steps=10):
    """Generate intermediate coordinates for a route"""
    coords = []
    
    # Add start point
    coords.append([origin['lat'], origin['lng']])
    
    # Generate intermediate points
    for i in range(1, steps):
        fraction = i / steps
        lat = origin['lat'] + (destination['lat'] - origin['lat']) * fraction
        lng = origin['lng'] + (destination['lng'] - origin['lng']) * fraction
        
        # Add some curvature to make it look like a real road
        if steps > 3:
            mid_point = steps // 2
            if i == mid_point:
                # Add slight curve in the middle
                curve_factor = 0.1
                lat += (np.random.random() - 0.5) * curve_factor
                lng += (np.random.random() - 0.5) * curve_factor
        
        coords.append([lat, lng])
    
    # Add end point
    coords.append([destination['lat'], destination['lng']])
    
    return coords

@main.route("/api/get-real-time-data", methods=["GET"])
def get_real_time_data():
    """
    Get simulated real-time traffic data for Tunisian cities
    This simulates real traffic conditions
    """
    try:
        real_time_data = []
        now = datetime.now()
        hour = now.hour
        day = now.weekday()
        
        for city_id, city in CITIES.items():
            # Simulate traffic based on time and city
            base_traffic = 0.3  # Base traffic
            
            # Time factors
            if 7 <= hour <= 9 or 16 <= hour <= 19:  # Rush hours
                base_traffic += 0.4
            elif 12 <= hour <= 14:  # Lunch time
                base_traffic += 0.2
            
            # Day factors
            if day == 4:  # Friday
                base_traffic += 0.3
            elif day >= 5:  # Weekend
                base_traffic -= 0.1
            
            # City size factor
            if city.get('population', 0) > 200000:
                base_traffic += 0.3
            elif city.get('population', 0) > 100000:
                base_traffic += 0.2
            
            # Add randomness
            base_traffic += np.random.random() * 0.2 - 0.1
            base_traffic = max(0.1, min(1.0, base_traffic))
            
            # Convert to traffic level
            if base_traffic > 0.7:
                traffic_level = 2
            elif base_traffic > 0.4:
                traffic_level = 1
            else:
                traffic_level = 0
            
            # Generate speed based on traffic
            speeds = {0: 60, 1: 40, 2: 20}
            speed = speeds.get(traffic_level, 40) + np.random.randint(-10, 10)
            
            real_time_data.append({
                "city_id": city_id,
                "city_name": city.get('name', 'Unknown'),
                "governorate": city.get('governorate', 'Unknown'),
                "lat": city.get('lat'),
                "lng": city.get('lng'),
                "traffic_level": traffic_level,
                "traffic_score": round(base_traffic, 2),
                "avg_speed": speed,
                "congestion": int(base_traffic * 100),
                "last_updated": now.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": real_time_data,
            "timestamp": now.isoformat(),
            "total_cities": len(real_time_data)
        })
        
    except Exception as e:
        print(f"Real-time data error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@main.route("/api/cities", methods=["GET"])
def api_cities():
    """Get all cities grouped by governorate"""
    return jsonify({
        "success": True,
        "cities": CITIES,
        "governorates": GOVERNORATES,
        "total_cities": len(CITIES)
    })

@main.route("/api/system-status")
def system_status():
    """Get system status"""
    try:
        return jsonify({
            "success": True,
            "status": {
                "last_update": datetime.now().isoformat(),
                "cities_loaded": len(CITIES),
                "governorates": len(GOVERNORATES),
                "routing_service": "Free Calculation",
                "real_time_data": "Simulated"
            },
            "current_time": datetime.now().isoformat(),
            "timezone": "Africa/Tunis"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@main.route("/api/city/<int:city_id>")
def get_city_info(city_id):
    """Get city information"""
    city = CITIES.get(city_id)
    if city:
        return jsonify({
            "success": True,
            "city": city
        })
    return jsonify({"success": False, "error": "City not found"}), 404