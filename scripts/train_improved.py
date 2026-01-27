import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.traffic_net import EnhancedTrafficNet

class TrafficDataset(torch.utils.data.Dataset):
    def __init__(self, features, labels):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

def create_enhanced_features(df):
    """Create more sophisticated features"""
    # Basic features
    features = df[['hour', 'day', 'weekend', 'city', 'weather']].copy()
    
    # Time-based features
    features['sin_hour'] = np.sin(2 * np.pi * df['hour'] / 24)
    features['cos_hour'] = np.cos(2 * np.pi * df['hour'] / 24)
    features['sin_day'] = np.sin(2 * np.pi * df['day'] / 7)
    features['cos_day'] = np.cos(2 * np.pi * df['day'] / 7)
    
    # Traffic patterns
    features['rush_hour'] = df['hour'].apply(
        lambda x: 1 if (7 <= x <= 9) or (16 <= x <= 19) else 0
    )
    features['night_hour'] = df['hour'].apply(lambda x: 1 if 0 <= x <= 5 else 0)
    
    # Day type features
    features['friday'] = (df['day'] == 4).astype(int)
    features['monday'] = (df['day'] == 0).astype(int)
    
    # City features (population impact)
    city_weights = {0: 1.0, 1: 0.8, 2: 0.6, 3: 0.5}
    features['city_weight'] = df['city'].map(city_weights)
    
    # Weather impact
    weather_impact = {0: 0.0, 1: 1.0, 2: 0.5}
    features['weather_impact'] = df['weather'].map(weather_impact)
    
    # Interaction features
    features['rush_city'] = features['rush_hour'] * features['city_weight']
    features['weekend_city'] = df['weekend'] * features['city_weight']
    
    return features

def train_improved_model():
    print("🚀 Training Enhanced Traffic Prediction Model...")
    
    # Load data
    data_path = os.path.join("..", "data", "traffic_dataset.csv")
    if not os.path.exists(data_path):
        print("❌ Data file not found. Run generate_realistic_data.py first.")
        return
    
    df = pd.read_csv(data_path)
    print(f"📊 Loaded dataset with {len(df)} samples")
    print(f"Traffic distribution:\n{df['traffic'].value_counts().sort_index()}")
    
    # Create enhanced features
    X = create_enhanced_features(df)
    y = df['traffic'].values
    
    print(f"📈 Feature matrix shape: {X.shape}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Normalize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Create datasets
    train_dataset = TrafficDataset(X_train_scaled, y_train)
    test_dataset = TrafficDataset(X_test_scaled, y_test)
    
    # Data loaders
    train_loader = torch.utils.data.DataLoader(
        train_dataset, batch_size=64, shuffle=True
    )
    test_loader = torch.utils.data.DataLoader(
        test_dataset, batch_size=64, shuffle=False
    )
    
    # Model
    input_size = X_train_scaled.shape[1]
    model = EnhancedTrafficNet(input_size=input_size)
    print(f"🤖 Model architecture:\n{model}")
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', factor=0.5, patience=5
    )
    
    # Training loop
    num_epochs = 100
    best_accuracy = 0
    train_losses = []
    val_accuracies = []
    
    for epoch in range(num_epochs):
        # Training
        model.train()
        train_loss = 0
        for batch_features, batch_labels in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_features)
            loss = criterion(outputs, batch_labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        
        avg_train_loss = train_loss / len(train_loader)
        train_losses.append(avg_train_loss)
        
        # Validation
        model.eval()
        correct = 0
        total = 0
        all_predictions = []
        all_labels = []
        
        with torch.no_grad():
            for batch_features, batch_labels in test_loader:
                outputs = model(batch_features)
                _, predicted = torch.max(outputs, 1)
                total += batch_labels.size(0)
                correct += (predicted == batch_labels).sum().item()
                
                all_predictions.extend(predicted.numpy())
                all_labels.extend(batch_labels.numpy())
        
        accuracy = 100 * correct / total
        val_accuracies.append(accuracy)
        
        # Learning rate scheduling
        scheduler.step(accuracy)
        
        # Save best model
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            model_path = os.path.join("..", "models", "traffic_model_enhanced.pth")
            torch.save(model.state_dict(), model_path)
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch [{epoch+1}/{num_epochs}], "
                  f"Loss: {avg_train_loss:.4f}, "
                  f"Accuracy: {accuracy:.2f}%, "
                  f"Best: {best_accuracy:.2f}%")
    
    print(f"\n✅ Training completed! Best accuracy: {best_accuracy:.2f}%")
    
    # Detailed evaluation
    print("\n📋 Classification Report:")
    print(classification_report(all_labels, all_predictions, 
                                target_names=['Low', 'Medium', 'High']))
    
    # Confusion matrix
    cm = confusion_matrix(all_labels, all_predictions)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Low', 'Medium', 'High'],
                yticklabels=['Low', 'Medium', 'High'])
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig('../models/confusion_matrix.png', dpi=100)
    print("📊 Confusion matrix saved to models/confusion_matrix.png")
    
    # Plot training history
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(train_losses, label='Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training Loss')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(val_accuracies, label='Validation Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    plt.title('Validation Accuracy')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig('../models/training_history.png', dpi=100)
    print("📈 Training history saved to models/training_history.png")
    
    # Feature importance (simple version)
    print("\n🔍 Analyzing feature importance...")
    analyze_feature_importance(model, X.columns)
    
    print("\n🎯 Model saved to: ../models/traffic_model_enhanced.pth")
    return model

def analyze_feature_importance(model, feature_names):
    """Analyze feature importance using gradient-based method"""
    model.eval()
    
    # Create a sample input
    sample_input = torch.randn(1, len(feature_names))
    sample_input.requires_grad = True
    
    # Forward pass
    output = model(sample_input)
    
    # Get gradients
    model.zero_grad()
    output.backward(torch.ones_like(output))
    
    # Calculate importance
    importance = torch.abs(sample_input.grad).detach().numpy().flatten()
    
    # Create importance dataframe
    importance_df = pd.DataFrame({
        'Feature': feature_names,
        'Importance': importance
    }).sort_values('Importance', ascending=False)
    
    print("Top 10 Most Important Features:")
    print(importance_df.head(10).to_string(index=False))
    
    # Plot feature importance
    plt.figure(figsize=(10, 6))
    top_features = importance_df.head(15)
    plt.barh(range(len(top_features)), top_features['Importance'])
    plt.yticks(range(len(top_features)), top_features['Feature'])
    plt.xlabel('Importance')
    plt.title('Feature Importance')
    plt.tight_layout()
    plt.savefig('../models/feature_importance.png', dpi=100)
    print("📊 Feature importance plot saved")

if __name__ == "__main__":
    # Create models directory
    os.makedirs("../models", exist_ok=True)
    
    # Train model
    model = train_improved_model()
    
    print("\n🚀 Model training complete!")
    print("Next steps:")
    print("1. Run the Flask app: python run.py")
    print("2. Visit http://localhost:5000")
    print("3. Test with different times and cities")