@echo off
echo 🚀 Starting Tunisian Traffic Prediction System...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

echo 📦 Installing requirements...
pip install -r requirements.txt

echo 📁 Creating directories...
if not exist "data" mkdir data
if not exist "models" mkdir models
if not exist "app\static\images" mkdir app\static\images

REM Check if data exists
if not exist "data\traffic_dataset.csv" (
    echo 📊 Generating initial data...
    python scripts\generate_realistic_data.py
)

REM Check if model exists
if not exist "models\traffic_model.pth" (
    echo 🤖 Training initial model...
    python scripts\train_improved.py
)

echo 🚀 Starting Flask application...
python run.py