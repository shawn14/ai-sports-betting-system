#!/usr/bin/env python3
"""
Team name to abbreviation mapping for nfl_data_py integration.

Maps ESPN team names to nfl_data_py abbreviations.
Includes historical team relocations (Oakland Raiders -> Las Vegas Raiders, etc.)
"""

# ESPN full team name -> nfl_data_py abbreviation
TEAM_NAME_TO_ABBR = {
    # AFC East
    'Buffalo Bills': 'BUF',
    'Miami Dolphins': 'MIA',
    'New England Patriots': 'NE',
    'New York Jets': 'NYJ',

    # AFC North
    'Baltimore Ravens': 'BAL',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Pittsburgh Steelers': 'PIT',

    # AFC South
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Tennessee Titans': 'TEN',

    # AFC West
    'Denver Broncos': 'DEN',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Oakland Raiders': 'OAK',  # Historical (pre-2020)
    'Los Angeles Chargers': 'LAC',
    'San Diego Chargers': 'SD',  # Historical (pre-2017)

    # NFC East
    'Dallas Cowboys': 'DAL',
    'New York Giants': 'NYG',
    'Philadelphia Eagles': 'PHI',
    'Washington Commanders': 'WAS',
    'Washington Football Team': 'WAS',  # Historical (2020-2021)
    'Washington Redskins': 'WAS',  # Historical (pre-2020)

    # NFC North
    'Chicago Bears': 'CHI',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Minnesota Vikings': 'MIN',

    # NFC South
    'Atlanta Falcons': 'ATL',
    'Carolina Panthers': 'CAR',
    'New Orleans Saints': 'NO',
    'Tampa Bay Buccaneers': 'TB',

    # NFC West
    'Arizona Cardinals': 'ARI',
    'Los Angeles Rams': 'LA',
    'St. Louis Rams': 'STL',  # Historical (pre-2016)
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
}

# nfl_data_py abbreviation -> ESPN full team name (current names only)
ABBR_TO_TEAM_NAME = {
    # AFC East
    'BUF': 'Buffalo Bills',
    'MIA': 'Miami Dolphins',
    'NE': 'New England Patriots',
    'NYJ': 'New York Jets',

    # AFC North
    'BAL': 'Baltimore Ravens',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'PIT': 'Pittsburgh Steelers',

    # AFC South
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'TEN': 'Tennessee Titans',

    # AFC West
    'DEN': 'Denver Broncos',
    'KC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders',
    'LAC': 'Los Angeles Chargers',

    # NFC East
    'DAL': 'Dallas Cowboys',
    'NYG': 'New York Giants',
    'PHI': 'Philadelphia Eagles',
    'WAS': 'Washington Commanders',

    # NFC North
    'CHI': 'Chicago Bears',
    'DET': 'Detroit Lions',
    'GB': 'Green Bay Packers',
    'MIN': 'Minnesota Vikings',

    # NFC South
    'ATL': 'Atlanta Falcons',
    'CAR': 'Carolina Panthers',
    'NO': 'New Orleans Saints',
    'TB': 'Tampa Bay Buccaneers',

    # NFC West
    'ARI': 'Arizona Cardinals',
    'LA': 'Los Angeles Rams',
    'SF': 'San Francisco 49ers',
    'SEA': 'Seattle Seahawks',

    # Historical abbreviations
    'OAK': 'Oakland Raiders',
    'SD': 'San Diego Chargers',
    'STL': 'St. Louis Rams',
}


def get_abbr(team_name):
    """
    Get nfl_data_py abbreviation for ESPN team name.

    Args:
        team_name (str): ESPN full team name (e.g., "Kansas City Chiefs")

    Returns:
        str: nfl_data_py abbreviation (e.g., "KC") or None if not found
    """
    return TEAM_NAME_TO_ABBR.get(team_name)


def get_team_name(abbr):
    """
    Get ESPN team name for nfl_data_py abbreviation.

    Args:
        abbr (str): nfl_data_py abbreviation (e.g., "KC")

    Returns:
        str: ESPN full team name (e.g., "Kansas City Chiefs") or None if not found
    """
    return ABBR_TO_TEAM_NAME.get(abbr)


def validate_mappings():
    """Validate that all current teams have bidirectional mappings."""
    errors = []

    # Check that all current teams (non-historical) have reverse mappings
    current_teams = [
        'Buffalo Bills', 'Miami Dolphins', 'New England Patriots', 'New York Jets',
        'Baltimore Ravens', 'Cincinnati Bengals', 'Cleveland Browns', 'Pittsburgh Steelers',
        'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Tennessee Titans',
        'Denver Broncos', 'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers',
        'Dallas Cowboys', 'New York Giants', 'Philadelphia Eagles', 'Washington Commanders',
        'Chicago Bears', 'Detroit Lions', 'Green Bay Packers', 'Minnesota Vikings',
        'Atlanta Falcons', 'Carolina Panthers', 'New Orleans Saints', 'Tampa Bay Buccaneers',
        'Arizona Cardinals', 'Los Angeles Rams', 'San Francisco 49ers', 'Seattle Seahawks',
    ]

    for team in current_teams:
        abbr = get_abbr(team)
        if not abbr:
            errors.append(f"No abbreviation for {team}")
        elif get_team_name(abbr) != team:
            errors.append(f"Reverse mapping failed for {team} ({abbr})")

    if errors:
        raise ValueError(f"Mapping validation failed:\n" + "\n".join(errors))

    return True


if __name__ == '__main__':
    # Validate mappings
    try:
        validate_mappings()
        print("✅ All team mappings validated successfully")
        print(f"Total teams mapped: {len(TEAM_NAME_TO_ABBR)}")
        print(f"Current teams: 32")
        print(f"Historical teams: {len(TEAM_NAME_TO_ABBR) - 32}")
    except ValueError as e:
        print(f"❌ Validation failed: {e}")
