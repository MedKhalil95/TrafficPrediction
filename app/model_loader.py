# app/model_loader.py - Simple version
import torch
import os

def predict(features):
    """Simple prediction function"""
    hour, day, weekend, city_id, weather = features
    
    # Simple prediction logic
    score = 0
    
    # Time impact
    if 7 <= hour <= 9:
        score += 2
    elif 16 <= hour <= 19:
        score += 2.5
    elif 12 <= hour <= 14:
        score += 1
    
    # Day impact
    if day == 4:  # Friday
        score += 1
    
    # City impact
    if city_id == 0:  # Tunis
        score += 1
    elif city_id == 1:  # Ariana
        score += 0.5
    
    # Weather impact
    if weather == 1:  # Rain
        score += 1
    
    # Determine traffic level
    if score >= 3.5:
        return 2  # High
    elif score >= 1.5:
        return 1  # Medium
    else:
        return 0  # Low