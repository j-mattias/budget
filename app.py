import os
import re

from flask import Flask, render_template, request, session, redirect, flash, url_for, jsonify
from flask_session import Session
from db_models import *
from werkzeug.security import check_password_hash, generate_password_hash
from helpers import login_required
from validator_collection import checkers
from sqlalchemy.exc import IntegrityError, NoResultFound
from datetime import timedelta

app = Flask(__name__)

# https://flask-sqlalchemy.palletsprojects.com/en/3.1.x/quickstart/#configure-the-extension
# configure SQLAlchemy db URI
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = True

# Configure flask-session
app.config["SESSION_TYPE"] = "sqlalchemy"
app.config["SESSION_PERMANENT"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=1)
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
@login_required
def index():
    temp = "Hello, world!"
    
    return render_template("index.html", temp=temp, user=session["user_id"])


@app.route("/create", methods=["GET", "POST"])
@login_required
def create():

    if request.method == "POST":

        error = None

        # Get the JSON object containing form data
        form = request.json

        # Break it up into budget and expense data for convenience
        budget = form.get("info")
        expenses = form.get("categories")

        # Check for budget name and collisions
        if not budget.get("name"):
            error = "Missing budget name"
        elif form.get("collisions"):
            error = "Expense name collision(s), use unique names"

        # Check for valid categories
        for key in expenses.keys():
            if not key or key not in CATEGORIES:
                error = "Invalid categories or invalid/missing input"

        # Try to add the budget to the database
        try:
            new_budget = Budget(
                user_id=session["user_id"],
                budget=budget.get("total"),
                result=budget.get("result"),
                name=budget.get("name")
                )
            db.session.add(new_budget)

            # https://docs.sqlalchemy.org/en/20/tutorial/orm_data_manipulation.html#flushing
            # Create new transaction and emit SQL, but transaction remains open until commit is called
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            error = "Budget could not be saved"

        # Loop through categories, and expenses inside them
        for category in expenses.keys():
            for expense in expenses[category]:
                amount = expenses[category][expense]

                # Try to add expense to database
                try:
                    new_expense = Expense(
                        budget_id=new_budget.id,
                        category=category,
                        note=expense,
                        amount=amount
                    )
                    db.session.add(new_expense)
                except IntegrityError:
                    db.session.rollback()
                    error = "Data could not be saved"
                    break

        # If there was no error, commit the transactions to the database
        if error is None:
            db.session.commit()
            return jsonify({"response": "Data submitted"})
            return redirect(url_for("index"))
        
        # If something went wrong, return the error message to display
        return jsonify({"response": error})

    else:
        return render_template("create.html", categories=CATEGORIES)


@app.route("/account")
def account():
    return "Account route"


@app.route("/logout")
def logout():

    # Forget user
    session.clear()

    return redirect(url_for("index"))


@app.route("/login", methods=["GET", "POST"])
def login(): 

    if request.method == "POST":

        # Get user input
        user = request.form.get("username").lower()
        password = request.form.get("password")

        error = None

        try:
            # https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.or_
            # Select based on either username or email, raises error if not found
            user = db.session.execute(db.select(User).where((User.username_lower==user) | (User.email==user))).scalar_one()
            
            # Check password
            if not check_password_hash(user.password, password):
                error = "Incorrect password"
                
        except NoResultFound:
            error = "Invalid username or email"

        # If there was no error, start the session and redirect the
        if error is None:
            session["user_id"] = user.id
            return redirect(url_for("index"))
        
        flash(error)
        return render_template("login.html")

    else:

        # Forget user
        session.clear()
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

if __name__ == "__main__":
    app.run(debug=True)