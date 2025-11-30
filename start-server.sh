#!/bin/bash

# Create a .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" > .env
  echo "REACT_APP_MISTRAL_API_KEY=YOUR_MISTRAL_API_KEY_HERE" >> .env
  echo ".env file created! Please update it with your actual API keys."
fi

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
  echo "Python 3 is not installed. Please install it to run the server."
  exit 1
fi

# Create and activate a virtual environment
echo "Setting up a Python virtual environment..."
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "Virtual environment created."
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install required Python packages in the virtual environment
echo "Installing required Python packages..."
pip install flask flask-cors requests python-dotenv

# Start the server
echo "Starting server on http://localhost:5001..."
python server.py

# Note: The virtual environment will be deactivated when the script exits