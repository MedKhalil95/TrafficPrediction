# run.py
from app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Get host from environment or default to localhost
    host = os.environ.get('HOST', '0.0.0.0')
    
    # Run the app
    print(f"🚀 Starting Tunisian Traffic Prediction System...")
    print(f"🌐 Server running at http://{host}:{port}")
    print(f"📊 Data directory: {os.path.abspath('data')}")
    print(f"🤖 Models directory: {os.path.abspath('models')}")
    
    app.run(debug=True, host=host, port=port)