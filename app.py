import os
import re

from flask import Flask, render_template, request, session, redirect, flash, url_for, jsonify, abort
from flask_session import Session
from db_models import *
from werkzeug.security import check_password_hash, generate_password_hash
from helpers import login_required, form_data_error, escape_chars, encrypt_data, decrypt_data
from validator_collection import checkers
from sqlalchemy.exc import IntegrityError, NoResultFound
from datetime import timedelta
from cryptography.fernet import Fernet
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()

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

# Get and set the secret key for encryption/decryption
KEY = Fernet(os.getenv("SECRET_KEY").encode())

# Valid categories for budgeting
CATEGORIES = [
    "housing", "transportation", "utilities", "food", "clothing", "medical", "insurance",
    "personal", "debt", "savings", "retirement", "entertainment", "other"
    ]


@app.route("/")
@login_required
def index():

    # Select all of the users budgets
    budgets = db.session.execute(
                                db.select(Budget)
                                .where(Budget.user_id == session["user_id"])
                                .group_by(Budget)
                                .order_by(Budget.timestamp.desc())
                                ).scalars().all()
   
    return render_template("index.html", budgets=budgets)


@app.route("/budget/<int:id>")
@login_required
def budget(id):

    error = None

    # https://docs.sqlalchemy.org/en/20/tutorial/orm_related_objects.html#using-relationships-in-queries
    # Select budget and expenses associated with it
    try:
        budget = db.session.execute(
                                    db.select(Budget)
                                    .join_from(Budget, Expense)
                                    .where(Budget.id == id)
                                    .group_by(Budget)
                                    .order_by(Budget.timestamp.desc())
                                    ).scalar_one()
    except NoResultFound:
        return abort(404)
    
    # Prevent other users from accessing current users budgets
    if session["user_id"] != budget.user_id:
        return abort(401)
    
    # Decrypt and convert to float in order to compare against form data
    try:
        budget_total = float(decrypt_data(budget.budget, KEY))
        budget_result = float(decrypt_data(budget.result, KEY))
    except ValueError:
        error = "Budget could not be loaded, unable to convert values"
        flash(error)
        return redirect(url_for("index"))  

    # Initialize a dictionary to store budget and expense information
    json = {
        "info": {
            "name": budget.name,
            "total": budget_total,
            "result": budget_result,
            "id": id
            },
        "categories": {}
    }

    # Add categories and expense, cost key value pairs to categories part of the dictionary
    for expense in budget.expenses:
        if expense.category not in json["categories"].keys():
            json["categories"][expense.category] = {}
        try:
            json["categories"][expense.category][expense.note] = float(decrypt_data(expense.amount, KEY))
        except ValueError:
            error = "Budget could not be loaded, unable to convert values"
            flash(error)
            return redirect(url_for("index"))  

    return render_template("budget.html", json=json, categories=CATEGORIES)


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

        # Check for errors in the form
        error = form_data_error(form, CATEGORIES)

        # Try to add the budget to the database
        try:
            new_budget = Budget(
                user_id=session["user_id"],
                budget=encrypt_data(budget.get("total"), KEY),
                result=encrypt_data(budget.get("result"), KEY),
                name=budget.get("name")
                )
            db.session.add(new_budget)

            # https://docs.sqlalchemy.org/en/20/tutorial/orm_data_manipulation.html#flushing
            # Create new transaction and emit SQL, but transaction remains open until commit is called
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            error = "Budget could not be saved"
            return jsonify({"response": error})

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
                        amount=encrypt_data(amount, KEY)
                    )
                    db.session.add(new_expense)
                except IntegrityError:
                    db.session.rollback()
                    error = "Data could not be saved"
                    break

        # If there was no error, commit the transactions to the database
        if error is None:
            db.session.commit()
            # return jsonify({"response": "Data submitted"})
            return jsonify({"url": url_for("index")})
        
        # If something went wrong, return the error message to display
        return jsonify({"response": error})

    else:
        return render_template("create.html", categories=CATEGORIES)


@app.route("/update", methods=["POST"])
@login_required
def update():

    error = None
    
    # Get the form data that was submitted
    form = request.json

    # Break it up into budget and expense data for convenience
    budget = form.get("info")
    expenses = form.get("categories")

    # Check for errors in the form
    error = form_data_error(form, CATEGORIES)

    # Select budget by id and user_id
    try:
        cur_budget = db.session.execute(
                db.select(Budget)
                .where((Budget.id == budget.get("id")) &
                    (Budget.user_id == session["user_id"])
                    )).scalar_one()
    except NoResultFound:
        error = "Budget could not be found"

    # Decrypt and convert to float in order to compare against form data
    try:
        budget_total = float(decrypt_data(cur_budget.budget, KEY))
        budget_result = float(decrypt_data(cur_budget.result, KEY))
    except ValueError:
        error = "One or more values could not be processed as float"

    # Update name, budget, result
    if cur_budget.name != budget.get("name"):
        cur_budget.name = budget.get("name")

    if budget_total != budget.get("total"):
        cur_budget.budget = encrypt_data(budget.get("total"), KEY)

    if budget_result != budget.get("result"):
        cur_budget.result = encrypt_data(budget.get("result"), KEY)
    
    # Could have updated expenses if expense id was saved in the json, but seems unnecessary
    # when there's not budget or expense history being stored
   
    # Delete expenses previous expenses (not committed yet)
    for expense in cur_budget.expenses:
        db.session.delete(expense)
            
    # Loop through categories, and expenses inside them
    for category in expenses.keys():
        for expense in expenses[category]:
            amount = expenses[category][expense]

            # Try to add expense to database
            try:
                new_expense = Expense(
                    budget_id=cur_budget.id,
                    category=category,
                    note=expense,
                    amount=encrypt_data(amount, KEY)
                )
                db.session.add(new_expense)
            except IntegrityError:
                db.session.rollback()
                error = "Data could not be saved"
                break

    # If there was no error commit and send where to redirect since Flask redirect
    # won't work when using fetch
    if error is None:
        db.session.commit()
        return jsonify({"url": url_for("budget", id=cur_budget.id)})

    # If there was an error rollback changes and return an error response
    db.session.rollback()
    return jsonify({"response": error})


@app.route("/delete", methods=["POST"])
@login_required
def delete():

    # Select the form input with name id
    id = request.form.get("id")

    # Select the budget with the selected id, and make sure user_id matches
    try:
        budget = db.session.execute(
                db.select(Budget)
                .where((Budget.id == id) & 
                (Budget.user_id == session["user_id"])
                )).scalar_one()
    except NoResultFound:
        flash("Budget was not found")
        return redirect("/")

    # Delete the budget from the database
    db.session.delete(budget)
    db.session.commit()

    # Redirect to show the new list of budgets
    return redirect("/")


@app.route("/account")
@login_required
def account():

    error = None

    # Select current user
    try:
        USER = db.session.execute(db.select(User).where(User.id == session["user_id"])).scalar_one()
    except NoResultFound:
        error = "User not found"
        flash(error)
        abort(404)

    # if error:
    #     flash(error)

    return render_template("account.html", user=USER)


@app.route("/delete-account", methods=["POST"])
@login_required
def delete_account():

    error = None

    password = request.form.get("password")

    if not password:
        error = "Please provide a password"

    # Select the current user
    try:
        USER = db.session.execute(db.select(User).where(User.id == session["user_id"])).scalar_one()
    except NoResultFound:
        error = "User not found"

    # Ensure the correct password is provided before deleting
    if not check_password_hash(USER.password, password):
        error = "Incorrect password"

    # If there are no errors delete the users account
    if error is None:
        db.session.delete(USER)
        db.session.commit()

        # Clear the session before flashing message, since it's stored in the session
        session.clear()
        flash("Your account has been deleted")
        return render_template("login.html")
    
    flash(error)
    return redirect(url_for("account"))


@app.route("/change-password", methods=["POST"])
@login_required
def change_password():

    error = None

    old = request.form.get("old")
    new = request.form.get("new")
    confirm = request.form.get("confirm")

    # based on https://regexr.com/3bfsi
    # Check password has at least: 1 lowercase letter, 1 uppercase letter, 1 digit, 1 symbol, min 8 char length
    match = re.search(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]).{8,}$", new)

    # Error check password inputs
    if not old:
        error = "Please enter a password"
    elif not new:
        error = "Please enter a new password"
    elif new != confirm:
        error = "Passwords do not match"
    elif not match:
        error = """
                Password needs to be at least 8 characters and contain at least one lowercase letter, 
                one uppercase letter, one digit and one symbol ( !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~)
                """
    try:
        USER = db.session.execute(db.select(User).where(User.id == session["user_id"])).scalar_one()
    except NoResultFound:
        error = "User not found"

    # Make sure the correct old password was entered
    if not check_password_hash(USER.password, old):
        error = "Incorrect old password"

    # If there were no errors update the password
    if error is None:

        # Update password in db
        USER.password = generate_password_hash(new)
        db.session.commit()

        flash("Password has been changed")
        return redirect(url_for("account"))

    flash(error)
    return redirect(url_for("account"))


@app.route("/logout")
def logout():

    # Forget user
    session.clear()

    return redirect(url_for("index"))


@app.route("/login", methods=["GET", "POST"])
def login(): 

    if request.method == "POST":

        # Get user input
        username = request.form.get("username").lower()
        password = request.form.get("password")

        error = None

        try:
            # https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.or_
            # Select based on either username or email, raises error if not found
            USER = db.session.execute(db.select(User).where((User.username_lower==username) | (User.email==username))).scalar_one()
            
            # Check password
            if not check_password_hash(USER.password, password):
                error = "Incorrect password"
                
        except NoResultFound:
            error = "Invalid username or email"

        # If there was no error, start the session and redirect the
        if error is None:
            session["user_id"] = USER.id
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
                USER = User(
                    username=username, 
                    username_lower=username.lower(), 
                    password=generate_password_hash(password), 
                    email=email.lower()
                    )
                db.session.add(USER)
            
            except IntegrityError:

                # Revert uncommitted changes made to the session
                db.session.rollback()
                error = "Username and/or email is already taken"

            db.session.commit()

            # Using render_template since redirect seems to "consume" the flash message,
            # even tho redirect seems to work in change password route
            flash("Welcome! You're now registered.")
            return render_template("login.html")
        
        # Display error message
        flash(error)

    return render_template("register.html")


# https://flask.palletsprojects.com/en/3.0.x/errorhandling/#custom-error-pages
# Client error responses
@app.errorhandler(404)
def page_not_found(e):

    # Text to go on the image
    top = escape_chars("page doesn't exist")
    bottom = escape_chars("but that's none of my business")

    return render_template("400.html", code=404, message="Not Found", top=top, bottom=bottom), 404


@app.errorhandler(401)
def unauthorized(e):

    # Text to go on the image
    top = escape_chars("you don't have access")
    bottom = escape_chars("but that's none of my business")

    return render_template("400.html", code=401, message="Unauthorized", top=top, bottom=bottom), 401


# Server error responses
@app.errorhandler(500)
def server_error(e):

    # Text to go on the image
    top = " "
    bottom = escape_chars("this is fine")

    return render_template("500.html", code=500, message="Internal Server Error", top=top, bottom=bottom)