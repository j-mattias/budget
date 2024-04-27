from flask import redirect, session, url_for, request
from functools import wraps


def login_required(func):

    # https://flask.palletsprojects.com/en/3.0.x/patterns/viewdecorators/#login-required-decorator
    # Decorate routes with login requirement

    @wraps(func)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            
            # https://flask.palletsprojects.com/en/3.0.x/api/#flask.Request.url
            # take user back to page they were trying to access, after they log in
            return redirect(url_for("login", next=request.url))
        return func(*args, **kwargs)
    
    return decorated_function


def form_data_error(form, valid_categories):

    error = None
    budget = form.get("info")
    expenses = form.get("categories")

    # Check for budget name and collisions
    if not budget.get("name"):
        error = "Missing budget name"
    elif form.get("collisions"):
        error = "Expense name collision(s), use unique names"
    elif not expenses:
        error = "Missing categories"

    # Check that categories and inputs fields are valid
    for key in expenses.keys():
        
        # Check for valid categories
        if not key or key not in valid_categories:
            error = "Invalid categories"

        # Check for valid category value (dict of expenses)
        elif not expenses[key]:
            error = "Invalid/missing input"

        # Check for valid cost input
        for expense in expenses[key]:
            amount = expenses[key][expense]
            if not amount:
                error = "Missing cost value for one or more inputs"

    return error


def escape_chars(text):

    # https://memegen.link/#special-characters
    # Escape characters that collide with reserved URL characters
    for normal, escaped in [
        ("?", "~q" ),
        ("&", "~a"),
        ("%", "~p"),
        ("#", "~h"),
        ("/", "~s"),
        ("\\", "~b"),
        ("<", "~l"),
        (">", "~g"),
        ('"', "''"),
        ("-", "--"),
        ("_", "__"),
        (" ", "-"),
        ("\n", "~n")
    ]:
        text = text.replace(normal, escaped)
        
    return text