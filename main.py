from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import os
import re
import difflib

# Try to import Neo4j driver for health check support
try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

app = FastAPI(
    title="Intelligent Data Capture & Schedule-Linking API",
    description="Production-ready backend tracking WBS task state, performing telemetry ingestion, and fuzzy matching NLP logs.",
    version="1.1.0"
)

# CORS configurations
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class DatabaseStates(BaseModel):
    in_memory: str = Field(..., description="Status of the in-memory fallback database")
    neo4j: str = Field(..., description="Status of the Neo4j database connection")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall API health status")
    database: DatabaseStates

class WBSTask(BaseModel):
    wbs_id: str = Field(..., description="WBS Unique Code (e.g., WBS 1.1)")
    name: str = Field(..., description="Task description matching infrastructure projects")
    planned_date: str = Field(..., description="Planned execution date")
    status: str = Field(..., description="Current status: completed, in_progress, pending, or delayed")
    progress: int = Field(..., description="Progress percentage (0 to 100)")
    anomaly: bool = Field(..., description="Flag indicating construction anomalies or delays")
    variance: str = Field(..., description="P6 baseline variance in days")

class TelemetryIngestResponse(BaseModel):
    message: str
    detected_element: str
    confidence: float
    new_progress: int
    variance_days: str
    tasks: List[WBSTask]

class NLPLogRequest(BaseModel):
    text: str = Field(..., example="Verify concrete curing progress on Pier 4. We are at 80% completion.")

class NLPLogResponse(BaseModel):
    message: str
    matched_wbs_id: Optional[str]
    match_confidence: float
    detected_progress: Optional[int]
    detected_status: Optional[str]
    tasks: List[WBSTask]

class SCurveDataPoint(BaseModel):
    week: str
    Planned: int
    Actual: int

# Initial mock database for Indian Infrastructure Projects (NH-48 Expressway & Bridges)
INITIAL_WBS = [
    {
        "wbs_id": "WBS 1.1",
        "name": "NH-48 Expressway Site Clearing & Excavation",
        "planned_date": "2026-08-01",
        "status": "completed",
        "progress": 100,
        "anomaly": False,
        "variance": "0 Days"
    },
    {
        "wbs_id": "WBS 1.2",
        "name": "Foundation Pile Installation for Pier 1-3",
        "planned_date": "2026-08-10",
        "status": "completed",
        "progress": 100,
        "anomaly": False,
        "variance": "0 Days"
    },
    {
        "wbs_id": "WBS 1.3",
        "name": "Pier 4 Concrete Pour & Curing",
        "planned_date": "2026-08-20",
        "status": "in_progress",
        "progress": 50,
        "anomaly": True,
        "variance": "+3 Days (Est)"
    },
    {
        "wbs_id": "WBS 1.4",
        "name": "Precast Girder Assembly & Deck Erection",
        "planned_date": "2026-09-02",
        "status": "pending",
        "progress": 0,
        "anomaly": False,
        "variance": "--"
    }
]

# In-memory mock database state
db_wbs = [dict(task) for task in INITIAL_WBS]

# Neo4j connection configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def check_neo4j_connection() -> bool:
    """Helper to check if Neo4j is online and reachable."""
    if not NEO4J_AVAILABLE:
        return False
    try:
        # Create driver with 2-second timeout to avoid locking the backend thread
        driver = GraphDatabase.driver(
            NEO4J_URI, 
            auth=(NEO4J_USER, NEO4J_PASSWORD), 
            connection_timeout=2.0
        )
        with driver.session() as session:
            session.run("RETURN 1")
        driver.close()
        return True
    except Exception:
        return False

# Endpoints
@app.get("/api/v1/health", response_model=HealthResponse)
async def get_health():
    """
    Health check returning status and database connection states.
    Checks in-memory DB and attempts a connection to Neo4j.
    """
    neo4j_status = "connected" if check_neo4j_connection() else "offline"
    return HealthResponse(
        status="healthy",
        database=DatabaseStates(
            in_memory="connected",
            neo4j=neo4j_status
        )
    )

@app.get("/api/v1/wbs-tasks", response_model=List[WBSTask])
async def get_wbs_tasks():
    """
    Returns a list of WBS activities (WBS Code, Task Description, Planned Date, Actual Status, Progress %, Anomaly Flag).
    """
    return db_wbs

@app.post("/api/v1/telemetry/ingest", response_model=TelemetryIngestResponse)
async def ingest_telemetry(file: UploadFile = File(...)):
    """
    Accepts file upload (Drone Images, LiDAR point clouds, or IoT logs).
    Simulates object detection progress calculation.
    Updates the target WBS task (WBS 1.3 - Pier 4) and returns the updated schedule.
    """
    # Simulate processing delay
    await asyncio.sleep(2)
    
    filename = file.filename.lower()
    
    # Simple rule-based simulated engine logic
    confidence = 94.0
    detected_element = "Pier 4 Concrete Structure"
    new_progress = 100
    variance_days = "0 Days"
    
    # Check if the filename hints at a specific stage or WBS
    if "wbs 1.4" in filename or "girder" in filename:
        detected_element = "Precast Girder Assembly"
        new_progress = 40
        confidence = 88.5
        variance_days = "0 Days"
        for task in db_wbs:
            if task["wbs_id"] == "WBS 1.4":
                task["progress"] = new_progress
                task["status"] = "in_progress"
                task["variance"] = variance_days
                task["anomaly"] = False
    else:
        # Default fallback updates WBS 1.3 (Pier 4 Concrete Pour & Curing)
        for task in db_wbs:
            if task["wbs_id"] == "WBS 1.3":
                task["progress"] = new_progress
                task["status"] = "completed"
                task["variance"] = variance_days
                task["anomaly"] = False
                
    return TelemetryIngestResponse(
        message=f"Multi-modal telemetry file '{file.filename}' processed successfully by CV pipeline.",
        detected_element=detected_element,
        confidence=confidence,
        new_progress=new_progress,
        variance_days=variance_days,
        tasks=db_wbs
    )

@app.post("/api/v1/nlp-log", response_model=NLPLogResponse)
async def parse_nlp_log(request: NLPLogRequest):
    """
    Accepts raw text or voice transcript, performs token-based fuzzy matching against WBS task names,
    maps log entries to specific activities, updates their status, and returns the modified schedule.
    """
    text = request.text.lower()
    
    # Tokenize input text for stop-word filtered overlap check
    stop_words = {"verify", "the", "a", "of", "and", "on", "in", "for", "to", "at", "is", "we", "are", "our", "logs", "sensor", "core", "curing"}
    tokens = set(re.findall(r"\w+", text)) - stop_words
    
    best_task = None
    best_score = 0.0
    
    # 1. Look for explicit WBS ID reference
    wbs_id_match = re.search(r"wbs\s*1\.\d", text)
    if wbs_id_match:
        matched_id = wbs_id_match.group(0).replace(" ", "") # e.g. "wbs1.3"
        # Format to match database: "WBS 1.x"
        formatted_id = f"WBS {matched_id[-3:]}"
        for task in db_wbs:
            if task["wbs_id"].lower() == formatted_id.lower():
                best_task = task
                best_score = 1.0
                break
                
    # 2. Fuzzy match against task description words if no explicit ID is matched
    if not best_task:
        for task in db_wbs:
            task_name = task["name"].lower()
            task_tokens = set(re.findall(r"\w+", task_name)) - stop_words
            
            # Intersection score
            intersection = tokens.intersection(task_tokens)
            if not task_tokens:
                score = 0.0
            else:
                score = len(intersection) / len(task_tokens)
                
            # SequenceMatcher backup
            seq_score = difflib.SequenceMatcher(None, text, task_name).ratio()
            combined_score = max(score, seq_score)
            
            if combined_score > best_score:
                best_score = combined_score
                best_task = task
                
    # Heuristics to update status and progress based on NLP text cues
    detected_progress = None
    detected_status = None
    confidence = best_score
    
    if best_task and best_score >= 0.2:
        # Extract percentage if exists (e.g. 80%)
        pct_match = re.search(r"(\d+)%", text)
        if pct_match:
            detected_progress = int(pct_match.group(1))
        elif "completed" in text or "complete" in text or "finished" in text or "done" in text:
            detected_progress = 100
        elif "started" in text or "in progress" in text or "ongoing" in text:
            detected_progress = 50
            
        # Update database values
        if detected_progress is not None:
            best_task["progress"] = min(max(detected_progress, 0), 100)
            if best_task["progress"] == 100:
                best_task["status"] = "completed"
                best_task["variance"] = "0 Days"
                best_task["anomaly"] = False
            else:
                best_task["status"] = "in_progress"
                
        # Detect anomaly/delay flags
        if "delay" in text or "stuck" in text or "slow" in text or "anomaly" in text:
            best_task["status"] = "in_progress"
            best_task["anomaly"] = True
            best_task["variance"] = "+4 Days (Est)"
            detected_status = "delayed"
            
        detected_status = best_task["status"]
        detected_progress = best_task["progress"]
        matched_wbs_id = best_task["wbs_id"]
        msg = f"NLP log parsed: mapped to task '{best_task['name']}' ({matched_wbs_id})."
    else:
        matched_wbs_id = None
        confidence = 0.0
        msg = "NLP log entry could not be confidently mapped to any active WBS task."
        
    return NLPLogResponse(
        message=msg,
        matched_wbs_id=matched_wbs_id,
        match_confidence=confidence,
        detected_progress=detected_progress,
        detected_status=detected_status,
        tasks=db_wbs
    )

@app.get("/api/v1/s-curve", response_model=List[SCurveDataPoint])
async def get_s_curve():
    """
    Returns weekly planned vs. actual progress percentage arrays.
    Calculates progress dynamically to feed recharts/chart.js graphs.
    """
    # Find status of Pier 4 (WBS 1.3)
    pier4_complete = False
    for task in db_wbs:
        if task["wbs_id"] == "WBS 1.3" and task["progress"] == 100:
            pier4_complete = True
            break
            
    # Weekly dataset (dynamically adjust Week 4 based on Pier 4 task completion status)
    s_curve = [
        {"week": "Wk 1", "Planned": 20, "Actual": 20},
        {"week": "Wk 2", "Planned": 45, "Actual": 45},
        {"week": "Wk 3", "Planned": 60, "Actual": 58},
        {"week": "Wk 4", "Planned": 68, "Actual": 72 if pier4_complete else 62}
    ]
    return s_curve

@app.post("/api/v1/reset")
async def reset_schedule():
    """
    Reset in-memory database WBS states to their initial mock schedule configuration for testing.
    """
    global db_wbs
    db_wbs = [dict(task) for task in INITIAL_WBS]
    return {"status": "Database state reset successfully", "data": db_wbs}
