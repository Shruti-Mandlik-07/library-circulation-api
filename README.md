# 📚 Library Circulation & Analytics Hub

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://library-circulation-api.onrender.com/)
[![Database](https://img.shields.io/badge/Database-DataStax%20Astra%20DB-blueviolet?style=for-the-badge)](https://astra.datastax.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python%20Flask-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)

> 🌐 **Live Website**: [https://library-circulation-api.onrender.com/](https://library-circulation-api.onrender.com/)

---

## 🌟 Overview

A full-stack Library Management and Circulation Intelligence platform bridging **Big Data Analytics (Apache PySpark & Cassandra / Astra DB)** with an interactive **Operational Web Application (Flask & React 19)**.

- **📊 Big Data Analytics**: Visualizes historical checkout patterns from the Seattle Public Library dataset processed with Apache PySpark.
- **📚 Live Catalog Management**: Add, search, filter, and delete books in real time.
- **🔄 Circulation Desk**: Issue loans to readers, monitor 14-day due dates, and restock available inventory with 1-click returns.
- **👥 Reader Loan Analytics**: Visual charts showing *Who Issued What* (active loans vs. returned books per reader).
- **➕ Data Entry Hub**: Dedicated forms to input new titles, borrow records, or custom analytics metrics directly into Astra DB.

---

## 🛠️ Tech Stack

- **Cloud Database**: DataStax Astra DB (Serverless Apache Cassandra NoSQL)
- **Big Data Processing**: Apache PySpark
- **Backend API**: Python 3, Flask, Gunicorn, `astrapy`, Flask-CORS
- **Frontend App**: React 19, Vite, Recharts, Lucide Icons
- **Deployment**: Render (Unified Web Service)

---

## 🚀 Quick Start (Local)

### 1. Clone & Setup Backend
```bash
git clone https://github.com/Shruti-Mandlik-07/library-circulation-api.git
cd library-circulation-api

# Install dependencies
pip install -r requirements.txt

# Configure environment in .env
# ASTRA_DB_APPLICATION_TOKEN=your_token
# ASTRA_DB_API_ENDPOINT=https://your-db-region.apps.astra.datastax.com

# Run full-stack application (Flask serves the compiled React app at http://localhost:5000)
python app.py
```

### 2. Frontend Development (Optional)
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server at http://localhost:5173
npm run build    # Builds production bundle to frontend/dist/
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the web application |
| `GET` | `/api/stats` | Live summary metrics (titles, copies, active loans) |
| `GET` | `/api/books` | Fetch all catalog books |
| `POST` | `/api/books` | Add a new book to the library |
| `POST` | `/api/borrow` | Issue a book to a member |
| `POST` | `/api/return/<id>` | Return a book and restock inventory |
| `GET` | `/api/borrow-records` | Circulation history and loan statuses |
| `GET` | `/api/top-books` | Popular titles from Seattle Public Library analytics |
| `GET` | `/api/material-types` | Circulation format distribution |
| `GET` | `/api/monthly-trends` | Monthly circulation patterns over time |
| `POST` | `/api/analytics` | Input custom circulation analytics data |
| `POST` | `/api/seed` | Seed 6 sample classic books into catalog |
| `GET/POST`| `/api/data/<collection>` | Generic unrestricted collection access |

---

## 📄 License
This project is open-source under the MIT License.
