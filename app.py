import os
import re

from flask import Flask, render_template, request, session, redirect, flash, url_for
from flask_session import Session
from db_models import *
from werkzeug.security import check_password_hash, generate_password_hash
from helpers import login_required
from validator_collection import checkers
from sqlalchemy.exc import IntegrityError, NoResultFound

app = Flask(__name__)

# https://flask-sqlalchemy.palletsprojects.com/en/3.1.x/quickstart/#configure-the-extension
# configure SQLAlchemy db URI
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = True

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
#@login_required
def index():
    temp = "Hello, world!"

    return render_template("index.html", temp=temp)


@app.route("/create")
def create():
    return "Create route"


@app.route("/account")
def account():
    return "Account route"


@app.route("/logout")
def logout():

    # Clear user_id from the session, if there was no key, return None instead
    #session.pop("user_id", None)
    session.clear()

    flash("You've been logged out.")

    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():

    # Forget user
    session.clear()

    if request.method == "POST":
        user = request.form.get("username").lower()
        password = request.form.get("password")


    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":
        
        # Get user input
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        confirm = request.form.get("confirmation")

        error = None

        # based on https://regexr.com/3bfsi
        # Check password has at least: 1 lowercase letter, 1 uppercase letter, 1 digit, 1 symbol, min 8 char length
        match = re.search(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]).{8,}$", password)

        # Error checking form input
        if not username:
            error = "Please provide a username"
        elif not password:
            error = "Please enter a password"
        elif password != confirm:
            error = "Passwords do not match"
        elif not match:
            error = """
                    Password needs to be at least 8 characters and contain at least one lowercase letter, 
                    one uppercase letter, one digit and one symbol ( !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~)
                    """      
        elif not checkers.is_email(email):
            error = "Invalid email" 
        
        # Try to insert into db, if an entry already exists catch the error and rollback the transaction
        if error is None:
            try:
                user = User(
                    username=username, 
                    username_lower=username.lower(), 
                    password=generate_password_hash(password), 
                    email=email.lower()
                    )
                db.session.add(user)
                db.session.commit()
                flash("Welcome! You're now registered.")
                return redirect(url_for("login"))
            
            except IntegrityError:

                # Revert uncommitted changes made to the session
                db.session.rollback()
                error = "Username and/or email is already taken"
        
        # Display error message
        flash(error)

    return render_template("register.html")