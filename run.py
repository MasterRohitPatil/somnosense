"""
SomnoSense Platform Launcher
Run with: python run.py
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting SomnoSense Clinical Decision Support Platform...")
    print("🌐 Landing Page: http://127.0.0.1:8000/")
    print("🩺 Patient Portal: http://127.0.0.1:8000/app")
    uvicorn.run("backend.api:app", host="127.0.0.1", port=8000, reload=False)
