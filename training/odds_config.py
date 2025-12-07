"""
Configuration for Historical Odds Enrichment
"""

# The Odds API configuration
ODDS_API_CONFIG = {
    'api_key': '6501c357d0e15af57c63948347e2ea5f',
    'base_url': 'https://api.the-odds-api.com/v4',
    'sport': 'americanfootball_nfl',
    'regions': 'us',
    'markets': 'spreads,totals',  # h2h for moneyline if needed
    'odds_format': 'american',
    'rate_limit_delay': 1.0,  # seconds between requests
}

# Bookmakers to prioritize (most reliable)
PRIORITY_BOOKMAKERS = [
    'fanduel',
    'draftkings',
    'betmgm',
    'caesars',
]

# Line selection strategy
LINE_STRATEGY = {
    'method': 'consensus_median',  # Use median to avoid outliers
    'min_bookmakers': 3,  # Minimum books required for consensus
    'fallback_book': 'fanduel',  # If <3 books available
}

# Team name normalization (handle relocations/rebranding)
TEAM_ALIAS_MAP = {
    'Washington Commanders': ['Washington', 'Washington Football Team'],
    'Las Vegas Raiders': ['Oakland Raiders'],
    'Los Angeles Rams': ['St. Louis Rams'],
    'Los Angeles Chargers': ['San Diego Chargers'],
}

# NFL week 1 start dates by season (for date calculations)
WEEK_START_DATES = {
    2025: '2025-09-04',  # 2025 NFL season starts Thursday, Sept 4
    2024: '2024-09-05',
    2023: '2023-09-07',
    2022: '2022-09-08',
    2021: '2021-09-09',
}
