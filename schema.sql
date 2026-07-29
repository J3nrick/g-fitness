-- G! Fitness Schema
-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  coaching_style TEXT CHECK (coaching_style IS NULL OR coaching_style IN ('chill', 'tropa', 'real_talk')),
  daily_calories INT DEFAULT 2200,
  daily_protein INT DEFAULT 170,
  target_weight NUMERIC DEFAULT 70.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Daily Tracking Checklist
CREATE TABLE public.daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  workout_completed BOOLEAN DEFAULT FALSE,
  protein_hit BOOLEAN DEFAULT FALSE,
  water_hit BOOLEAN DEFAULT FALSE,
  sleep_hit BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, log_date)
);

-- 3. Exercise Library
CREATE TABLE public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL
);

-- 4. Workout Plans
CREATE TABLE public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- 5. Active Workouts
CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 6. Exercise Sets
CREATE TABLE public.exercise_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC DEFAULT 0,
  reps INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Foods List
CREATE TABLE public.foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories INT NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0
);

-- 8. Meal Logs
CREATE TABLE public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  food_id UUID REFERENCES public.foods(id) ON DELETE CASCADE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 9. Weight Logs
CREATE TABLE public.weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Motivation Quotes Library
CREATE TABLE public.motivation_quotes (
  id SERIAL PRIMARY KEY,
  style TEXT CHECK (style IN ('chill', 'tropa', 'real_talk')),
  trigger_event TEXT CHECK (trigger_event IN ('morning', 'missed_workout', 'workout_complete', 'pr_hit')),
  message TEXT NOT NULL
);

-- Seed Motivation Quotes
INSERT INTO public.motivation_quotes (style, trigger_event, message) VALUES
('chill', 'morning', 'Good morning. Let us build consistency today.'),
('chill', 'workout_complete', 'Great session. Progress takes time.'),
('chill', 'missed_workout', 'Rest is okay, but make sure to show up tomorrow.'),
('tropa', 'morning', 'Uy gising na! Tara, baka kalawangin ka na naman.'),
('tropa', 'workout_complete', 'Solid! Isa na namang araw na pinili mong umusad.'),
('tropa', 'missed_workout', 'Hoy! Bakit walang buhat kahapon? Bawi ka ngayon.'),
('real_talk', 'morning', 'Gago, bangon! Hindi gagalaw ang timbang mo sa pag-escroll.'),
('real_talk', 'workout_complete', 'Tangina, lakas! Ganyan dapat, huwag kang tatamad-tamad.'),
('real_talk', 'missed_workout', 'Wala kang galaw kahapon. Ang hina. Babawi ka ba o magpapatatas na lang?');

-- RLS Policies Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivation_quotes ENABLE ROW LEVEL SECURITY;

-- Standard User Policies
CREATE POLICY "Users access own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users access own daily_logs" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own exercises" ON public.exercises FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users access own workout_plans" ON public.workout_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own exercise_sets" ON public.exercise_sets FOR ALL USING (
  workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
);
CREATE POLICY "Users access own foods" ON public.foods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own meal_logs" ON public.meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own weight_logs" ON public.weight_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone read quotes" ON public.motivation_quotes FOR SELECT USING (true);

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
