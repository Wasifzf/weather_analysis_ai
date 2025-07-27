import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConfigurationError
from typing import Optional
import warnings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Database:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.connected = False
        self.connect()
    
    def connect(self):
        """Connect to MongoDB with error handling"""
        try:
            # MongoDB connection string - should be in environment variable
            connection_string = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
            
            if not connection_string or connection_string == "mongodb://localhost:27017/":
                print("⚠️  No MongoDB URI found in environment. Using local fallback.")
                print("⚠️  Set MONGODB_URI environment variable for production.")
            
            # Create client with timeout settings
            self.client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=5000,  # Shorter timeout for startup
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
                maxPoolSize=10,
                retryWrites=True
            )
            
            # Test connection with shorter timeout
            self.client.admin.command('ping')
            self.db = self.client.weather_anomaly_db
            self.connected = True
            print("✅ Successfully connected to MongoDB")
            
        except ServerSelectionTimeoutError as e:
            print(f"❌ MongoDB connection timeout: {e}")
            print("🔄 App will start without database connectivity")
            self.connected = False
            self._setup_mock_db()
            
        except ConfigurationError as e:
            print(f"❌ MongoDB configuration error: {e}")
            print("🔄 App will start without database connectivity")
            self.connected = False
            self._setup_mock_db()
            
        except Exception as e:
            print(f"❌ Unexpected database error: {e}")
            print("🔄 App will start without database connectivity")
            self.connected = False
            self._setup_mock_db()
    
    def _setup_mock_db(self):
        """Setup mock database for development when MongoDB is unavailable"""
        print("🔧 Setting up mock database for development")
        self.db = MockDatabase()
    
    def get_collection(self, collection_name: str):
        """Get a collection, with fallback for mock database"""
        if self.connected and self.db is not None:
            return self.db[collection_name]
        else:
            return MockCollection(collection_name)
    
    def close(self):
        """Close database connection"""
        if self.client and self.connected:
            self.client.close()
            print("🔌 Database connection closed")

class MockDatabase:
    """Mock database for development when MongoDB is unavailable"""
    def __getitem__(self, collection_name):
        return MockCollection(collection_name)

class MockCollection:
    """Mock collection that returns empty results"""
    def __init__(self, name):
        self.name = name
        print(f"🔧 Using mock collection: {name}")
    
    def find(self, *args, **kwargs):
        return MockCursor([])
    
    def find_one(self, *args, **kwargs):
        return None
    
    def insert_many(self, documents):
        print(f"🔧 Mock insert_many: {len(documents)} documents to {self.name}")
        return MockInsertResult(len(documents))
    
    def insert_one(self, document):
        print(f"🔧 Mock insert_one to {self.name}")
        return MockInsertResult(1)
    
    def delete_many(self, *args, **kwargs):
        print(f"🔧 Mock delete_many from {self.name}")
        return MockDeleteResult(0)
    
    def count_documents(self, *args, **kwargs):
        return 0

class MockCursor:
    """Mock cursor for find operations"""
    def __init__(self, documents):
        self.documents = documents
    
    def sort(self, *args, **kwargs):
        return self
    
    def limit(self, *args, **kwargs):
        return self
    
    def __iter__(self):
        return iter(self.documents)
    
    def __list__(self):
        return list(self.documents)

class MockInsertResult:
    """Mock insert result"""
    def __init__(self, count):
        self.inserted_ids = [f"mock_id_{i}" for i in range(count)]

class MockDeleteResult:
    """Mock delete result"""
    def __init__(self, count):
        self.deleted_count = count

# Initialize database connection
db = Database()

# Helper functions to get collections
def get_weather_collection():
    """Get weather data collection"""
    return db.get_collection("weather_data")

def get_anomaly_collection():
    """Get anomaly collection"""
    return db.get_collection("anomalies")

def get_user_preferences_collection():
    """Get user preferences collection"""
    return db.get_collection("user_preferences")