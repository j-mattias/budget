import os

from flask import Flask, render_template, request
from flask_session import Session
from db_models import *

app = Flask(__name__)

# https://flask-sqlalchemy.palletsprojects.com/en/3.1.x/quickstart/#configure-the-extension
# configure SQLAlchemy db URI
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure flask-session
app.config["SESSION_TYPE"] = "sqlalchemy"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_SQLALCHEMY"] = db

# Bind SQLAlchemy to the Flask app instance
db.init_app(app)

# Initialize session with app
Session(app)

CATEGORIES = [
    "housing", "transportation", "utilities", "food", "clothing", "medical", "insurance",
    "personal", "debt", "savings", "retirement", "entertainment", "other"
    ]


@app.route("/")
def index():
    return render_template("index.html")
