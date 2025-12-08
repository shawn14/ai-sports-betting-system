#!/usr/bin/env python3
"""
Explore what data is available in the FREE ESPN API
that we're not currently using in our model
"""

import requests
import json

def explore_scoreboard():
    """Check what's available in ESPN scoreboard API"""
    print("=" * 70)
    print("📊 EXPLORING ESPN FREE API DATA")
    print("=" * 70)

    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

    # Try to get a recent week's data
    params = {
        'dates': '2024',
        'week': '13'
    }

    print(f"\n🔍 Fetching: {url}")
    print(f"   Params: {params}\n")

    response = requests.get(url, params=params)
    data = response.json()

    if 'events' not in data or len(data['events']) == 0:
        print("⚠️  No events found, trying current scoreboard...")
        response = requests.get(url)
        data = response.json()

    print(f"✅ Found {len(data.get('events', []))} games\n")

    # Examine first game in detail
    if data.get('events'):
        game = data['events'][0]
        competition = game['competitions'][0]

        print("=" * 70)
        print("📋 DETAILED GAME DATA STRUCTURE")
        print("=" * 70)

        # Top-level game info
        print("\n🎮 Game Level:")
        print(f"   ID: {game.get('id')}")
        print(f"   Name: {game.get('name')}")
        print(f"   Date: {game.get('date')}")
        print(f"   Season: {game.get('season', {}).get('year')}")
        print(f"   Week: {game.get('week', {}).get('number')}")

        # Competition data
        print("\n🏟️  Competition Level:")
        print(f"   Venue: {competition.get('venue', {}).get('fullName')}")
        print(f"   Attendance: {competition.get('attendance', 'N/A')}")
        print(f"   Is Conference Game: {competition.get('conferenceCompetition', False)}")

        # Check for odds
        print("\n💰 Odds Data:")
        if competition.get('odds'):
            for odd in competition['odds']:
                print(f"   Provider: {odd.get('provider', {}).get('name', 'Unknown')}")
                print(f"   Details: {odd.get('details', 'N/A')}")
                print(f"   Over/Under: {odd.get('overUnder', 'N/A')}")
                print(f"   Spread: {odd.get('spread', 'N/A')}")
        else:
            print("   ❌ No odds data available")

        # Team data
        print("\n🏈 Team Data:")
        for competitor in competition['competitors']:
            team = competitor['team']
            print(f"\n   {team['displayName']} ({competitor['homeAway'].upper()}):")
            print(f"      Team ID: {team['id']}")
            print(f"      Score: {competitor.get('score', 'N/A')}")
            print(f"      Records: {competitor.get('records', [])}")

            # Check for team statistics
            if competitor.get('statistics'):
                print(f"      📊 Statistics Available:")
                for stat in competitor['statistics'][:5]:  # Show first 5
                    print(f"         - {stat.get('name')}: {stat.get('displayValue')}")

            # Check for leaders
            if competitor.get('leaders'):
                print(f"      ⭐ Leaders Available:")
                for leader in competitor['leaders']:
                    print(f"         - {leader.get('name')}: {leader.get('displayName')}")

        # Check for game leaders
        print("\n🌟 Game Leaders:")
        if competition.get('leaders'):
            for leader_cat in competition['leaders']:
                print(f"   {leader_cat.get('displayName')}:")
                for leader in leader_cat.get('leaders', [])[:1]:  # Show top leader
                    athlete = leader.get('athlete', {})
                    print(f"      {athlete.get('displayName')}: {leader.get('displayValue')}")
        else:
            print("   ❌ No game leaders available")

        # Check for situation (game state)
        print("\n⏱️  Game Situation:")
        if competition.get('situation'):
            situation = competition['situation']
            print(f"   Down: {situation.get('down', 'N/A')}")
            print(f"   Distance: {situation.get('distance', 'N/A')}")
            print(f"   Possession: {situation.get('possession', 'N/A')}")
        else:
            print("   ℹ️  No live situation data (game not in progress)")

        # Save full structure for inspection
        print("\n" + "=" * 70)
        print("💾 Saving full game structure to espn_game_sample.json")
        print("=" * 70)

        with open('espn_game_sample.json', 'w') as f:
            json.dump(game, f, indent=2)

        print("✅ Saved! Review the file to see all available fields.\n")

def explore_team_endpoint():
    """Check what's available in team detail endpoint"""
    print("\n" + "=" * 70)
    print("🏈 EXPLORING TEAM DETAIL ENDPOINT")
    print("=" * 70)

    # Kansas City Chiefs
    team_id = "12"
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}"

    print(f"\n🔍 Fetching: {url}\n")

    response = requests.get(url)
    data = response.json()

    team = data.get('team', {})
    print(f"✅ Team: {team.get('displayName')}\n")

    print("📊 Available Data:")
    print(f"   Record: {team.get('record', {})}")
    print(f"   Standings: {team.get('standingSummary', 'N/A')}")

    # Check for statistics
    if team.get('record', {}).get('items'):
        print(f"\n   📈 Record Items Available:")
        for item in team['record']['items'][:3]:  # Show first 3
            print(f"      Type: {item.get('type', 'N/A')}")
            if item.get('stats'):
                print(f"      Stats: {len(item['stats'])} stat categories")
                for stat in item['stats'][:5]:
                    print(f"         - {stat.get('name')}: {stat.get('displayValue', stat.get('value'))}")

    # Save team structure
    with open('espn_team_sample.json', 'w') as f:
        json.dump(data, f, indent=2)

    print("\n✅ Saved team structure to espn_team_sample.json\n")

if __name__ == '__main__':
    explore_scoreboard()
    explore_team_endpoint()

    print("=" * 70)
    print("🎯 SUMMARY")
    print("=" * 70)
    print("\nReview the generated JSON files to see all available data.")
    print("We can then identify which fields to add to our training data.\n")
