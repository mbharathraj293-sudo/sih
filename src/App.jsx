import React, { useState, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  HardHat, 
  Activity, 
  FileUp, 
  FileText, 
  Terminal as TerminalIcon, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  UploadCloud, 
  Check, 
  Loader2, 
  RefreshCw, 
  User, 
  MapPin, 
  Bell, 
  ExternalLink, 
  Clock,
  Database,
  Layers,
  ChevronRight,
  Search,
  CheckCircle,
  TrendingUp,
  Cpu,
  Share2,
  ListTodo
} from 'lucide-react';

const INITIAL_LOGS = [
  { time: '15:54:05', type: 'system', text: 'Telemetry sync broker online. Port listener 8000 connected.' },
  { time: '15:54:08', type: 'system', text: 'Active Primavera P6 Baseline Database: "Bridge_Alpha_P2_Rev4".' },
  { time: '15:54:10', type: 'system', text: 'In-memory telemetry feed ready for IoT/Lidar stream ingestion...' }
];

const BACKEND_URL = 'http://localhost:8000';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [nlpText, setNlpText] = useState('Verify concrete curing progress on Pier 4. Core temperature sensor logs: Normal.');
  const [currentTime, setCurrentTime] = useState('15:54:10');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const terminalEndRef = useRef(null);

  // Fetch WBS schedule from FastAPI backend
  const fetchSchedule = async (silent = false) => {
    try {
      const res = await fetch(`${BACKEND_URL}/schedule`);
      if (!res.ok) throw new Error('API server returned error status');
      const data = await res.json();
      setTasks(data);
      setIsApiConnected(true);
    } catch (err) {
      console.error('Failed to fetch schedule from backend:', err);
      setIsApiConnected(false);
      if (!silent) {
        const time = new Date().toTimeString().split(' ')[0];
        setLogs(prev => [
          ...prev,
          { time, type: 'system', text: `WARNING: Unable to connect to backend at ${BACKEND_URL}. Check if main.py is running.` }
        ]);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchSchedule();
    
    // Time simulation
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle API site data processing
  const triggerIngestion = async (fileName = 'lidar_site_scan_pier4_volumetrics.las') => {
    if (isUploading) return;

    setIsUploading(true);
    setUploadSuccess(false);

    // Ingest initiation logs
    const uploadTime = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [
      ...prev,
      { time: uploadTime, type: 'ingest', text: `Receiving sensor log stream: "${fileName}"` },
      { time: uploadTime, type: 'pipeline', text: `Routing raw IoT payload to FastAPI model validator...` }
    ]);

    // Simulated parsing steps before backend response
    const simTimeout1 = setTimeout(() => {
      const time = new Date().toTimeString().split(' ')[0];
      setLogs(prev => [
        ...prev,
        { time, type: 'engine', text: 'CV_ENGINE: Processing raw point cloud datasets...' }
      ]);
    }, 600);

    const simTimeout2 = setTimeout(() => {
      const time = new Date().toTimeString().split(' ')[0];
      setLogs(prev => [
        ...prev,
        { time, type: 'engine', text: 'CV_ENGINE: Extracting volumetric structural telemetry on Pier 4...' }
      ]);
    }, 1200);

    try {
      // Call FastAPI backend to process data
      const res = await fetch(`${BACKEND_URL}/process-site-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('API server returned error during WBS processing');
      const apiResponse = await res.json();

      clearTimeout(simTimeout1);
      clearTimeout(simTimeout2);

      const completeTime = new Date().toTimeString().split(' ')[0];
      setLogs(prev => [
        ...prev,
        { time: completeTime, type: 'success', text: 'CV_ENGINE: Analysis complete. Raw telemetry output data fetched:' },
        { time: completeTime, type: 'json', text: JSON.stringify(apiResponse, null, 2) },
        { time: completeTime, type: 'system', text: 'PRIMAVERA_BROKER: Recalculating critical path...' },
        { time: completeTime, type: 'system', text: 'PRIMAVERA_BROKER: Primavera P6 baseline synchronized. Baseline delta successfully updated.' }
      ]);

      setIsUploading(false);
      setUploadSuccess(true);
      
      // Re-fetch the updated schedule state from the backend WBS database
      await fetchSchedule(true);
      setShowToast(true);
    } catch (err) {
      clearTimeout(simTimeout1);
      clearTimeout(simTimeout2);
      console.error('API Ingestion Error:', err);
      
      const errorTime = new Date().toTimeString().split(' ')[0];
      setLogs(prev => [
        ...prev,
        { time: errorTime, type: 'system', text: `ERROR: POST request to ${BACKEND_URL}/process-site-data failed. Ingestion pipeline aborted.` }
      ]);
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      triggerIngestion(file.name);
    }
  };

  const handleManualNlpParse = () => {
    if (nlpText.trim() === '') return;
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [
      ...prev,
      { time, type: 'nlp', text: `NLP Manual Log Entry: "${nlpText}"` },
      { time, type: 'nlp', text: 'NLP_PARSER: Extracting structural tokens and linking to WBS 1.3...' }
    ]);
    triggerIngestion('manual_telemetry_transcript.txt');
  };

  const resetDemo = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('API server returned error during reset');
      
      setLogs(INITIAL_LOGS);
      setUploadSuccess(false);
      setShowToast(false);
      
      // Fetch reset schedule
      await fetchSchedule(true);
    } catch (err) {
      console.error('Failed to reset schedule:', err);
      setLogs(prev => [
        ...prev,
        { time: new Date().toTimeString().split(' ')[0], type: 'system', text: 'ERROR: Failed to trigger backend database reset.' }
      ]);
    }
  };

  // Helper to determine if Pier 4 Concrete Pour WBS is complete based on backend progress
  const getPier4Task = () => {
    return tasks.find(t => t.wbs_id === 'WBS 1.3');
  };
  
  const pier4Task = getPier4Task();
  const isPier4Complete = pier4Task ? pier4Task.progress === 100 : false;

  // Cascading KPI values based on backend WBS state
  const overallProgress = isPier4Complete ? 72 : 68;
  const scheduleVariance = isPier4Complete ? 'On Schedule' : '-3 Days';
  const activeAnomalies = isPier4Complete ? 2 : 2; // Keep anomaly count constant as requested

  // S-Curve mock dataset tracking over 4 weeks (dynamically updates week 4 based on backend Pier 4 completion)
  const chartData = [
    { week: 'Wk 1', Planned: 20, Actual: 20 },
    { week: 'Wk 2', Planned: 45, Actual: 45 },
    { week: 'Wk 3', Planned: 60, Actual: 58 },
    { week: 'Wk 4', Planned: 68, Actual: isPier4Complete ? 72 : 62 }
  ];

  // Helper to get Gantt bar attributes depending on task WBS
  const getGanttLayout = (wbsId, progress) => {
    switch (wbsId) {
      case 'WBS 1.1':
        return { left: '0%', plannedWidth: '25%', actualWidth: `${25 * (progress / 100)}%` };
      case 'WBS 1.2':
        return { left: '20%', plannedWidth: '33%', actualWidth: `${33 * (progress / 100)}%` };
      case 'WBS 1.3':
        return { left: '45%', plannedWidth: '28%', actualWidth: `${28 * (progress / 100)}%` };
      case 'WBS 1.4':
        return { left: '70%', plannedWidth: '25%', actualWidth: `${25 * (progress / 100)}%` };
      default:
        return { left: '0%', plannedWidth: '20%', actualWidth: '0%' };
    }
  };

  // Filter tasks if search query is typed
  const filteredTasks = tasks.filter(task => 
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.wbs_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-900">
      {/* Background visual guides */}
      <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none z-0" />

      {/* 1. Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand & Project Selector Dropdown */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10">
                <HardHat className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">
                  Command Center
                </span>
                <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Intelligent Schedule-Linking Layer</p>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-slate-350 px-3 py-1.5 rounded-lg cursor-pointer transition-all">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              <select 
                className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
                defaultValue="bridge-p2"
              >
                <option value="bridge-p2">Bridge Alpha - Phase 2</option>
                <option value="metro-line-3">Metro Line 3 - Tunneling</option>
                <option value="terminal-t4">Terminal 4 - Expansion</option>
              </select>
            </div>
          </div>

          {/* Search bar inside Navigation */}
          <div className="hidden md:flex items-center relative max-w-xs w-full">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:bg-white text-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none transition-all"
            />
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Sync to Primavera P6 Outline Button */}
            <button 
              onClick={resetDemo}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-sm focus:outline-none"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Sync to Primavera P6</span>
            </button>

            {/* Notification Bell */}
            <button className="relative p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus:outline-none shrink-0">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
            </button>

            <div className="h-6 w-[1px] bg-slate-200" />

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs select-none">
                  BR
                </div>
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isApiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 relative z-10">

        {/* 2. KPI Metrics Ribbon (Top Row) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Overall Progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Overall Progress</span>
              <h3 className="font-extrabold text-2xl text-slate-900 mt-1 transition-all duration-1000">
                {overallProgress}%
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">MS Project Sync Status</p>
            </div>
            
            {/* Inline SVG Sparkline */}
            <div className="flex flex-col items-end">
              <svg viewBox="0 0 100 30" className="h-7 w-20 text-blue-600">
                <path 
                  d={isPier4Complete ? "M 0,25 L 30,22 L 60,18 L 100,5" : "M 0,25 L 30,22 L 60,18 L 100,12"} 
                  stroke="currentColor" 
                  fill="none" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="text-[9px] text-slate-400 mt-1 font-mono font-semibold">+4.0% Delta</span>
            </div>
          </div>

          {/* Card 2: Schedule Variance */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Schedule Variance</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-extrabold text-lg rounded-md px-2 py-0.5 transition-all duration-1000 ${
                  isPier4Complete 
                    ? 'bg-green-50 text-green-700 border border-green-200 text-xs' 
                    : 'bg-red-50 text-red-600 border border-red-200 text-xs'
                }`}>
                  {scheduleVariance}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">P6 Baseline Variance</p>
            </div>
            <div className={`p-2 rounded-lg border ${
              isPier4Complete ? 'bg-green-50 border-green-150 text-green-600' : 'bg-red-50 border-red-150 text-red-600'
            }`}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: AI Confidence Score */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AI Confidence Score</span>
              <h3 className="font-extrabold text-2xl text-slate-900 mt-1">94%</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">Computer Vision Avg</p>
            </div>
            <div className="p-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
              <Cpu className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Active Anomalies */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Anomalies</span>
              <h3 className="font-extrabold text-2xl text-slate-900 mt-1">{activeAnomalies}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">Unresolved Conflicts</p>
            </div>
            <div className="p-2 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>

        </section>

        {/* 3. Main Content Grid (Two Columns) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN (Operational - 1/3 Width) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Card 1: Field Telemetry Ingestion */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-blue-600" />
                  Field Telemetry Ingestion
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Link construction drone orthophotos or LiDAR telemetry.</p>
              </div>

              {/* Dashed dropzone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/15' 
                    : 'border-slate-350 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50/80'
                }`}
                onClick={() => triggerIngestion()}
              >
                <div className="p-2.5 bg-white border border-slate-200 rounded-full mb-2 shadow-sm">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <UploadCloud className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                
                <h3 className="font-bold text-[11px] text-slate-700 mb-0.5">Drag telemetry files here</h3>
                <p className="text-[9px] text-slate-400 max-w-[200px] mb-3 leading-normal">Supports RAW scans & sensor logs.</p>
                
                <button 
                  type="button"
                  disabled={isUploading}
                  className={`text-[10px] font-bold px-3 py-2 rounded-md transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer ${
                    isUploading
                      ? 'bg-slate-100 border border-slate-200 text-slate-450 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerIngestion();
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing Telemetry...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-3 w-3" />
                      Process Site Capture (Drone/IoT)
                    </>
                  )}
                </button>
              </div>

              {/* Minimal NLP Log Entry */}
              <div className="flex flex-col gap-2">
                <label htmlFor="nlp-telemetry-log" className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Manual NLP Telemetry Entry
                </label>
                <textarea 
                  id="nlp-telemetry-log"
                  value={nlpText}
                  onChange={(e) => setNlpText(e.target.value)}
                  placeholder="Enter manual site observations..."
                  className="bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:bg-white text-slate-700 text-[11px] rounded-lg p-2.5 h-16 resize-none focus:outline-none transition-all"
                />
                <button 
                  onClick={handleManualNlpParse}
                  disabled={isUploading}
                  className="self-end text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 flex items-center gap-0.5 py-0.5 px-1.5 hover:bg-blue-50 rounded transition-all cursor-pointer disabled:opacity-40"
                >
                  Verify NLP WBS <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Card 2: Automated Variance Detection */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-blue-600" />
                  Automated Variance Detection
                </h2>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border font-mono ${
                  isUploading ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-450 border-slate-200'
                }`}>
                  {isUploading ? 'RUNNING' : 'LISTEN'}
                </span>
              </div>

              {/* Terminal Logs */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] flex flex-col gap-2 min-h-[220px] max-h-[220px] overflow-y-auto select-text shadow-inner">
                <div className="flex-1 flex flex-col gap-1.5">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1 leading-relaxed animate-slide-in">
                      <span className="text-slate-400 select-none">[{log.time}]</span>
                      
                      {log.type === 'system' && <span className="text-blue-600 font-bold">[SYS]</span>}
                      {log.type === 'ingest' && <span className="text-indigo-600 font-bold">[INGEST]</span>}
                      {log.type === 'pipeline' && <span className="text-teal-600 font-bold">[PIPE]</span>}
                      {log.type === 'engine' && <span className="text-amber-600 font-bold">[MODEL]</span>}
                      {log.type === 'success' && <span className="text-green-600 font-bold">[OK]</span>}
                      {log.type === 'nlp' && <span className="text-purple-600 font-bold">[NLP]</span>}

                      {log.type === 'json' ? (
                        <div className="w-full mt-1.5 bg-green-50 border border-green-200 rounded-md p-2.5 text-green-800 shadow-sm font-sans">
                          <div className="flex items-center gap-1.5 mb-1 font-bold text-[10px]">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <span>Telemetry Analysis Match</span>
                          </div>
                          <pre className="font-mono text-[9px] leading-normal select-all overflow-x-auto">
                            {log.text}
                          </pre>
                        </div>
                      ) : (
                        <span className={`flex-1 ${
                          log.type === 'success' ? 'text-green-700 font-medium' :
                          log.type === 'engine' ? 'text-amber-700' :
                          log.type === 'nlp' ? 'text-purple-700' :
                          'text-slate-650'
                        }`}>
                          {log.text}
                        </span>
                      )}
                    </div>
                  ))}

                  {isUploading && (
                    <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-slate-200 animate-pulse font-sans">
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Analyzing structural telemetry...</span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 animate-infinite-loading rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Strategic - 2/3 Width) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Card 3: WBS Progress Sync (Gantt/Table) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  WBS Progress Sync
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Primavera P6 baseline status linked directly to telemetry records.</p>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <th className="py-2.5 px-3 font-mono text-[10px]">WBS CODE</th>
                      <th className="py-2.5 px-3">TASK DESCRIPTION</th>
                      <th className="py-2.5 px-3">PLANNED DATE</th>
                      <th className="py-2.5 px-3 text-center">ACTUAL STATUS</th>
                      <th className="py-2.5 px-3 w-36">PROGRESS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const isCompleted = task.status === 'completed';
                        const isInProgress = task.status === 'in_progress';
                        const isPending = task.status === 'pending';

                        // Semantic status colors
                        let statusBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        let progressBarColor = 'bg-slate-350';
                        if (isCompleted) {
                          statusBadgeColor = 'bg-green-50 text-green-700 border-green-200';
                          progressBarColor = 'bg-green-500';
                        } else if (isInProgress) {
                          statusBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                          progressBarColor = 'bg-amber-500';
                          if (task.variance.includes('+')) {
                            // delayed
                            statusBadgeColor = 'bg-red-50 text-red-600 border-red-200 animate-pulse';
                            progressBarColor = 'bg-red-500';
                          }
                        }

                        return (
                          <tr key={task.wbs_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-600">{task.wbs_id}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{task.name}</td>
                            <td className="py-3 px-3 text-slate-500 font-mono">
                              {task.wbs_id === 'WBS 1.1' ? '2026-08-01' : 
                               task.wbs_id === 'WBS 1.2' ? '2026-08-10' : 
                               task.wbs_id === 'WBS 1.3' ? '2026-08-20' : '2026-09-02'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                                {task.status === 'in_progress' && task.variance.includes('+') ? 'delayed' : task.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[10px] w-8 text-right text-slate-700">
                                  {task.progress}%
                                </span>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden relative">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${progressBarColor}`}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-xs text-slate-400 font-mono">
                          No tasks matched search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 4: Planned vs. Actual (S-Curve) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Planned vs. Actual (S-Curve)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Cumulative progress percentage charting tracking over the last 4 weeks.</p>
              </div>

              {/* Recharts S-Curve Line Chart */}
              <div className="h-56 w-full select-none text-[10px] flex justify-center overflow-x-auto">
                <LineChart
                  width={540}
                  height={220}
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#1e293b' }}
                    formatter={(value) => [`${value}%`]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  {/* Planned line (gray dashed) */}
                  <Line 
                    type="monotone" 
                    dataKey="Planned" 
                    name="Planned Baseline"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="4 4" 
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {/* Actual line (solid blue) */}
                  <Line 
                    type="monotone" 
                    dataKey="Actual" 
                    name="Actual Progress"
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                    animationDuration={1000}
                  />
                </LineChart>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Floating crisp white Toast Alert */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-slate-100/50 backdrop-blur-md max-w-sm">
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600 border border-green-150 self-start shrink-0">
              <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-0.5">WBS Linked</h4>
              <p className="text-xs font-bold text-slate-800 mb-1">
                Primavera P6 Baseline Updated.
              </p>
              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                Task WBS 1.3 concrete pour verified complete. Baseline critical path recalculated successfully.
              </p>
              <div className="flex items-center gap-1 text-[9px] text-green-600 font-mono font-bold bg-green-50 py-0.5 px-2 rounded border border-green-100 self-start w-fit">
                <Check className="h-3 w-3" /> P6 DATABASE SYNCED
              </div>
            </div>
            
            <button 
              onClick={() => setShowToast(false)}
              className="text-slate-400 hover:text-slate-600 text-base font-bold focus:outline-none px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
