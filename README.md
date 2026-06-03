# ✦ Daily Vision — Setup Guide

## Step 1 — Firebase Config Replace karo
`app.js` file kholo aur upar `firebaseConfig` mein apni keys daalo:

```js
const firebaseConfig = {
  apiKey:            "APNI_KEY_YAHAN",
  authDomain:        "APNA_AUTH_DOMAIN",
  projectId:         "APNA_PROJECT_ID",
  storageBucket:     "APNA_STORAGE_BUCKET",
  messagingSenderId: "APNA_SENDER_ID",
  appId:             "APNA_APP_ID"
};
```

## Step 2 — Admin Password Change karo (optional)
`app.js` mein yeh line dhundo:
```js
const ADMIN_PASSWORD = "vision@2025";
```
Apna password set karo!

## Step 3 — Firebase Storage Enable karo
Firebase Console → Storage → Get Started → Production mode → Done

## Step 4 — Deploy on Netlify (Free)
1. https://netlify.com pe jao
2. `daily-image-site` folder drag & drop karo
3. Live URL mil jaayega!

## How to Use
- Website kholo → sabko gallery dikhti hai
- ✦ button dabao → Password enter karo → Admin panel khulega
- Image + Prompt daalo → Post karo → Sabko live dikhega!

## Admin Password (default)
```
vision@2025
```
