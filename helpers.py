from flask import redirect, session, url_for, request
from functools import wraps


def login_required(func):

    # https://flask.palletsprojects.com/en/3.0.x/patterns/viewdecorators/#login-required-decorator
    # Decorate routes with login requirement

    @wraps(func)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            
            # https://flask.palletsprojects.com/en/3.0.x/api/#flask.Request.url
            # take user back to page they were trying to access
            return redirect(url_for("login", next=request.url))
        return func(*args, **kwargs)
    
    return decorated_function