export type CoachingStyle = 'chill' | 'tropa' | 'real_talk'
export type QuoteTrigger =
  | 'morning'
  | 'missed_workout'
  | 'workout_complete'
  | 'pr_hit'
  | 'late_night'
  | 'streak_7'
  | 'rest_day'
  | 'water_log'

export interface Profile {
  id: string
  coaching_style: CoachingStyle | null
  daily_calories: number
  daily_protein: number
  target_weight: number
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  workout_completed: boolean
  protein_hit: boolean
  water_hit: boolean
  sleep_hit: boolean
  discipline_score?: number
}

export interface Exercise {
  id: string
  user_id: string | null
  name: string
  muscle_group: string
}

export interface WorkoutPlan {
  id: string
  user_id: string
  name: string
  description: string | null
}

export interface Workout {
  id: string
  user_id: string
  plan_id: string | null
  started_at: string
  ended_at: string | null
  is_minimum_dose?: boolean
}

export interface ExerciseSet {
  id: string
  workout_id: string
  exercise_id: string
  weight: number
  reps: number
  is_completed: boolean
  created_at: string
}

export interface Food {
  id: string
  user_id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealLog {
  id: string
  user_id: string
  food_id: string
  consumed_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  weight: number
  logged_at: string
}

export interface MotivationQuote {
  id: number
  style: CoachingStyle
  trigger_event: QuoteTrigger
  message: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      daily_logs: {
        Row: DailyLog
        Insert: Partial<DailyLog> & { user_id: string }
        Update: Partial<DailyLog>
      }
      exercises: {
        Row: Exercise
        Insert: Partial<Exercise> & { name: string; muscle_group: string }
        Update: Partial<Exercise>
      }
      workout_plans: {
        Row: WorkoutPlan
        Insert: Partial<WorkoutPlan> & { user_id: string; name: string }
        Update: Partial<WorkoutPlan>
      }
      workouts: {
        Row: Workout
        Insert: Partial<Workout> & { user_id: string }
        Update: Partial<Workout>
      }
      exercise_sets: {
        Row: ExerciseSet
        Insert: Partial<ExerciseSet> & { workout_id: string; exercise_id: string }
        Update: Partial<ExerciseSet>
      }
      foods: {
        Row: Food
        Insert: Partial<Food> & { user_id: string; name: string; calories: number; protein: number }
        Update: Partial<Food>
      }
      meal_logs: {
        Row: MealLog
        Insert: Partial<MealLog> & { user_id: string; food_id: string }
        Update: Partial<MealLog>
      }
      weight_logs: {
        Row: WeightLog
        Insert: Partial<WeightLog> & { user_id: string; weight: number }
        Update: Partial<WeightLog>
      }
      motivation_quotes: {
        Row: MotivationQuote
        Insert: Partial<MotivationQuote> & { style: CoachingStyle; trigger_event: QuoteTrigger; message: string }
        Update: Partial<MotivationQuote>
      }
    }
  }
}
