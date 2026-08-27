import sqlite3
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_FILE = os.getenv("SQLITE_DB_PATH", "sih_project.db")
logger = logging.getLogger("sih-backend-db")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    logger.info(f"Initializing database at {DB_FILE}")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Projects Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT
    )
    """)
    
    # 2. Activities Table (with support for WBS hierarchy)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        parent_id TEXT,
        level INTEGER DEFAULT 5,
        activity_code TEXT NOT NULL,
        name TEXT NOT NULL,
        discipline TEXT,
        location TEXT,
        baseline_start TEXT,
        baseline_finish TEXT,
        actual_start TEXT,
        actual_finish TEXT,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        quantity REAL,
        unit TEXT,
        risk_level TEXT DEFAULT 'low',
        variance_days INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)
    
    # 3. Reports Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_name TEXT NOT NULL,
        raw_text TEXT,
        discipline TEXT,
        reported_date TEXT,
        reported_by TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)
    
    # 4. Extracted Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extracted_events (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        activity TEXT,
        discipline TEXT,
        asset TEXT,
        location TEXT,
        quantity REAL,
        unit TEXT,
        status TEXT,
        reported_date TEXT,
        reported_time TEXT,
        delay_reason TEXT,
        confidence REAL,
        FOREIGN KEY (report_id) REFERENCES reports(report_id)
    )
    """)
    
    # 5. Activity Matches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_matches (
        match_id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        confidence REAL,
        reasons TEXT, -- JSON array of reasons
        FOREIGN KEY (report_id) REFERENCES reports(report_id),
        FOREIGN KEY (activity_id) REFERENCES activities(id)
    )
    """)
    
    # 6. Review Queue Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS review_queue (
        id TEXT PRIMARY KEY, -- maps to match_id or review_id
        report_id TEXT NOT NULL,
        source TEXT,
        extracted_event_id TEXT NOT NULL,
        suggested_activity_id TEXT,
        status TEXT DEFAULT 'pending_review', -- pending_review, approved, rejected
        reason TEXT,
        candidates TEXT, -- JSON array of candidates
        FOREIGN KEY (report_id) REFERENCES reports(report_id),
        FOREIGN KEY (extracted_event_id) REFERENCES extracted_events(id),
        FOREIGN KEY (suggested_activity_id) REFERENCES activities(id)
    )
    """)
    
    # 7. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action_source TEXT NOT NULL,
        report_id TEXT,
        activity_id TEXT,
        old_value TEXT,
        new_value TEXT,
        action TEXT NOT NULL,
        confidence REAL
    )
    """)
    
    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_discipline ON activities(discipline)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_reported_date ON reports(reported_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_events_report_id ON extracted_events(report_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_matches_report_id ON activity_matches(report_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_matches_activity_id ON activity_matches(activity_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status)")
    
    conn.commit()
    conn.close()
    logger.info("Database schemas and indexes initialized successfully.")

def clear_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM review_queue")
    cursor.execute("DELETE FROM activity_matches")
    cursor.execute("DELETE FROM extracted_events")
    cursor.execute("DELETE FROM reports")
    cursor.execute("DELETE FROM activities")
    cursor.execute("DELETE FROM projects")
    cursor.execute("DELETE FROM audit_logs")
    conn.commit()
    conn.close()
    logger.info("Database cleared.")

def load_demo_data():
    clear_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Insert Project
    cursor.execute("""
    INSERT INTO projects (id, name, description, location, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        "proj-unit-02", 
        "Unit 02 Expansion", 
        "Expansion of Unit 02 processing area, piping spools erection, and telemetry linking", 
        "Sector B", 
        "2026-08-01", 
        "2026-12-31", 
        "in_progress"
    ))
    
    # 2. Insert Activities (L5/L6 tasks)
    # 20-30 realistic tasks spanning Civil, Piping, Electrical, Instrumentation, and Mechanical
    activities = [
        # Civil (L5 tasks)
        ("L5-CIV-001", "proj-unit-02", None, 5, "WBS 1.1", "NH-48 Expressway Site Clearing & Excavation", "Civil", "Sector A", "2026-08-01", "2026-08-05", "2026-08-01", "2026-08-05", "completed", 100, 500, "m3", "low", 0),
        ("L5-CIV-002", "proj-unit-02", None, 5, "WBS 1.2", "Foundation Pile Installation for Pier 1-3", "Civil", "Sector A", "2026-08-06", "2026-08-15", "2026-08-06", "2026-08-15", "completed", 100, 30, "piles", "low", 0),
        ("L5-CIV-003", "proj-unit-02", None, 5, "WBS 1.3", "Pier 4 Concrete Pour & Curing", "Civil", "Sector B", "2026-08-16", "2026-08-23", "2026-08-16", None, "in_progress", 50, 150, "m3", "medium", 3),
        ("L5-CIV-004", "proj-unit-02", None, 5, "WBS 1.4", "Precast Girder Assembly & Deck Erection", "Civil", "Sector B", "2026-08-24", "2026-09-05", None, None, "pending", 0, 12, "girders", "low", 0),
        ("L5-CIV-005", "proj-unit-02", None, 5, "WBS 1.5", "Pier 5 Foundation Excavation", "Civil", "Sector B", "2026-08-20", "2026-08-28", None, None, "pending", 0, 100, "m3", "low", 0),
        ("L5-CIV-006", "proj-unit-02", None, 5, "WBS 1.6", "Abutment A Concrete Retaining Wall", "Civil", "Sector A", "2026-08-10", "2026-08-25", "2026-08-10", "2026-08-27", "completed", 100, 220, "m3", "medium", 2),
        
        # Piping (L5/L6 tasks)
        ("L5-PIP-001", "proj-unit-02", None, 5, "WBS 2.1", "Pipe Spool Fabrication - 10 Inch Carbon Steel", "Piping", "Sector B", "2026-08-01", "2026-08-20", "2026-08-01", "2026-08-18", "completed", 100, 120, "spools", "low", -2),
        ("L5-PIP-002", "proj-unit-02", None, 5, "WBS 2.2", "Pipe Rack Steel Structure Assembly", "Piping", "Sector B", "2026-08-10", "2026-08-28", "2026-08-10", None, "in_progress", 80, 45, "tons", "low", 0),
        # L6 sub-activities for Pipe Rack Steel Structure Assembly
        ("L6-PIP-024A", "proj-unit-02", "L5-PIP-002", 6, "WBS 2.2.1", "Spool Erection - Line 24", "Piping", "Unit 02", "2026-08-20", "2026-08-28", None, None, "pending", 0, 12, "spools", "low", 0),
        ("L6-PIP-024B", "proj-unit-02", "L5-PIP-002", 6, "WBS 2.2.2", "Welding & NDT - Line 24", "Piping", "Unit 02", "2026-08-25", "2026-08-30", None, None, "pending", 0, 24, "joints", "low", 0),
        ("L5-PIP-003", "proj-unit-02", None, 5, "WBS 2.3", "Utility Line Piping Hydrotesting", "Piping", "Sector B", "2026-09-01", "2026-09-10", None, None, "pending", 0, 5, "loops", "low", 0),
        
        # Electrical (L5 tasks)
        ("L5-ELC-001", "proj-unit-02", None, 5, "WBS 3.1", "Substation Cable Tray Installation", "Electrical", "Sector B", "2026-08-15", "2026-08-30", "2026-08-18", None, "in_progress", 40, 350, "meters", "low", 0),
        ("L5-ELC-002", "proj-unit-02", None, 5, "WBS 3.2", "Main Power Cable Pulling", "Electrical", "Sector B", "2026-08-25", "2026-09-10", None, None, "pending", 0, 1200, "meters", "low", 0),
        ("L5-ELC-003", "proj-unit-02", None, 5, "WBS 3.3", "Transformer T-01 Terminal Connections", "Electrical", "Sector B", "2026-09-05", "2026-09-15", None, None, "pending", 0, 24, "cores", "low", 0),
        ("L5-ELC-004", "proj-unit-02", None, 5, "WBS 3.4", "Substation Grounding Grid Testing", "Electrical", "Sector B", "2026-08-12", "2026-08-18", "2026-08-12", "2026-08-18", "completed", 100, 1, "test", "low", 0),
        
        # Instrumentation (L5 tasks)
        ("L5-INS-001", "proj-unit-02", None, 5, "WBS 4.1", "Junction Box JB-101 Mounting & Wiring", "Instrumentation", "Unit 02", "2026-08-18", "2026-08-28", "2026-08-20", None, "in_progress", 30, 4, "boxes", "medium", 0),
        ("L5-INS-002", "proj-unit-02", None, 5, "WBS 4.2", "Control Valve FV-201 Calibration", "Instrumentation", "Unit 02", "2026-08-22", "2026-08-27", None, None, "pending", 0, 1, "unit", "low", 0),
        ("L5-INS-003", "proj-unit-02", None, 5, "WBS 4.3", "DCS Loop Testing & Commissioning", "Instrumentation", "Sector B", "2026-09-10", "2026-09-25", None, None, "pending", 0, 50, "loops", "high", 0),
        
        # Mechanical (L5 tasks)
        ("L5-MEC-001", "proj-unit-02", None, 5, "WBS 5.1", "Centrifugal Pump P-202A Installation", "Mechanical", "Unit 02", "2026-08-10", "2026-08-20", "2026-08-10", "2026-08-20", "completed", 100, 1, "set", "low", 0),
        ("L5-MEC-002", "proj-unit-02", None, 5, "WBS 5.2", "Centrifugal Pump P-202B Installation & Alignment", "Mechanical", "Unit 02", "2026-08-18", "2026-08-28", "2026-08-20", None, "in_progress", 60, 1, "set", "low", 0),
        ("L5-MEC-003", "proj-unit-02", None, 5, "WBS 5.3", "Compressor C-101 Shaft Coupling Alignment", "Mechanical", "Unit 02", "2026-08-25", "2026-09-05", None, None, "pending", 0, 1, "unit", "medium", 0),
        ("L5-MEC-004", "proj-unit-02", None, 5, "WBS 5.4", "Heat Exchanger E-102 Erection on Foundation", "Mechanical", "Sector B", "2026-08-14", "2026-08-22", "2026-08-14", "2026-08-22", "completed", 100, 1, "unit", "low", 0),
        ("L5-MEC-005", "proj-unit-02", None, 5, "WBS 5.5", "Vessel V-101 Internal Inspection & Boxing-up", "Mechanical", "Sector B", "2026-08-24", "2026-08-29", None, None, "pending", 0, 1, "job", "low", 0)
    ]
    
    cursor.executemany("""
    INSERT INTO activities (id, project_id, parent_id, level, activity_code, name, discipline, location, baseline_start, baseline_finish, actual_start, actual_finish, status, progress, quantity, unit, risk_level, variance_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, activities)
    
    # 3. Create Sample Reports
    reports_data = [
        ("RPT-101", "proj-unit-02", "text", "Daily Construction Log Book", "Excavation and site clearing completed on Expressway NH-48 Sector A as planned. Output verified by lead surveyor.", "Civil", "2026-08-05", "John Doe"),
        ("RPT-102", "proj-unit-02", "text", "Weekly Progress Summary", "Pier 4 concrete pour is currently at 50% completion. However, temperature sensors indicate high core temperatures. Action required to mitigate cracking risk.", "Civil", "2026-08-20", "Alice Smith"),
        ("RPT-103", "proj-unit-02", "text", "Piping Progress Email", "Spool Erection for Line 24 in Unit 02 completed at 4 PM on 26 August. 12 spools erected.", "Piping", "2026-08-26", "Bob Green")
    ]
    
    cursor.executemany("""
    INSERT INTO reports (report_id, project_id, source_type, source_name, raw_text, discipline, reported_date, reported_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, reports_data)
    
    # 4. Create Extracted Events matching reports
    # Let's populate the events
    events_data = [
        ("EVT-101", "RPT-101", "NH-48 Expressway Site Clearing & Excavation", "Civil", "Expressway NH-48", "Sector A", 500.0, "m3", "completed", "2026-08-05", "17:00", None, 0.98),
        ("EVT-102", "RPT-102", "Pier 4 Concrete Pour & Curing", "Civil", "Pier 4", "Sector B", 50.0, "percent", "in_progress", "2026-08-20", "11:30", "Thermal core temperature threshold exceeded", 0.94),
        ("EVT-103", "RPT-103", "Spool Erection", "Piping", "Line 24", "Unit 02", 12.0, "spools", "completed", "2026-08-26", "16:00", None, 0.96)
    ]
    
    cursor.executemany("""
    INSERT INTO extracted_events (id, report_id, activity, discipline, asset, location, quantity, unit, status, reported_date, reported_time, delay_reason, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, events_data)
    
    # 5. Insert Matches
    # RPT-103 matches L6-PIP-024A with 96% confidence
    # RPT-102 matches L5-CIV-003 with 88% confidence
    matches_data = [
        ("MCH-101", "RPT-101", "L5-CIV-001", 0.98, json.dumps(["exact_name_match", "discipline_match", "location_match"])),
        ("MCH-102", "RPT-102", "L5-CIV-003", 0.88, json.dumps(["discipline_match", "asset_match", "location_match", "semantic_similarity"])),
        ("MCH-103", "RPT-103", "L6-PIP-024A", 0.96, json.dumps(["discipline_match", "asset_match", "location_match", "semantic_similarity"]))
    ]
    
    cursor.executemany("""
    INSERT INTO activity_matches (match_id, report_id, activity_id, confidence, reasons)
    VALUES (?, ?, ?, ?, ?)
    """, matches_data)
    
    # 6. Populate Review Queue
    # In review queue: MCH-103 is auto-approved because conf >= 0.90 (actually wait, let's keep it in the queue for demonstration, or mark it approved)
    # The prompt says: "Send low-confidence records to Review Queue"
    # AUTO_APPROVE_THRESHOLD = 0.90
    # MCH-102 (0.88) goes to pending_review.
    # MCH-103 (0.96) could be approved or pending_review depending on whether we want to show it. In the legacy INITIAL_REVIEW_QUEUE,
    # REV-001 (Line 24 Spool Erection) is pending_review with confidence 0.96. We should match that!
    # Let's populate the review queue:
    # 1. Spool Erection Line 24 (suggested: L6-PIP-024A, status: pending_review)
    # 2. Pier 4 Concrete Pour (suggested: L5-CIV-003, status: pending_review)
    candidates_evt3 = [
        {"wbs_id": "L6-PIP-024A", "name": "Spool Erection - Line 24", "confidence": 0.96},
        {"wbs_id": "L5-CIV-003", "name": "Pier 4 Concrete Pour & Curing", "confidence": 0.52}
    ]
    candidates_evt2 = [
        {"wbs_id": "L5-CIV-003", "name": "Pier 4 Concrete Pour & Curing", "confidence": 0.88},
        {"wbs_id": "L5-CIV-002", "name": "Foundation Pile Installation for Pier 1-3", "confidence": 0.45}
    ]
    
    review_queue_data = [
        ("REV-001", "RPT-103", "Daily Site Log PDF", "EVT-103", "L6-PIP-024A", "pending_review", "High semantic similarity & matching location/asset ID", json.dumps(candidates_evt3)),
        ("REV-002", "RPT-102", "Drone Orthophoto (DJI RTK)", "EVT-102", "L5-CIV-003", "pending_review", "Explicit reference to Pier 4 and curing status", json.dumps(candidates_evt2))
    ]
    
    cursor.executemany("""
    INSERT INTO review_queue (id, report_id, source, extracted_event_id, suggested_activity_id, status, reason, candidates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, review_queue_data)
    
    # 7. Insert Audit Logs
    audit_data = [
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "system", "RPT-101", "L5-CIV-001", "0", "100", "AI matched report RPT-101 to L5-CIV-001 with 98.0% confidence.", 0.98),
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "system", "RPT-102", "L5-CIV-003", "0", "50", "AI matched report RPT-102 to L5-CIV-003 with 88.0% confidence.", 0.88)
    ]
    
    cursor.executemany("""
    INSERT INTO audit_logs (timestamp, action_source, report_id, activity_id, old_value, new_value, action, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, audit_data)
    
    conn.commit()
    conn.close()
    logger.info("Demo dataset loaded successfully.")

# Run init_db() automatically on load to ensure file exists and is healthy
init_db()
if not os.path.exists(DB_FILE) or os.path.getsize(DB_FILE) == 0:
    load_demo_data()
