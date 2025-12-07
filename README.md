# PredictionMatrix

**AI-Powered Sports Betting Analytics**

A comprehensive AI-powered sports betting analysis system with machine learning predictions, edge detection, and performance tracking. Built with Next.js, XGBoost, and Firebase. Currently supports NFL with extensibility for other sports.

🌐 **Website:** [predictionmatrix.com](https://predictionmatrix.com)

![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Python](https://img.shields.io/badge/Python-3.9+-green)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![XGBoost](https://img.shields.io/badge/ML-XGBoost-red)

## 🎯 Features

### 📊 Data & Analytics
- **Real-time Odds Integration** - Live betting lines from The Odds API
- **Historical Data Collection** - 800+ NFL games with team stats, weather, outcomes
- **Performance Tracking** - Track predictions vs actual results
- **Firebase Storage** - Persistent storage for predictions, results, and betting lines

### 🤖 Machine Learning
- **XGBoost Models** - Trained on 832 historical games
- **Spread Prediction** - Predict game margins with 11.7 point MAE
- **Total Prediction** - Predict over/under with 12.0 point MAE
- **Feature Engineering** - 23 statistical features per game
- **Model Versioning** - Track and compare model performance

### 🎯 Edge Detection
- **ML vs Vegas Comparison** - Find profitable betting opportunities
- **Edge Calculation** - Quantify advantage in points
- **Betting Recommendations** - STRONG BET, GOOD BET, SLIGHT EDGE, NO EDGE
- **Visual Dashboard** - Sort and filter by edge magnitude

### 📈 Analysis Tools
- **Backtesting System** - Test predictions on historical games
- **Line Movement Tracking** - Detect sharp money and steam moves
- **Weather Impact Analysis** - Quantify weather effects on scoring
- **Performance Analytics** - ROI, ATS win rate, confidence calibration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Firebase account (free tier)
- The Odds API key (free tier: 500 requests/month)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/sports-betting-system.git
cd sports-betting-system

# Install dependencies
npm install

# Install Python ML dependencies
cd training
pip install -r requirements.txt
cd ..

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Configuration

Add to `.env.local`:
```bash
# The Odds API
NEXT_PUBLIC_ODDS_API_KEY=your_odds_api_key

# OpenWeather API
NEXT_PUBLIC_WEATHER_API_KEY=your_weather_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## 📚 Documentation

- **[Edge Finding System](EDGE_FINDING_SYSTEM.md)** - Complete guide to finding betting edges
- **[ML Training Guide](TRAINING_README.md)** - Train and optimize ML models
- **[Quick Start](training/QUICKSTART.md)** - Fast track to predictions

## 🏗️ Architecture

```
sports-betting-system/
├── app/                    # Next.js pages
│   ├── page.tsx           # Home - current games
│   ├── predictions/       # AI predictions
│   ├── analytics/         # Performance tracking
│   ├── dashboard/         # Line movement
│   ├── backtest/          # Historical validation
│   ├── database/          # Data management
│   ├── training/          # ML training UI
│   └── edge/              # Edge detection
│
├── lib/                   # Core libraries
│   ├── api/              # External APIs (NFL, Odds, Weather)
│   ├── models/           # Prediction algorithms
│   ├── firebase/         # Database integration
│   └── training/         # Data collection
│
├── training/             # ML training scripts
│   ├── train_model.py   # XGBoost training
│   ├── ml_predictor.py  # Prediction service
│   └── scrape_historical_spreads.py  # Data collection
│
└── types/               # TypeScript definitions
```

## 🎮 Usage

### 1. View Current Games & Predictions

```bash
# Start dev server
npm run dev

# Visit pages
http://localhost:3000              # Current week games
http://localhost:3000/predictions  # AI predictions
http://localhost:3000/edge         # Edge detection
```

### 2. Train ML Models

```bash
# Collect historical data
http://localhost:3000/training
# Click "Export to JSON"

# Train models
cd training
python train_model.py ../nfl_training_data_*.json

# View results
# - spread_model_*.pkl (trained model)
# - ATS accuracy, ROI metrics
# - Feature importance charts
```

### 3. Find Betting Edges

```bash
# Method 1: Web dashboard
http://localhost:3000/edge

# Method 2: Python CLI
cd training
python ml_predictor.py --test

# Look for:
# - STRONG BET (4+ point edge)
# - GOOD BET (2.5-4 point edge)
```

### 4. Backtest Performance

```bash
# Visit backtest page
http://localhost:3000/backtest

# Select season and weeks
# Run backtest
# Review ATS accuracy and ROI
```

## 📊 Performance Metrics

### Current ML Model (832 games trained)
- **Spread MAE**: 11.68 points
- **Total MAE**: 11.97 points
- **Training**: 665 games
- **Testing**: 167 games

### Target Metrics
- **ATS Win Rate**: 54-56% (profitable)
- **ROI**: 5-10%
- **Sharpe Ratio**: 1.0+

### Why These Matter
- **52.4% ATS** = Breakeven (covers -110 vig)
- **54% ATS** = ~$1,900 profit per season ($100/game)
- **55% ATS** = ~$3,400 profit per season (12.5% ROI)

## 🔬 Machine Learning

### Features Used (23 total)
- Team win percentage
- Points per game (PPG)
- Points allowed per game (PAG)
- Yards per game
- Turnover differential
- Divisional/Conference matchups
- Weather (temperature, wind, precipitation)
- Dome vs outdoor stadium

### Models
- **XGBoost Regressor** for spread prediction
- **XGBoost Regressor** for total prediction
- Separate models for different targets
- Temporal train/test split (past → future)

### Training
```bash
cd training

# Basic training
python train_model.py data.json

# With historical spreads (better ATS accuracy)
python scrape_historical_spreads.py 2024 1 14
python train_model.py data_with_spreads.json
```

## 🎯 Betting Strategy

### Recommended Approach
1. **Check Edge Dashboard** before games
2. **Only bet STRONG BET and GOOD BET** recommendations
3. **Bet 1-2% of bankroll** per game
4. **Track all bets** for performance analysis
5. **Shop for best lines** across sportsbooks

### Bankroll Management
- **Conservative**: 1-2% per bet, STRONG/GOOD only
- **Moderate**: 2-3% on STRONG, 1-2% on GOOD
- **Aggressive**: 3-5% (higher risk, requires discipline)

### Line Shopping
- 0.5 point difference = 2-3% ROI improvement over season
- Use The Odds API to compare multiple sportsbooks
- Be patient - lines move throughout the week

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide Icons** - UI icons

### Backend
- **Firebase Firestore** - NoSQL database
- **The Odds API** - Betting lines
- **ESPN API** - Game data
- **OpenWeather API** - Weather data

### Machine Learning
- **Python 3.9+**
- **XGBoost** - Gradient boosting
- **scikit-learn** - ML utilities
- **pandas** - Data manipulation
- **joblib** - Model persistence

## 📖 API Keys

### The Odds API
- Free tier: 500 requests/month
- Get key: https://the-odds-api.com
- Provides: Spreads, moneylines, totals

### OpenWeather API  
- Free tier: 1000 requests/day
- Get key: https://openweathermap.org/api
- Provides: Temperature, wind, precipitation

### ESPN API
- Public API (no key required)
- Provides: Scores, schedules, team stats

## 🔄 Extending to Other Sports

The system is designed to be sport-agnostic:

### To Add New Sport:

1. **API Integration** (`lib/api/`)
   - Create new sport API service
   - Follow same interface pattern

2. **Data Models** (`types/index.ts`)
   - Extend or create sport-specific types
   - Maintain common interfaces

3. **Prediction Logic** (`lib/models/`)
   - Sport-specific statistical models
   - Or use generic ML approach

4. **Training Data** (`training/`)
   - Collect historical games
   - Extract sport-specific features
   - Train models

### Supported Sports (Planned)
- ✅ **NFL** - Fully implemented
- 🔄 **NBA** - Coming soon
- 🔄 **MLB** - Coming soon
- 🔄 **NHL** - Coming soon
- 🔄 **Soccer** - Coming soon

## 📝 License

MIT License - see LICENSE file

## ⚠️ Disclaimer

This system is for educational and research purposes only. Sports betting involves risk. Past performance does not guarantee future results. Always gamble responsibly and within your means. The creators of this software are not responsible for any financial losses incurred through its use.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🙏 Acknowledgments

- The Odds API for betting data
- ESPN for game data
- OpenWeather for weather data
- XGBoost team for ML framework

---

**Built with ❤️ for sports betting enthusiasts and data scientists**
