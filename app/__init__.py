# __init__.py
from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-123')
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = 'data'
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
    
    # Create necessary directories first
    os.makedirs('data', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    os.makedirs('app/static/images', exist_ok=True)
    
    # Import and register blueprints AFTER creating directories
    from .routes import main
    app.register_blueprint(main)
    
    print("✅ Application initialized successfully")
    
    return app

# Remove the immediate app creation at module level
app = create_app()  