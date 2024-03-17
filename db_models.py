from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ForeignKey, String, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List

# https://flask-sqlalchemy.palletsprojects.com/en/3.1.x/models/#initializing-the-base-class
class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)

    # https://docs.sqlalchemy.org/en/20/tutorial/orm_related_objects.html#working-with-orm-related-objects
    # https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html#basic-relationship-patterns
    # A user can have many budgets hence List, back_populates the user attribute in the Budget class,
    # delete all records of budgets if parent is deleted
    budget: Mapped[List["Budget"]] = relationship(back_populates="user", cascade="all, delete")

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, username={self.username!r}, password=hashed, email={self.email!r})"


class Budget(db.Model):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    budget: Mapped[int]
    result: Mapped[int]
    name: Mapped[str]

    # https://stackoverflow.com/questions/76942961/specify-timestamp-column-type-hint-in-the-creation-of-a-table-using-sqlalchemy-a
    timestamp = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # back_populates uses the attribute name of the target table
    user: Mapped["User"] = relationship(back_populates="budget")

    # Adding a list of expenses, since multiple expenses can be associated with a single budget
    # cascade behavior is set to delete all associated records when the parent is deleted
    expenses: Mapped[List["Expense"]] = relationship(back_populates="budget", cascade="all, delete")

    def __repr__(self) -> str:
        return f"""
                Budget(id={self.id!r}, user_id={self.user_id!r}, budget={self.budget!r}, 
                result={self.result!r}, name={self.name!r}, timestamp={self.timestamp!r})
                """


class Expense(db.Model):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"))

    # A list in app.py will define valid categories for more flexibility
    category: Mapped[str]
    note: Mapped[Optional[str]] = mapped_column(default="expense")
    amount: Mapped[int]

    budget: Mapped["Budget"] = relationship(back_populates="expenses")

    def __repr__(self) -> str:
        return f"""
                Expense(id={self.id!r}, budget_id={self.budget_id!r}, category={self.category!r},
                note={self.note!r}, amount={self.amount!r})
                """


# Delete behavior for one to many
# https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html#configuring-delete-behavior-for-one-to-many
