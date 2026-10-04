# IIPS Campus Market 🎓

A small website where students can **buy, sell and rent** books, notes, electronics and stationery inside their campus.

I made this as a student project using plain HTML, CSS and JavaScript. Supabase handles the database and login, and Vercel hosts the site.

## What it can do

- Sign up and log in (only with a college email like `.edu` or `.ac.in`)
- Browse items, search them, filter by category and price
- Sell or rent your own items with a photo
- Save items to a wishlist
- Chat with the seller
- Mark an item as sold or rented
- Works on phone and PC
- Shows a welcome image for a few seconds when the site opens

## Folders

```
index.html     -> welcome image, then goes to the site
pages/         -> all the pages (login, home, item, chat...)
css/           -> style.css (all the design)
js/            -> all the JavaScript
images/        -> welcome image
supabase/      -> schema.sql (database setup)
uploads/       -> photos for the demo items
```

## How to run it

**1. Supabase setup**

1. Make a free account on [supabase.com](https://supabase.com) and create a new project.
2. Go to **SQL Editor**, paste everything from `supabase/schema.sql` and press **Run**.
3. Go to **Project Settings -> API** and copy your **Project URL** and **anon key** into `js/config.js`.

**2. Login settings** (Supabase -> Authentication)

- Keep **Confirm email** turned ON.
- In **URL Configuration**, put your website link as the Site URL.

**3. Run on your computer**

```
npx serve -l 3000
```

Then open http://localhost:3000 (double-clicking the HTML files won't work).

**4. Put it online**
Upload the folder to GitHub, then import it on [vercel.com](https://vercel.com). Choose **Other** as the framework and click Deploy.

## Things you may want to change

| What                             | Where                                      |
| -------------------------------- | ------------------------------------------ |
| How long the welcome image shows | `index.html` (`--splash-ms` and `SHOW_MS`) |
| Welcome image                    | replace `images/campus-market-splash.webp` |
| Categories (books, notes...)     | `js/common.js`                             |
| Colors and fonts                 | top of `css/style.css`                     |

## Note

Only the **anon** key goes in `js/config.js`. Never put your Supabase **service role** key in this project.

Made by a student, for students ✌️
