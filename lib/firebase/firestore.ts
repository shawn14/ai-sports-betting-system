import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { Game, GamePrediction, BettingLine } from '@/types';
import { PredictionResult } from '@/lib/models/analytics';

// Collection names
const COLLECTIONS = {
  GAMES: 'games',
  PREDICTIONS: 'predictions',
  BETTING_LINES: 'betting_lines',
  RESULTS: 'results',
  BETS: 'bets',
  TRAINING_DATA: 'training_data',
  TRAINING_DATASETS: 'training_datasets',
  ODDS_CACHE: 'odds_cache', // Cache odds data
  GAME_INTELLIGENCE_CACHE: 'game_intelligence_cache', // NEW: Cache game intelligence
  ANALYST_REPORTS: 'analyst_reports', // NEW: Weekly analyst reports
};

export class FirestoreService {
  /**
   * Save a game to Firestore
   */
  static async saveGame(game: Game): Promise<void> {
    try {
      const gameRef = doc(db, COLLECTIONS.GAMES, game.id);
      await setDoc(gameRef, {
        ...game,
        gameTime: Timestamp.fromDate(game.gameTime),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });

      console.log(`Saved game: ${game.id}`);
    } catch (error) {
      console.error('Error saving game:', error);
      throw error;
    }
  }

  /**
   * Save a prediction to Firestore
   */
  static async savePrediction(prediction: GamePrediction): Promise<void> {
    try {
      // Use gameId as document ID to prevent duplicates
      // This will UPDATE the existing prediction instead of creating a new one
      const predictionId = prediction.gameId;
      const predictionRef = doc(db, COLLECTIONS.PREDICTIONS, predictionId);

      await setDoc(predictionRef, {
        gameId: prediction.gameId,
        predictedWinner: prediction.predictedWinner,
        confidence: prediction.confidence,
        predictedScore: prediction.predictedScore,
        factors: prediction.factors,
        edgeAnalysis: prediction.edgeAnalysis,
        recommendation: prediction.recommendation,
        timestamp: Timestamp.now(),
        season: prediction.game.season,
        week: prediction.game.week,
      });

      console.log(`Saved prediction: ${predictionId}`);
    } catch (error) {
      console.error('Error saving prediction:', error);
      throw error;
    }
  }

  /**
   * Save betting lines to Firestore
   */
  static async saveBettingLines(gameId: string, lines: BettingLine[]): Promise<void> {
    try {
      for (const line of lines) {
        const lineId = `${gameId}_${line.bookmaker}_${Date.now()}`;
        const lineRef = doc(db, COLLECTIONS.BETTING_LINES, lineId);

        await setDoc(lineRef, {
          gameId,
          bookmaker: line.bookmaker,
          timestamp: Timestamp.fromDate(line.timestamp),
          spread: line.spread,
          moneyline: line.moneyline,
          total: line.total,
        });
      }

      console.log(`Saved ${lines.length} betting lines for game ${gameId}`);
    } catch (error) {
      console.error('Error saving betting lines:', error);
      throw error;
    }
  }

  /**
   * Save a prediction result (after game completes)
   */
  static async saveResult(result: PredictionResult): Promise<void> {
    try {
      const resultId = result.gameId;
      const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);

      await setDoc(resultRef, {
        gameId: result.gameId,
        actualScore: result.actualScore,
        outcomes: result.outcomes,
        profitLoss: result.profitLoss,
        prediction: {
          predictedWinner: result.prediction.predictedWinner,
          confidence: result.prediction.confidence,
          predictedScore: result.prediction.predictedScore,
          recommendation: result.prediction.recommendation,
        },
        season: result.game.season,
        week: result.game.week,
        timestamp: Timestamp.now(),
      });

      console.log(`Saved result for game: ${resultId}`);
    } catch (error) {
      console.error('Error saving result:', error);
      throw error;
    }
  }

  /**
   * Get all predictions for a specific week
   */
  static async getPredictionsByWeek(season: number, week: number): Promise<any[]> {
    try {
      // Simplified query - just filter by season and week, skip orderBy to avoid index requirement
      const q = query(
        collection(db, COLLECTIONS.PREDICTIONS),
        where('season', '==', season),
        where('week', '==', week)
      );

      const querySnapshot = await getDocs(q);
      const predictions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort in memory instead of in query
      predictions.sort((a: any, b: any) => {
        const aTime = a.timestamp?.toDate?.() || new Date(0);
        const bTime = b.timestamp?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      console.log(`Found ${predictions.length} predictions for ${season} Week ${week}`);
      return predictions;
    } catch (error) {
      console.error('Error getting predictions:', error);
      return [];
    }
  }

  /**
   * Get cached predictions with games (for fast page loading)
   * Returns the most recent prediction for each game in the current week
   */
  static async getCachedPredictions(season: number, week: number): Promise<{
    predictions: any[];
    games: any[];
    lastUpdate: Date | null;
  }> {
    try {
      // Get all predictions for the week
      const predictions = await this.getPredictionsByWeek(season, week);

      // Group by gameId and keep only the most recent
      const latestPredictions = new Map();
      for (const pred of predictions) {
        const existing = latestPredictions.get(pred.gameId);
        if (!existing || pred.timestamp.toDate() > existing.timestamp.toDate()) {
          latestPredictions.set(pred.gameId, pred);
        }
      }

      // Get games for this season/week in ONE query instead of individual requests
      const gamesQuery = query(
        collection(db, COLLECTIONS.GAMES),
        where('season', '==', season),
        where('week', '==', week)
      );
      const gamesSnapshot = await getDocs(gamesQuery);
      const validGames = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        gameTime: doc.data().gameTime.toDate(),
      }));

      // Find most recent update time
      const lastUpdate = predictions.length > 0
        ? predictions[0].timestamp.toDate()
        : null;

      return {
        predictions: Array.from(latestPredictions.values()).map(p => ({
          ...p,
          timestamp: p.timestamp.toDate()
        })),
        games: validGames,
        lastUpdate,
      };
    } catch (error) {
      console.error('Error getting cached predictions:', error);
      return {
        predictions: [],
        games: [],
        lastUpdate: null,
      };
    }
  }

  /**
   * Get latest betting lines for a game
   */
  static async getLatestBettingLines(gameId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.BETTING_LINES),
        where('gameId', '==', gameId),
        orderBy('timestamp', 'desc'),
        limit(10) // Get latest lines from different bookmakers
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
    } catch (error) {
      console.error('Error getting latest betting lines:', error);
      return [];
    }
  }

  /**
   * Get all results for backtesting
   */
  static async getAllResults(season?: number): Promise<any[]> {
    try {
      let q = query(
        collection(db, COLLECTIONS.RESULTS),
        orderBy('season', 'desc'),
        orderBy('week', 'desc')
      );

      if (season) {
        q = query(
          collection(db, COLLECTIONS.RESULTS),
          where('season', '==', season),
          orderBy('week', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting results:', error);
      return [];
    }
  }

  /**
   * Get betting line history for a game
   */
  static async getBettingLineHistory(gameId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.BETTING_LINES),
        where('gameId', '==', gameId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
    } catch (error) {
      console.error('Error getting betting line history:', error);
      return [];
    }
  }

  /**
   * Save a bet placed by user
   */
  static async saveBet(bet: {
    gameId: string;
    betType: 'spread' | 'moneyline' | 'total';
    selection: string;
    stake: number;
    odds: number;
    bookmaker: string;
  }): Promise<string> {
    try {
      const betRef = await addDoc(collection(db, COLLECTIONS.BETS), {
        ...bet,
        timestamp: Timestamp.now(),
        status: 'pending',
      });

      console.log(`Saved bet: ${betRef.id}`);
      return betRef.id;
    } catch (error) {
      console.error('Error saving bet:', error);
      throw error;
    }
  }

  /**
   * Update bet status after game completes
   */
  static async updateBetStatus(
    betId: string,
    status: 'won' | 'lost' | 'push',
    payout?: number
  ): Promise<void> {
    try {
      const betRef = doc(db, COLLECTIONS.BETS, betId);
      await updateDoc(betRef, {
        status,
        payout,
        settledAt: Timestamp.now(),
      });

      console.log(`Updated bet ${betId} to ${status}`);
    } catch (error) {
      console.error('Error updating bet:', error);
      throw error;
    }
  }

  /**
   * Get all user bets
   */
  static async getAllBets(status?: 'pending' | 'won' | 'lost' | 'push'): Promise<any[]> {
    try {
      let q = query(
        collection(db, COLLECTIONS.BETS),
        orderBy('timestamp', 'desc')
      );

      if (status) {
        q = query(
          collection(db, COLLECTIONS.BETS),
          where('status', '==', status),
          orderBy('timestamp', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
    } catch (error) {
      console.error('Error getting bets:', error);
      return [];
    }
  }

  /**
   * Get performance statistics from stored results
   */
  static async getPerformanceStats(season?: number): Promise<{
    totalGames: number;
    correctPredictions: number;
    accuracy: number;
    avgConfidence: number;
  }> {
    try {
      const results = await this.getAllResults(season);

      if (results.length === 0) {
        return {
          totalGames: 0,
          correctPredictions: 0,
          accuracy: 0,
          avgConfidence: 0,
        };
      }

      const correctPredictions = results.filter(
        r => r.outcomes?.predictedWinnerCorrect
      ).length;

      const totalConfidence = results.reduce(
        (sum, r) => sum + (r.prediction?.confidence || 0),
        0
      );

      return {
        totalGames: results.length,
        correctPredictions,
        accuracy: (correctPredictions / results.length) * 100,
        avgConfidence: totalConfidence / results.length,
      };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return {
        totalGames: 0,
        correctPredictions: 0,
        accuracy: 0,
        avgConfidence: 0,
      };
    }
  }

  /**
   * Delete old data (cleanup)
   */
  static async cleanupOldData(daysOld: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete old betting lines
      const linesQuery = query(
        collection(db, COLLECTIONS.BETTING_LINES),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(linesQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`Deleted ${snapshot.size} old betting lines`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Save training dataset metadata
   */
  static async saveTrainingDataset(metadata: {
    collectionDate: Date;
    seasons: number[];
    totalGames: number;
    features: string[];
    version: string;
  }): Promise<string> {
    try {
      const datasetId = `dataset_${metadata.seasons.join('_')}_${Date.now()}`;
      const datasetRef = doc(db, COLLECTIONS.TRAINING_DATASETS, datasetId);

      await setDoc(datasetRef, {
        ...metadata,
        collectionDate: Timestamp.fromDate(metadata.collectionDate),
        createdAt: Timestamp.now(),
      });

      console.log(`Saved training dataset: ${datasetId}`);
      return datasetId;
    } catch (error) {
      console.error('Error saving training dataset:', error);
      throw error;
    }
  }

  /**
   * Save a training data point
   */
  static async saveTrainingDataPoint(dataPoint: any): Promise<void> {
    try {
      const pointRef = doc(db, COLLECTIONS.TRAINING_DATA, dataPoint.gameId);
      await setDoc(pointRef, dataPoint);
    } catch (error) {
      console.error('Error saving training data point:', error);
      throw error;
    }
  }

  /**
   * Get all training data
   */
  static async getAllTrainingData(season?: number): Promise<any[]> {
    try {
      let q = query(
        collection(db, COLLECTIONS.TRAINING_DATA),
        orderBy('season', 'desc'),
        orderBy('week', 'desc')
      );

      if (season) {
        q = query(
          collection(db, COLLECTIONS.TRAINING_DATA),
          where('season', '==', season),
          orderBy('week', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting training data:', error);
      return [];
    }
  }

  /**
   * Get training datasets list
   */
  static async getTrainingDatasets(): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.TRAINING_DATASETS),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collectionDate: doc.data().collectionDate.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      }));
    } catch (error) {
      console.error('Error getting training datasets:', error);
      return [];
    }
  }

  /**
   * Save odds cache to Firestore
   * This allows pages to load odds from cache instead of hitting The Odds API every time
   */
  static async saveOddsCache(cacheDoc: {
    season: number;
    week: number;
    odds: any[];
    lastUpdate: Date;
    expiresAt: Date;
  }): Promise<void> {
    try {
      const cacheId = `${cacheDoc.season}_${cacheDoc.week}`;
      const cacheRef = doc(db, COLLECTIONS.ODDS_CACHE, cacheId);

      await setDoc(cacheRef, {
        season: cacheDoc.season,
        week: cacheDoc.week,
        odds: cacheDoc.odds,
        lastUpdate: Timestamp.fromDate(cacheDoc.lastUpdate),
        expiresAt: Timestamp.fromDate(cacheDoc.expiresAt),
      }, { merge: true });

      console.log(`Saved odds cache for Season ${cacheDoc.season}, Week ${cacheDoc.week}`);
    } catch (error) {
      console.error('Error saving odds cache:', error);
      throw error;
    }
  }

  /**
   * Get cached odds data
   * Returns null if cache is expired or doesn't exist
   */
  static async getCachedOdds(season: number, week: number): Promise<any[] | null> {
    try {
      const cacheId = `${season}_${week}`;
      const cacheRef = doc(db, COLLECTIONS.ODDS_CACHE, cacheId);
      const cacheDoc = await getDoc(cacheRef);

      if (!cacheDoc.exists()) {
        console.log(`No odds cache found for Season ${season}, Week ${week}`);
        return null;
      }

      const data = cacheDoc.data();
      const expiresAt = data.expiresAt.toDate();

      // Check if cache is expired
      if (new Date() > expiresAt) {
        console.log(`Odds cache expired for Season ${season}, Week ${week}`);
        return null;
      }

      console.log(`✅ Loaded cached odds for Season ${season}, Week ${week}`);
      return data.odds;
    } catch (error) {
      console.error('Error getting cached odds:', error);
      return null;
    }
  }

  /**
   * Save game intelligence to cache
   */
  static async saveGameIntelligence(gameId: string, intelligenceData: any): Promise<void> {
    try {
      const cacheRef = doc(db, COLLECTIONS.GAME_INTELLIGENCE_CACHE, gameId);
      await setDoc(cacheRef, {
        ...intelligenceData,
        generatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24 hours
      });
      console.log(`✅ Cached game intelligence for game ${gameId}`);
    } catch (error) {
      console.error('Error saving game intelligence:', error);
      throw error;
    }
  }

  /**
   * Get cached game intelligence for a specific game
   */
  static async getCachedGameIntelligence(gameId: string): Promise<any | null> {
    try {
      const cacheRef = doc(db, COLLECTIONS.GAME_INTELLIGENCE_CACHE, gameId);
      const docSnap = await getDoc(cacheRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      const expiresAt = data.expiresAt?.toDate();

      // Check if cache is expired
      if (new Date() > expiresAt) {
        console.log(`Game intelligence cache expired for ${gameId}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached game intelligence:', error);
      return null;
    }
  }

  /**
   * Get all cached game intelligence for a week
   */
  static async getGameIntelligenceForWeek(season: number, week: number): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.GAME_INTELLIGENCE_CACHE),
        where('season', '==', season),
        where('week', '==', week)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting week intelligence:', error);
      return [];
    }
  }

  /**
   * Save weekly analyst report
   */
  static async saveAnalystReport(reportId: string, reportData: any): Promise<void> {
    try {
      const reportRef = doc(db, COLLECTIONS.ANALYST_REPORTS, reportId);
      await setDoc(reportRef, {
        ...reportData,
        generatedAt: Timestamp.now()
      });
      console.log(`✅ Saved analyst report: ${reportId}`);
    } catch (error) {
      console.error('Error saving analyst report:', error);
      throw error;
    }
  }

  /**
   * Get analyst report by ID (e.g., "2025-w14")
   */
  static async getAnalystReport(reportId: string): Promise<any | null> {
    try {
      const reportRef = doc(db, COLLECTIONS.ANALYST_REPORTS, reportId);
      const docSnap = await getDoc(reportRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data();
    } catch (error) {
      console.error('Error getting analyst report:', error);
      return null;
    }
  }

  /**
   * Get all analyst reports (for historical view)
   */
  static async getAllAnalystReports(): Promise<any[]> {
    try {
      const reportsRef = collection(db, COLLECTIONS.ANALYST_REPORTS);
      const querySnapshot = await getDocs(reportsRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all analyst reports:', error);
      return [];
    }
  }
}
