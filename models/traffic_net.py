import torch
import torch.nn as nn
import torch.nn.functional as F

class EnhancedTrafficNet(nn.Module):
    def __init__(self, input_size=15, hidden_size=128, output_size=3, dropout_rate=0.3):
        super().__init__()
        
        self.input_bn = nn.BatchNorm1d(input_size)
        
        self.network = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.BatchNorm1d(hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_size, hidden_size // 2),
            nn.BatchNorm1d(hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_size // 2, hidden_size // 4),
            nn.BatchNorm1d(hidden_size // 4),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_size // 4, output_size)
        )
        
        # Attention mechanism for time features
        self.time_attention = nn.Sequential(
            nn.Linear(2, 8),  # sin/cos features
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        # Apply input normalization
        x = self.input_bn(x)
        
        # Apply attention to time features (assuming first 4 features are time-based)
        time_features = x[:, :4] if x.shape[1] >= 4 else x
        attention_weights = self.time_attention(time_features)
        
        # Apply attention
        x = x * torch.cat([attention_weights] * (x.shape[1] // attention_weights.shape[1]), dim=1)
        
        # Pass through network
        return self.network(x)

class SpatialTemporalNet(nn.Module):
    """More advanced model for spatio-temporal traffic prediction"""
    def __init__(self, input_size=15, num_cities=4, output_size=3):
        super().__init__()
        
        # Temporal encoder for time features
        self.temporal_encoder = nn.Sequential(
            nn.Linear(4, 16),  # hour, day, sin_hour, cos_hour
            nn.ReLU(),
            nn.Linear(16, 8)
        )
        
        # Spatial encoder for city features
        self.spatial_encoder = nn.Sequential(
            nn.Embedding(num_cities, 8),  # City embeddings
            nn.Flatten()
        )
        
        # Feature encoder for other features
        self.feature_encoder = nn.Sequential(
            nn.Linear(input_size - 4 - 1, 16),  # All other features
            nn.ReLU(),
            nn.Linear(16, 8)
        )
        
        # Fusion layer
        self.fusion = nn.Sequential(
            nn.Linear(8 + 8 + 8, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, output_size)
        )
        
    def forward(self, x):
        # Split features
        temporal_features = x[:, :4]
        city_features = x[:, 4].long()  # City index
        other_features = x[:, 5:]
        
        # Encode each component
        temporal_encoded = self.temporal_encoder(temporal_features)
        spatial_encoded = self.spatial_encoder(city_features)
        feature_encoded = self.feature_encoder(other_features)
        
        # Concatenate and fuse
        combined = torch.cat([temporal_encoded, spatial_encoded, feature_encoded], dim=1)
        return self.fusion(combined)