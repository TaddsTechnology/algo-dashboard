-- Fix Supabase Signup Issues
-- Run this in Supabase SQL Editor

-- Step 1: Create user_profiles table if not exists
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.user_profiles;

-- Step 4: Create RLS Policies
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Enable insert for service role" 
  ON public.user_profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Step 5: Drop and recreate the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, trial_end_date, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW() + INTERVAL '7 days',
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 6: Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 7: Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- Step 9: Check if email confirmation is required
-- Run this separately to see current settings:
-- SELECT * FROM auth.config;

-- Optional: Disable email confirmation for testing (NOT RECOMMENDED FOR PRODUCTION)
-- UPDATE auth.config SET enable_signup = true;

-- Verify setup
SELECT 
  'Trigger exists: ' || CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN 'YES ✓' ELSE 'NO ✗' END as trigger_status,
  'Table exists: ' || CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN 'YES ✓' ELSE 'NO ✗' END as table_status,
  'RLS enabled: ' || CASE WHEN (
    SELECT relrowsecurity FROM pg_class 
    WHERE relname = 'user_profiles' AND relnamespace = 'public'::regnamespace
  ) THEN 'YES ✓' ELSE 'NO ✗' END as rls_status;
