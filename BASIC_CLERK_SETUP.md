# Basic Clerk Setup Guide

## Overview
This guide will help you set up a basic, reliable Clerk authentication configuration that avoids SSL issues and uses default settings.

## 1. Required Environment Variables

Create these environment variables in your production deployment platform (Vercel, Netlify, etc.):

```bash
# Required Clerk Environment Variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
CLERK_SECRET_KEY=sk_test_... # or sk_live_... for production
```

### How to Get These Keys:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to "API Keys" section
4. Copy the "Publishable key" and "Secret key"

## 2. Basic Configuration (Already Applied)

Your `app/layout.tsx` now has the minimal Clerk configuration:

```tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#3b82f6',
          colorText: '#1f2937',
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## 3. What We Removed
- **Custom domain**: No more `domain={process.env.NEXT_PUBLIC_CLERK_DOMAIN}`
- **SSL issues**: Uses Clerk's default secure domain (clerk.dev)
- **Complex configuration**: Simplified to essential settings only

## 4. Your Current Setup
Your app already has:
- ✅ Sign-in page: `/sign-in`
- ✅ Sign-up page: `/sign-up`
- ✅ User hooks: `useUser()` in components
- ✅ Settings integration: User profile management

## 5. Environment Variables to Set

### Development (.env.local)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

### Production
Set these same variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Railway: Variables tab

## 6. Remove These (if they exist)
Remove these environment variables that were causing issues:
```bash
# Remove these lines:
# NEXT_PUBLIC_CLERK_DOMAIN=clerk.24up.site
# CLERK_DOMAIN=clerk.24up.site
```

## 7. Testing Your Setup

1. **Local Development**:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000/sign-in` to test

2. **Production**:
   Deploy and test the sign-in flow

## 8. Common Issues & Solutions

### Issue: "Clerk publishable key not found"
**Solution**: Make sure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly

### Issue: Authentication not working
**Solution**: Verify both publishable and secret keys are from the same Clerk application

### Issue: Redirect loops
**Solution**: Check that your sign-in/sign-up routes are correctly configured

## 9. Next Steps After Basic Setup

Once basic auth is working:
1. Customize the appearance if needed
2. Add user profile features
3. Set up webhooks (if required)
4. Configure social logins (optional)

## 10. Key Benefits of This Basic Setup

- ✅ **No SSL issues**: Uses Clerk's secure default domain
- ✅ **Simple**: Minimal configuration
- ✅ **Reliable**: Uses Clerk's recommended defaults
- ✅ **Secure**: Built-in security features
- ✅ **Scalable**: Easy to extend later

This basic setup should resolve your SSL errors and provide a solid foundation for authentication.
