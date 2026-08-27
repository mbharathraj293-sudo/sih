import os
import re
import json
import urllib.request
import urllib.error
import difflib
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("sih-backend-ai")

# Thresholds loaded from environment variables
AUTO_APPROVE_THRESHOLD = float(os.getenv("AUTO_APPROVE_THRESHOLD", "0.90"))
REVIEW_THRESHOLD = float(os.getenv("REVIEW_THRESHOLD", "0.70"))

def call_gemini_api(prompt: str) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {}
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Define structured JSON output schema for Gemini
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "activity": {"type": "STRING"},
                    "discipline": {"type": "STRING"},
                    "asset": {"type": "STRING"},
                    "location": {"type": "STRING"},
                    "quantity": {"type": "NUMBER"},
                    "unit": {"type": "STRING"},
                    "status": {"type": "STRING", "enum": ["completed", "in_progress", "pending", "delayed"]},
                    "reported_date": {"type": "STRING"},
                    "reported_time": {"type": "STRING"},
                    "delay_reason": {"type": "STRING"},
                    "confidence": {"type": "NUMBER"}
                },
                "required": ["activity", "discipline", "asset", "location", "status", "reported_date", "confidence"]
            }
        }
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10.0) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidate = res_data.get("candidates", [{}])[0]
            text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
            return json.loads(text.strip())
    except urllib.error.URLError as e:
        logger.error(f"Gemini API request failed: {e}")
        return {}
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {e}")
        return {}

def extract_report_data(raw_text: str) -> Dict[str, Any]:
    """
    Extract structured events from raw text.
    First tries Gemini API if GEMINI_API_KEY is defined.
    Otherwise falls back to rule-based NLP extraction.
    """
    logger.info("Extracting structured info from report text")
    
    # Try calling Gemini if API key is present
    if os.getenv("GEMINI_API_KEY"):
        prompt = f"""
        Extract structured engineering progress event from this report:
        ---
        {raw_text}
        ---
        Extract fields:
        - activity: short progress name (e.g. Spool Erection, Concrete Pour)
        - discipline: Civil, Piping, Electrical, Instrumentation, or Mechanical
        - asset: target structure/line/equipment ID (e.g. Line 24, Pier 4)
        - location: Sector A, Sector B, Unit 02, etc.
        - quantity: numeric amount of progress (or null)
        - unit: unit of quantity (e.g. spools, piles, meters, m3, percent, tons, loops, etc.)
        - status: completed, in_progress, pending, or delayed
        - reported_date: YYYY-MM-DD format
        - reported_time: HH:MM format
        - delay_reason: any issue, anomaly, or block reason (or null)
        - confidence: confidence score between 0.0 and 1.0 based on clarity of text.
        """
        gemini_result = call_gemini_api(prompt)
        if gemini_result:
            logger.info("Structured extraction using Gemini API completed successfully.")
            return gemini_result

    # Fallback to rule-based NLP extraction
    logger.info("Gemini API key missing or call failed. Using rule-based NLP extractor.")
    text_lower = raw_text.lower()
    
    # Defaults
    extracted = {
        "activity": "General Progress",
        "discipline": "Civil",
        "asset": "General Site",
        "location": "Sector A",
        "quantity": None,
        "unit": None,
        "status": "in_progress",
        "reported_date": datetime.now().strftime("%Y-%m-%d"),
        "reported_time": datetime.now().strftime("%H:%M"),
        "delay_reason": None,
        "confidence": 0.85
    }
    
    # 1. Discipline parsing
    if any(kwd in text_lower for kwd in ["piping", "spool", "weld", "ndt", "hydrotest"]):
        extracted["discipline"] = "Piping"
        extracted["activity"] = "Spool Erection"
    elif any(kwd in text_lower for kwd in ["cable", "tray", "power", "electrical", "substation", "grounding"]):
        extracted["discipline"] = "Electrical"
        extracted["activity"] = "Electrical Works"
    elif any(kwd in text_lower for kwd in ["jb", "junction box", "instrumentation", "calibrate", "valve", "dcs", "loop"]):
        extracted["discipline"] = "Instrumentation"
        extracted["activity"] = "Instrumentation Works"
    elif any(kwd in text_lower for kwd in ["pump", "compressor", "shaft", "coupling", "mechanical", "exchanger", "vessel"]):
        extracted["discipline"] = "Mechanical"
        extracted["activity"] = "Mechanical Erection"
    else:
        extracted["discipline"] = "Civil"
        if "excavation" in text_lower or "clearing" in text_lower:
            extracted["activity"] = "Excavation & Clearing"
        elif "pier" in text_lower or "curing" in text_lower or "concrete" in text_lower:
            extracted["activity"] = "Concrete Pour & Curing"
            
    # 2. Asset parsing
    asset_matches = {
        "pier 4": "Pier 4",
        "pier 1-3": "Piers 1-3",
        "piers 1-3": "Piers 1-3",
        "pier 5": "Pier 5",
        "line 24": "Line 24",
        "nh-48": "Expressway NH-48",
        "jb-101": "JB-101",
        "fv-201": "FV-201",
        "p-202a": "Pump P-202A",
        "p-202b": "Pump P-202B",
        "c-101": "Compressor C-101",
        "e-102": "Heat Exchanger E-102",
        "v-101": "Vessel V-101",
        "abutment a": "Abutment A"
    }
    for key, val in asset_matches.items():
        if key in text_lower:
            extracted["asset"] = val
            break
            
    # 3. Location parsing
    if "sector b" in text_lower or "unit 02" in text_lower:
        if "unit 02" in text_lower:
            extracted["location"] = "Unit 02"
        else:
            extracted["location"] = "Sector B"
    elif "sector a" in text_lower:
        extracted["location"] = "Sector A"
    elif "unit 02" in text_lower:
        extracted["location"] = "Unit 02"
        
    # 4. Status and progress
    if any(kwd in text_lower for kwd in ["complete", "done", "finish", "erected", "cured"]):
        extracted["status"] = "completed"
        extracted["confidence"] = 0.96
    elif any(kwd in text_lower for kwd in ["delay", "issue", "blocked", "stuck", "stop"]):
        extracted["status"] = "delayed"
        extracted["confidence"] = 0.88
    else:
        extracted["status"] = "in_progress"
        extracted["confidence"] = 0.85
        
    # 5. Quantity & Unit
    qty_pattern = r"(\d+(?:\.\d+)?)\s*(spools|piles|girders|meters|boxes|loops|joints|m3|percent|%|tons)"
    qty_match = re.search(qty_pattern, text_lower)
    if qty_match:
        extracted["quantity"] = float(qty_match.group(1))
        extracted["unit"] = qty_match.group(2)
        if extracted["unit"] == "%":
            extracted["unit"] = "percent"
    elif "12 spools" in text_lower:
        extracted["quantity"] = 12.0
        extracted["unit"] = "spools"
    elif "80%" in text_lower:
        extracted["quantity"] = 80.0
        extracted["unit"] = "percent"
    elif "50%" in text_lower:
        extracted["quantity"] = 50.0
        extracted["unit"] = "percent"
        
    # 6. Date & Time parsing
    date_match = re.search(r"(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december|aug)", text_lower)
    if date_match:
        day = int(date_match.group(1))
        month_name = date_match.group(2)
        months = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8, "aug": 8, "september": 9, "october": 10, "november": 11, "december": 12}
        month = months.get(month_name, 8)
        extracted["reported_date"] = f"2026-{month:02d}-{day:02d}"
        
    time_match = re.search(r"(\d{1,2})\s*(pm|am)", text_lower)
    if time_match:
        hour = int(time_match.group(1))
        meridiem = time_match.group(2)
        if meridiem == "pm" and hour < 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
        extracted["reported_time"] = f"{hour:02d}:00"
        
    # 7. Delay reason
    if "delay" in text_lower or "anomaly" in text_lower or "issue" in text_lower or "temperature" in text_lower:
        sentences = re.split(r"[.!?]", raw_text)
        for sent in sentences:
            if any(kwd in sent.lower() for kwd in ["delay", "issue", "blocked", "temperature", "cracking"]):
                extracted["delay_reason"] = sent.strip()
                break
                
    return extracted

class SemanticMatcher:
    """
    Interface for semantic similarity calculations.
    Can be inherited or extended to support dense vector embeddings or TF-IDF.
    """
    def calculate_similarity(self, text1: str, text2: str) -> float:
        stop_words = {"verify", "the", "a", "of", "and", "on", "in", "for", "to", "at", "is", "we", "are", "our", "logs", "sensor", "core", "curing"}
        
        words1 = set(re.findall(r"\w+", text1.lower())) - stop_words
        words2 = set(re.findall(r"\w+", text2.lower())) - stop_words
        
        if not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        overlap_score = len(intersection) / len(words2)
        
        seq_matcher = difflib.SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        
        return max(overlap_score, seq_matcher)

def match_activity(project_id: str, extracted_event: Dict[str, Any], db_conn) -> List[Dict[str, Any]]:
    """
    Hybrid activity matching engine. Matches an extracted progress event to the schedule activities.
    Uses: exact WBS codes, discipline, location, asset, dates, semantic similarity, and hierarchy.
    """
    cursor = db_conn.cursor()
    cursor.execute("""
        SELECT id, parent_id, level, activity_code, name, discipline, location, baseline_start, baseline_finish, status 
        FROM activities 
        WHERE project_id = ?
    """, (project_id,))
    
    activities = cursor.fetchall()
    candidates = []
    
    event_act = extracted_event.get("activity", "")
    event_disc = extracted_event.get("discipline", "")
    event_loc = extracted_event.get("location", "")
    event_asset = extracted_event.get("asset", "")
    event_date = extracted_event.get("reported_date", "")
    
    matcher = SemanticMatcher()
    
    for act in activities:
        act_id = act["id"]
        act_code = act["activity_code"] # WBS code e.g. "WBS 1.3"
        act_name = act["name"]
        act_disc = act["discipline"]
        act_loc = act["location"]
        act_start = act["baseline_start"]
        act_finish = act["baseline_finish"]
        
        score = 0.0
        reasons = []
        
        # 1. Exact identifiers (WBS code or activity ID)
        # Search for "WBS 1.3" or "L5-CIV-003" in raw text / activity name
        wbs_match = re.search(r"wbs\s*(\d+(?:\.\d+)*)", event_act.lower())
        if wbs_match:
            formatted_wbs = f"WBS {wbs_match.group(1)}"
            if formatted_wbs.lower() == act_code.lower():
                score = 0.98
                reasons.append("exact_wbs_match")
        elif act_id.lower() in event_act.lower() or act_code.lower() in event_act.lower():
            score = 0.98
            reasons.append("exact_id_match")
            
        if not reasons:
            # 2. Discipline matching
            disc_match = False
            if event_disc.lower() == act_disc.lower():
                score += 0.25
                reasons.append("discipline_match")
                disc_match = True
            else:
                score -= 0.40  # severe penalty for discipline mismatch
                
            # 3. Location matching
            if event_loc and act_loc and (event_loc.lower() == act_loc.lower() or event_loc.lower() in act_loc.lower() or act_loc.lower() in event_loc.lower()):
                score += 0.20
                reasons.append("location_match")
                
            # 4. Asset matching
            if event_asset and (event_asset.lower() in act_name.lower() or event_asset.lower() in act_loc.lower()):
                score += 0.25
                reasons.append("asset_match")
                
            # 5. Semantic similarity
            sim = matcher.calculate_similarity(event_act, act_name)
            if sim > 0.4:
                score += (sim * 0.30)
                reasons.append("semantic_similarity")
                
            # 6. Date consistency (Reported date is around baseline start/finish window)
            try:
                evt_d = datetime.strptime(event_date, "%Y-%m-%d")
                b_start = datetime.strptime(act_start, "%Y-%m-%d")
                b_finish = datetime.strptime(act_finish, "%Y-%m-%d")
                # If date is within baseline window + 10 days lag
                if b_start <= evt_d <= (b_finish + datetime.timedelta(days=10)):
                    score += 0.10
                    reasons.append("date_consistency")
            except Exception:
                pass
                
            # 7. Activity hierarchy
            # If the activity is L6, and its parent L5 matches
            if act["level"] == 6 and act["parent_id"]:
                # Check parent
                cursor.execute("SELECT discipline, location FROM activities WHERE id = ?", (act["parent_id"],))
                parent = cursor.fetchone()
                if parent and event_disc.lower() == parent["discipline"].lower():
                    score += 0.05
                    reasons.append("hierarchy_bonus")
                    
        # Clamp score between 0.0 and 1.0
        score = max(0.0, min(1.0, score))
        
        # Round confidence
        score = round(score, 3)
        
        if score > 0.3: # Minimum threshold to list as a candidate
            candidates.append({
                "activity_id": act_id,
                "activity_code": act_code,
                "activity_name": act_name,
                "confidence": score,
                "reasons": reasons
            })
            
    # Sort candidates by confidence descending
    candidates.sort(key=lambda x: x["confidence"], reverse=True)
    return candidates
