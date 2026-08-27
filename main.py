from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI(
    title="Intelligent Data Capture & Schedule-Linking API",
    description="Backend service tracking WBS construction task state, simulating computer vision analysis, and managing schedule sync.",
    version="1.0.0"
)

# Enable CORS for frontend API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initial mock database configuration
INITIAL_WBS = [
    {
        "wbs_id": "WBS 1.1",
        "name": "Site Clearing & Excavation",
        "progress": 100,
        "status": "completed",
        "variance": "-1 Day"
    },
    {
        "wbs_id": "WBS 1.2",
        "name": "Foundation Pile Installation",
        "progress": 100,
        "status": "completed",
        "variance": "0 Days"
    },
    {
        "wbs_id": "WBS 1.3",
        "name": "Pier 4 Concrete Pour & Cure",
        "progress": 50,
        "status": "in_progress",
        "variance": "+3 Days (Est)"
    },
    {
        "wbs_id": "WBS 1.4",
        "name": "Steel Decking Erection",
        "progress": 0,
        "status": "pending",
        "variance": "--"
    }
]

# In-memory database WBS state
db_wbs = [dict(task) for task in INITIAL_WBS]

@app.get("/schedule")
async def get_schedule():
    """
    Fetch the list of construction schedule tasks from the in-memory database.
    """
    return db_wbs

@app.post("/process-site-data")
async def process_site_data():
    """
    Simulate AI Computer Vision model processing on site photos.
    Delays execution by 2 seconds, updates WBS Task 1.3 to 100% completed, and returns metadata.
    """
    await asyncio.sleep(2)
    
    # Update state for WBS 1.3 (Pier 4 Concrete Pour & Cure)
    for task in db_wbs:
        if task["wbs_id"] == "WBS 1.3":
            task["progress"] = 100
            task["status"] = "completed"
            task["variance"] = "0 Days"
            break

    return {
        "message": "CV analyzed visual data",
        "detected_element": "Pier 4",
        "new_progress": "100%",
        "confidence": 0.94
    }

@app.post("/reset")
async def reset_schedule():
    """
    Reset WBS database to its initial mock schedule configuration for testing.
    """
    global db_wbs
    db_wbs = [dict(task) for task in INITIAL_WBS]
    return {"status": "Database state reset successfully", "data": db_wbs}
