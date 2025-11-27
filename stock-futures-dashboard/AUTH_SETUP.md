# Authentication Setup Guide

## Overview
Aapke Stock Futures Dashboard mein ab complete authentication system hai with 7-day free trial feature using Supabase.

## Features ✨
- ✅ User Registration (Signup) with automatic 7-day free trial
- ✅ Login/Logout functionality
- ✅ Email verification support
- ✅ Protected dashboard - only authenticated users can access
- ✅ Trial expiry check - users ko 7 days ke baad access nahi milega
- ✅ Remaining days counter on dashboard
- ✅ Beautiful UI with proper error handling

## Setup Steps

### 1. Supabase Database Setup

Apne Supabase project mein SQL Editor open karein aur `supabase-schema.sql` file ka content run karein:

```bash
# File location: ./supabase-schema.sql
```

Yeh SQL script:
- `user_profiles` table create karega with trial_end_date
- Automatically 7 days trial set karega jab user signup karega
- Row Level Security (RLS) policies setup karega
- Auto-trigger setup karega jo new user ke signup pe profile create karega

### 2. Environment Variables

`.env.local` file already create ho gayi hai with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

Server start hone ke baad: http://localhost:3000

## User Flow

### First Time User:
1. Visit http://localhost:3000
2. Automatically redirect hoga `/login` page pe
3. Click on "Sign up for free trial" link
4. Fill the signup form:
   - Full Name
   - Email
   - Password (minimum 6 characters)
   - Confirm Password
5. Account create hone ke baad:
   - 7-day free trial automatically start hoga
   - Email verification link aayega (optional)
   - Login page pe redirect hoga

### Login:
1. Email aur password enter karein
2. Dashboard access milega with trial counter
3. Dashboard ke top pe remaining trial days dikhenge

### Trial Expiry:
- Jab 7 days complete ho jayenge
- User ko "Trial Expired" screen dikhega
- "Upgrade Now" aur "Sign Out" options honge

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── signup/
│   │   └── page.tsx          # Signup page with trial
│   ├── layout.tsx            # Root layout with AuthProvider
│   └── page.tsx              # Protected dashboard
├── components/
│   └── ui/
│       └── card.tsx          # Card component for auth pages
├── contexts/
│   └── AuthContext.tsx       # Authentication context & logic
└── lib/
    └── supabase.ts           # Supabase client configuration
```

## Important Notes

### Trial Management:
- Trial automatically 7 days set hota hai user ke signup ke time
- Trial expiry check hota hai real-time
- Expired users ko dashboard access nahi milta

### Security:
- Row Level Security (RLS) enabled hai
- Users sirf apna data access kar sakte hain
- Passwords securely hash hoke store hote hain

### Email Verification:
- Supabase automatically verification email bhejta hai
- Agar aap chahte ho ki email verification mandatory ho, to Supabase dashboard mein ja ke:
  1. Authentication → Settings
  2. "Enable email confirmations" ko ON karein

## Customization

### Change Trial Duration:
`supabase-schema.sql` mein yeh line change karein:
```sql
NOW() + INTERVAL '7 days'  -- Change '7 days' to your desired duration
```

### Styling:
Auth pages use karte hain:
- Tailwind CSS for styling
- shadcn/ui components (Button, Input, Label, Card)
- Gradient backgrounds for modern look

## Testing

1. **Create Account**: http://localhost:3000/signup
2. **Login**: http://localhost:3000/login
3. **Dashboard**: http://localhost:3000 (protected)

## Troubleshooting

### Issue: "Failed to fetch"
- Check if Supabase URL aur Anon Key correct hain
- Verify `.env.local` file exists aur properly configured hai

### Issue: "User already registered"
- Email already use ho chuka hai
- Different email use karein ya Supabase dashboard se delete karein

### Issue: Trial not working
- Verify SQL schema properly run hua hai
- Check if trigger create hua hai Supabase dashboard mein

## Next Steps

1. **Payment Integration**: Stripe ya Razorpay integrate karein for paid plans
2. **Plan Management**: Multiple subscription plans add karein
3. **Email Templates**: Custom email templates for verification
4. **Password Reset**: Forgot password functionality

## Support

Agar koi issue aaye to:
1. Supabase dashboard check karein for errors
2. Browser console check karein
3. Network tab dekhe API calls ke liye

---

**Note**: Make sure aapne Supabase dashboard mein SQL schema run kiya hai before testing!
