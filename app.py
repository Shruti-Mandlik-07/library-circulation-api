from flask_cors import CORS
import os
from flask import Flask, jsonify
from astrapy import DataAPIClient

app = Flask(__name__)

def get_collection():
    token = os.environ.get("ASTRA_DB_APPLICATION_TOKEN")
    endpoint = os.environ.get("ASTRA_DB_API_ENDPOINT")

    if not token or not endpoint:
        raise RuntimeError("Astra DB environment variables are missing")

    client = DataAPIClient(token)
    db = client.get_database(
        endpoint,
        keyspace="default_keyspace"
    )
    return db.get_collection("checkout_analytics")

@app.route("/")
def home():
    return jsonify({
        "message": "Library Book Circulation API is running",
        "endpoints": [
            "/api/top-books",
            "/api/material-types",
            "/api/monthly-trends"
        ]
    })

def get_records(analysis_type):
    collection = get_collection()
    records = list(collection.find(
        {"analysis_type": analysis_type},
        limit=100
    ))

    for record in records:
        record.pop("_id", None)

    return records

@app.route("/api/top-books")
def top_books():
    return jsonify(get_records("top_books"))

@app.route("/api/material-types")
def material_types():
    return jsonify(get_records("material_type"))

@app.route("/api/monthly-trends")
def monthly_trends():
    return jsonify(get_records("monthly_trend"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
