class KalmanFilter {
    constructor({ R = 0.01, Q = 0.1, A = 1, B = 0, C = 1 } = {}) {
      this.R = R; // Noise covariance
      this.Q = Q; // Process covariance
      this.A = A; // State vector
      this.B = B; // Control vector
      this.C = C; // Measurement vector
      this.cov = NaN;
      this.x = NaN; // Estimated signal without noise
    }
  
    filter(z, u = 0) {
      if (isNaN(this.x)) {
        this.x = (1 / this.C) * z;
        this.cov = (1 / this.C) * this.Q * (1 / this.C);
      } else {
        // Prediction
        const predX = (this.A * this.x) + (this.B * u);
        const predCov = ((this.A * this.cov) * this.A) + this.R;
  
        // Kalman Gain
        const K = predCov * this.C * (1 / ((this.C * predCov * this.C) + this.Q));
  
        // Correction
        this.x = predX + K * (z - (this.C * predX));
        this.cov = predCov - (K * this.C * predCov);
      }
      return this.x;
    }
  }
  
  export default KalmanFilter;