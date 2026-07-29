# Knowledge OS: G! Project Map

## Project Folder Structure
/src
  ├── /assets            # SVG icons, branding
  ├── /components
  │   ├── /ui            # Custom Cards, Buttons, Checkboxes, Modal, Inputs
  │   ├── /layout        # NavigationBar, TopHeader, ScreenWrapper
  │   ├── /dashboard     # DailyChecklist, DynamicQuoteCard, QuickActionGroup
  │   ├── /workout       # WorkoutPlanCard, ActiveLogger, SetRow, PRBadge
  │   ├── /meals         # MealTemplateCard, OneTapFoodButton
  │   └── /progress      # WeightChart, StreakCounter, PhotoGrid
  ├── /context           # AuthContext, PersonaContext, ActiveWorkoutContext
  ├── /hooks             # useProfile, useDailyLogs, useWorkoutSession, useFoods
  ├── /lib               # supabase.ts (Client setup), utils.ts
  ├── /pages             # Dashboard, Bakal (Workout), Lamon (Meals), Salmin (Progress), Settings
  ├── /types             # database.types.ts
  ├── App.tsx            # Main router switch
  └── main.tsx           # React entry point

## Database Reference
- Tables: profiles, daily_logs, exercises, workout_plans, workouts, exercise_sets, foods, meal_logs, weight_logs, motivation_quotes.
