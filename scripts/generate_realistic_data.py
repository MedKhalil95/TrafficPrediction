import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

def generate_realistic_tunisian_traffic_data(num_samples=10000):
    """
    Generate realistic Tunisian traffic data with actual traffic patterns
    """
    np.random.seed(42)
    random.seed(42)
    
    # Tunisian cities with realistic traffic patterns
    cities = {
        0: {"name": "Tunis", "population": 638845, "traffic_base": 0.8},
        1: {"name": "Ariana", "population": 114486, "traffic_base": 0.7},
        2: {"name": "Sfax", "population": 330440, "traffic_base": 0.6},
        3: {"name": "Sousse", "population": 221530, "traffic_base": 0.5}
    }
    
    # Weather conditions with probabilities
    weather_conditions = {
        0: {"name": "Clear", "probability": 0.7, "impact": 0.0},
        1: {"name": "Rain", "probability": 0.2, "impact": 0.3},
        2: {"name": "Fog", "probability": 0.1, "impact": 0.2}
    }
    
    data = []
    
    for _ in range(num_samples):
        # Generate random timestamp within a year
        day_of_year = random.randint(0, 364)
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        
        # Convert to day of week (0=Monday, 6=Sunday)
        day_of_week = (day_of_year + 1) % 7  # Start from Monday
        weekend = 1 if day_of_week >= 5 else 0
        
        # Random city with weights based on population
        city_id = random.choices(
            list(cities.keys()), 
            weights=[cities[0]["traffic_base"], cities[1]["traffic_base"], 
                     cities[2]["traffic_base"], cities[3]["traffic_base"]]
        )[0]
        
        # Random weather
        weather_id = random.choices(
            list(weather_conditions.keys()),
            weights=[weather_conditions[0]["probability"], 
                     weather_conditions[1]["probability"],
                     weather_conditions[2]["probability"]]
        )[0]
        
        # Calculate realistic traffic level (0=Low, 1=Medium, 2=High)
        traffic_score = calculate_traffic_score(hour, day_of_week, weekend, city_id, weather_id)
        
        data.append([hour, day_of_week, weekend, city_id, weather_id, traffic_score])
    
    df = pd.DataFrame(data, columns=["hour", "day", "weekend", "city", "weather", "traffic"])
    
    # Add some noise to make it more realistic
    df["traffic"] = df["traffic"].apply(lambda x: add_traffic_noise(x))
    
    return df

def calculate_traffic_score(hour, day, weekend, city_id, weather_id):
    """
    Calculate realistic traffic score based on Tunisian traffic patterns
    """
    score = 0.0
    
    # 1. Time of day impact (based on real Tunisian rush hours)
    # Morning rush: 7-9 AM (most intense in Tunis)
    if 7 <= hour <= 9:
        if city_id in [0, 1]:  # Tunis & Ariana
            score += 2.5
        else:  # Other cities
            score += 1.5
    
    # Lunch time: 12-2 PM
    elif 12 <= hour <= 14:
        score += 0.8
    
    # Evening rush: 4-7 PM (most intense)
    elif 16 <= hour <= 19:
        if city_id in [0, 1]:
            score += 3.0
        else:
            score += 2.0
    
    # Night time: 8 PM - 5 AM (low traffic)
    elif 20 <= hour <= 23 or 0 <= hour <= 5:
        score -= 1.0
    
    # 2. Day of week impact
    # Fridays (day 4) have special traffic patterns (prayer time)
    if day == 4:  # Friday
        if 11 <= hour <= 13:  # Friday prayer time
            score += 1.5
        elif 14 <= hour <= 16:  # Post-prayer traffic
            score += 1.0
    
    # Weekends generally have less traffic
    if weekend:
        if 10 <= hour <= 18:  # Weekend shopping/tourism hours
            score += 0.5
        else:
            score -= 0.5
    
    # Mondays have more traffic (start of work week)
    if day == 0 and 7 <= hour <= 9:
        score += 0.5
    
    # 3. City impact
    city_multipliers = {0: 1.2, 1: 1.1, 2: 1.0, 3: 0.9}
    score *= city_multipliers.get(city_id, 1.0)
    
    # 4. Weather impact
    weather_impacts = {0: 0.0, 1: 0.8, 2: 0.5}  # Rain increases traffic, fog reduces speed
    score += weather_impacts.get(weather_id, 0.0)
    
    # 5. Special events (simulated)
    # Randomly add special events (holidays, accidents, etc.)
    if random.random() < 0.02:  # 2% chance of special event
        score += random.uniform(1.0, 2.0)
    
    # Convert score to traffic level (0, 1, 2)
    if score >= 3.5:
        return 2  # High traffic
    elif score >= 1.5:
        return 1  # Medium traffic
    else:
        return 0  # Low traffic

def add_traffic_noise(traffic_level):
    """Add some randomness to traffic levels"""
    noise = random.random()
    if noise < 0.1:  # 10% chance to change level
        if traffic_level == 0:
            return 1 if random.random() < 0.5 else 0
        elif traffic_level == 2:
            return 1 if random.random() < 0.5 else 2
        else:  # traffic_level == 1
            return 0 if random.random() < 0.5 else 2
    return traffic_level

def generate_time_series_data(start_date="2024-01-01", end_date="2024-12-31"):
    """Generate time-series traffic data"""
    dates = pd.date_range(start=start_date, end=end_date, freq='H')
    data = []
    
    for date in dates:
        hour = date.hour
        day = date.weekday()  # 0=Monday
        weekend = 1 if day >= 5 else 0
        
        # More realistic city distribution
        city_id = random.choices([0, 1, 2, 3], weights=[0.4, 0.3, 0.2, 0.1])[0]
        
        # Seasonal weather patterns
        month = date.month
        if month in [11, 12, 1, 2]:  # Winter months
            weather_probs = [0.5, 0.4, 0.1]  # More rain
        elif month in [3, 4, 5]:  # Spring
            weather_probs = [0.8, 0.1, 0.1]  # Mostly clear
        else:  # Summer and Fall
            weather_probs = [0.9, 0.05, 0.05]  # Very clear
        
        weather_id = random.choices([0, 1, 2], weights=weather_probs)[0]
        
        # Calculate traffic
        traffic = calculate_traffic_score(hour, day, weekend, city_id, weather_id)
        
        # Add holiday effects
        if month == 1 and date.day == 1:  # New Year
            traffic = min(2, traffic + 1)
        elif month == 5 and date.day == 1:  # Labor Day
            traffic = min(2, traffic + 1)
        elif month == 7 and 25 <= date.day <= 27:  # Republic Day period
            traffic = min(2, traffic + 1)
        
        data.append([hour, day, weekend, city_id, weather_id, traffic])
    
    return pd.DataFrame(data, columns=["hour", "day", "weekend", "city", "weather", "traffic"])

if __name__ == "__main__":
    print("Generating realistic Tunisian traffic data...")
    
    # Create data directory
    os.makedirs("data", exist_ok=True)
    
    # Generate two types of datasets
    print("1. Generating general traffic dataset...")
    df_general = generate_realistic_tunisian_traffic_data(20000)
    df_general.to_csv("data/traffic_dataset.csv", index=False)
    
    print("2. Generating time-series dataset...")
    df_time_series = generate_time_series_data()
    df_time_series.to_csv("data/traffic_time_series.csv", index=False)
    
    print("\nDataset Summary:")
    print(f"Total samples: {len(df_general)}")
    print("\nTraffic Level Distribution:")
    print(df_general["traffic"].value_counts().sort_index())
    
    print("\nTraffic by City:")
    for city_id in range(4):
        city_data = df_general[df_general["city"] == city_id]
        city_name = ["Tunis", "Ariana", "Sfax", "Sousse"][city_id]
        print(f"{city_name}:")
        print(city_data["traffic"].value_counts().sort_index())
    
    print("\nTraffic by Hour (Tunis):")
    tunis_data = df_general[df_general["city"] == 0]
    for hour in range(0, 24, 3):
        hour_data = tunis_data[tunis_data["hour"] == hour]
        if len(hour_data) > 0:
            avg_traffic = hour_data["traffic"].mean()
            print(f"Hour {hour:02d}:00 - Avg Traffic: {avg_traffic:.2f}")
    
    print("\n✅ Datasets generated successfully!")
    print(f"📁 Location: {os.path.abspath('data')}")