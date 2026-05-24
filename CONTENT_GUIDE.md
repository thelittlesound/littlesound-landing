# Little Sound — Content & Copy Management Guide

## 📝 How to Update Text Without Coding

Everything is in component files. Here's where to find what you want to change.

---

## 🔤 Common Changes & Where to Find Them

### Hero Section (`app/components/Hero.tsx`)

**What to change:**
- Main headline
- Subheadline
- Benefits list
- Tagline

**Find & replace these lines:**

```
"Less searching. More living." 
→ Change the main headline

"Stop wasting hours finding the right camps..."
→ Change the subheading

"Free to join · Early access to Seattle beta · Founding family pricing"
→ Update benefits
```

### Problem Section (`app/components/Problem.tsx`)

**Update pain points:**
- Icon (emoji)
- Title
- Description

```
{
  icon: '🔍',
  title: 'Research Overload',
  description: 'Searching across 5+ websites...',
}
```

Change any of these values. That's it!

### Solution Section (`app/components/Solution.tsx`)

**Update features:**
- Number (1, 2, 3)
- Title (Discover, Compare, Book)
- Description

Find the `features` array and edit.

### Founders Section (`app/components/Founders.tsx`)

**Update founder story:**
- Names & titles
- Origin story
- Mission statement

All the text is right there—just edit it.

### Categories (`app/components/Categories.tsx`)

**Add/remove activity categories:**

```
const categories = [
  { emoji: '⚽', name: 'Sports & Fitness', count: 'Coming Soon' },
  { emoji: '🎨', name: 'Arts & Crafts', count: 'Coming Soon' },
  // Add more here
]
```

Change emoji, name, or count.

### Call-to-Action Section (`app/components/CTA.tsx`)

**Update closing message:**
- Headline
- Description
- Stats (100+ families, Q3 2026, etc.)

### Footer (`app/components/Footer.tsx`)

**Update footer links:**
- Navigation links
- Social media links
- Legal pages

---

## 🎨 Colors (If You Ever Want to Change Them)

All colors are defined in `tailwind.config.js` in the `colors` section.

**Example:** To change teal-800 from `#0D5C6E` to a new color:
```
teal: {
  800: '#NEW-COLOR-CODE', // Change this
}
```

But honestly, your colors are perfect per the design tokens—you probably won't need this!

---

## 🖼️ Images & Placeholders

### Hero Image
**File:** `app/components/Hero.tsx`

The placeholder says "Hero Image (1920x1080)". When ready:
1. Save your image as `/public/images/hero.jpg`
2. In `Hero.tsx`, replace the placeholder with:
   ```
   <Image
     src="/images/hero.jpg"
     alt="Pacific Northwest family"
     width={1920}
     height={1080}
   />
   ```

### Family Photo (Founders Section)
**File:** `app/components/Founders.tsx`

Same process—replace placeholder with actual family photo.

### OG Image (Social Share Preview)
**File:** `app/layout.tsx`

This shows when you share the link on Twitter, Facebook, etc.
Save as `/public/og-image.png` (1200x630px).

---

## 🔧 Advanced Changes (Still No Code!)

### Change the Waitlist Form CTA Text
**File:** `app/components/WaitlistForm.tsx`

Find this line:
```
{loading ? 'Joining...' : 'Join the Waitlist'}
```

Change `'Join the Waitlist'` to whatever button text you want.

### Update Navigation Links in Footer
**File:** `app/components/Footer.tsx`

All the links are in the footer component. Change the `href="#"` to actual URLs when you have those pages built.

---

## 📤 How to Deploy Your Changes

After editing any file:

1. **Save the file**
2. **Push to GitHub:**
   ```
   git add .
   git commit -m "Update [what you changed]"
   git push
   ```
3. **Vercel auto-deploys** in ~1 minute ✓
4. **Your live site updates** automatically

That's it! No manual deployment needed.

---

## 🎯 Most Common Updates You'll Make

### Update 1: Add Real Customer Testimonials
**File:** Add a new section in `app/page.tsx`

Copy the format from `Problem` or `Solution` section to create a testimonials component.

### Update 2: Change Waitlist CTA Button Text
**File:** `app/components/WaitlistForm.tsx`

Change `'Join the Waitlist'` to `'Get Early Access'` or `'Become a Beta Family'`.

### Update 3: Add Real Founder Photos
**File:** `app/components/Founders.tsx`

Replace emoji placeholder with actual `<Image>` tag pointing to `/public/images/family.jpg`.

### Update 4: Update Pricing
**File:** `app/components/CTA.tsx`

Change `$49+` to your actual founding family price.

---

## 🆘 If You Get Stuck

**Error message on your site?**
1. Check the browser console (F12 → Console tab)
2. Copy the error
3. Google it
4. Or ask in the Vercel dashboard—they have great support

**Changed something and it broke?**
1. Undo your last change
2. Or roll back on GitHub
3. Vercel will deploy the previous working version

**Want to add something new?**
1. Look at how an existing section is built
2. Copy that structure
3. Modify the content
4. Push to GitHub

You can't break anything permanently—GitHub has version history!

---

## 🚀 You're Ready!

Your landing page is built. You just need to:
1. Deploy to Vercel (follow DEPLOYMENT_GUIDE.md)
2. Update text as needed (this guide)
3. Add images when ready
4. Share with your waitlist

Everything else works automatically.

Less searching. More living. You've got this! 💪
