# ⚡ Smart EB Tracker

[![Stars](https://img.shields.io/github/stars/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
[![Forks](https://img.shields.io/github/forks/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
[![GitHub license](https://img.shields.io/github/license/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
![Anbuselvan Rocky Twitter](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fanburocky3%2Fudal-workout-app)
[![Support Server](https://img.shields.io/discord/742347296091537448.svg?label=Discord&logo=Discord&colorB=7289da)](https://discord.gg/6ktMR65YMy)

A modern, cloud-synced TNEB (Tamil Nadu Electricity Board) EB management dashboard designed to track multi-property electricity consumption, monitor billing cycles, and prevent arrears.

![Smart EB Tracker Hero](docs/screenshots/hero.png)

> ### 🎉 Live Preview: [https://tneb-smart.vercel.app](https://tneb-smart.vercel.app)
>
> Safe to use with your own credentials

## 👋 What is Smart EB Tracker?

Smart EB Tracker is a private dashboard for people managing electricity connections across multiple homes, shops, rental properties, or other locations. It brings TNEB bill history, payment status, consumption trends, tariff slabs, and manual meter readings into one place.

The app is designed for quick, practical decisions: see which connection has the lowest usage, identify pending dues, estimate where the current 60-day cycle is heading, and decide where heavy appliances can be used without crossing the 200-unit free slab.

## 🧭 How It Works

1. **Securely open your workspace:** Connections and readings are tied to your authenticated account.
2. **Link a TNEB meter:** Add a nickname, consumer number, location, and TNEB token ID. The optional bookmarklet can extract the consumer number and token from the TNEB portal.
3. **Review official data:** The dashboard fetches bill history, meter readings, slab rates, payment status, and connection details from TNEB.
4. **Log a manual reading:** Enter the current kWh value and reading date. The value cannot be lower than the official cycle-start reading, and future dates are rejected.
5. **Use the forecast:** Smart EB Tracker projects usage across the 60-day billing cycle, estimates the TNEB bill, shows the remaining free-unit allowance, and highlights possible load-shifting opportunities between meters at the same location.

Manual readings entered for the same consumer number and date replace the previous entry, so correcting a reading does not create duplicate records.

## 👀 What Visitors Should Know

- This is a utility-management dashboard, not an electricity payment gateway. Payments must still be completed through the official TNEB channels.
- TNEB token IDs are used to retrieve connection data and should be treated as private credentials.
- Forecasts are estimates based on the latest official cycle-start reading and your manual reading. They do not replace the official TNEB bill.
- The dashboard supports multiple properties and groups connections by location for easier comparison.

## ✨ Core Features

- **☁️ Cloud Synchronization:** Seamlessly stores and syncs meter connections across devices using Firebase Firestore (via Server-Side `firebase-admin`).
- **🔐 Bank-Grade Security:** Access is protected by a master PIN validated against Firestore, generating an `HttpOnly` JWT cookie (via `jose`) to prevent XSS and session hijacking.
- **⚡ TNEB Token Extractor:** Includes a custom, drag-and-drop JavaScript bookmarklet that instantly scrapes `consumerNo` and `tokenID` from the TNEB Quick Pay portal.
- **🚀 Smart Caching Engine:** Bi-monthly bills are cached locally for 12 hours with automated TTL management to prevent TNEB API rate-limiting, complete with smooth, animated Toast notifications.
- **📊 Advanced Analytics:** Visualizes consumption trends using `Recharts`, breaks down applicable government slab rates, and highlights 100-unit free subsidies.
- **🏢 Location-Based EB Management:** Groups multiple meters by sub-division/location. Features comprehensive sorting (Highest Bill, Units, Pending Dues) and live search.
- **🧮 Manual Reading & Forecasting:** Records one reading per meter per date, projects 60-day usage, estimates the bill with Tamil Nadu domestic slabs, and shows the daily allowance needed to stay within 200 free units.
- **🔁 Same-Location Load Shifting:** Compares projected usage across meters in the same location and suggests moving heavy loads when another meter has unused free allowance.
- **📲 Installable PWA & Alerts:** Install Minnal on a phone or desktop, register each device for push alerts, receive monthly meter-reading reminders, and get notified when a new bill is detected or marked paid.
- **🛡️ Super Admin Control Room:** A separate `/super/login` entry point lets the configured administrator review users, linked meters, manual-reading activity, and push-device registrations. Email, PIN, token, and push endpoint values are masked until explicitly revealed.

---

## 📸 Screenshots

![Screenshot #1](./docs/screenshots/1.png)
![Screenshot #2](./docs/screenshots/2.png)
![Screenshot #3](./docs/screenshots/3.png)

![Admin Panel](./docs/screenshots/admin.png)

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Database:** [Firebase Firestore](https://firebase.google.com/) (Admin SDK)
- **Authentication:** [Jose](https://github.com/panva/jose) (Edge-compatible JWTs)
- **Charts:** [Recharts](https://recharts.org/)
- **Deployment:** [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have Node.js installed. You will also need a Firebase Project with Firestore enabled.

### 2. Environment Variables

Create a `.env.local` file in the root of your project and add the following keys.

```env
# Firebase Admin Credentials
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"

# JWT Authentication
JWT_SECRET_KEY="generate_a_super_secure_random_string_here"
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/anburocky3/tneb-smart-tracker.git
cd tneb-smart-tracker
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Env configuration

Make duplicate of `env.example` to `.env` and update your data there.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Configure PWA notifications

Generate a VAPID key pair with `bunx web-push generate-vapid-keys`, then add the values to your deployment environment:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
VAPID_SUBJECT="mailto:you@example.com"
CRON_SECRET="a-long-random-secret"
```

After signing in, select **Enable alerts** on each device. Vercel runs the protected daily notification job from `vercel.json`; it sends monthly reading reminders and detects new or paid TNEB bills. The official TNEB bill remains the source of truth.

### 6. Configure the super admin

Set separate administrator credentials in the server environment. These are not regular user credentials:

```env
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PIN="use-a-long-admin-pin"
```

Open `/super/login` to access the control room. The admin session is stored in a separate HttpOnly cookie and expires after eight hours. Keep the admin PIN and `JWT_SECRET_KEY` private.

### [API Endpoint](./docs/api/meter-readings.md)

## 👨‍💻 Credits

**Designed & Developed by:** [Anbuselvan Annamalai](https://anbuselvan-annamalai.com) (Anbu)

_Built with passion to make utility management smarter and simpler for everyone._
