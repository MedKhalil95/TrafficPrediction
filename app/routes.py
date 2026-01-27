# app/routes.py - Fixed version
from flask import Blueprint, render_template, request, jsonify
from datetime import datetime
import json
import os

main = Blueprint('main', __name__)

# Tunisian cities with coordinates and real traffic data
CITIES = {
    0: {
        "name": "Tunis",
        "lat": 36.8065,
        "lng": 10.1815,
        "population": 638845,
        "hotspots": ["Bab Bhar", "Lac", "Belvédère", "Avenue Habib Bourguiba"]
    },
    1: {
        "name": "Ariana",
        "lat": 36.8625,
        "lng": 10.1956,
        "population": 114486,
        "hotspots": ["Cité Ennasr", "Ariana Ville", "Riadh Andalous"]
    },
    2: {
        "name": "Sfax",
        "lat": 34.7406,
        "lng": 10.7603,
        "population": 330440,
        "hotspots": ["Sfax Médina", "Route de l'Aéroport", "Route de Tunis"]
    },
    3: {
        "name": "Sousse",
        "lat": 35.8254,
        "lng": 10.6360,
        "population": 221530,
        "hotspots": ["Port El Kantaoui", "Sousse Médina", "Boulevard 14 Janvier"]
    }
}

WEATHER_CONDITIONS = {
    0: {"name": "Clear", "emoji": "☀️", "impact": 0},
    1: {"name": "Rain", "emoji": "🌧️", "impact": 1},
    2: {"name": "Fog", "emoji": "🌫️", "impact": 0.5}
}

@main.route("/", methods=["GET", "POST"])
def index():
    """Main page with real-time data"""
    if request.method == "POST":
        try:
            hour = int(request.form.get("hour", datetime.now().hour))
            day = int(request.form.get("day", datetime.now().weekday()))
            city_id = int(request.form.get("city", 0))
            weather = int(request.form.get("weather", 0))
            
            weekend = 1 if day >= 5 else 0
            
            # Get prediction (simulated for now)
            prediction = get_prediction(hour, day, weekend, city_id, weather)
            
            # Get city info
            city = CITIES.get(city_id, CITIES[0])
            
            # Get day name
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day_name = days[day] if day < len(days) else "Unknown"
            
            # Get weather info
            weather_info = WEATHER_CONDITIONS.get(weather, WEATHER_CONDITIONS[0])
            
            # Calculate traffic percentage
            traffic_percentage = {
                0: "10-30%",
                1: "40-70%", 
                2: "75-100%"
            }.get(prediction, "Unknown")
            
            # Get rush hour status
            is_rush_hour = hour in [7, 8, 9, 16, 17, 18]
            
            # Generate recommendations
            recommendations = get_recommendations(prediction, hour, city_id)
            
            return render_template("index.html", 
                prediction=prediction,
                city=city,
                weather=weather_info,
                day_name=day_name,
                hour=hour,
                traffic_percentage=traffic_percentage,
                is_rush_hour=is_rush_hour,
                recommendations=recommendations,
                cities=CITIES,
                show_map=True)
                
        except Exception as e:
            print(f"Error: {e}")
            return render_template("index.html", 
                error="Invalid input. Please check your values.",
                cities=CITIES)
    
    return render_template("index.html", cities=CITIES)

def get_prediction(hour, day, weekend, city_id, weather):
    """Get traffic prediction"""
    # Simulated prediction logic
    score = 0
    
    # Time impact
    if 7 <= hour <= 9:  # Morning rush
        score += 2.5
        if city_id in [0, 1]:  # Tunis & Ariana
            score += 1.0
    
    elif 12 <= hour <= 14:  # Lunch time
        score += 1.0
    
    elif 16 <= hour <= 19:  # Evening rush
        score += 3.0
        if city_id in [0, 1]:
            score += 1.5
    
    elif 20 <= hour <= 23 or 0 <= hour <= 5:  # Night
        score -= 1.5
    
    # Day impact
    if day == 4:  # Friday
        if 11 <= hour <= 14:  # Prayer time
            score += 1.5
    
    # Weekend impact
    if weekend:
        if 10 <= hour <= 18:
            score += 0.5
        else:
            score -= 1.0
    
    # City impact
    city_weights = {0: 1.3, 1: 1.2, 2: 1.0, 3: 0.9}
    score *= city_weights.get(city_id, 1.0)
    
    # Weather impact
    if weather == 1:  # Rain
        score += 1.2
    elif weather == 2:  # Fog
        score += 0.6
    
    # Convert to traffic level
    if score >= 4.0:
        return 2  # High
    elif score >= 2.0:
        return 1  # Medium
    else:
        return 0  # Low

def get_recommendations(prediction, hour, city_id):
    """Generate traffic recommendations"""
    recommendations = []
    
    if prediction == 2:  # High traffic
        recommendations.append("🚗 Consider using public transportation")
        recommendations.append("⏰ Allow extra travel time")
        if hour in [7, 8, 9, 16, 17, 18]:
            recommendations.append("🕒 Avoid peak hours if possible")
    
    elif prediction == 1:  # Medium traffic
        recommendations.append("🚘 Normal travel time expected")
        recommendations.append("📱 Check real-time traffic updates")
    
    else:  # Low traffic
        recommendations.append("✅ Smooth driving conditions")
        recommendations.append("⏱️ Normal travel time")
    
    # City-specific recommendations
    if city_id == 0:  # Tunis
        recommendations.append("📍 Main hotspots: Avenue Habib Bourguiba, Lac")
    elif city_id == 2:  # Sfax
        recommendations.append("📍 Main hotspots: Route de l'Aéroport")
    
    return recommendations

@main.route("/api/traffic-prediction", methods=["POST"])
def api_traffic_prediction():
    """API endpoint for AJAX predictions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        hour = int(data.get("hour", datetime.now().hour))
        day = int(data.get("day", datetime.now().weekday()))
        city_id = int(data.get("city", 0))
        weather = int(data.get("weather", 0))
        
        weekend = 1 if day >= 5 else 0
        prediction = get_prediction(hour, day, weekend, city_id, weather)
        
        # Get traffic level info
        traffic_level_info = {
            0: {"level": "Low", "color": "#28a745", "message": "Traffic is light"},
            1: {"level": "Medium", "color": "#ffc107", "message": "Moderate traffic expected"},
            2: {"level": "High", "color": "#dc3545", "message": "Heavy traffic - consider alternate routes"}
        }.get(prediction)
        
        # Get city info
        city_info = CITIES.get(city_id, CITIES[0])
        
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
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@main.route("/api/system-status")
def system_status():
    """Get system status"""
    try:
        return jsonify({
            "success": True,
            "status": {
                "last_update": datetime.now().isoformat(),
                "next_update": "in 1 hour",
                "dataset_size": 0
            },
            "files": {
                "dataset": {"exists": os.path.exists("data/traffic_dataset.csv")},
                "model": {"exists": os.path.exists("models/traffic_model.pth")}
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
        return jsonify(city)
    return jsonify({"error": "City not found"}), 404