# ♟️ SuperSquare

**SuperSquare** is a strategic multiplayer board game inspired by *Ultimate Tic-Tac-Toe*.
It combines classic turn-based strategy with real-time multiplayer matchmaking, creating a competitive yet accessible experience.

---

## 🎯 About the Game

SuperSquare is not just about winning a board. Every move affects where your opponent can play next, forcing players to think several steps ahead.

Designed for:
- 🏆 **Competitive Strategy**
- ⚡ **Real-time Multiplayer**
- 📱 **Mobile-First Experience**

---

## 📜 Game Rules

Understanding the rules is key to mastering SuperSquare.

### 1️⃣ Board Structure
- The game uses a **Main Board** (3×3).
- Each cell of the Main Board contains a **Small Board** (also 3×3).

### 2️⃣ Move Linking (Core Mechanic)
- Your move inside a Small Board determines **where your opponent must play next**.
- **Example:** If you place your mark in the **top-right cell** of a Small Board, your opponent must play in the **top-right Small Board** of the Main Board.

### 3️⃣ Winning a Small Board
- Get **3 in a row** (horizontal, vertical, or diagonal) inside a Small Board.
- Once won, the entire Small Board is claimed by that player (X or O).

### 4️⃣ Free Move Rule
- If you are sent to a Small Board that is already **won or full**, you receive a **Free Move**.
- A Free Move allows you to play in **any valid cell on any active Small Board**.

### 5️⃣ Victory Condition
- Win **3 Small Boards in a row** on the Main Board to win the game.

---

## ✨ Features

- **🎮 Real-time Multiplayer**: Play against friends or get matched with random players instantly using robust **Socket.IO** architecture.
- **🔐 Secure Authentication**: Seamless login via **Email/Phone** or **Google OAuth** (JWT-based).
- **🤝 Friend System**: Add friends, view real-time online status, and send direct game invites.
- **📊 Stats & Leaderboard**: Track your ELO, wins, losses, and global rank.
- **💬 In-Match Messaging**: Send ephemeral messages and reactions during gameplay.
- **📱 Responsive UI**: A mobile-first interface optimized for all devices with smooth **Framer Motion** animations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Vanilla CSS
- **State/Effects**: Framer Motion
- **Communication**: Socket.IO Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Communication**: Socket.IO
- **Auth**: JWT, BCrypt, Google OAuth

---

## 📂 Project Structure

```text
SuperSquare/
├── supersquare-frontend/     # React Client
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # App pages (Home, Game, Profile)
│   │   ├── context/          # Auth & Multiplayer Contexts
│   │   ├── services/         # API & Socket services
│   │   └── engine/           # Game logic (shared rules)
│   └── public/               
├── supersquare-backend/      # Node.js Server
│   ├── src/
│   │   ├── controllers/      # Route logic
│   │   ├── models/           # Mongoose schemas
│   │   ├── engine/           # Game logic source
│   │   └── server.ts         # Entry point & Socket setup
└── dist/                     # Production build output
```

---

## 🚀 Getting Started

Follow these instructions to run the project locally.

### Prerequisites
- **Node.js** (v16+)
- **MongoDB** (Local instance or Atlas URI)

### 1. Installation

Clone the repository and install dependencies for both applications.

```bash
# Clone the repository
git clone <repository_url>
cd SuperSquare

# Install Frontend Dependencies
cd supersquare-frontend
npm install

# Install Backend Dependencies
cd ../supersquare-backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in **both** directories with the following variables.

**Frontend (`supersquare-frontend/.env`)**
```env
VITE_API_URL=http://localhost:3000
```
*(Note: If your backend runs on a different port, update this URL accordingly.)*

**Backend (`supersquare-backend/.env`)**
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/supersquare
JWT_SECRET=your_super_secret_jwt_key

# Google OAuth (Optional - for Google Login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

### 3. Running the Application

**Start the Backend Server**
```bash
cd supersquare-backend
npm run dev
# Server runs on http://localhost:3000
```

**Start the Frontend Client**
```bash
cd supersquare-frontend
npm run dev
# Client runs on http://localhost:5173
```

---

## 🌍 Deployment

### Frontend (Vercel)
1. **Import Project**: Select the `supersquare-frontend` directory.
2. **Build Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables**:
   - `VITE_API_URL`: Your Render Backend URL (e.g., `https://supersquare-server.onrender.com`)

### Backend (Render)
1. **Create Web Service**: Connect your repo and select `supersquare-backend` as the Root Directory.
2. **Build Settings**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. **Environment Variables**:
   - `PORT`: `3000`
   - `MONGO_URI`: Your MongoDB Atlas Connection String
   - `JWT_SECRET`: A strong secret key
   - `CLIENT_URL`: Your Vercel Frontend URL (e.g., `https://supersquare.vercel.app`)

### Android App (Capacitor)
1. **Build the App**:
   - Navigate to frontend: `cd supersquare-frontend`
   - Build assets: `npm run build`
   - Sync Capacitor: `npx cap sync`
   - Open Android Studio: `npx cap open android`
2. **Distribution**:
   - The app is packaged as an APK and distributed via **GitHub Releases**.
   - Users can download the latest `SuperSquare-vX.X.apk` from the Releases section.

---

## ❤️ Credits
Designed and developed by Ashutosh Pathak, B.Tech Cse(AiMl) 2025-2029 Student at KCC Institute of Technology And Management, Greater Noida

**Made with ❤️ by Ashutosh Pathak**
