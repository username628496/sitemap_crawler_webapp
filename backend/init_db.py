# init_db.py
from models.database import DatabaseManager

if __name__ == "__main__":
    db = DatabaseManager()
    db.init_database()
    print("✅ Database initialized successfully!")
