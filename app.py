import os
import uuid
from datetime import date, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from astrapy import DataAPIClient

# Load environment variables from .env if present
load_dotenv()

# Setup Flask with static folder pointing to frontend/dist if built
current_dir = os.path.dirname(os.path.abspath(__file__))
dist_folder = os.path.join(current_dir, "frontend", "dist")

if os.path.isdir(dist_folder):
    app = Flask(__name__, static_folder=dist_folder, static_url_path="")
else:
    app = Flask(__name__)

# Enable full, unrestricted CORS for everything (all routes, all origins, all methods, all headers)
CORS(
    app,
    resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        "allow_headers": "*"
    }},
    supports_credentials=False
)

@app.before_request
def handle_preflight():
    """Immediately respond to preflight OPTIONS requests from any origin."""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

@app.after_request
def add_cors_headers(response):
    """Ensure every outgoing response has full permissive CORS headers attached."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response

KEYSPACE = os.environ.get("ASTRA_DB_KEYSPACE", "default_keyspace")


# ---------------- DATABASE CONNECTION ----------------

def get_database():
    token = os.environ.get("ASTRA_DB_APPLICATION_TOKEN")
    endpoint = os.environ.get("ASTRA_DB_API_ENDPOINT")

    if not token or not endpoint:
        raise RuntimeError(
            "Astra DB credentials missing! Please configure ASTRA_DB_APPLICATION_TOKEN "
            "and ASTRA_DB_API_ENDPOINT in your environment or .env file."
        )

    client = DataAPIClient(token)
    return client.get_database(endpoint, keyspace=KEYSPACE)


KNOWN_COLLECTIONS = set()

def get_collection(name):
    """Retrieve an Astra DB collection, auto-creating it if it does not exist."""
    db = get_database()
    global KNOWN_COLLECTIONS

    if not KNOWN_COLLECTIONS:
        try:
            KNOWN_COLLECTIONS = {c.name for c in db.list_collections()}
        except Exception:
            pass

    if name not in KNOWN_COLLECTIONS:
        try:
            db.create_collection(name)
            KNOWN_COLLECTIONS.add(name)
        except Exception:
            pass

    return db.get_collection(name)


def clean_records(records):
    """Strip database-internal _id field so results serialize cleanly to JSON."""
    cleaned = []
    for record in records:
        if isinstance(record, dict):
            r = dict(record)
            r.pop("_id", None)
            cleaned.append(r)
    return cleaned


# ---------------- API STATUS & SUMMARY STATS ----------------

@app.route("/api")
@app.route("/api/health")
def api_info():
    token_set = bool(os.environ.get("ASTRA_DB_APPLICATION_TOKEN"))
    endpoint_set = bool(os.environ.get("ASTRA_DB_API_ENDPOINT"))
    return jsonify({
        "status": "online",
        "message": "Library Book Circulation & Management API",
        "database_configured": token_set and endpoint_set,
        "endpoints": [
            "/api/stats",
            "/api/books",
            "/api/books/<book_id>",
            "/api/borrow",
            "/api/borrow-records",
            "/api/return/<record_id>",
            "/api/top-books",
            "/api/material-types",
            "/api/monthly-trends",
            "/api/analytics",
            "/api/data/<collection_name>",
            "/api/seed"
        ]
    })


@app.route("/api/stats")
def get_stats():
    """Return live summary stats for the dashboard counters."""
    try:
        books_coll = get_collection("library_books")
        borrow_coll = get_collection("borrow_records")
        analytics_coll = get_collection("checkout_analytics")

        books = list(books_coll.find({}, limit=1000))
        borrow_records = list(borrow_coll.find({}, limit=1000))
        
        total_books = len(books)
        total_copies = sum(int(b.get("total_quantity", 1)) for b in books)
        available_copies = sum(int(b.get("available_quantity", 0)) for b in books)
        
        active_borrows = sum(1 for r in borrow_records if r.get("status") == "Borrowed")
        returned_borrows = sum(1 for r in borrow_records if r.get("status") == "Returned")
        
        # Calculate total checkouts from analytics collection
        analytics = list(analytics_coll.find({"analysis_type": "material_type"}, limit=100))
        analytics_checkouts = sum(int(a.get("total_checkouts", 0)) for a in analytics)

        return jsonify({
            "total_titles": total_books,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "active_borrows": active_borrows,
            "returned_borrows": returned_borrows,
            "analytics_total_checkouts": analytics_checkouts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- BOOK CATALOG ENDPOINTS ----------------

@app.route("/api/books", methods=["GET"])
def list_books():
    """Fetch all books in the catalog."""
    try:
        coll = get_collection("library_books")
        records = list(coll.find({}, limit=500))
        return jsonify(clean_records(records))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/books", methods=["POST"])
def add_book():
    """Add a new book to the library catalog with permissive field handling."""
    try:
        data = request.get_json(silent=True) or {}

        # Allow flexible title and fields
        title = str(data.get("title", "")).strip() or "Untitled Book"
        author = str(data.get("author", "")).strip() or "Unknown Author"
        category = str(data.get("category", "")).strip() or "General"
        isbn = str(data.get("isbn", "")).strip()

        try:
            quantity = int(data.get("quantity", 1))
        except (ValueError, TypeError):
            quantity = 1

        if quantity < 1:
            quantity = 1

        # Build book document preserving all user-supplied custom properties
        book = dict(data)
        book.update({
            "book_id": str(data.get("book_id") or uuid.uuid4()),
            "title": title,
            "author": author,
            "category": category,
            "isbn": isbn,
            "total_quantity": quantity,
            "available_quantity": int(data.get("available_quantity", quantity)),
            "added_date": str(data.get("added_date") or date.today())
        })

        coll = get_collection("library_books")
        coll.insert_one(book)

        return jsonify({
            "message": "Book added successfully",
            "book": clean_records([book])[0]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/books/<book_id>", methods=["PUT", "PATCH"])
def update_book(book_id):
    """Update existing book details with any modified fields."""
    try:
        data = request.get_json(silent=True) or {}
        data.pop("_id", None)
        data.pop("book_id", None)

        coll = get_collection("library_books")
        coll.update_one({"book_id": book_id}, {"$set": data})
        updated = coll.find_one({"book_id": book_id})
        return jsonify({
            "message": "Book updated successfully",
            "book": clean_records([updated])[0] if updated else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/books/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    """Delete a book from the catalog."""
    try:
        coll = get_collection("library_books")
        coll.delete_one({"book_id": book_id})
        return jsonify({"message": "Book deleted successfully", "deleted": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/seed", methods=["POST"])
def seed_sample_books():
    """Seed initial sample books into library_books if empty or requested."""
    try:
        coll = get_collection("library_books")
        sample_books = [
            {
                "book_id": str(uuid.uuid4()),
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "category": "Classic Literature",
                "isbn": "978-0743273565",
                "total_quantity": 5,
                "available_quantity": 5,
                "added_date": str(date.today())
            },
            {
                "book_id": str(uuid.uuid4()),
                "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
                "author": "Robert C. Martin",
                "category": "Computer Science",
                "isbn": "978-0132350884",
                "total_quantity": 4,
                "available_quantity": 4,
                "added_date": str(date.today())
            },
            {
                "book_id": str(uuid.uuid4()),
                "title": "Dune",
                "author": "Frank Herbert",
                "category": "Sci-Fi & Fantasy",
                "isbn": "978-0441172719",
                "total_quantity": 6,
                "available_quantity": 6,
                "added_date": str(date.today())
            },
            {
                "book_id": str(uuid.uuid4()),
                "title": "To Kill a Mockingbird",
                "author": "Harper Lee",
                "category": "Classic Literature",
                "isbn": "978-0060935467",
                "total_quantity": 3,
                "available_quantity": 3,
                "added_date": str(date.today())
            },
            {
                "book_id": str(uuid.uuid4()),
                "title": "Atomic Habits",
                "author": "James Clear",
                "category": "Self-Help",
                "isbn": "978-0735211292",
                "total_quantity": 7,
                "available_quantity": 7,
                "added_date": str(date.today())
            },
            {
                "book_id": str(uuid.uuid4()),
                "title": "Introduction to Algorithms (CLRS)",
                "author": "Thomas H. Cormen, Charles E. Leiserson",
                "category": "Computer Science",
                "isbn": "978-0262046305",
                "total_quantity": 3,
                "available_quantity": 3,
                "added_date": str(date.today())
            }
        ]
        coll.insert_many(sample_books)
        return jsonify({
            "message": f"Successfully seeded {len(sample_books)} sample books into the library!",
            "count": len(sample_books)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- BORROWING / CIRCULATION ENDPOINTS ----------------

@app.route("/api/borrow-records", methods=["GET"])
def list_borrow_records():
    """List all borrow and circulation records."""
    try:
        coll = get_collection("borrow_records")
        records = list(coll.find({}, limit=500))
        # Sort newest first by borrow_date
        records.reverse()
        return jsonify(clean_records(records))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/borrow", methods=["POST"])
def borrow_book():
    """Issue / Borrow a book out to a member."""
    try:
        data = request.get_json(silent=True) or {}

        book_id = str(data.get("book_id", "")).strip()
        title_query = str(data.get("title", "")).strip()
        borrower = str(data.get("borrower", "")).strip() or "Library Member"

        books_coll = get_collection("library_books")
        records_coll = get_collection("borrow_records")

        book = None
        if book_id:
            book = books_coll.find_one({"book_id": book_id})
        if not book and title_query:
            book = books_coll.find_one({"title": title_query})

        if not book:
            return jsonify({"error": "Selected book was not found in catalog"}), 404

        book_id = book.get("book_id")
        available = int(book.get("available_quantity", 0))
        if available < 1:
            return jsonify({"error": "Sorry, no copies of this title are currently available"}), 400

        # Decrement available count
        books_coll.update_one(
            {"book_id": book_id},
            {"$inc": {"available_quantity": -1}}
        )

        today = date.today()
        due = today + timedelta(days=14)

        record = dict(data)
        record.update({
            "record_id": str(uuid.uuid4()),
            "book_id": book_id,
            "title": book.get("title", ""),
            "author": book.get("author", ""),
            "borrower": borrower,
            "borrow_date": str(data.get("borrow_date") or today),
            "due_date": str(data.get("due_date") or due),
            "return_date": None,
            "status": "Borrowed"
        })

        try:
            records_coll.insert_one(record)
        except Exception:
            # Revert decrement if insert failed
            books_coll.update_one(
                {"book_id": book_id},
                {"$inc": {"available_quantity": 1}}
            )
            raise

        return jsonify({
            "message": f"Successfully borrowed '{book.get('title')}' for {borrower}",
            "record": clean_records([record])[0]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/return/<record_id>", methods=["POST"])
def return_book(record_id):
    """Mark a borrowed book as returned and increment available stock."""
    try:
        records_coll = get_collection("borrow_records")
        books_coll = get_collection("library_books")

        record = records_coll.find_one({"record_id": record_id})
        if not record:
            return jsonify({"error": "Borrow record not found"}), 404

        if record.get("status") == "Returned":
            return jsonify({"error": "Book is already marked as returned"}), 400

        book_id = record.get("book_id")

        # Update borrow record
        records_coll.update_one(
            {"record_id": record_id},
            {"$set": {
                "status": "Returned",
                "return_date": str(date.today())
            }}
        )

        # Increment available copies back
        if book_id:
            books_coll.update_one(
                {"book_id": book_id},
                {"$inc": {"available_quantity": 1}}
            )

        return jsonify({
            "message": f"'{record.get('title')}' successfully returned!",
            "return_date": str(date.today()),
            "status": "Returned"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- CIRCULATION ANALYTICS ENDPOINTS ----------------

def get_analytics_records(analysis_type):
    coll = get_collection("checkout_analytics")
    records = list(coll.find({"analysis_type": analysis_type}, limit=100))
    return clean_records(records)


@app.route("/api/top-books", methods=["GET"])
def top_books():
    try:
        return jsonify(get_analytics_records("top_books"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/material-types", methods=["GET"])
def material_types():
    try:
        return jsonify(get_analytics_records("material_type"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/monthly-trends", methods=["GET"])
def monthly_trends():
    try:
        return jsonify(get_analytics_records("monthly_trend"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics", methods=["POST"])
def add_analytics_record():
    """Allow storing custom circulation analytics data (accepts any analysis type or metric)."""
    try:
        data = request.get_json(silent=True) or {}
        analysis_type = str(data.get("analysis_type", "")).strip() or "custom_metric"

        coll = get_collection("checkout_analytics")

        try:
            total_checkouts = int(data.get("total_checkouts", 1))
        except (ValueError, TypeError):
            total_checkouts = 1

        new_doc = dict(data)
        new_doc["analysis_type"] = analysis_type
        new_doc["total_checkouts"] = total_checkouts

        if analysis_type == "top_books":
            new_doc["title"] = str(data.get("title", "")).strip() or "Untitled Title"
        elif analysis_type == "material_type":
            new_doc["materialtype"] = str(data.get("materialtype", "")).strip().upper() or "GENERAL"
            new_doc["record_count"] = int(data.get("record_count", 1))
        elif analysis_type == "monthly_trend":
            new_doc["checkoutyear"] = int(data.get("checkoutyear", date.today().year))
            new_doc["checkoutmonth"] = int(data.get("checkoutmonth", date.today().month))

        coll.insert_one(new_doc)
        return jsonify({
            "message": "Analytics record added successfully",
            "record": clean_records([new_doc])[0]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- GENERIC DYNAMIC DATA ACCESS (ALLOW EVERYTHING) ----------------

@app.route("/api/data/<collection_name>", methods=["GET"])
def get_any_collection(collection_name):
    """Retrieve up to 500 records from ANY collection in Astra DB."""
    try:
        coll = get_collection(collection_name)
        records = list(coll.find({}, limit=500))
        return jsonify(clean_records(records))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/data/<collection_name>", methods=["POST"])
def post_any_collection(collection_name):
    """Insert ANY arbitrary JSON document into ANY collection in Astra DB."""
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            data = {"created_at": str(date.today())}

        doc = dict(data)
        if not any(k in doc for k in ("id", "doc_id", "book_id", "record_id")):
            doc["doc_id"] = str(uuid.uuid4())

        coll = get_collection(collection_name)
        coll.insert_one(doc)
        return jsonify({
            "message": f"Document stored successfully into '{collection_name}'",
            "document": clean_records([doc])[0]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/data/<collection_name>/<doc_id>", methods=["DELETE"])
def delete_any_collection_doc(collection_name, doc_id):
    """Delete a document from any collection by doc_id, book_id, record_id, or _id."""
    try:
        coll = get_collection(collection_name)
        coll.delete_one({"$or": [
            {"doc_id": doc_id},
            {"book_id": doc_id},
            {"record_id": doc_id},
            {"id": doc_id}
        ]})
        return jsonify({"message": f"Deleted document '{doc_id}' from '{collection_name}'", "deleted": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- FRONTEND SERVING ROUTE ----------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the compiled React frontend, or fallback gracefully."""
    if os.path.isdir(dist_folder):
        file_path = os.path.join(dist_folder, path)
        if path != "" and os.path.exists(file_path):
            return send_from_directory(dist_folder, path)
        return send_from_directory(dist_folder, "index.html")

    # If dist folder is not found, return API overview
    return jsonify({
        "message": "Library Circulation API is running. Build frontend with 'npm run build' to serve UI.",
        "endpoints": [
            "/api/stats",
            "/api/books",
            "/api/borrow-records",
            "/api/borrow",
            "/api/return/<record_id>",
            "/api/top-books",
            "/api/material-types",
            "/api/monthly-trends"
        ]
    })


# ---------------- MAIN RUNNER ----------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
