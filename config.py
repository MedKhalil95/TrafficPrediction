# config.py - Configuration settings
import os
from datetime import timedelta

class Config:
    # Base directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Data paths
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    MODELS_DIR = os.path.join(BASE_DIR, 'models')
    
    # File paths
    TRAFFIC_DATASET_PATH = os.path.join(DATA_DIR, 'traffic_dataset.csv')
    TIME_SERIES_PATH = os.path.join(DATA_DIR, 'traffic_time_series.csv')
    LIVE_DATA_PATH = os.path.join(DATA_DIR, 'live_traffic_data.json')
    MODEL_PATH = os.path.join(MODELS_DIR, 'traffic_model.pth')
    LAST_UPDATE_FILE = os.path.join(DATA_DIR, 'last_update.txt')
    
    # Map configuration
    MAP_CENTER = [34.0, 9.0]  # Tunisia center
    MAP_ZOOM = 7
    
    # Prediction thresholds
    TRAFFIC_THRESHOLDS = {
        'low': 0.3,
        'medium': 0.6,
        'high': 0.8
    }

    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist"""
        directories = [cls.DATA_DIR, cls.MODELS_DIR]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            print(f"✅ Directory ensured: {directory}")

# Initialize directories
Config.ensure_directories()