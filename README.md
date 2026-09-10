# ⚡ Smart EB Tracker

[![Stars](https://img.shields.io/github/stars/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
[![Forks](https://img.shields.io/github/forks/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
[![GitHub license](https://img.shields.io/github/license/anburocky3/udal-workout-app)](https://github.com/anburocky3/udal-workout-app)
![Anbuselvan Rocky Twitter](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fanburocky3%2Fudal-workout-app)
[![Support Server](https://img.shields.io/discord/742347296091537448.svg?label=Discord&logo=Discord&colorB=7289da)](https://discord.gg/6ktMR65YMy)

A modern, cloud-synced TNEB (Tamil Nadu Electricity Board) EB management dashboard designed to track multi-property electricity consumption, monitor billing cycles, and prevent arrears.

![Smart EB Tracker Hero](docs/screenshots/hero.png)

## ✨ Core Features

- **☁️ Cloud Synchronization:** Seamlessly stores and syncs meter connections across devices using Firebase Firestore (via Server-Side `firebase-admin`).
- **🔐 Bank-Grade Security:** Access is protected by a master PIN validated against Firestore, generating an `HttpOnly` JWT cookie (via `jose`) to prevent XSS and session hijacking.
- **⚡ TNEB Token Extractor:** Includes a custom, drag-and-drop JavaScript bookmarklet that instantly scrapes `consumerNo` and `tokenID` from the TNEB Quick Pay portal.
- **🚀 Smart Caching Engine:** Bi-monthly bills are cached locally for 12 hours with automated TTL management to prevent TNEB API rate-limiting, complete with smooth, animated Toast notifications.
- **📊 Advanced Analytics:** Visualizes consumption trends using `Recharts`, breaks down applicable government slab rates, and highlights 100-unit free subsidies.
- **🏢 Location-Based EB Management:** Groups multiple meters by sub-division/location. Features comprehensive sorting (Highest Bill, Units, Pending Dues) and live search.

---

## 📸 Screenshots

![Screenshot #1](./docs/screenshots/1.png)
![Screenshot #2](./docs/screenshots/2.png)

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

## 👨‍💻 Credits

**Designed & Developed by:** [Anbuselvan Annamalai](https://anbuselvan-annamalai.com) (Anbu)

_Built with passion to make utility management smarter and simpler for everyone._
