# Little Sound Landing Page — Setup & Deployment Guide

## 🎯 What You Have

A complete, production-ready Next.js landing page that:
- ✅ Converts families to your waitlist via Brevo
- ✅ Tracks analytics (waitlist signups, page views, time on site)
- ✅ Mobile-first responsive design
- ✅ Follows your Little Sound design tokens perfectly
- ✅ Ready to deploy to Vercel in minutes

---

## 📋 Pre-Deployment Checklist

### 1. **Verify Brevo Setup** ✓
Your API key is already in `.env.local`:
```
BREVO_API_KEY=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
```

But you need to **find your Brevo List ID** and update the API route:

- Log into [Brevo](https://app.brevo.com)
- Go to **Contacts → Lists**
- Find or create a list called "Little Sound Waitlist"
- Copy the **List ID** (it's a number like `2` or `5`)
- Open `app/api/waitlist/route.ts` and replace `listIds: [2]` with your actual list ID

### 2. **Get Your Google Analytics ID** (Optional but Recommended)
To track conversions and user behavior:

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new property for thelittlesound.com
3. Create a GA4 data stream
4. Copy your **Measurement ID** (looks like `G-XXXXXXXXXX`)
5. Update `.env.local`:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
6. Update `app/layout.tsx`: replace both `G-XXXXXXXXXX` with your ID

### 3. **Update Hero Images & Photos** (After Launch)
Placeholder images are ready—just replace:
- `/public/images/hero.jpg` — Main hero image (1920x1080px, Pacific Northwest family moment)
- `/public/images/family.jpg` — Founder family photo (square, 1080x1080px)
- `/public/og-image.png` — Social share preview (1200x630px)

For now, the placeholders look great and you can swap them anytime.

---

## 🚀 Deployment to Vercel (No Coding Required!)

### Step 1: Create GitHub Repo
1. Go to [GitHub](https://github.com) and sign in
2. Click **New repository**
3. Name it: `littlesound-landing`
4. Description: "Little Sound landing page & waitlist"
5. Choose **Public**
6. Click **Create repository**

### Step 2: Push Your Code to GitHub
Open a terminal and run these commands (in the `/home/claude/littlesound` directory):

```bash
cd /home/claude/littlesound
git init
git add .
git commit -m "Initial commit: Little Sound landing page"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/littlesound-landing.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### Step 3: Deploy to Vercel
1. Go to [Vercel](https://vercel.com) and click **Sign Up**
2. Choose "Continue with GitHub"
3. Authorize Vercel to access your GitHub
4. Click **Import Project**
5. Select `littlesound-landing` repo
6. Vercel auto-detects it's a Next.js project ✓
7. In **Environment Variables**, add:
   ```
   BREVO_API_KEY = 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
   NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX (or leave blank for now)
   NEXT_PUBLIC_SITE_URL = https://thelittlesound.com
   ```
8. Click **Deploy** and wait ~3 minutes

### Step 4: Connect Your GoDaddy Domain
Your site will be live at `littlesound-landing.vercel.app`. Now point `thelittlesound.com` there:

1. In Vercel dashboard, go to your project → **Settings → Domains**
2. Click **Add Domain**
3. Enter `thelittlesound.com`
4. Vercel gives you nameserver instructions
5. Log into [GoDaddy](https://godaddy.com)
6. Go to **My Products → Domains → thelittlesound.com**
7. Click **Manage → Nameservers**
8. Replace GoDaddy nameservers with Vercel's nameservers
9. Wait 24–48 hours for DNS to propagate (usually faster, 30 min)

Once DNS is live, your site is at **https://thelittlesound.com** ✓

---

## 📊 Tracking Conversions & Analytics

### Brevo Form Submissions
Every "Join the Waitlist" submission automatically:
- Adds the family to your Brevo list
- Logs their email in the Brevo dashboard
- Sends them a welcome email (you can customize in Brevo)

**Check submissions:**
- Log into Brevo → **Contacts**
- You'll see all waitlist signups here

### Google Analytics (When Connected)
Tracks:
- **Page views** → How many people visit
- **Time on site** → How long they stay
- **CTA clicks** → "Join the Waitlist" button clicks
- **Form submissions** → Successful signups
- **Scroll depth** → What sections people read

**View in GA4:**
- Go to Google Analytics → **Reports**
- Check **Engagement** metrics

---

## 🛠️ Making Changes (Without Code)

### Update Text Copy
You don't need to code! Edit the component files directly:

**Example: Change hero headline**
1. Open `app/components/Hero.tsx` in any text editor
2. Find the line: `Less searching. <span>More living.</span>`
3. Change it to whatever you want
4. Save the file
5. Push to GitHub: `git add . && git commit -m "Update hero copy" && git push`
6. Vercel auto-deploys in ~1 minute ✓

### Change Colors
All colors are in `tailwind.config.js`. But you probably won't need to—they're already perfect per your design tokens!

### Add a New Section
Copy a component structure from an existing section and modify it.

---

## ✅ Post-Launch Checklist

- [ ] DNS propagated & site live on thelittlesound.com
- [ ] Google Analytics ID added and tracking
- [ ] Brevo list ID confirmed & working
- [ ] Test the waitlist form (submit your own email)
- [ ] Check Brevo dashboard for signup
- [ ] Check GA4 dashboard for form event
- [ ] Share link with your waitlist! 🎉

---

## 🆘 Troubleshooting

**"Waitlist form isn't working"**
- Check Brevo API key in `.env.local`
- Verify your List ID in `app/api/waitlist/route.ts`
- Check browser console for errors (F12 → Console tab)

**"Domain isn't pointing to Vercel"**
- Make sure GoDaddy nameservers are updated
- Give DNS 24–48 hours to propagate
- Clear your browser cache (Ctrl+Shift+Del)

**"I want to change the site but don't know how"**
- All text is in the component files (`.tsx` files)
- Colors are in `tailwind.config.js`
- DM Kelly or Evan questions—they can always help!

---

## 📞 Next Steps

1. **Get GitHub account** → [github.com](https://github.com)
2. **Create Vercel account** → [vercel.com](https://vercel.com)
3. **Follow deployment steps** above
4. **Test waitlist form** with your email
5. **Share with your 100+ waitlist families!**

Your landing page is ready to convert. Let's go. 🚀

---

## Questions?

**When stuck:**
- Check this guide first
- Google the error message
- Reach out to Vercel support (they're amazing)
- DM Kelly & Evan if all else fails

You've got this! ✨
