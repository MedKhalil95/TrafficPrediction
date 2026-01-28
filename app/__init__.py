from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-123')
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = 'data'
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
    
    # Register blueprints
    from .routes import main
    app.register_blueprint(main)
    
    # Create necessary directories
    os.makedirs('data', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    os.makedirs('app/static/images', exist_ok=True)
    
    print("✅ Application initialized successfully")
    
    return app

# Expose an `app` WSGI callable at package level so `gunicorn app:app` works.
# This calls the factory at import time — keep this here only if you want the
# package to directly provide the WSGI app. Otherwise prefer starting Gunicorn
# with `gunicorn run:app`.
app = create_app()