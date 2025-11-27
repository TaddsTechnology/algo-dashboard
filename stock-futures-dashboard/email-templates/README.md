# Custom Email Templates Setup for Futures Watch

## Overview
Professional email templates with **Tadds Technology** branding for Supabase authentication emails.

## Files
- `supabase-verification.html` - **USE THIS** Email verification template (ready for Supabase)
- `supabase-password-reset.html` - **USE THIS** Password reset template (ready for Supabase)
- `verification-email.html` - Old template with external logo (for reference)
- `password-reset-email.html` - Old template with external logo (for reference)

## Setup Instructions

### Step 1: Logo (Already Done ✓)

Logo is currently a text placeholder "TADDS" in the email templates. This works perfectly and is visible in all email clients.

**To use actual logo image later:**
1. Deploy your app to production (Vercel/Netlify)
2. Logo will be available at: `https://your-domain.com/tadds-logo.png`
3. Replace line 20 in templates with:
   ```html
   <img src="https://your-domain.com/tadds-logo.png" alt="Tadds" style="max-width: 120px; height: auto;">
   ```

### Step 2: Configure Custom SMTP (Optional but Recommended)

For using `info@taddstechnology.com` as sender:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Project Settings** → **Auth** → **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter your SMTP details:
   - **SMTP Host**: Your email provider's SMTP server (e.g., `smtp.gmail.com`, `smtp.zoho.com`)
   - **SMTP Port**: Usually `587` for TLS or `465` for SSL
   - **SMTP User**: `info@taddstechnology.com`
   - **SMTP Password**: Your email password or app-specific password
   - **Sender Email**: `info@taddstechnology.com`
   - **Sender Name**: `Tadds Technology - Futures Watch`

#### Popular SMTP Providers:

**Gmail:**
- Host: `smtp.gmail.com`
- Port: `587`
- Enable "App Passwords" in Google Account settings

**Zoho Mail:**
- Host: `smtp.zoho.com`
- Port: `587`

**Outlook/Office 365:**
- Host: `smtp.office365.com`
- Port: `587`

### Step 3: Apply Custom Email Templates ✅

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**

2. **For Confirmation Email (Signup Verification):**
   - Click on "Confirm signup"
   - Open `supabase-verification.html` file
   - Copy **ENTIRE** content (Ctrl+A, Ctrl+C)
   - Paste into the Supabase template editor
   - Click **Save**

3. **For Password Recovery:**
   - Click on "Reset password"
   - Open `supabase-password-reset.html` file
   - Copy **ENTIRE** content (Ctrl+A, Ctrl+C)
   - Paste into the Supabase template editor
   - Click **Save**

**Important:** Don't modify anything - templates are ready to use with correct `{{ .ConfirmationURL }}` variables!

### Step 4: Test the Templates

1. Sign up with a test email
2. Check your inbox for the branded email
3. Verify the logo displays correctly
4. Test the verification link

## Template Variables

Supabase provides these variables for use in templates:

- `{{ .ConfirmationURL }}` - Verification/reset link
- `{{ .Token }}` - Raw token
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL (from Supabase settings)

## Customization

### Colors Used:
- Primary Blue: `#2563eb`
- Dark Blue: `#1d4ed8`
- Text Gray: `#4b5563`

### Fonts:
- System fonts for best compatibility
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

## Features

✅ Professional branded design
✅ Mobile responsive
✅ Company logo integration
✅ Custom sender email (`info@taddstechnology.com`)
✅ Trial features highlighted
✅ Security warnings for password reset
✅ Clean, modern UI matching your dashboard

## Support

For issues or questions:
- Email: info@taddstechnology.com
- Check Supabase Auth logs for email delivery status

## Preview

The emails include:
- 🎨 Branded header with gradient
- 📧 Company logo
- 🔘 Clear call-to-action buttons
- 📋 Trial features list
- ⚠️ Security notices
- 📱 Mobile-responsive design
