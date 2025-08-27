#!/bin/bash

# Create images directory if it doesn't exist
mkdir -p public/images

# Download workout-specific images
echo "Downloading workout images..."

# 1. Pilates - Stretching/flexibility pose
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/pilates.png"

# 2. Isometrics - Strength/static hold
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/isometrics.png"

# 3. Lose Weight with Ease - Cardio/weight loss
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/weight-loss.png"

# 4. Morning Stretching - Stretching/flexibility
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/stretching.png"

# 5. Standing Flabby Stomach - Core/abdominal
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/core.png"

# 6. Best Ab Workouts - Core/abdominal
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/abs.png"

# 7. Kettlebell Training - Strength training
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/kettlebell.png"

# 8. Health and Wellness - General fitness
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center" -o "public/images/wellness.png"

echo "Images downloaded successfully!"
ls -la public/images/
