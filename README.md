# Syntarx AI: Intelligent Data Capture Dashboard

This project is a high-fidelity, full-stack prototype designed for a construction management hackathon. It features a Python FastAPI backend acting as the Work Breakdown Structure (WBS) schedule database, and a React + Tailwind CSS client dashboard simulating Computer Vision photo capture analytics.

---

## 🛠️ Tech Stack & Requirements

- **Backend**: Python (3.8+), FastAPI, Uvicorn
- **Frontend**: Node.js (18+), React (19), Tailwind CSS v4, Lucide React (Icons)

---

## 🚀 Running the Project Locally

To run this application, you must run both the **FastAPI Backend Server** and the **Vite Frontend Server** concurrently.

### 1. Backend Setup & Run (Python FastAPI)

1. Open a new terminal in the project directory.
2. Create and activate a Python virtual environment (if not already done):
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install the dependencies listed in `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will boot on **`http://localhost:8000`**.*

### 2. Frontend Setup & Run (React + Vite)

1. Open a second terminal window in the project directory.
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will boot on **`http://localhost:5173`**.*

---

## 🏗️ Interactive Demo Flow

1. Open **`http://localhost:5173/`** in your browser.
2. Note that the **Gantt Chart** at the bottom pulls its state directly from the backend. The **"Pier 4 Concrete Pour"** actual progress bar is initialized to **50% (Amber)**.
3. Click the **"Upload Drone Photo / Sensor Log"** button in the Multi-Modal Ingestion Zone (top-left).
4. Observe the **Live AI Insights Terminal** on the top-right:
   - It transitions to processing mode (`Running Computer Vision Model...`).
   - Call the backend `POST /process-site-data` endpoint.
   - After exactly **2 seconds**, it receives the payload response and outputs the structured JSON output with confidence metadata.
5. Watch the Gantt progress bar for **Pier 4** automatically and smoothly animate from **50% to 100%** and change its color from **Amber to Emerald Green (Completed)**.
6. A success toast notification pops up in the bottom-right corner confirming WBS synchronization with MS Project.
7. To run the demo again, click the **"Reset Database State"** button in the top action bar. This triggers `POST /reset` to refresh the mock state inside the Python server.
