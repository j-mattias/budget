import os

from flask import Flask
from db_models import *

# Create app
app = Flask(__name__)

# Configure db, get env variable with address
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

def main():

    # Doesn't update tables if they're already in db
    db.create_all()
    print("Created tables")

if __name__ == "__main__":
    # create_all() requires an application context, since there's no request, create one
    with app.app_context():
        main()