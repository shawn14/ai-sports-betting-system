#!/bin/bash

# Quick training script for NFL betting model

echo "🏈 NFL Betting Model Training"
echo "=============================="
echo ""

# Check if JSON file exists in current directory
JSON_FILE=$(ls nfl_training_data_*.json 2>/dev/null | head -1)

if [ -z "$JSON_FILE" ]; then
    echo "❌ No training data found!"
    echo ""
    echo "Please:"
    echo "1. Go to http://localhost:3001/training"
    echo "2. Click 'Export to JSON'"
    echo "3. Move the downloaded file to this directory"
    echo ""
    exit 1
fi

echo "✅ Found training data: $JSON_FILE"
echo ""

# Check if dependencies are installed
if ! python3 -c "import xgboost" &> /dev/null; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements.txt
    echo ""
fi

echo "🚀 Starting model training..."
echo ""

# Run training
python3 train_model.py "$JSON_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Training complete!"
    echo ""
    echo "📊 Check the results above for:"
    echo "   - ATS Win Rate (target: 54%+)"
    echo "   - ROI (target: 5-10%)"
    echo "   - Feature importance charts (*.png files)"
    echo ""
    echo "📁 Models saved to:"
    ls -1t spread_model_*.pkl 2>/dev/null | head -1
    ls -1t total_model_*.pkl 2>/dev/null | head -1
else
    echo ""
    echo "❌ Training failed. Check the errors above."
fi
