// Progress Tracking Service
// Handles storage and retrieval of workout progress data

const STORAGE_KEY = 'gym_feedback_workout_progress';

export class ProgressTrackingService {
  // Get all workout history
  static getAllWorkouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading workout progress:', error);
      return [];
    }
  }

  // Save a completed workout
  static saveWorkout(workoutData) {
    try {
      const workouts = this.getAllWorkouts();
      const newWorkout = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        challengeName: workoutData.challengeName,
        totalDuration: workoutData.totalDuration,
        averagePerformance: workoutData.averagePerformance,
        bestPerformance: workoutData.bestPerformance,
        worstPerformance: workoutData.worstPerformance,
        performanceHistory: workoutData.performanceHistory,
        userRating: workoutData.userRating,
        fitnessGoal: workoutData.fitnessGoal,
        focusArea: workoutData.focusArea,
        performanceLevels: workoutData.performanceLevels
      };

      workouts.push(newWorkout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
      
      return newWorkout;
    } catch (error) {
      console.error('Error saving workout progress:', error);
      return null;
    }
  }

  // Get workout history for a specific challenge
  static getChallengeHistory(challengeName) {
    const workouts = this.getAllWorkouts();
    return workouts.filter(workout => workout.challengeName === challengeName);
  }

  // Get user's best performance for a challenge
  static getBestPerformance(challengeName) {
    const challengeHistory = this.getChallengeHistory(challengeName);
    if (challengeHistory.length === 0) return null;

    return challengeHistory.reduce((best, current) => 
      current.averagePerformance > best.averagePerformance ? current : best
    );
  }

  // Get user's progress over time
  static getProgressOverTime(challengeName) {
    const challengeHistory = this.getChallengeHistory(challengeName);
    return challengeHistory
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(workout => ({
        date: workout.timestamp,
        performance: workout.averagePerformance,
        rating: workout.userRating
      }));
  }

  // Get overall statistics
  static getOverallStats() {
    const workouts = this.getAllWorkouts();
    
    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        averagePerformance: 0,
        totalTimeSpent: 0,
        challengesCompleted: 0,
        averageRating: 0
      };
    }

    const totalWorkouts = workouts.length;
    const averagePerformance = workouts.reduce((sum, w) => sum + w.averagePerformance, 0) / totalWorkouts;
    const totalTimeSpent = workouts.reduce((sum, w) => sum + w.totalDuration, 0);
    const challengesCompleted = new Set(workouts.map(w => w.challengeName)).size;
    const averageRating = workouts
      .filter(w => w.userRating > 0)
      .reduce((sum, w) => sum + w.userRating, 0) / workouts.filter(w => w.userRating > 0).length || 0;

    return {
      totalWorkouts,
      averagePerformance: Math.round(averagePerformance * 10) / 10,
      totalTimeSpent,
      challengesCompleted,
      averageRating: Math.round(averageRating * 10) / 10
    };
  }

  // Get recent workouts (last 10)
  static getRecentWorkouts(limit = 10) {
    const workouts = this.getAllWorkouts();
    return workouts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Clear all progress data (for testing/reset)
  static clearAllProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing progress:', error);
      return false;
    }
  }

  // Export progress data (for backup)
  static exportProgress() {
    const workouts = this.getAllWorkouts();
    const dataStr = JSON.stringify(workouts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `workout-progress-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  // Import progress data (for restore)
  static importProgress(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid file format'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  }
}
