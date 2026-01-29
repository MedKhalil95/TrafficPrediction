# app/data_updater.py - Auto-updates traffic data
import pandas as pd
import numpy as np
import requests
import json
import os
import time
import threading
from datetime import datetime, timedelta
from config import Config
import random

class TrafficDataUpdater:
    """Handles automatic updates of traffic data"""
    
    def __init__(self):
        self.last_update = None
        self.live_data = {}
        self.update_thread = None
        self.running = False
        
    def load_last_update_time(self):
        """Load the last update time from file"""
        try:
            if os.path.exists(Config.LAST_UPDATE_FILE):
                with open(Config.LAST_UPDATE_FILE, 'r') as f:
                    self.last_update = datetime.fromisoformat(f.read().strip())
                    print(f"📅 Last update: {self.last_update}")
            else:
                self.last_update = datetime.now() - timedelta(days=1)  # Default to yesterday
        except Exception as e:
            print(f"❌ Error loading last update time: {e}")
            self.last_update = datetime.now() - timedelta(days=1)
    
    def save_last_update_time(self):
        """Save the current update time to file"""
        try:
            with open(Config.LAST_UPDATE_FILE, 'w') as f:
                f.write(datetime.now().isoformat())
            print(f"💾 Saved update time: {datetime.now()}")
        except Exception as e:
            print(f"❌ Error saving update time: {e}")
    
    def fetch_live_traffic_data(self):
        """
        Fetch live traffic data from external API or generate simulated data
        In production, replace with real API calls
        """
        print("🔄 Fetching live traffic data...")
        
        try:
            # Simulated API response (replace with real API call)
            live_data = self.generate_simulated_live_data()
            
            # Save to file
            with open(Config.LIVE_DATA_PATH, 'w') as f:
                json.dump(live_data, f, indent=2)
            
            print(f"✅ Live data saved: {len(live_data['data'])} records")
            return live_data
            
        except Exception as e:
            print(f"❌ Error fetching live data: {e}")
            return self.generate_simulated_live_data()
    
    def generate_simulated_live_data(self):
        """Generate realistic simulated traffic data"""
        now = datetime.now()
        cities = Config.CITIES
        
        data = {
            "timestamp": now.isoformat(),
            "source": "simulated",
            "data": []
        }
        
        for city_id, city_info in cities.items():
            hour = now.hour
            day = now.weekday()
            
            # Generate realistic traffic levels based on time and city
            base_traffic = self.calculate_realistic_traffic(hour, day, city_id)
            
            # Add some randomness
            traffic_level = base_traffic + random.uniform(-0.2, 0.2)
            traffic_level = max(0, min(1, traffic_level))
            
            # Convert to categorical
            if traffic_level < Config.TRAFFIC_THRESHOLDS['low']:
                level = 0  # Low
            elif traffic_level < Config.TRAFFIC_THRESHOLDS['medium']:
                level = 1  # Medium
            else:
                level = 2  # High
            
            data["data"].append({
                "city_id": city_id,
                "city_name": city_info["name"],
                "lat": city_info["lat"],
                "lng": city_info["lng"],
                "traffic_level": level,
                "traffic_score": traffic_level,
                "speed": random.randint(20, 80),  # km/h
                "congestion": random.randint(10, 95),  # percentage
                "last_updated": now.isoformat()
            })
        
        return data
    
    def calculate_realistic_traffic(self, hour, day, city_id):
        """Calculate realistic traffic score for Tunisian cities"""
        score = 0.5  # Base score
        
        # Time of day impact
        if 7 <= hour <= 9:  # Morning rush
            score += 0.3
            if city_id in [0, 1]:  # Tunis & Ariana are busier
                score += 0.2
        
        elif 12 <= hour <= 14:  # Lunch time
            score += 0.1
        
        elif 16 <= hour <= 19:  # Evening rush
            score += 0.4
            if city_id in [0, 1]:
                score += 0.2
        
        elif 20 <= hour <= 23 or 0 <= hour <= 5:  # Night
            score -= 0.2
        
        # Day of week impact
        if day == 4:  # Friday
            if 11 <= hour <= 14:  # Prayer time
                score += 0.3
        
        if day >= 5:  # Weekend
            if 10 <= hour <= 18:
                score += 0.1
            else:
                score -= 0.1
        
        # City-specific adjustments
        city_weights = {0: 1.2, 1: 1.1, 2: 1.0, 3: 0.9}
        score *= city_weights.get(city_id, 1.0)
        
        return max(0, min(1, score))
    
    def update_dataset_with_live_data(self):
        """Update the main dataset with live data"""
        try:
            # Load current dataset
            if os.path.exists(Config.TRAFFIC_DATASET_PATH):
                df = pd.read_csv(Config.TRAFFIC_DATASET_PATH)
            else:
                # Create new dataset if doesn't exist
                from scripts.generate_realistic_data import generate_realistic_tunisian_traffic_data
                df = generate_realistic_tunisian_traffic_data(1000)
            
            # Load live data
            if os.path.exists(Config.LIVE_DATA_PATH):
                with open(Config.LIVE_DATA_PATH, 'r') as f:
                    live_data = json.load(f)
                
                # Convert live data to dataframe format
                now = datetime.now()
                new_rows = []
                
                for record in live_data['data']:
                    new_row = {
                        'hour': now.hour,
                        'day': now.weekday(),
                        'weekend': 1 if now.weekday() >= 5 else 0,
                        'city': record['city_id'],
                        'weather': random.randint(0, 2),  # Random weather
                        'traffic': record['traffic_level']
                    }
                    new_rows.append(new_row)
                
                # Add new data to dataset
                new_df = pd.DataFrame(new_rows)
                df = pd.concat([df, new_df], ignore_index=True)
                
                # Keep only recent data (last 30 days equivalent)
                df = df.tail(10000)
                
                # Save updated dataset
                df.to_csv(Config.TRAFFIC_DATASET_PATH, index=False)
                print(f"✅ Dataset updated: {len(df)} total records")
                
                # Check if model needs retraining
                self.check_model_retraining()
                
                return True
                
        except Exception as e:
            print(f"❌ Error updating dataset: {e}")
            return False
    
    def check_model_retraining(self):
        """Check if model needs retraining based on data age"""
        try:
            # Check when model was last trained
            model_time = datetime.fromtimestamp(os.path.getmtime(Config.MODEL_PATH))
            days_since_training = (datetime.now() - model_time).days
            
            if days_since_training >= 7:  # Retrain weekly
                print("🤖 Model retraining needed...")
                self.retrain_model()
                
        except FileNotFoundError:
            print("⚠️ Model file not found, training new model...")
            self.retrain_model()
        except Exception as e:
            print(f"❌ Error checking model retraining: {e}")
    
    def retrain_model(self):
        """Retrain the model with updated data"""
        try:
            print("🎯 Starting model retraining...")
            
            # Import and run training script
            import sys
            sys.path.append(os.path.dirname(Config.BASE_DIR))
            
            from scripts.train_improved import train_improved_model
            train_improved_model()
            
            print("✅ Model retraining completed")
            
        except Exception as e:
            print(f"❌ Error retraining model: {e}")
    
    def should_update(self):
        """Check if it's time to update data"""
        if not self.last_update:
            self.load_last_update_time()
        
        time_since_update = datetime.now() - self.last_update
        return time_since_update >= Config.DATA_UPDATE_INTERVAL
    
    def perform_update(self):
        """Perform a complete data update"""
        print("🚀 Starting data update cycle...")
        
        # Fetch live data
        self.fetch_live_traffic_data()
        
        # Update dataset
        self.update_dataset_with_live_data()
        
        # Save update time
        self.save_last_update_time()
        
        print("✅ Update cycle completed")
    
    def start_auto_updates(self, interval_minutes=60):
        """Start automatic updates in background thread"""
        if self.running:
            print("⚠️ Auto-updates already running")
            return
        
        self.running = True
        
        def update_loop():
            while self.running:
                try:
                    if self.should_update():
                        self.perform_update()
                    else:
                        print(f"⏳ Next update in: {self.get_time_until_next_update()}")
                    
                    # Sleep for specified interval
                    time.sleep(interval_minutes * 60)
                    
                except Exception as e:
                    print(f"❌ Error in update loop: {e}")
                    time.sleep(300)  # Wait 5 minutes on error
        
        self.update_thread = threading.Thread(target=update_loop, daemon=True)
        self.update_thread.start()
        print(f"🔄 Auto-updates started (every {interval_minutes} minutes)")
    
    def stop_auto_updates(self):
        """Stop automatic updates"""
        self.running = False
        if self.update_thread:
            self.update_thread.join(timeout=5)
        print("🛑 Auto-updates stopped")
    
    def get_time_until_next_update(self):
        """Get time until next scheduled update"""
        if not self.last_update:
            return "Now"
        
        next_update = self.last_update + Config.DATA_UPDATE_INTERVAL
        time_until = next_update - datetime.now()
        
        if time_until.total_seconds() <= 0:
            return "Now"
        
        hours = int(time_until.total_seconds() // 3600)
        minutes = int((time_until.total_seconds() % 3600) // 60)
        
        return f"{hours}h {minutes}m"
    
    def get_last_update_info(self):
        """Get information about last update"""
        self.load_last_update_time()
        
        info = {
            "last_update": self.last_update.isoformat() if self.last_update else "Never",
            "next_update": self.get_time_until_next_update(),
            "live_data_available": os.path.exists(Config.LIVE_DATA_PATH),
            "dataset_size": 0
        }
        
        if os.path.exists(Config.TRAFFIC_DATASET_PATH):
            df = pd.read_csv(Config.TRAFFIC_DATASET_PATH)
            info["dataset_size"] = len(df)
        
        return info

# Global updater instance
traffic_updater = TrafficDataUpdater()