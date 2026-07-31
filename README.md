# 🌾 AgriRent Hub — Agricultural Equipment Rental Platform

<div align="center">

[![🚀 Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Click%20to%20Open-brightgreen?style=for-the-badge&logo=render&logoColor=white)](https://agro-rental-platform.onrender.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://agro-rental-platform.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://agro-rental-platform.onrender.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://agro-rental-platform.onrender.com)

</div>

---

## 🌐 Live Deployed Application

> **[👉 https://agro-rental-platform.onrender.com](https://agro-rental-platform.onrender.com)**

Click the link above to open the live project instantly. No setup required.

---

## 📌 Project Overview

**AgriRent Hub** is a full-stack web platform that enables farmers to rent agricultural equipment from tool owners. It includes role-based access, AI-powered crop disease detection, real-time booking, integrated payments, and an intelligent advisory system.

### ✨ Key Features

| Feature | Description |
|---|---|
| 🚜 **Equipment Rental** | Browse, book & rent farm machinery with real-time availability |
| 🤖 **AI Disease Scanner** | Google Gemini Vision API for crop disease detection |
| 💳 **Payments** | Razorpay integration with demo mode |
| 🌤️ **Weather Advisory** | Live weather data via OpenWeather API |
| 🛒 **Agri Marketplace** | Seeds, fertilizers & products from local shopkeepers |
| 🗺️ **Maps** | Leaflet.js + OpenStreetMap for location-based search |
| 📊 **Analytics Dashboard** | Revenue, bookings & KYC management for admins |
| 🔐 **Role-Based Access** | Farmer / Tool Owner / Shopkeeper / Admin roles |

### 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 · Redux Toolkit · TailwindCSS · Recharts · Socket.io |
| **Backend** | Node.js · Express.js · MongoDB · JWT Auth · Socket.io |
| **AI / ML** | Google Gemini Vision API · Rule-based fallback · YOLO11 (optional) |
| **DevOps** | Docker · Render (deployed) · MongoDB Atlas |
| **Integrations** | Razorpay · Cloudinary · OpenWeatherMap · Leaflet.js |

---

# 🌾 AgriRent Hub — Production Setup Guide

## Quick Start (Development)

```bash
# 1. Start backend
cd server && npm install && npm run dev

# 2. Start frontend (new terminal)
cd client && npm install && npm run dev
```

> Make sure MongoDB is running locally on port 27017.

---

## Environment Configuration

### Server (`server/.env`)

Copy `server/.env` and fill in your real keys:

| Variable | Description | Required |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Random 32+ char secret | ✅ Yes |
| `REFRESH_TOKEN_SECRET` | Random 32+ char secret | ✅ Yes |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | Optional (has fallback) |
| `RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) | Optional (demo mode) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Optional (demo mode) |
| `CLOUDINARY_CLOUD_NAME` | [Cloudinary Console](https://cloudinary.com/console) | Optional (upload disabled) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Optional |
| `OPENWEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) | Optional (has fallback) |

---

## Running Without External Services

The app works fully without API keys using built-in fallbacks:

| Service | Fallback |
|---|---|
| Gemini AI | Rule-based disease diagnosis engine |
| Razorpay | Demo payment mode (simulated) |
| Cloudinary | Image uploads disabled |
| OpenWeather | Static weather data |
| ML Python Service | Gemini Vision fallback |

---

## Docker Deployment (Production)

```bash
# 1. Clone and configure
cp server/.env server/.env.production
# Edit server/.env.production with real keys

# 2. Build and start all services
docker-compose up -d --build

# 3. Check status
docker-compose ps
docker-compose logs -f server
```

### Services started by Docker:
- **MongoDB** → `localhost:27017`
- **Backend API** → `localhost:5001`
- **ML Service** → `localhost:5002`
- **Frontend (Nginx)** → `localhost:80`

---

## ML Disease Detection Service (Python)

```bash
cd server/ml_service
pip install -r requirements.txt
python disease_detector.py
# Runs on http://localhost:5002
```

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (32+ random chars)
- [ ] Change default MongoDB credentials in `docker-compose.yml`
- [ ] Set `NODE_ENV=production` in server `.env`
- [ ] Add real Cloudinary credentials for image uploads
- [ ] Add real Razorpay keys for payments
- [ ] Add Gemini API key for AI features
- [ ] Set `CLIENT_URL` to your frontend domain
- [ ] Configure HTTPS via reverse proxy (Nginx, Caddy, or Cloudflare)
- [ ] Set up MongoDB Atlas for managed cloud database
- [ ] Enable MongoDB Atlas IP allowlist

---

## Role-Based Access

| Role | Capabilities |
|---|---|
| **Farmer / Buyer** | Browse tools, book rentals, disease scanner, AI advisory, quiz, crops market |
| **Tool Owner** | List machinery, manage bookings, view revenue analytics |
| **Shopkeeper** | List seeds/fertilizers/products, manage inventory |
| **Admin** | Approve KYC, manage users, view platform analytics |

---

## Tech Stack

- **Frontend**: React 18 + Redux Toolkit + TailwindCSS + Recharts + Socket.io
- **Backend**: Node.js + Express + MongoDB + Socket.io
- **AI**: Google Gemini Vision API + rule-based fallback
- **Payments**: Razorpay (with demo mode)
- **Images**: Cloudinary
- **Maps**: Leaflet.js + OpenStreetMap
- **ML**: Python + YOLO11 (optional microservice)
