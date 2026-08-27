import unittest
import threading
import time
import urllib.request
import urllib.parse
import json
import os
from typing import Any
import uvicorn
from main import app

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Override DB path for testing if needed
        os.environ["SQLITE_DB_PATH"] = "test_sih_project.db"
        
        # Start server in daemon thread
        cls.server_thread = threading.Thread(
            target=uvicorn.run,
            args=(app,),
            kwargs={"host": "127.0.0.1", "port": 8005, "log_level": "warning"},
            daemon=True
        )
        cls.server_thread.start()
        time.sleep(1.5) # Wait for server to boot
        cls.base_url = "http://127.0.0.1:8005"

    @classmethod
    def tearDownClass(cls):
        # Delete test database
        if os.path.exists("test_sih_project.db"):
            try:
                os.remove("test_sih_project.db")
            except Exception:
                pass

    def request(self, path: str, method: str = "GET", data: Any = None, headers: dict = None, is_multipart: bool = False):
        url = f"{self.base_url}{path}"
        if headers is None:
            headers = {}
            
        payload = None
        if data is not None:
            if is_multipart:
                payload, mp_headers = data
                headers.update(mp_headers)
            else:
                payload = json.dumps(data).encode("utf-8")
                headers["Content-Type"] = "application/json"
                
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as res:
                body = res.read().decode("utf-8")
                return res.status, json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            return e.code, json.loads(body) if body else None
        except Exception as e:
            return 500, {"error": str(e)}

    def make_multipart(self, filename: str, content: str, fields: dict = None):
        boundary = "----TestBoundary"
        body = []
        if fields:
            for k, v in fields.items():
                body.append(f"--{boundary}".encode("utf-8"))
                body.append(f'Content-Disposition: form-data; name="{k}"'.encode("utf-8"))
                body.append(b"")
                body.append(str(v).encode("utf-8"))
        body.append(f"--{boundary}".encode("utf-8"))
        body.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode("utf-8"))
        body.append(b"Content-Type: text/plain")
        body.append(b"")
        body.append(content.encode("utf-8"))
        body.append(f"--{boundary}--".encode("utf-8"))
        
        payload = b"\r\n".join(body)
        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(payload))
        }
        return payload, headers

    def test_01_health(self):
        status, res = self.request("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["service"], "sih-intelligence-backend")

    def test_02_load_demo(self):
        status, res = self.request("/api/demo/load", method="POST")
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        self.assertIn("loaded successfully", res["message"])

    def test_03_projects(self):
        # List
        status, res = self.request("/api/projects")
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        self.assertEqual(len(res["data"]), 1)
        self.assertEqual(res["data"][0]["id"], "proj-unit-02")
        
        # Get single
        status, res = self.request("/api/projects/proj-unit-02")
        self.assertEqual(status, 200)
        self.assertEqual(res["data"]["name"], "Unit 02 Expansion")
        
        # Create new
        new_proj = {
            "id": "proj-test",
            "name": "Test Project",
            "description": "Integration testing",
            "location": "Sector C",
            "start_date": "2026-09-01",
            "end_date": "2026-10-31",
            "status": "pending"
        }
        status, res = self.request("/api/projects", method="POST", data=new_proj)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])

    def test_04_activities(self):
        # List all
        status, res = self.request("/api/activities")
        self.assertEqual(status, 200)
        self.assertTrue(len(res["data"]) >= 20)
        
        # Filters: discipline
        status, res = self.request("/api/activities?discipline=Piping")
        self.assertEqual(status, 200)
        for act in res["data"]:
            self.assertEqual(act["discipline"], "Piping")
            
        # Create activity
        new_act = {
            "id": "L5-CIV-007",
            "project_id": "proj-unit-02",
            "activity_code": "WBS 1.7",
            "name": "Final Clean-up and Handover",
            "discipline": "Civil",
            "location": "Sector A",
            "baseline_start": "2026-09-01",
            "baseline_finish": "2026-09-05",
            "quantity": 1.0,
            "unit": "job"
        }
        status, res = self.request("/api/activities", method="POST", data=new_act)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        
        # Patch activity
        patch_data = {"progress": 20, "status": "in_progress", "actual_start": "2026-09-01"}
        status, res = self.request("/api/activities/L5-CIV-007", method="PATCH", data=patch_data)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])

    def test_05_data_ingestion(self):
        # Ingest text
        text_data = {
            "text": "Piping spool erection completed Line 24 Unit 02 12 spools 26 August 4 PM",
            "project_id": "proj-unit-02",
            "reported_by": "Test Suite"
        }
        status, res = self.request("/api/ingestion/text", method="POST", data=text_data)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        self.assertEqual(res["data"]["source_type"], "text")
        self.assertIn("report_id", res["data"])
        
        # Ingest file (PDF)
        file_payload = self.make_multipart("report_pier4.pdf", "Pier 4 concrete pour completed Sector B 20 August")
        status, res = self.request("/api/ingestion/pdf", method="POST", data=file_payload, is_multipart=True)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        self.assertEqual(res["data"]["source_type"], "pdf")

    def test_06_ai_extraction_and_matching(self):
        # Create a text log and extract
        text_data = {
            "text": "Spool Erection for Line 24 in Unit 02 completed at 4 PM on 26 August. 12 spools erected.",
            "project_id": "proj-unit-02"
        }
        _, res_ing = self.request("/api/ingestion/text", method="POST", data=text_data)
        report_id = res_ing["data"]["report_id"]
        
        # Extract
        status, res_ext = self.request("/api/ai/extract", method="POST", data={"report_id": report_id})
        self.assertEqual(status, 200)
        self.assertTrue(res_ext["success"])
        self.assertEqual(res_ext["data"]["discipline"], "Piping")
        self.assertEqual(res_ext["data"]["status"], "completed")
        self.assertEqual(res_ext["data"]["quantity"], 12.0)
        
        # Match
        status, res_match = self.request("/api/ai/match", method="POST", data={
            "project_id": "proj-unit-02",
            "extracted_event": res_ext["data"]
        })
        self.assertEqual(status, 200)
        self.assertTrue(res_match["success"])
        self.assertTrue(len(res_match["data"]["matches"]) > 0)
        self.assertEqual(res_match["data"]["matches"][0]["activity_id"], "L6-PIP-024A")

    def test_07_review_queue_and_approvals(self):
        # Verify review queue contains items
        status, res_q = self.request("/api/review-queue")
        self.assertEqual(status, 200)
        self.assertTrue(len(res_q["data"]) > 0)
        
        # Find a pending item
        item_id = res_q["data"][0]["id"]
        
        # Approve
        status, res_app = self.request(f"/api/review/{item_id}/approve", method="POST")
        self.assertEqual(status, 200)
        self.assertTrue(res_app["success"])
        
        # Reassign and approve another
        # Find another
        status, res_q2 = self.request("/api/review-queue")
        pending_items = [i for i in res_q2["data"] if i["status"] == "pending_review"]
        if pending_items:
            target_id = pending_items[0]["id"]
            # Reassign
            status, res_re = self.request(f"/api/review/{target_id}/reassign", method="POST", data={"wbs_id": "L5-CIV-003"})
            self.assertEqual(status, 200)
            
            # Approve
            status, res_app2 = self.request(f"/api/review/{target_id}/approve", method="POST")
            self.assertEqual(status, 200)

    def test_08_schedule_update(self):
        update_data = {
            "activity_id": "L5-CIV-004",
            "actual_start": "2026-08-25",
            "actual_finish": "2026-09-02",
            "progress": 100,
            "status": "completed"
        }
        status, res = self.request("/api/schedule/update", method="POST", data=update_data)
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        # Variance should be calculated: actual finish (09-02) - baseline finish (09-05) = -3 days (ahead)
        self.assertEqual(res["data"]["variance_days"], -3)

    def test_09_analytics_engines(self):
        # Variance
        status, res_var = self.request("/api/analytics/variance")
        self.assertEqual(status, 200)
        self.assertTrue(res_var["success"])
        
        # Risk
        status, res_risk = self.request("/api/analytics/risk")
        self.assertEqual(status, 200)
        self.assertTrue(res_risk["success"])
        
        # Dashboard
        status, res_db = self.request("/api/analytics/dashboard")
        self.assertEqual(status, 200)
        self.assertTrue(res_db["success"])
        self.assertTrue(res_db["data"]["total_activities"] > 0)
        
        # Chart APIs
        for chart_path in ["progress-trend", "discipline-progress", "matching-performance", "risk-distribution", "activity-status", "variance-summary"]:
            status, res = self.request(f"/api/analytics/{chart_path}")
            self.assertEqual(status, 200)
            self.assertTrue(res["success"])

    def test_10_memory_and_search(self):
        # Memory
        status, res_mem = self.request("/api/memory/activity/L5-CIV-003")
        self.assertEqual(status, 200)
        self.assertTrue(res_mem["success"])
        
        # Search
        status, res_search = self.request("/api/search?q=Piping")
        self.assertEqual(status, 200)
        self.assertTrue(res_search["success"])
        self.assertTrue(len(res_search["data"]["activities"]) > 0)

    def test_11_audit_log(self):
        status, res = self.request("/api/audit")
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])
        self.assertTrue(len(res["data"]) > 0)

    # ---------------- COMPATIBILITY ROUTE TESTS ----------------
    def test_12_legacy_endpoints(self):
        # v1 health
        status, res = self.request("/api/v1/health")
        self.assertEqual(status, 200)
        self.assertEqual(res["status"], "healthy")
        
        # v1 reset
        status, res = self.request("/api/v1/reset", method="POST")
        self.assertEqual(status, 200)
        self.assertTrue(len(res["data"]) > 0)
        
        # v1 wbs-tasks
        status, res = self.request("/api/v1/wbs-tasks")
        self.assertEqual(status, 200)
        self.assertTrue(len(res) > 0)
        self.assertEqual(res[0]["wbs_id"], "WBS 1.1")
        
        # v1 telemetry ingest
        file_payload = self.make_multipart("spool_log.txt", "Spool Erection Line 24 Unit 02 12 spools 26 August 4 PM")
        status, res = self.request("/api/v1/telemetry/ingest", method="POST", data=file_payload, is_multipart=True)
        self.assertEqual(status, 200)
        self.assertIn("processed successfully", res["message"])
        
        # v1 review-queue
        status, res = self.request("/api/v1/review-queue")
        self.assertEqual(status, 200)
        self.assertTrue(len(res) > 0)
        
        # v1 notifications
        status, res = self.request("/api/v1/notifications")
        self.assertEqual(status, 200)
        self.assertTrue(len(res) > 0)

if __name__ == "__main__":
    unittest.main()
