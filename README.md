# Campus Market (Supabase + Vercel version)

Plain HTML/CSS/JS site. Database, photo storage, login, email confirmation and
password reset all run on **Supabase** (free). The site itself is hosted on **Vercel**.
There is no PHP any more.

## Setup (about 15 minutes)

### 1. Create the Supabase project
1. Sign up at supabase.com -> **New project** (save the database password somewhere).
2. Open **SQL Editor -> New query**, paste all of `supabase/schema.sql`, click **Run**.
   This creates the tables, security rules, the photo bucket and the 6 demo listings.
3. Open **Project Settings -> API**. Copy the **Project URL** and the **anon public** key
   into `js/config.js`. (The anon key is meant to be public; the security rules protect the data.)

### 2. Auth settings (Authentication menu)
- **Sign In / Providers -> Email**: keep **Confirm email** turned ON. This is what proves a student owns the address.
- **URL Configuration**: set **Site URL** to your Vercel address (e.g. `https://campus-market.vercel.app`)
  and add `https://campus-market.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.
- Supabase's built-in email sender is limited to a few emails per hour. For real use, add your own
  SMTP (Resend, Brevo...) under **Authentication -> SMTP Settings**.

### 3. Test locally
```bash
cd campus-marketplace
npx serve -l 3000
```
Open http://localhost:3000. (Opening the files by double-click will not work.)

### 4. Deploy to Vercel
1. Put the folder in a GitHub repository.
2. On vercel.com -> **Add New Project** -> import the repo. Framework preset: **Other**. No build command. Deploy.

## How it works
- `js/supabase-api.js` is the whole backend layer; pages call it exactly like they called the old PHP.
- Only addresses ending in `.edu`, `.edu.xx` or `.ac.xx` can sign up (checked in the browser and again in the database).
- Everything needs a login; the first page shown is the login page.
- Seller phone/email are stored privately and only revealed by "Contact Seller" while an item is available.
- Photos are shrunk in the browser (max 1280px) and stored in the `item-images` bucket.
- The `uploads/` folder only holds the demo listing photos.
