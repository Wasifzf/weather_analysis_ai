#!/usr/bin/env python3
"""
Frontend startup script for Weather Anomaly Detection Platform
"""

import subprocess
import sys
import os
from pathlib import Path

def start_frontend():
    """Start the React frontend development server"""
    print("🚀 Starting Frontend Development Server...")
    
    frontend_dir = Path(__file__).parent / "frontend"
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return 1
    
    try:
        # Change to frontend directory
        os.chdir(frontend_dir)
        print(f"📁 Working directory: {os.getcwd()}")
        
        # Install dependencies if node_modules doesn't exist
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            subprocess.run(["npm", "install"], check=True)
        
        # Start the development server
        print("🌐 Starting React development server on http://localhost:3000")
        subprocess.run(["npm", "start"])
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start frontend: {e}")
        return 1
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped by user")
        return 0
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js and npm.")
        return 1

def main():
    """Main startup function"""
    print("=" * 60)
    print("🌐 Weather Anomaly Detection - Frontend Development Server")
    print("=" * 60)
    
    return start_frontend()

if __name__ == "__main__":
    sys.exit(main()) 