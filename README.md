# 📚 Library Circulation & Management Hub

A modern, responsive full-stack Library Management and Circulation Web Application powered by **Flask**, **React 19**, **Recharts**, and **DataStax Astra DB**.

This platform combines book catalog inventory management, circulation loan issuance, returns handling, and Seattle Public Library circulation analytics into a single unified cloud-backed system.

---

## ✨ Features

- **📊 Circulation & Analytics Dashboard**:
  - Interactive visual charts of Seattle Public Library material types and monthly checkout trends using Recharts.
  - Ranking list of most checked-out titles.
  - Live metric counters for titles, copies available, active borrowings, and checkout volume.

- **📖 Book Catalog Management**:
  - Add new books (Title, Author, Category, Copies, ISBN) stored directly into Astra DB (`library_books`).
  - Search by keywords, title, author, or ISBN.
  - Category filters (Fiction, Sci-Fi, Computer Science, Classic Literature, etc.).
  - Real-time stock status badges (`In Stock`, `Only 1 Left`, `Out of Stock`).
  - Delete/remove books from catalog.

- **🔄 Circulation Desk (Borrow & Return)**:
  - Issue copies to library members with auto-calculated 14-day due date (`borrow_records`).
  - Automatically updates and protects available stock in real-time.
  - One-click **Return Book** action that automatically restocks available inventory.
  - Status filters (`All`, `Currently Borrowed`, `Returned`).

- **➕ Data Entry Hub**:
  - Dedicated forms to input and store new books, borrow transactions, and custom circulation analytics points.
  - One-click sample books seeder (`/api/seed`) to get started instantly.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Flask-CORS, Gunicorn, AstraPy (DataAPIClient)
- **Database**: DataStax Astra DB (NoSQL Document API)
  - `library_books`: Book inventory & stock levels
  - `borrow_records`: Circulation history and active loans
  - `checkout_analytics`: Aggregated circulation analytics
- **Frontend**: React 19, Vite, Recharts, Lucide Icons, Modern CSS

---

## 🚀 Deployment on Render

This repository is designed for **single-service deployment** on Render. The Flask backend automatically serves the pre-built React application from `frontend/dist` at the root domain `/`, while providing the JSON API at `/api/*`.

### Steps:

1. Log in to [Render](https://render.com).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository: `https://github.com/Shruti-Mandlik-07/library-circulation-api`.
4. Configure the settings:
   - **Name**: `library-circulation-api`
   - **Runtime**: `Python 3`
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Under **Environment Variables**, add:
   - `ASTRA_DB_APPLICATION_TOKEN` = `your_astra_token_here`
   - `ASTRA_DB_API_ENDPOINT` = `https://your-db-id-region.apps.astra.datastax.com`
   - `ASTRA_DB_KEYSPACE` = `default_keyspace` (optional, default: `default_keyspace`)
6. Click **Deploy Web Service**!

Once deployed, visit your Render URL in your browser to interact with the full website and input data.

---

## 💻 Local Development

### 1. Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env and enter your Astra DB token and endpoint

# Run backend
python app.py
```
Backend will start at `http://localhost:5000`.

### 2. Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```
Vite will start at `http://localhost:5173` and automatically connect to `http://localhost:5000`.

To rebuild the production bundle served by Flask:
```bash
cd frontend
npm run build
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the web application |
| `GET` | `/api/stats` | Dashboard summary metrics |
| `GET` | `/api/books` | Get all catalog books |
| `POST` | `/api/books` | Add new book to catalog |
| `DELETE`| `/api/books/<book_id>` | Remove book from catalog |
| `POST` | `/api/borrow` | Issue / borrow book to member |
| `POST` | `/api/return/<record_id>`| Return borrowed book |
| `GET` | `/api/borrow-records` | Circulation history & loans |
| `GET` | `/api/top-books` | Popular titles analytics |
| `GET` | `/api/material-types` | Material formats distribution |
| `GET` | `/api/monthly-trends` | Monthly circulation patterns |
| `POST` | `/api/analytics` | Store circulation analytics record |
| `POST` | `/api/seed` | Seed initial sample books |
