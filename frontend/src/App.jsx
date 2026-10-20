import { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  LibraryBig,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  BookMarked,
  Users,
  Calendar,
  BookmarkPlus,
  BarChart3,
  Database,
  Layers,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./App.css";

// Automatically use local Flask backend in dev (5173 -> 5000) or relative path when built/deployed on Render
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" && window.location.port === "5173"
    ? "http://localhost:5000"
    : "");

const CATEGORIES = [
  "Classic Literature",
  "Fiction",
  "Sci-Fi & Fantasy",
  "Computer Science",
  "Science & Nature",
  "Self-Help",
  "History & Politics",
  "Mystery & Thriller",
  "Audiobook",
  "Comics & Manga",
  "Philosophy",
  "General",
  "Custom / Other"
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'catalog' | 'circulation' | 'entry'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Data states
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [trends, setTrends] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [circulationFilter, setCirculationFilter] = useState("all");

  // Form states
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    category: "Fiction",
    quantity: 1,
    isbn: "",
  });

  const [borrowForm, setBorrowForm] = useState({
    book_id: "",
    borrower: "",
  });

  const [analyticsForm, setAnalyticsForm] = useState({
    analysis_type: "top_books",
    title: "",
    materialtype: "BOOK",
    checkoutyear: new Date().getFullYear(),
    checkoutmonth: new Date().getMonth() + 1,
    total_checkouts: 150,
  });

  // Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  // Notification helper
  const notify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Fetch all data
  async function loadAllData() {
    setLoading(true);
    try {
      const [
        statsRes,
        booksRes,
        topRes,
        matRes,
        trendRes,
        borrowRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/stats`).catch(() => null),
        fetch(`${API_BASE}/api/books`).catch(() => null),
        fetch(`${API_BASE}/api/top-books`).catch(() => null),
        fetch(`${API_BASE}/api/material-types`).catch(() => null),
        fetch(`${API_BASE}/api/monthly-trends`).catch(() => null),
        fetch(`${API_BASE}/api/borrow-records`).catch(() => null),
      ]);

      if (statsRes && statsRes.ok) setStats(await statsRes.json());
      if (booksRes && booksRes.ok) setBooks(await booksRes.json());
      if (topRes && topRes.ok) setTopBooks(await topRes.json());
      if (matRes && matRes.ok) setMaterials(await matRes.json());
      if (trendRes && trendRes.ok) setTrends(await trendRes.json());
      if (borrowRes && borrowRes.ok) setBorrowRecords(await borrowRes.json());
    } catch (err) {
      console.error("Failed to load library data:", err);
      notify("Failed to connect to library database. Check your internet connection.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Handler: Add Book
  async function handleAddBook(e) {
    e.preventDefault();
    if (!newBook.title.trim()) {
      notify("Please provide a book title", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBook),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add book");

      notify(`📖 Book "${newBook.title}" successfully added!`);
      setNewBook({
        title: "",
        author: "",
        category: "Fiction",
        quantity: 1,
        isbn: "",
      });
      setIsBookModalOpen(false);
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Handler: Delete Book
  async function handleDeleteBook(bookId, bookTitle) {
    if (!window.confirm(`Are you sure you want to remove "${bookTitle}" from the library?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/books/${bookId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete book");
      notify(`Book "${bookTitle}" removed.`);
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  // Handler: Borrow Book
  async function handleBorrowBook(e) {
    e.preventDefault();
    if (!borrowForm.book_id) {
      notify("Please select a book to borrow", "error");
      return;
    }
    if (!borrowForm.borrower.trim()) {
      notify("Please enter borrower name or library card ID", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/borrow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrowForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue book");

      notify(`🎉 Book successfully issued to ${borrowForm.borrower}!`);
      setBorrowForm({ book_id: "", borrower: "" });
      setIsBorrowModalOpen(false);
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Handler: Return Book
  async function handleReturnBook(recordId, bookTitle) {
    try {
      const res = await fetch(`${API_BASE}/api/return/${recordId}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to return book");

      notify(`✅ "${bookTitle}" marked as returned. Inventory updated!`);
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  // Handler: Add Analytics Record
  async function handleAddAnalytics(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record analytics");

      notify("📊 Circulation analytics record saved to Astra DB!");
      setAnalyticsForm((curr) => ({
        ...curr,
        title: "",
        total_checkouts: 100,
      }));
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Handler: Seed Sample Books
  async function handleSeedBooks() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed sample books");
      notify(`🌱 ${data.message}`);
      loadAllData();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchSearch =
        searchQuery === "" ||
        book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === "all" || book.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [books, searchQuery, selectedCategory]);

  // Filtered circulation records
  const filteredBorrowRecords = useMemo(() => {
    return borrowRecords.filter((rec) => {
      if (circulationFilter === "borrowed") return rec.status === "Borrowed";
      if (circulationFilter === "returned") return rec.status === "Returned";
      return true;
    });
  }, [borrowRecords, circulationFilter]);

  // Chart data
  const materialChartData = useMemo(() => {
    return materials
      .map((item) => ({
        name: item.materialtype ?? "Unknown",
        checkouts: Number(item.total_checkouts) || 0,
      }))
      .sort((a, b) => b.checkouts - a.checkouts)
      .slice(0, 8);
  }, [materials]);

  const trendChartData = useMemo(() => {
    return trends
      .map((item) => ({
        name: `${item.checkoutyear}-${String(item.checkoutmonth).padStart(2, "0")}`,
        checkouts: Number(item.total_checkouts) || 0,
        year: item.checkoutyear,
        month: item.checkoutmonth,
      }))
      .sort(
        (a, b) =>
          Number(a.year) - Number(b.year) ||
          Number(a.month) - Number(b.month)
      );
  }, [trends]);

  return (
    <div className="app">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{notification.message}</span>
          <button
            className="toast-close"
            onClick={() => setNotification(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="navbar">
        <div className="brand" onClick={() => setActiveTab("dashboard")}>
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <div>
            <span>
              little<span className="brand-accent">Library</span>
            </span>
            <span className="brand-sub">Circulation & Cloud DB</span>
          </div>
        </div>

        <div className="nav-links">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart3 size={16} /> Overview & Analytics
          </button>
          <button
            className={`nav-btn ${activeTab === "catalog" ? "active" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <BookMarked size={16} /> Book Catalog ({books.length})
          </button>
          <button
            className={`nav-btn ${activeTab === "circulation" ? "active" : ""}`}
            onClick={() => setActiveTab("circulation")}
          >
            <Users size={16} /> Circulation Desk
          </button>
          <button
            className={`nav-btn ${activeTab === "entry" ? "active" : ""}`}
            onClick={() => setActiveTab("entry")}
          >
            <BookmarkPlus size={16} /> Input & Store Data
          </button>
        </div>

        <div className="nav-actions">
          <button
            className="refresh-btn"
            onClick={loadAllData}
            disabled={loading}
            title="Refresh database records"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            {loading ? "Syncing..." : "Refresh"}
          </button>
          <button
            className="action-btn primary"
            onClick={() => setIsBookModalOpen(true)}
          >
            <Plus size={16} /> Add Book
          </button>
        </div>
      </nav>

      <main className="container">
        {/* Hero Banner */}
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} /> Real-time Cloud Database Powered by Astra DB
            </span>

            <h1>
              Every book has a journey.
              <br />
              <span>Track, manage, and discover.</span>
            </h1>

            <p>
              Complete circulation desk & analytics suite. Input new books, issue loans,
              record returns, and explore Seattle Public Library checkouts with live cloud persistence.
            </p>

            <div className="hero-cta-group">
              <button
                className="hero-link"
                onClick={() => setActiveTab("entry")}
              >
                + Input New Data <ArrowUpRight size={18} />
              </button>
              <button
                className="hero-link-secondary"
                onClick={() => setActiveTab("circulation")}
              >
                Issue / Return Books
              </button>
            </div>
          </div>

          <div className="hero-art">
            <div className="sun"></div>
            <div className="art-label">DATABASE • LIVE • CLOUD</div>

            <div className="book-stack">
              <div className="book book-one">
                classic<br />catalog
              </div>
              <div className="book book-two">
                borrow<br />records
              </div>
              <div className="book book-three">
                checkout<br />trends
              </div>
            </div>

            <span className="sparkle sparkle-one">✳</span>
            <span className="sparkle sparkle-two">✦</span>
            <span className="art-caption">Stored securely in Astra DB ✷</span>
          </div>
        </section>

        {/* Dynamic Metric Cards */}
        <section className="stats-grid">
          <article
            className="stat-card pink cursor-pointer"
            onClick={() => setActiveTab("catalog")}
          >
            <div className="stat-top">
              <span>Book Titles</span>
              <BookOpen size={21} />
            </div>
            <strong>{loading ? "—" : books.length}</strong>
            <p>Total titles in library catalog</p>
          </article>

          <article
            className="stat-card yellow cursor-pointer"
            onClick={() => setActiveTab("catalog")}
          >
            <div className="stat-top">
              <span>Copies Available</span>
              <LibraryBig size={21} />
            </div>
            <strong>
              {loading
                ? "—"
                : stats?.available_copies ??
                  books.reduce((acc, b) => acc + (Number(b.available_quantity) || 0), 0)}
            </strong>
            <p>Ready to borrow on shelves</p>
          </article>

          <article
            className="stat-card purple cursor-pointer"
            onClick={() => setActiveTab("circulation")}
          >
            <div className="stat-top">
              <span>Active Borrowings</span>
              <Users size={21} />
            </div>
            <strong>
              {loading
                ? "—"
                : stats?.active_borrows ??
                  borrowRecords.filter((r) => r.status === "Borrowed").length}
            </strong>
            <p>Books currently issued to readers</p>
          </article>

          <article
            className="stat-card green cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="stat-top">
              <span>Analytics Dataset</span>
              <ChartNoAxesCombined size={21} />
            </div>
            <strong>
              {loading
                ? "—"
                : (stats?.analytics_total_checkouts || 168209).toLocaleString()}
            </strong>
            <p>Seattle circulation checkouts</p>
          </article>
        </section>

        {/* ===================== TAB 1: OVERVIEW & ANALYTICS ===================== */}
        {activeTab === "dashboard" && (
          <div className="tab-pane">
            <section className="data-section" id="top-books">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">POPULAR READING</span>
                  <h2>Most Checked-Out Titles in Library Circulation</h2>
                </div>
                <button
                  className="tab-action-pill"
                  onClick={() => setActiveTab("entry")}
                >
                  <Plus size={14} /> Add Analytics Entry
                </button>
              </div>

              {loading ? (
                <p className="message">Gathering records from Astra DB...</p>
              ) : topBooks.length === 0 ? (
                <div className="empty-state-box">
                  <p>No top checkout records found in Astra DB.</p>
                </div>
              ) : (
                <div className="data-card">
                  {topBooks
                    .slice()
                    .sort(
                      (a, b) =>
                        (Number(b.total_checkouts) || 0) -
                        (Number(a.total_checkouts) || 0)
                    )
                    .map((book, index) => (
                      <div className="book-row" key={`${book.title}-${index}`}>
                        <span className="rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="book-info-col">
                          <span className="book-name" title={book.title}>
                            {book.title || "Untitled"}
                          </span>
                        </div>
                        <span className="book-value">
                          {(Number(book.total_checkouts) || 0).toLocaleString()} checkouts
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="bottom-grid">
              {/* Materials Chart */}
              <article className="data-panel" id="materials">
                <span className="eyebrow">CIRCULATION FORMATS</span>
                <h2>What's on the Shelves?</h2>

                {loading ? (
                  <p className="message">Loading formats...</p>
                ) : materials.length === 0 ? (
                  <p className="message">No material records returned yet.</p>
                ) : (
                  <>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={materialChartData}
                          layout="vertical"
                          margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={95}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="checkouts"
                            name="Total checkouts"
                            fill="#bb91d1"
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="material-list">
                      {materials.map((item, index) => (
                        <div
                          className="material-row"
                          key={`${item.materialtype}-${index}`}
                        >
                          <span className={`material-dot dot-${index % 5}`}></span>
                          <span className="material-name">
                            {item.materialtype || "Other"}
                          </span>
                          <strong>
                            {(Number(item.total_checkouts) || 0).toLocaleString()}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>

              {/* Monthly Trends Chart */}
              <article className="data-panel trend-panel" id="trends">
                <span className="eyebrow">CIRCULATION OVER TIME</span>
                <h2>Monthly Checkout Trends</h2>
                <p className="sample-note">
                  Monthly circulation records aggregated and stored in Astra DB.
                </p>

                {loading ? (
                  <p className="message">Loading monthly trends...</p>
                ) : trends.length === 0 ? (
                  <p className="message">No monthly records returned yet.</p>
                ) : (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={trendChartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 35 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="checkouts"
                          name="Total checkouts"
                          fill="#e9a2b5"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>
            </section>
          </div>
        )}

        {/* ===================== TAB 2: BOOK INVENTORY CATALOG ===================== */}
        {activeTab === "catalog" && (
          <div className="tab-pane">
            <div className="pane-header">
              <div>
                <span className="eyebrow">LIBRARY INVENTORY</span>
                <h2>Books Catalog & Stock Management</h2>
                <p>Add new books, monitor real-time stock levels, and issue copies to readers.</p>
              </div>

              <div className="pane-header-actions">
                <button
                  className="action-btn secondary"
                  onClick={handleSeedBooks}
                  disabled={submitting}
                >
                  <Database size={15} /> Seed Sample Books
                </button>
                <button
                  className="action-btn primary"
                  onClick={() => setIsBookModalOpen(true)}
                >
                  <Plus size={16} /> Add New Book
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="filters-bar">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="category-select-wrapper">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories ({books.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Books Display */}
            {loading ? (
              <p className="message">Loading catalog books...</p>
            ) : filteredBooks.length === 0 ? (
              <div className="empty-catalog-card">
                <BookOpen size={45} className="empty-icon" />
                <h3>No books match your criteria</h3>
                <p>
                  {books.length === 0
                    ? "Your catalog is currently empty! Click below to add your first book or seed classic sample titles."
                    : "Try searching with a different keyword or category filter."}
                </p>
                <div className="empty-actions">
                  <button
                    className="action-btn primary"
                    onClick={() => setIsBookModalOpen(true)}
                  >
                    <Plus size={15} /> Add Book Now
                  </button>
                  {books.length === 0 && (
                    <button
                      className="action-btn secondary"
                      onClick={handleSeedBooks}
                    >
                      <Sparkles size={15} /> Seed 6 Sample Books
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="books-grid">
                {filteredBooks.map((book) => {
                  const available = Number(book.available_quantity) || 0;
                  const total = Number(book.total_quantity) || 1;
                  const isOutOfStock = available < 1;

                  return (
                    <article className="catalog-card" key={book.book_id}>
                      <div className="catalog-card-header">
                        <span className="catalog-category-tag">
                          {book.category || "General"}
                        </span>
                        <button
                          className="delete-book-btn"
                          title="Remove book from catalog"
                          onClick={() =>
                            handleDeleteBook(book.book_id, book.title)
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <h3 className="catalog-book-title" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="catalog-book-author">by {book.author || "Unknown"}</p>

                      {book.isbn && (
                        <span className="catalog-book-isbn">
                          ISBN: {book.isbn}
                        </span>
                      )}

                      <div className="catalog-stock-row">
                        <div className="stock-info">
                          <span className="stock-label">Availability</span>
                          <div className="stock-counts">
                            <strong>{available}</strong> / {total} copies
                          </div>
                        </div>

                        <span
                          className={`stock-badge ${
                            isOutOfStock
                              ? "out"
                              : available === 1
                              ? "low"
                              : "in"
                          }`}
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : available === 1
                            ? "Only 1 Left"
                            : "In Stock"}
                        </span>
                      </div>

                      <div className="catalog-card-actions">
                        <button
                          className="issue-btn"
                          disabled={isOutOfStock}
                          onClick={() => {
                            setBorrowForm((curr) => ({
                              ...curr,
                              book_id: book.book_id,
                            }));
                            setIsBorrowModalOpen(true);
                          }}
                        >
                          <BookMarked size={15} />
                          {isOutOfStock ? "Unavailable" : "Borrow Book"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: CIRCULATION & BORROW DESK ===================== */}
        {activeTab === "circulation" && (
          <div className="tab-pane">
            <div className="pane-header">
              <div>
                <span className="eyebrow">CIRCULATION DESK</span>
                <h2>Active Loans & Borrowing History</h2>
                <p>Issue books to members, track loan due dates, and mark returns instantly.</p>
              </div>

              <button
                className="action-btn primary"
                onClick={() => setIsBorrowModalOpen(true)}
              >
                <BookMarked size={16} /> Issue Book to Reader
              </button>
            </div>

            {/* Quick Filter */}
            <div className="circulation-filter-tabs">
              <button
                className={`filter-tab ${
                  circulationFilter === "all" ? "active" : ""
                }`}
                onClick={() => setCirculationFilter("all")}
              >
                All Records ({borrowRecords.length})
              </button>
              <button
                className={`filter-tab ${
                  circulationFilter === "borrowed" ? "active" : ""
                }`}
                onClick={() => setCirculationFilter("borrowed")}
              >
                Currently Borrowed (
                {borrowRecords.filter((r) => r.status === "Borrowed").length})
              </button>
              <button
                className={`filter-tab ${
                  circulationFilter === "returned" ? "active" : ""
                }`}
                onClick={() => setCirculationFilter("returned")}
              >
                Returned (
                {borrowRecords.filter((r) => r.status === "Returned").length})
              </button>
            </div>

            {/* Circulation Table */}
            {loading ? (
              <p className="message">Loading circulation history...</p>
            ) : filteredBorrowRecords.length === 0 ? (
              <div className="empty-catalog-card">
                <Users size={45} className="empty-icon" />
                <h3>No circulation records found</h3>
                <p>No books are currently under this filter. Issue a book to begin tracking circulation!</p>
                <button
                  className="action-btn primary"
                  onClick={() => setIsBorrowModalOpen(true)}
                >
                  <Plus size={15} /> Issue a Book
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="circulation-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Borrower / Member</th>
                      <th>Borrow Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBorrowRecords.map((record) => {
                      const isBorrowed = record.status === "Borrowed";
                      return (
                        <tr key={record.record_id}>
                          <td>
                            <strong className="table-title">
                              {record.title || "Unknown Book"}
                            </strong>
                            <div className="table-sub">{record.author}</div>
                          </td>
                          <td>
                            <span className="borrower-badge">
                              <Users size={12} /> {record.borrower || "Reader"}
                            </span>
                          </td>
                          <td>{record.borrow_date || "—"}</td>
                          <td>{record.due_date || "14 days"}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                isBorrowed ? "borrowed" : "returned"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td>
                            {isBorrowed ? (
                              <button
                                className="return-action-btn"
                                onClick={() =>
                                  handleReturnBook(
                                    record.record_id,
                                    record.title
                                  )
                                }
                              >
                                Return Book
                              </button>
                            ) : (
                              <span className="returned-date-label">
                                Returned {record.return_date || ""}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 4: INPUT & STORE DATA HUB ===================== */}
        {activeTab === "entry" && (
          <div className="tab-pane">
            <div className="pane-header">
              <div>
                <span className="eyebrow">DATA ENTRY HUB</span>
                <h2>Input & Store Data Directly into Astra DB</h2>
                <p>Enter new books, record circulation transactions, or add circulation analytics data.</p>
              </div>
            </div>

            <div className="entry-grid">
              {/* Form 1: Add Book to Catalog */}
              <div className="entry-card">
                <div className="entry-card-header">
                  <span className="entry-icon book-entry-icon">
                    <BookOpen size={20} />
                  </span>
                  <div>
                    <h3>Add Book to Inventory</h3>
                    <p>Stores into <code>library_books</code> collection</p>
                  </div>
                </div>

                <form onSubmit={handleAddBook} className="entry-form">
                  <div className="form-group">
                    <label>Book Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Design Patterns"
                      value={newBook.title}
                      onChange={(e) =>
                        setNewBook({ ...newBook, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Author</label>
                    <input
                      type="text"
                      placeholder="e.g. Erich Gamma, Richard Helm"
                      value={newBook.author}
                      onChange={(e) =>
                        setNewBook({ ...newBook, author: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={newBook.category}
                        onChange={(e) =>
                          setNewBook({ ...newBook, category: e.target.value })
                        }
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Quantity / Copies *</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={newBook.quantity}
                        onChange={(e) =>
                          setNewBook({
                            ...newBook,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>ISBN / Call Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 978-0201633610"
                      value={newBook.isbn}
                      onChange={(e) =>
                        setNewBook({ ...newBook, isbn: e.target.value })
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    className="form-submit-btn"
                    disabled={submitting}
                  >
                    <Plus size={16} />
                    {submitting ? "Saving to Astra DB..." : "Store Book in Catalog"}
                  </button>
                </form>
              </div>

              {/* Form 2: Issue / Borrow a Book */}
              <div className="entry-card">
                <div className="entry-card-header">
                  <span className="entry-icon borrow-entry-icon">
                    <Users size={20} />
                  </span>
                  <div>
                    <h3>Record Book Borrowing</h3>
                    <p>Stores into <code>borrow_records</code> & updates stock</p>
                  </div>
                </div>

                <form onSubmit={handleBorrowBook} className="entry-form">
                  <div className="form-group">
                    <label>Select Book *</label>
                    <select
                      value={borrowForm.book_id}
                      onChange={(e) =>
                        setBorrowForm({ ...borrowForm, book_id: e.target.value })
                      }
                      required
                    >
                      <option value="">-- Choose a title to borrow --</option>
                      {books.map((b) => {
                        const avail = Number(b.available_quantity) || 0;
                        return (
                          <option
                            key={b.book_id}
                            value={b.book_id}
                            disabled={avail < 1}
                          >
                            {b.title} ({avail} available)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Borrower Name / Card ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. Shruti Mandlik / CARD-1042"
                      value={borrowForm.borrower}
                      onChange={(e) =>
                        setBorrowForm({ ...borrowForm, borrower: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Loan Duration</label>
                    <div className="input-static-badge">
                      <Calendar size={14} /> 14 Days (Standard Loan)
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="form-submit-btn secondary-btn"
                    disabled={submitting}
                  >
                    <BookMarked size={16} />
                    {submitting ? "Recording loan..." : "Issue & Store Borrow Record"}
                  </button>
                </form>
              </div>

              {/* Form 3: Input Analytics Record */}
              <div className="entry-card full-width">
                <div className="entry-card-header">
                  <span className="entry-icon analytics-entry-icon">
                    <ChartNoAxesCombined size={20} />
                  </span>
                  <div>
                    <h3>Input Circulation Analytics Data</h3>
                    <p>Stores into <code>checkout_analytics</code> to update dashboard charts</p>
                  </div>
                </div>

                <form onSubmit={handleAddAnalytics} className="entry-form horizontal-form">
                  <div className="form-group">
                    <label>Analysis Category</label>
                    <select
                      value={analyticsForm.analysis_type}
                      onChange={(e) =>
                        setAnalyticsForm({
                          ...analyticsForm,
                          analysis_type: e.target.value,
                        })
                      }
                    >
                      <option value="top_books">Top Checked-Out Title</option>
                      <option value="material_type">Material Type / Format</option>
                      <option value="monthly_trend">Monthly Circulation Trend</option>
                      <option value="custom_metric">Custom Metric / Category</option>
                    </select>
                  </div>

                  {analyticsForm.analysis_type === "custom_metric" && (
                    <div className="form-group flex-2">
                      <label>Metric Name / Label *</label>
                      <input
                        type="text"
                        placeholder="e.g. Digital Audio Downloads, Study Room Bookings"
                        value={analyticsForm.title || ""}
                        onChange={(e) =>
                          setAnalyticsForm({
                            ...analyticsForm,
                            title: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  )}

                  {analyticsForm.analysis_type === "top_books" && (
                    <div className="form-group flex-2">
                      <label>Book Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. The Lord of the Rings"
                        value={analyticsForm.title}
                        onChange={(e) =>
                          setAnalyticsForm({
                            ...analyticsForm,
                            title: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  )}

                  {analyticsForm.analysis_type === "material_type" && (
                    <div className="form-group flex-2">
                      <label>Material Type Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. AUDIOBOOK, GRAPHIC_NOVEL, EBOOK"
                        value={analyticsForm.materialtype}
                        onChange={(e) =>
                          setAnalyticsForm({
                            ...analyticsForm,
                            materialtype: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  )}

                  {analyticsForm.analysis_type === "monthly_trend" && (
                    <>
                      <div className="form-group">
                        <label>Year</label>
                        <input
                          type="number"
                          value={analyticsForm.checkoutyear}
                          onChange={(e) =>
                            setAnalyticsForm({
                              ...analyticsForm,
                              checkoutyear: parseInt(e.target.value) || 2024,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Month (1-12)</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={analyticsForm.checkoutmonth}
                          onChange={(e) =>
                            setAnalyticsForm({
                              ...analyticsForm,
                              checkoutmonth: parseInt(e.target.value) || 1,
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>Total Checkouts *</label>
                    <input
                      type="number"
                      min="1"
                      value={analyticsForm.total_checkouts}
                      onChange={(e) =>
                        setAnalyticsForm({
                          ...analyticsForm,
                          total_checkouts: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="form-submit-btn pill-btn"
                    disabled={submitting}
                  >
                    <Plus size={16} /> Store Analytics
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Book */}
        {isBookModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsBookModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Book to Library</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setIsBookModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddBook} className="modal-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="Book Title"
                    value={newBook.title}
                    onChange={(e) =>
                      setNewBook({ ...newBook, title: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Author</label>
                  <input
                    type="text"
                    placeholder="Author name"
                    value={newBook.author}
                    onChange={(e) =>
                      setNewBook({ ...newBook, author: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newBook.category}
                      onChange={(e) =>
                        setNewBook({ ...newBook, category: e.target.value })
                      }
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Copies</label>
                    <input
                      type="number"
                      min="1"
                      value={newBook.quantity}
                      onChange={(e) =>
                        setNewBook({
                          ...newBook,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>ISBN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 978-0141439518"
                    value={newBook.isbn}
                    onChange={(e) =>
                      setNewBook({ ...newBook, isbn: e.target.value })
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="action-btn secondary"
                    onClick={() => setIsBookModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-btn primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save Book"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue / Borrow Book */}
        {isBorrowModalOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setIsBorrowModalOpen(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Issue Book to Member</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setIsBorrowModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBorrowBook} className="modal-form">
                <div className="form-group">
                  <label>Select Book *</label>
                  <select
                    value={borrowForm.book_id}
                    onChange={(e) =>
                      setBorrowForm({ ...borrowForm, book_id: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Choose a title --</option>
                    {books.map((b) => {
                      const avail = Number(b.available_quantity) || 0;
                      return (
                        <option
                          key={b.book_id}
                          value={b.book_id}
                          disabled={avail < 1}
                        >
                          {b.title} ({avail} copies available)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Borrower Name / Library Card *</label>
                  <input
                    type="text"
                    placeholder="Reader Name or Member ID"
                    value={borrowForm.borrower}
                    onChange={(e) =>
                      setBorrowForm({ ...borrowForm, borrower: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="action-btn secondary"
                    onClick={() => setIsBorrowModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-btn primary"
                    disabled={submitting}
                  >
                    {submitting ? "Issuing..." : "Confirm & Issue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer>
          <div className="footer-left">
            <span>Made with curiosity & love for books ✿</span>
            <span>Connected to DataStax Astra DB · Seattle Public Library Circulation</span>
          </div>
          <div className="footer-right">
            <span>Ready for Render deployment · Python Flask & React</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
