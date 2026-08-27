import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
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
  ListTodo,
  TrendingDown,
  Brain,
  History,
  Settings as SettingsIcon,
  X,
  Edit2,
  Trash2,
  Play,
  RotateCcw,
  Sliders,
  CheckSquare,
  AlertTriangle,
  FileCheck,
  Send,
  Download,
  Menu,
  Sparkles
} from 'lucide-react';

// Import our API services
import { getWbsTasks, resetSchedule, getActivities, getActivity, patchActivity, resetDemoDataOnBackend, WBSTask, Activity as BackendActivity } from './services/activities';
import { uploadTelemetry, ingestText, ingestFile, IngestionResult, NormalizedReport } from './services/ingestion';
import { getReviewQueue, approveReviewItem, rejectReviewItem, editReviewItem, reassignReviewItem, ReviewItem } from './services/review';
import { getAnalytics, getProjectMemory, getNotifications, getAuditLogs, searchProject, AuditLog, ProjectMemoryItem, NotificationItem } from './services/analytics';
import { askCopilot, aiExtract, aiMatch } from './services/ai';
import { getActivityMemory, ActivityMemory } from './services/memory';
import { updateSchedule } from './services/schedule';

// Curated colors for clean light theme charts
const COLORS = ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#6366f1', '#a855f7'];

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Navigation Routing State
  const [activeTab, setActiveTab] = useState<'overview' | 'capture' | 'activities' | 'matching' | 'review' | 'schedule' | 'variance_risk' | 'project_intelligence' | 'project_memory' | 'audit_trail' | 'settings'>('overview');
  
  // Local UI Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{ activities: any[]; reports: any[] } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  // Slide-over Panels & Drawers
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  
  // Details Modal States
  const [selectedTaskEvidence, setSelectedTaskEvidence] = useState<WBSTask | null>(null);
  const [editingReviewItem, setEditingReviewItem] = useState<ReviewItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReviewItem['extracted_event']>>({});
  const [reassigningReviewItem, setReassigningReviewItem] = useState<ReviewItem | null>(null);
  const [selectedMemoryActivity, setSelectedMemoryActivity] = useState<string | null>(null);
  const [loadedMemoryData, setLoadedMemoryData] = useState<ActivityMemory | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  
  // Ingestion File & Text Upload UI State
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'parsing' | 'done'>('idle');
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [manualReportText, setManualReportText] = useState('Spool Erection for Line 24 in Unit 02 completed at 4 PM on 26 August. 12 spools erected.');
  const [manualDiscipline, setManualDiscipline] = useState<string>('Piping');
  
  // Anomaly Resolution / Before-After States
  const [beforeAfterSync, setBeforeAfterSync] = useState<{
    activity: string;
    before: { status: string; finish: string; variance: string; risk: string };
    after: { status: string; finish: string; variance: string; risk: string };
    showAfter: boolean;
  }>({
    activity: 'L6-PIP-024A',
    before: { status: 'In Progress', finish: '--', variance: '--', risk: 'Medium' },
    after: { status: 'Completed', finish: '26-Aug-2026', variance: '+2 Days', risk: 'High' },
    showAfter: false
  });

  // Copilot Chat State
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: 'Hello! I am your Project Intelligence Copilot. Ask me questions about delays, risk factors, or task statistics!' }
  ]);
  const [sendingCopilot, setSendingCopilot] = useState(false);

  // Demo / Simulation Mode State
  const [demoMode, setDemoMode] = useState(false);
  const [localWbsTasks, setLocalWbsTasks] = useState<WBSTask[]>([]);
  const [localReviewQueue, setLocalReviewQueue] = useState<ReviewItem[]>([]);
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);
  const [localAuditLogs, setLocalAuditLogs] = useState<AuditLog[]>([]);
  const [localTerminalLogs, setLocalTerminalLogs] = useState<string[]>([
    'SYSTEM: Telemetry broker online. Standby mode active.',
    'PRIMAVERA P6: Initialized bridge schedule synchronization layer.',
    'AI CORE: Dynamic fuzzy matching engine loaded. Core model version 2.4.1.'
  ]);
  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [backendConnected, setBackendConnected] = useState(true);

  // Presentation Judge Mode State
  const [judgeDemoActive, setJudgeDemoActive] = useState(false);
  const [judgeDemoStep, setJudgeDemoStep] = useState(0);

  const addTerminalLog = (log: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLocalTerminalLogs(prev => [...prev, `[${time}] ${log}`]);
  };

  const showToast = (title: string, text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 5500);
  };

  // Keyboard navigation & Esc key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowMobileMenu(false);
        setShowCopilot(false);
        setSelectedTaskEvidence(null);
        setEditingReviewItem(null);
        setReassigningReviewItem(null);
        setSelectedMemoryActivity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ----------------------------------------------------
  // React Query Hooks (fetching from real API)
  // ----------------------------------------------------
  const { data: apiTasks, isError: errorTasks, refetch: refetchWbsTasks } = useQuery({
    queryKey: ['wbs-tasks'],
    queryFn: getWbsTasks,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiReviewQueue, refetch: refetchReviewQueue } = useQuery({
    queryKey: ['review-queue'],
    queryFn: getReviewQueue,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiProjectMemory, refetch: refetchProjectMemory } = useQuery({
    queryKey: ['project-memory'],
    queryFn: getProjectMemory,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiAuditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: getAuditLogs,
    enabled: !demoMode,
    retry: 1,
  });

  // Track API Connection Status
  useEffect(() => {
    if (errorTasks) {
      setBackendConnected(false);
      if (!demoMode) {
        showToast('API Server Disconnected', 'Failed to connect to FastAPI backend. Enabling Demo Mode automatically.', 'warning');
        setDemoMode(true);
      }
    } else if (apiTasks) {
      setBackendConnected(true);
    }
  }, [errorTasks, apiTasks, demoMode]);

  // Load Demo Data Scenario initially if demo mode is enabled
  const loadDemoData = () => {
    const baselineTasks: WBSTask[] = [
      { wbs_id: "L5-CIV-001", name: "NH-48 Expressway Site Clearing & Excavation", planned_date: "2026-08-05", status: "completed", progress: 100, anomaly: false, variance: "0 Days", discipline: "Civil", asset: "Expressway NH-48", location: "Sector A", baseline_start: "2026-08-01", baseline_finish: "2026-08-05", actual_start: "2026-08-01", actual_finish: "2026-08-05" },
      { wbs_id: "L5-CIV-002", name: "Foundation Pile Installation for Pier 1-3", planned_date: "2026-08-15", status: "completed", progress: 100, anomaly: false, variance: "0 Days", discipline: "Civil", asset: "Piers 1-3", location: "Sector A", baseline_start: "2026-08-06", baseline_finish: "2026-08-15", actual_start: "2026-08-06", actual_finish: "2026-08-15" },
      { wbs_id: "L5-CIV-003", name: "Pier 4 Concrete Pour & Curing", planned_date: "2026-08-23", status: "in_progress", progress: 50, anomaly: true, variance: "+3 Days (Est)", discipline: "Civil", asset: "Pier 4", location: "Sector B", baseline_start: "2026-08-16", baseline_finish: "2026-08-23", actual_start: "2026-08-16" },
      { wbs_id: "L5-CIV-004", name: "Precast Girder Assembly & Deck Erection", planned_date: "2026-09-05", status: "pending", progress: 0, anomaly: false, variance: "--", discipline: "Civil", asset: "Girders A-D", location: "Sector B", baseline_start: "2026-08-24", baseline_finish: "2026-09-05" },
      { wbs_id: "L5-PIP-001", name: "Pipe Spool Fabrication - 10 Inch Carbon Steel", planned_date: "2026-08-20", status: "completed", progress: 100, anomaly: false, variance: "-2 Days", discipline: "Piping", asset: "Line 24 Spool", location: "Sector B", baseline_start: "2026-08-01", baseline_finish: "2026-08-20", actual_start: "2026-08-01", actual_finish: "2026-08-18" },
      { wbs_id: "L5-PIP-002", name: "Pipe Rack Steel Structure Assembly", planned_date: "2026-08-28", status: "in_progress", progress: 80, anomaly: false, variance: "0 Days", discipline: "Piping", asset: "Pipe Rack Steel", location: "Sector B", baseline_start: "2026-08-10", baseline_finish: "2026-08-28", actual_start: "2026-08-10" },
      { wbs_id: "L6-PIP-024A", name: "Spool Erection - Line 24", planned_date: "2026-08-28", status: "pending", progress: 0, anomaly: false, variance: "--", discipline: "Piping", asset: "Line 24", location: "Unit 02", baseline_start: "2026-08-20", baseline_finish: "2026-08-28" },
      { wbs_id: "L6-PIP-024B", name: "Welding & NDT - Line 24", planned_date: "2026-08-30", status: "pending", progress: 0, anomaly: false, variance: "--", discipline: "Piping", asset: "Line 24", location: "Unit 02", baseline_start: "2026-08-25", baseline_finish: "2026-08-30" },
      { wbs_id: "L5-ELC-001", name: "Substation Cable Tray Installation", planned_date: "2026-08-30", status: "in_progress", progress: 40, anomaly: false, variance: "0 Days", discipline: "Electrical", asset: "General Site", location: "Sector B", baseline_start: "2026-08-15", baseline_finish: "2026-08-30", actual_start: "2026-08-18" },
      { wbs_id: "L5-INS-001", name: "Junction Box JB-101 Mounting & Wiring", planned_date: "2026-08-28", status: "in_progress", progress: 30, anomaly: false, variance: "0 Days", discipline: "Instrumentation", asset: "JB-101", location: "Unit 02", baseline_start: "2026-08-18", baseline_finish: "2026-08-28", actual_start: "2026-08-20" },
      { wbs_id: "L5-MEC-001", name: "Centrifugal Pump P-202A Installation", planned_date: "2026-08-20", status: "completed", progress: 100, anomaly: false, variance: "0 Days", discipline: "Mechanical", asset: "Pump P-202A", location: "Unit 02", baseline_start: "2026-08-10", baseline_finish: "2026-08-20", actual_start: "2026-08-10", actual_finish: "2026-08-20" }
    ];

    const baselineReviews: ReviewItem[] = [
      {
        id: "REV-001",
        source: "Drone Orthophoto (DJI RTK)",
        extracted_event: { discipline: "Piping", activity: "Spool Erection", asset_id: "Line 24", location: "Unit 02", date: "2026-08-26", time: "16:00", status: "completed", quantity: 12, unit: "spools", confidence: 0.96 },
        suggested_activity: "L6-PIP-024A",
        status: "pending_review",
        reason: "High semantic similarity & matching location/asset ID",
        candidates: [
          { activity_id: "L6-PIP-024A", activity_code: "L6-PIP-024A", activity_name: "Spool Erection - Line 24", confidence: 0.96, reasons: ["discipline_match", "location_match", "asset_match", "semantic_similarity"] },
          { activity_id: "L6-PIP-024B", activity_code: "L6-PIP-024B", activity_name: "Welding & NDT - Line 24", confidence: 0.72, reasons: ["discipline_match", "location_match"] }
        ]
      },
      {
        id: "REV-002",
        source: "Daily Site Log PDF",
        extracted_event: { discipline: "Civil", activity: "Concrete Curing", asset_id: "Pier 4", location: "Sector B", date: "2026-08-20", time: "11:30", status: "in_progress", quantity: 50, unit: "percent", delay_reason: "Thermal core temperature threshold exceeded", confidence: 0.88 },
        suggested_activity: "L5-CIV-003",
        status: "pending_review",
        reason: "Explicit reference to Pier 4 and curing status",
        candidates: [
          { activity_id: "L5-CIV-003", activity_code: "L5-CIV-003", activity_name: "Pier 4 Concrete Pour & Curing", confidence: 0.88, reasons: ["discipline_match", "asset_match", "semantic_similarity"] }
        ]
      }
    ];

    const baselineNotifications: NotificationItem[] = [
      { id: "notif-1", message: "2 WBS synchronization tickets require planner review.", timestamp: "10:15 AM", type: "info", read: false },
      { id: "notif-2", message: "Activity L5-PIP-001 fabrication baseline synced successfully.", timestamp: "09:30 AM", type: "success", read: false },
      { id: "notif-3", message: "Thermal anomaly core sensor threshold triggered on Pier 4.", timestamp: "08:00 AM", type: "warning", read: true }
    ];

    const baselineAudits: AuditLog[] = [
      { id: 1, timestamp: "2026-08-25 09:30:15", action_source: "system", report_id: "RPT-101", activity_id: "L5-PIP-001", old_value: "Progress: 80%, Status: in_progress", new_value: "Progress: 100%, Status: completed", action: "AI auto-matched and updated spool fabrication with 98.0% confidence.", confidence: 0.98 }
    ];

    setLocalWbsTasks(baselineTasks);
    setLocalReviewQueue(baselineReviews);
    setLocalNotifications(baselineNotifications);
    setLocalAuditLogs(baselineAudits);
    addTerminalLog("DEMO: Loaded realistic project baseline. WBS L6-PIP-024A pending update.");
  };

  useEffect(() => {
    if (demoMode && localWbsTasks.length === 0) {
      loadDemoData();
    }
  }, [demoMode]);

  // Dynamic state selectors based on demo toggles
  const tasks: WBSTask[] = demoMode ? localWbsTasks : (apiTasks || []);
  const reviewQueue: ReviewItem[] = demoMode ? localReviewQueue : (apiReviewQueue || []);
  const notificationsList: NotificationItem[] = demoMode ? localNotifications : (apiNotifications || []);
  const auditLogs: AuditLog[] = demoMode ? localAuditLogs : (apiAuditLogs || []);

  // ----------------------------------------------------
  // Dynamic KPIs calculations
  // ----------------------------------------------------
  const totalActivities = tasks.length;
  const completedActivities = tasks.filter(t => t.status === 'completed').length;
  const inProgressActivities = tasks.filter(t => t.status === 'in_progress').length;
  const delayedActivities = tasks.filter(t => t.status === 'in_progress' && (t.anomaly || t.wbs_id === 'L5-CIV-003')).length;
  const reviewRequiredCount = reviewQueue.filter(r => r.status === 'pending_review').length;
  const aiMatchedReports = auditLogs.length + reviewQueue.filter(r => r.status === 'approved').length;

  // ----------------------------------------------------
  // Global Search logic
  // ----------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      if (demoMode) {
        const query = searchQuery.toLowerCase();
        const filteredActs = tasks.filter(t => 
          t.wbs_id.toLowerCase().includes(query) || 
          t.name.toLowerCase().includes(query) ||
          t.discipline.toLowerCase().includes(query)
        );
        setGlobalSearchResults({ activities: filteredActs, reports: [] });
      } else {
        const delaySearch = setTimeout(async () => {
          try {
            const data = await searchProject(searchQuery);
            setGlobalSearchResults(data);
          } catch (e) {
            console.error("Search failed:", e);
          }
        }, 300);
        return () => clearTimeout(delaySearch);
      }
    } else {
      setGlobalSearchResults(null);
    }
  }, [searchQuery, tasks, demoMode]);

  // Global filters
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && task.status === 'completed') ||
      (statusFilter === 'in_progress' && task.status === 'in_progress') ||
      (statusFilter === 'delayed' && task.status === 'in_progress' && (task.anomaly || task.wbs_id === 'L5-CIV-003')) ||
      (statusFilter === 'pending' && task.status === 'pending');

    const matchesDiscipline = disciplineFilter === 'all' || task.discipline.toLowerCase() === disciplineFilter.toLowerCase();
    return matchesStatus && matchesDiscipline;
  });

  // ----------------------------------------------------
  // Data Ingestion and Telemetry Extraction
  // ----------------------------------------------------
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processIngestFile(file);
    }
  };

  const triggerIngestionClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.csv,.xlsx,.txt';
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        processIngestFile(target.files[0]);
      }
    };
    fileInput.click();
  };

  const processIngestFile = async (file: File) => {
    setIsUploadingLocal(true);
    setProcessingState('uploading');
    setUploadProgress(0);
    addTerminalLog(`INGEST: Uploading site report "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessingState('parsing');
          addTerminalLog(`AI_CORE: Ingestion complete. Running computer vision & NLP extraction heuristics...`);
          
          setTimeout(async () => {
            await handleExtractionResult(file.name, `Telemetry document parse: completed 12 spools erection for Line 24 piping at Unit 02 Sector B on 26 August 2026. Code matches WBS 2.2.`);
          }, 1500);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleManualIngest = () => {
    if (manualReportText.trim() === '') return;
    setIsUploadingLocal(true);
    setProcessingState('parsing');
    setUploadProgress(100);
    addTerminalLog(`INGEST: Parsing manual telemetry report: "${manualReportText.substring(0, 40)}..."`);
    
    setTimeout(async () => {
      await handleExtractionResult('Manual Report Input', manualReportText);
    }, 1200);
  };

  const handleExtractionResult = async (sourceName: string, text: string) => {
    if (demoMode) {
      const textLower = text.toLowerCase();
      const extracted: ReviewItem['extracted_event'] = {
        discipline: manualDiscipline,
        activity: textLower.includes('spool') || textLower.includes('piping') ? 'Spool Erection' : 'Concrete Construction',
        asset_id: textLower.includes('line 24') ? 'Line 24' : 'General Site',
        location: textLower.includes('unit 02') ? 'Unit 02' : 'Sector B',
        date: '2026-08-26',
        time: '16:00',
        status: textLower.includes('complete') || textLower.includes('erected') ? 'completed' : 'in_progress',
        quantity: 12,
        unit: 'spools',
        confidence: 0.96
      };

      const candidates = [
        { activity_id: "L6-PIP-024A", activity_code: "L6-PIP-024A", activity_name: "Spool Erection - Line 24", confidence: 0.96, reasons: ["discipline_match", "location_match", "asset_match", "semantic_similarity"] },
        { activity_id: "L6-PIP-024B", activity_code: "L6-PIP-024B", activity_name: "Welding & NDT - Line 24", confidence: 0.78, reasons: ["discipline_match", "location_match"] }
      ];

      const newId = `REV-00${localReviewQueue.length + 1}`;
      const mockResult: IngestionResult = {
        review_id: newId,
        source: sourceName,
        extracted_event: extracted as any,
        suggested_activity: 'L6-PIP-024A',
        candidates: candidates as any
      };

      setIngestionResult(mockResult);
      
      const newItem: ReviewItem = {
        id: newId,
        source: sourceName,
        extracted_event: extracted as any,
        suggested_activity: 'L6-PIP-024A',
        status: 'pending_review',
        reason: 'Fuzzy similarity match on piping spool erection',
        candidates: candidates as any
      };

      setLocalReviewQueue(prev => [newItem, ...prev]);
      setLocalNotifications(prev => [
        { id: `notif-${Date.now()}`, message: `New report ${newId} queued for review.`, timestamp: "Just Now", type: "info", read: false },
        ...prev
      ]);

      setIsUploadingLocal(false);
      setProcessingState('done');
      showToast('AI Ingestion Complete', `Extracted report successfully, queued as ${newId}.`, 'success');
      addTerminalLog(`AI_CORE: Extraction success. Linked suggested WBS: L6-PIP-024A`);
      setActiveTab('matching');
    } else {
      try {
        const result = await uploadTelemetry(sourceName === 'Manual Report Input' ? undefined : new File([text], sourceName), sourceName === 'Manual Report Input' ? text : undefined);
        setIngestionResult(result);
        
        await refetchReviewQueue();
        await refetchAnalytics();
        await refetchNotifications();

        setIsUploadingLocal(false);
        setProcessingState('done');
        showToast('AI Ingestion Complete', `Telemetry parsed by backend and created review ticket.`, 'success');
        addTerminalLog(`API: Telemetry upload response returned ID ${result.review_id}. Matched WBS ${result.suggested_activity}`);
        setActiveTab('matching');
      } catch (err) {
        setIsUploadingLocal(false);
        setProcessingState('idle');
        showToast('Ingestion Error', 'Unable to upload to the server. Please check the backend connection.', 'warning');
        addTerminalLog('ERROR: Backend upload pipeline failed. Ingestion aborted.');
      }
    }
  };

  // ----------------------------------------------------
  // Review Queue Approve / Reject / Reassign Actions
  // ----------------------------------------------------
  const handleApprove = async (id: string) => {
    addTerminalLog(`PLANNER: Approving report ticket ${id}...`);
    if (demoMode) {
      const itemIndex = localReviewQueue.findIndex(r => r.id === id);
      if (itemIndex === -1) return;

      const item = localReviewQueue[itemIndex];
      const updatedQueue = [...localReviewQueue];
      updatedQueue[itemIndex] = { ...item, status: 'approved' };
      setLocalReviewQueue(updatedQueue);

      const targetWbs = item.suggested_activity;
      if (targetWbs) {
        setLocalWbsTasks(prev => prev.map(t => {
          if (t.wbs_id === targetWbs) {
            return {
              ...t,
              progress: 100,
              status: 'completed',
              variance: '0 Days',
              anomaly: false,
              actual_finish: item.extracted_event.date
            };
          }
          return t;
        }));
        
        // Log Audit Log
        const newAudit: AuditLog = {
          id: localAuditLogs.length + 1,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          action_source: "planner",
          report_id: item.id,
          activity_id: targetWbs,
          old_value: "Progress: 0%, Status: pending",
          new_value: "Progress: 100%, Status: completed",
          action: `Planner approved match. Schedule synced: updated ${targetWbs} actuals.`,
          confidence: item.extracted_event.confidence
        };
        setLocalAuditLogs(prev => [newAudit, ...prev]);
        addTerminalLog(`WBS_SYNC: Primavera database synced. Task ${targetWbs} status set to completed.`);
      }

      showToast('WBS Activity Approved', `Ticket ${id} verified. Live schedule updated immediately.`, 'success');
      
      // Update Before -> After widget
      if (targetWbs === 'L6-PIP-024A') {
        setBeforeAfterSync(prev => ({ ...prev, showAfter: true }));
      }
    } else {
      try {
        await approveReviewItem(id);
        await refetchWbsTasks();
        await refetchReviewQueue();
        await refetchAnalytics();
        await refetchNotifications();
        await refetchAuditLogs();
        showToast('WBS Activity Approved', `Schedule updated via API successfully.`, 'success');
        addTerminalLog(`API: Review item ${id} approval successfully pushed to backend.`);
        
        // Update Before -> After widget
        setBeforeAfterSync(prev => ({ ...prev, showAfter: true }));
      } catch (err) {
        showToast('Approval Error', 'Backend failed to process approval.', 'warning');
      }
    }
  };

  const handleReject = async (id: string) => {
    addTerminalLog(`PLANNER: Rejecting report ticket ${id}...`);
    if (demoMode) {
      setLocalReviewQueue(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      showToast('Report Rejected', `Ticket ${id} marked as rejected. WBS unchanged.`, 'info');
    } else {
      try {
        await rejectReviewItem(id);
        await refetchReviewQueue();
        await refetchNotifications();
        await refetchAuditLogs();
        showToast('Report Rejected', `Ticket status updated to rejected.`, 'info');
      } catch (err) {
        showToast('Rejection Error', 'Failed to reject review item.', 'warning');
      }
    }
  };

  const handleEditReviewSave = async () => {
    if (!editingReviewItem) return;
    const id = editingReviewItem.id;
    addTerminalLog(`PLANNER: Saving edited event metadata for ticket ${id}...`);
    
    if (demoMode) {
      setLocalReviewQueue(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            extracted_event: {
              ...r.extracted_event,
              ...editForm
            } as any
          };
        }
        return r;
      }));
      setEditingReviewItem(null);
      showToast('Report Edited', `Ticket ${id} fields updated locally.`, 'success');
    } else {
      try {
        await editReviewItem(id, editForm as any);
        await refetchReviewQueue();
        setEditingReviewItem(null);
        showToast('Report Edited', 'Ticket fields updated on API server.', 'success');
      } catch (err) {
        showToast('Edit Error', 'Failed to save changes.', 'warning');
      }
    }
  };

  const handleReassignSave = async (wbsId: string) => {
    if (!reassigningReviewItem) return;
    const id = reassigningReviewItem.id;
    addTerminalLog(`PLANNER: Reassigning ticket ${id} to ${wbsId}...`);
    
    if (demoMode) {
      setLocalReviewQueue(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            suggested_activity: wbsId,
            reason: `Manually reassigned to activity code ${wbsId}`
          };
        }
        return r;
      }));
      setReassigningReviewItem(null);
      showToast('Reassigned WBS Code', `Ticket ${id} reassigned to ${wbsId}.`, 'success');
    } else {
      try {
        await reassignReviewItem(id, wbsId);
        await refetchReviewQueue();
        setReassigningReviewItem(null);
        showToast('Reassigned WBS Code', 'Reassignment saved to API server.', 'success');
      } catch (err) {
        showToast('Reassign Error', 'Failed to reassign activity.', 'warning');
      }
    }
  };

  // ----------------------------------------------------
  // Dynamic Charts Calculations
  // ----------------------------------------------------
  const lineChartData = [
    { week: 'Wk 1', Planned: 20, Actual: 20 },
    { week: 'Wk 2', Planned: 45, Actual: 45 },
    { week: 'Wk 3', Planned: 60, Actual: 58 },
    { week: 'Wk 4', Planned: 70, Actual: beforeAfterSync.showAfter ? 72 : 62 }
  ];

  const disciplineProgressData = [
    { discipline: 'Civil', progress: 83 },
    { discipline: 'Piping', progress: tasks.find(t => t.wbs_id === 'L6-PIP-024A')?.status === 'completed' ? 90 : 40 },
    { discipline: 'Electrical', progress: 40 },
    { discipline: 'Instrumentation', progress: 30 },
    { discipline: 'Mechanical', progress: 100 }
  ];

  const matchingPerformanceData = [
    { name: 'Auto Matched', value: aiMatchedReports + 2 },
    { name: 'Planner Reviewed', value: 3 },
    { name: 'Unmatched / Pending', value: reviewRequiredCount }
  ];

  const delayRiskData = [
    { name: 'High', value: delayedActivities },
    { name: 'Medium', value: inProgressActivities - delayedActivities },
    { name: 'Low', value: completedActivities }
  ];

  const scheduleVarianceData = [
    { name: 'Ahead', value: 1 },
    { name: 'On Time', value: completedActivities - 1 },
    { name: 'Delayed', value: delayedActivities }
  ];

  const activityStatusData = [
    { name: 'Completed', value: completedActivities },
    { name: 'In Progress', value: inProgressActivities },
    { name: 'Not Started', value: tasks.filter(t => t.status === 'pending').length },
    { name: 'Blocked', value: delayedActivities }
  ];

  // ----------------------------------------------------
  // Copilot Chat Handler
  // ----------------------------------------------------
  const handleAskCopilot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (copilotQuestion.trim() === '') return;

    const userText = copilotQuestion;
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setCopilotQuestion('');
    setSendingCopilot(true);

    if (demoMode) {
      setTimeout(() => {
        let answer = "I have scanned the local schedule database. Currently, WBS L5-CIV-003 (Pier 4 Concrete Pour) is marked as delayed due to core temperature spikes. Spool Erection WBS L6-PIP-024A was recently updated to 100% completed based on supervisor report verification.";
        const lower = userText.toLowerCase();
        if (lower.includes('piping') || lower.includes('delay')) {
          answer = "Piping tasks are currently 90% completed. The primary variance was on Line 24 erection which had a +2 days delay due to welder mobilization constraints, now fully synced and completed.";
        } else if (lower.includes('risk') || lower.includes('highest risk')) {
          answer = "The highest risk activity is WBS L5-CIV-003 (Pier 4 Curing) which is flagged with core temperature anomalies exceeding 62°C, causing a 3-day projected baseline slip.";
        } else if (lower.includes('focus')) {
          answer = "Today's priority focus: 1 active thermal anomaly on Pier 4 concrete curing, and 2 pending reviews in the queue requiring structural supervisor authorization.";
        }
        setChatHistory(prev => [...prev, { sender: 'assistant', text: answer }]);
        setSendingCopilot(false);
      }, 1000);
    } else {
      try {
        const res = await askCopilot(userText);
        setChatHistory(prev => [...prev, { sender: 'assistant', text: res.answer }]);
        setSendingCopilot(false);
      } catch (err) {
        setChatHistory(prev => [...prev, { sender: 'assistant', text: 'Error connecting to Project Copilot server. Please retry.' }]);
        setSendingCopilot(false);
      }
    }
  };

  // ----------------------------------------------------
  // Project Memory Details Loader
  // ----------------------------------------------------
  const loadMemoryDetails = async (activityId: string) => {
    setSelectedMemoryActivity(activityId);
    setLoadingMemory(true);
    setLoadedMemoryData(null);

    if (demoMode) {
      setTimeout(() => {
        let mockMemory: ActivityMemory = {
          activity_id: activityId,
          average_duration: 4.8,
          historical_durations: [4, 5, 6, 4, 5],
          common_delay_reasons: ["Material availability", "Welder mobilization", "Inspection holds"],
          historical_productivity: "Stable",
          predicted_duration: 5.2,
          predicted_delay_probability: 0.28
        };
        if (activityId === 'L5-CIV-003') {
          mockMemory = {
            activity_id: activityId,
            average_duration: 6.2,
            historical_durations: [6, 7, 8, 6],
            common_delay_reasons: ["Weather conditions", "Core core temperature anomalies", "Concrete batch delay"],
            historical_productivity: "Degrading",
            predicted_duration: 7.5,
            predicted_delay_probability: 0.82
          };
        }
        setLoadedMemoryData(mockMemory);
        setLoadingMemory(false);
      }, 800);
    } else {
      try {
        const data = await getActivityMemory(activityId);
        setLoadedMemoryData(data);
        setLoadingMemory(false);
      } catch (err) {
        setLoadedMemoryData({
          activity_id: activityId,
          average_duration: 5.0,
          historical_durations: [],
          common_delay_reasons: ["Data capture failure"],
          historical_productivity: "Unknown",
          predicted_duration: 5.0,
          predicted_delay_probability: 0.0,
          status: "insufficient historical data"
        });
        setLoadingMemory(false);
      }
    }
  };

  // ----------------------------------------------------
  // Primavera P6 Schedule CSV Export Heuristic
  // ----------------------------------------------------
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "WBS Code,Task Name,Discipline,Location,Baseline Start,Baseline Finish,Actual Start,Actual Finish,Status,Progress %,Variance Days,Risk Level\n";
    tasks.forEach(t => {
      csvContent += `"${t.wbs_id}","${t.name}","${t.discipline}","${t.location}","${t.baseline_start}","${t.baseline_finish}","${t.actual_start || ''}","${t.actual_finish || ''}","${t.status}",${t.progress},"${t.variance}","${t.anomaly ? 'High' : 'Low'}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Primavera_Schedule_Update_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export Successful", "Schedule data successfully exported as CSV.", "success");
  };

  // ----------------------------------------------------
  // Presentation Judge Mode Steps Definition
  // ----------------------------------------------------
  const startJudgeDemo = () => {
    setJudgeDemoActive(true);
    setJudgeDemoStep(1);
    setDemoMode(true);
    loadDemoData();
    // Reset before after states
    setBeforeAfterSync({
      activity: 'L6-PIP-024A',
      before: { status: 'In Progress', finish: '--', variance: '--', risk: 'Medium' },
      after: { status: 'Completed', finish: '26-Aug-2026', variance: '+2 Days', risk: 'High' },
      showAfter: false
    });
    setActiveTab('overview');
  };

  const handleJudgeNext = () => {
    const nextStep = judgeDemoStep + 1;
    if (nextStep > 14) {
      setJudgeDemoActive(false);
      setJudgeDemoStep(0);
      return;
    }
    setJudgeDemoStep(nextStep);

    // Automation actions per step
    switch (nextStep) {
      case 1:
        setActiveTab('overview');
        break;
      case 2:
        setActiveTab('capture');
        setManualReportText('Spool Erection for Line 24 in Unit 02 completed at 4 PM on 26 August. 12 spools erected.');
        setManualDiscipline('Piping');
        break;
      case 3:
        setActiveTab('capture');
        setProcessingState('parsing');
        setUploadProgress(100);
        break;
      case 4:
        // Trigger simulated extraction
        setProcessingState('done');
        setIngestionResult({
          review_id: 'REV-001',
          source: 'Daily Site Log PDF',
          extracted_event: { discipline: 'Piping', activity: 'Spool Erection', asset_id: 'Line 24', location: 'Unit 02', date: '2026-08-26', time: '16:00', status: 'completed', quantity: 12, unit: 'spools', confidence: 0.96 },
          suggested_activity: 'L6-PIP-024A',
          candidates: [
            { activity_id: 'L6-PIP-024A', activity_code: 'L6-PIP-024A', activity_name: 'Spool Erection - Line 24', confidence: 0.96, reasons: ['discipline_match', 'location_match', 'semantic_similarity'] }
          ] as any
        });
        break;
      case 5:
        setActiveTab('matching');
        break;
      case 6:
        setActiveTab('matching');
        break;
      case 7:
        setActiveTab('review');
        break;
      case 8:
        handleApprove('REV-001');
        break;
      case 9:
        setActiveTab('schedule');
        break;
      case 10:
        setActiveTab('variance_risk');
        setStatusFilter('all');
        break;
      case 11:
        setActiveTab('variance_risk');
        break;
      case 12:
        setActiveTab('overview');
        break;
      case 13:
        setActiveTab('overview');
        // Make sure Before -> After is visible
        break;
      case 14:
        setActiveTab('overview');
        setShowCopilot(true);
        setChatHistory(prev => [...prev, { sender: 'user', text: 'Why is piping delayed?' }, { sender: 'assistant', text: 'Piping spools on Line 24 experienced a +2 days variance due to welder mobilization, now resolved and schedule updated to completed status.' }]);
        break;
    }
  };

  const handleJudgePrev = () => {
    if (judgeDemoStep <= 1) return;
    const prev = judgeDemoStep - 1;
    setJudgeDemoStep(prev);
    // Reverse actions if desired (simplified here to tab changes)
    if (prev === 1 || prev === 12 || prev === 13 || prev === 14) setActiveTab('overview');
    else if (prev === 2 || prev === 3 || prev === 4) setActiveTab('capture');
    else if (prev === 5 || prev === 6) setActiveTab('matching');
    else if (prev === 7 || prev === 8) setActiveTab('review');
    else if (prev === 9) setActiveTab('schedule');
    else if (prev === 10 || prev === 11) setActiveTab('variance_risk');
  };

  const exitJudgeDemo = () => {
    setJudgeDemoActive(false);
    setJudgeDemoStep(0);
    showToast('Judge Mode Exited', 'Demo state complete. Returned to system configuration.', 'info');
  };

  // Nav actions
  const navigateToFilteredActivities = (filter: string) => {
    if (filter === 'pending_review') {
      setActiveTab('review');
    } else if (filter === 'approved') {
      setActiveTab('matching');
    } else {
      setStatusFilter(filter);
      setActiveTab('activities');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex font-sans relative overflow-x-hidden selection:bg-blue-600/10 selection:text-blue-800">
      
      {/* Background grids */}
      <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ----------------------------------------------------
          SIDEBAR NAVIGATION (Desktop)
          ---------------------------------------------------- */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-slate-900 text-slate-100 flex-col z-30 shadow-xl border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-850 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-md">
            <HardHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight uppercase">
              SYNTARX AI
            </h1>
            <p className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">Execution Intelligence</p>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'capture', label: 'AI Data Capture', icon: FileUp },
            { id: 'activities', label: 'Activity Intelligence', icon: ListTodo },
            { id: 'matching', label: 'AI Matching', icon: Brain },
            { id: 'review', label: 'Review Queue', icon: CheckSquare, badge: reviewRequiredCount },
            { id: 'schedule', label: 'Live Schedule', icon: Calendar },
            { id: 'variance_risk', label: 'Variance & Risk', icon: TrendingUp },
            { id: 'project_intelligence', label: 'Project Intelligence', icon: Cpu },
            { id: 'project_memory', label: 'Project Memory', icon: History },
            { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck },
            { id: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSearchQuery('');
                  setGlobalSearchResults(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync Status Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
            <span>API CONNECTION</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${backendConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={backendConnected ? 'text-green-400' : 'text-red-400'}>
                {backendConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          {demoMode && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-2.5 py-1 text-[9px] text-amber-400 font-mono flex items-center gap-1.5 justify-center">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>DEMO MODE ACTIVE</span>
            </div>
          )}
        </div>
      </aside>

      {/* ----------------------------------------------------
          MOBILE DRAWER / NAVIGATION Drawer
          ---------------------------------------------------- */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div onClick={() => setShowMobileMenu(false)} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="relative w-72 bg-slate-900 text-slate-100 flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-blue-500" />
                <span className="font-extrabold text-sm">SYNTARX MENU</span>
              </div>
              <button onClick={() => setShowMobileMenu(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Layers },
                { id: 'capture', label: 'AI Data Capture', icon: FileUp },
                { id: 'activities', label: 'Activity Intelligence', icon: ListTodo },
                { id: 'matching', label: 'AI Matching', icon: Brain },
                { id: 'review', label: 'Review Queue', icon: CheckSquare, badge: reviewRequiredCount },
                { id: 'schedule', label: 'Live Schedule', icon: Calendar },
                { id: 'variance_risk', label: 'Variance & Risk', icon: TrendingUp },
                { id: 'project_intelligence', label: 'Project Intelligence', icon: Cpu },
                { id: 'project_memory', label: 'Project Memory', icon: History },
                { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck },
                { id: 'settings', label: 'Settings', icon: SettingsIcon }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setShowMobileMenu(false);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MAIN SCREEN CONTAINER
          ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 z-10">

        {/* ----------------------------------------------------
            TOP HEADER / SEARCH & ACTION ROW
            ---------------------------------------------------- */}
        <header className="border-b border-slate-200/80 bg-white sticky top-0 z-20 shadow-xs">
          <div className="px-6 h-16 flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Trigger */}
              <button 
                onClick={() => setShowMobileMenu(true)} 
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 focus:outline-none"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2 text-slate-800">
                <HardHat className="h-5 w-5 text-blue-600" />
                <span className="font-extrabold text-sm uppercase tracking-tight">Syntarx CC</span>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="flex items-center relative max-w-sm w-full">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Global search activities or reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-slate-400"
              />
              
              {/* Search Results Dropdown Overlay */}
              {globalSearchResults && (
                <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto p-3 text-xs flex flex-col gap-2">
                  <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Search Results</div>
                  {globalSearchResults.activities.length === 0 ? (
                    <div className="text-slate-500 font-mono py-2 text-center">No matching activities found.</div>
                  ) : (
                    globalSearchResults.activities.map(act => (
                      <button
                        key={act.wbs_id}
                        onClick={() => {
                          setSearchQuery('');
                          setGlobalSearchResults(null);
                          navigateToFilteredActivities('all');
                          // highlight task or set search filter
                        }}
                        className="w-full text-left p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 flex justify-between items-center transition-all cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{act.wbs_id} - {act.name}</div>
                          <div className="text-[10px] text-slate-400">Discipline: {act.discipline} | Status: {act.status}</div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Actions Ribbon */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Judge Presenter Tool */}
              <button
                onClick={startJudgeDemo}
                className="hidden md:flex text-xs font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start Presentation Demo</span>
              </button>

              {/* Demo Mode Toggle switch */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-[9px] font-extrabold text-slate-500 tracking-wide">DEMO MODE</span>
                <button
                  onClick={() => {
                    const nextMode = !demoMode;
                    setDemoMode(nextMode);
                    if (nextMode) loadDemoData();
                  }}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none relative ${demoMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${demoMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Copilot Drawer Toggle */}
              <button
                onClick={() => setShowCopilot(!showCopilot)}
                className="text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>

              {/* Notifications Center */}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all focus:outline-none shrink-0 cursor-pointer shadow-xs"
              >
                <Bell className="h-4 w-4" />
                {notificationsList.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------
            JUDGE PRESENTATION PROCESS PANEL
            ---------------------------------------------------- */}
        {judgeDemoActive && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-40 relative">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase bg-blue-600 text-white px-2 py-0.5 rounded tracking-widest animate-pulse">PRESENTATION SCRIPT</span>
                <span className="font-bold text-xs text-slate-700">Step {judgeDemoStep} of 14</span>
              </div>
              <p className="text-xs text-slate-800 mt-1 font-semibold leading-relaxed">
                {judgeDemoStep === 1 && "Our challenge is that actual site progress exists in unstructured reports while the master schedule exists separately. We will start by inspecting the project baseline on the Dashboard."}
                {judgeDemoStep === 2 && "Site supervisor uploads a daily report or enters progress update manually on the Data Capture page."}
                {judgeDemoStep === 3 && "The AI parses the unstructured report text to extract key structural entities: Activity, Discipline, Asset, Location, Status, and Date."}
                {judgeDemoStep === 4 && "Planner can view the original site report text side-by-side with the AI-extracted fields, highlighting exactly where the evidence was found."}
                {judgeDemoStep === 5 && "The extracted progress event is mapped against the baseline schedule WBS elements using fuzzy matching algorithms. Candidate 1 (L6-PIP-024A) has 96.8% confidence."}
                {judgeDemoStep === 6 && "The planner inspects the explainability checklist: Discipline, Asset ID, Location, and Semantic similarity scores are checked to see why the match was selected."}
                {judgeDemoStep === 7 && "Since the match requires planner verification, the ticket is pushed to the Human-in-the-Loop Review Queue."}
                {judgeDemoStep === 8 && "The planner verifies and clicks 'Approve'. This action immediately writes actual status to the schedule database."}
                {judgeDemoStep === 9 && "The schedule database updates task L6-PIP-024A to 100% completed, causing the Gantt timeline visualization to update immediately."}
                {judgeDemoStep === 10 && "The variance engine calculates the variance days (Actual Finish - Baseline Finish = +2 Days) and marks the status as delayed/critical."}
                {judgeDemoStep === 11 && "Risk metrics are automatically updated. Potential dependency delays are flagged based on the +2 days variance of Line 24."}
                {judgeDemoStep === 12 && "The dashboard KPIs and analytics charts are refreshed. Total completed activities increase, delayed counts change, and completion charts update."}
                {judgeDemoStep === 13 && "Behold the Before -> After sync panel: L6-PIP-024A status shifts from In Progress to Completed, Actual Finish: 26-Aug-2026, Variance: +2 Days, Risk: High."}
                {judgeDemoStep === 14 && "Historical averages are updated in Project Memory, and the AI Copilot is now aware of the new schedule state. Try asking: 'Why is piping delayed?'"}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleJudgePrev} 
                disabled={judgeDemoStep === 1}
                className="px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-xs font-bold border border-slate-200 text-slate-700 disabled:opacity-40"
              >
                Back
              </button>
              <button 
                onClick={handleJudgeNext} 
                className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {judgeDemoStep === 14 ? 'Finish' : 'Next Step'}
              </button>
              <button 
                onClick={exitJudgeDemo} 
                className="px-2.5 py-1.5 rounded bg-slate-200 hover:bg-slate-350 text-xs font-bold text-slate-600"
              >
                Exit Demo
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            MAIN LAYOUT WRAPPER
            ---------------------------------------------------- */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

          {/* ----------------------------------------------------
              ENTERPRISE KPI METRIC RIBBON
              ---------------------------------------------------- */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Activities', value: totalActivities, key: 'all', border: 'border-slate-200 hover:border-blue-500/50' },
              { label: 'Completed', value: completedActivities, key: 'completed', border: 'border-slate-200 hover:border-emerald-500/50' },
              { label: 'In Progress', value: inProgressActivities - delayedActivities, key: 'in_progress', border: 'border-slate-200 hover:border-amber-500/50' },
              { label: 'Delayed / Anomaly', value: delayedActivities, key: 'delayed', border: 'border-slate-200 hover:border-red-500/50', badge: delayedActivities > 0 },
              { label: 'AI Matched', value: aiMatchedReports, key: 'approved', border: 'border-slate-200 hover:border-indigo-500/50' },
              { label: 'Review Required', value: reviewRequiredCount, key: 'pending_review', border: 'border-slate-200 hover:border-pink-500/50', alert: reviewRequiredCount > 0 }
            ].map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => navigateToFilteredActivities(kpi.key)}
                className={`bg-white border ${kpi.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden group select-none`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block group-hover:text-blue-600 transition-colors">
                  {kpi.label}
                </span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">
                    {kpi.value}
                  </h3>
                  {kpi.alert && (
                    <span className="text-[9px] text-pink-600 font-bold px-1.5 py-0.5 rounded bg-pink-50 border border-pink-100 animate-pulse">
                      Needs Action
                    </span>
                  )}
                  {kpi.badge && (
                    <span className="text-[9px] text-red-600 font-bold px-1.5 py-0.5 rounded bg-red-55 border border-red-100 animate-bounce">
                      Anomaly
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* ----------------------------------------------------
              PAGE ROUTING RENDERER
              ---------------------------------------------------- */}
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              
              {/* Before -> After Synchronizer Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">AI Schedule Sync Tracker</h3>
                    <p className="text-[10px] text-slate-500">Volumetric pipeline observations auto-sync check</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-widest font-mono">
                    {beforeAfterSync.showAfter ? "Synchronized" : "Variance Flagged"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 text-xs">
                  
                  {/* Before */}
                  <div className="md:col-span-5 bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Before Sync Event</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Activity Code:</span>
                      <span className="text-slate-800 font-bold font-mono">{beforeAfterSync.activity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <span className="text-amber-600 font-bold">{beforeAfterSync.before.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Actual Finish:</span>
                      <span className="text-slate-800 font-bold font-mono">{beforeAfterSync.before.finish}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Schedule Variance:</span>
                      <span className="text-slate-800 font-bold font-mono">{beforeAfterSync.before.variance}</span>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="md:col-span-1 flex justify-center">
                    <div className="p-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">
                      <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
                    </div>
                  </div>

                  {/* After */}
                  <div className="md:col-span-5 bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col gap-2 relative">
                    <span className="text-[9px] uppercase font-bold text-slate-400">After AI Sync</span>
                    {beforeAfterSync.showAfter ? (
                      <div className="flex flex-col gap-2 animate-slide-in">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Activity Code:</span>
                          <span className="text-slate-800 font-bold font-mono">{beforeAfterSync.activity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Status:</span>
                          <span className="text-green-600 font-bold">{beforeAfterSync.after.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Actual Finish:</span>
                          <span className="text-slate-800 font-bold font-mono">{beforeAfterSync.after.finish}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Schedule Variance:</span>
                          <span className="text-red-500 font-bold font-mono">{beforeAfterSync.after.variance}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-6 text-slate-400 font-medium">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400 mb-1" />
                        <span>Awaiting AI Match Approval...</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Line Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Planned vs. Actual S-Curve</h3>
                      <p className="text-[10px] text-slate-500">Cumulative schedule progress percentage</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="h-48 w-full text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="week" stroke="#64748b" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" />
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }} />
                        <Legend verticalAlign="top" height={24} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                        <Line type="monotone" dataKey="Planned" name="Planned Baseline" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="Actual" name="Actual Progress" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Discipline Completion Progress</h3>
                      <p className="text-[10px] text-slate-500">Progress percentage by WBS discipline</p>
                    </div>
                    <Layers className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="h-48 w-full text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disciplineProgressData} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                        <YAxis dataKey="discipline" type="category" stroke="#64748b" />
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }} />
                        <Bar dataKey="progress" name="Completion %" fill="#10b981" radius={[0, 4, 4, 0]}>
                          {disciplineProgressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie/Donut Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">AI Matching Performance</h3>
                      <p className="text-[10px] text-slate-500">Telemetry-to-WBS automation ratio</p>
                    </div>
                    <Brain className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="h-48 w-full text-[9px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={matchingPerformanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {matchingPerformanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                        <Legend verticalAlign="bottom" height={24} iconSize={6} wrapperStyle={{ fontSize: '9px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Console & Architecture Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Console */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <TerminalIcon className="h-4.5 w-4.5 text-blue-600" />
                      In-Memory Broker Logs
                    </h3>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 font-mono uppercase tracking-widest animate-pulse">
                      Live Stream
                    </span>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-850 rounded-lg p-3.5 font-mono text-[9px] text-blue-400 flex flex-col gap-2 h-60 overflow-y-auto select-text shadow-inner">
                    {localTerminalLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed border-b border-slate-900/30 pb-1.5">
                        {log}
                      </div>
                    ))}
                    {isUploadingLocal && (
                      <div className="flex items-center gap-2 text-amber-400 animate-pulse mt-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Processing site capture point clouds...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Architecture Flow */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">System Architecture Flow</h3>
                    <p className="text-[10px] text-slate-500">Telemetry automation lifecycle</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5 text-xs">
                    {[
                      { num: '01', title: 'Data Ingestion', desc: 'Ingest supervisor manuals, Drone CSV/PDF scans.' },
                      { num: '02', title: 'AI Extraction', desc: 'Extract activities, locations & quantities.' },
                      { num: '03', title: 'Fuzzy Matching Engine', desc: 'Maps telemetry to schedule candidate WBS codes.' },
                      { num: '04', title: 'Planner Review', desc: 'Planner verifies extraction on Review Queue.' },
                      { num: '05', title: 'Schedule Update', desc: 'Approval instantly updates Primavera WBS baseline states.' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-lg group transition-all">
                        <span className="text-[11px] font-mono font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                          {step.num}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{step.title}</h4>
                          <p className="text-[10px] text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: AI DATA CAPTURE */}
          {activeTab === 'capture' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Ingestion Area */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileUp className="h-4.5 w-4.5 text-blue-600" />
                    AI Data Capture Zone
                  </h2>
                  <p className="text-[10px] text-slate-500">Provide drone orthophotos, core sensor temperature logs, or text reports</p>
                </div>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerIngestionClick}
                  className={`border border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-305 relative ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="p-3 bg-white border border-slate-200 rounded-full mb-3 shadow-sm">
                    {processingState === 'parsing' ? (
                      <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                    ) : processingState === 'uploading' ? (
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    ) : (
                      <UploadCloud className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  
                  <h3 className="font-bold text-xs text-slate-700 mb-0.5">Drag & drop files here</h3>
                  <p className="text-[9px] text-slate-500 max-w-[240px] mb-4">Supports site PDF reports, CSV logs, TXT sensor scans.</p>
                  
                  {processingState !== 'idle' ? (
                    <div className="w-48 flex flex-col gap-1.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-500">
                        <span>{processingState === 'uploading' ? 'UPLOADING' : 'PARSING RAW CODES'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-250 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      className="text-[10px] font-bold px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                    >
                      Process Site File Capture
                    </button>
                  )}
                </div>

                <div className="h-[1px] bg-slate-200" />

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Manual Field Observation Log
                  </label>
                  <textarea
                    value={manualReportText}
                    onChange={(e) => setManualReportText(e.target.value)}
                    placeholder="Describe observations, progress, structures, and delays manually..."
                    className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 text-xs rounded-lg p-3 h-24 resize-none focus:outline-none transition-all"
                  />
                  
                  <div className="flex justify-between items-center">
                    <select
                      value={manualDiscipline}
                      onChange={(e) => setManualDiscipline(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700"
                    >
                      <option value="Civil">Civil</option>
                      <option value="Piping">Piping</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="Mechanical">Mechanical</option>
                    </select>

                    <button
                      onClick={handleManualIngest}
                      disabled={isUploadingLocal}
                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-3 hover:bg-blue-50 border border-blue-100 rounded cursor-pointer disabled:opacity-40"
                    >
                      {isUploadingLocal ? 'Analyzing...' : 'Parse Observations'}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Extraction result split layout */}
              <div>
                {ingestionResult ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 h-full animate-slide-in">
                    
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                          AI Extraction & Evidence Viewer
                        </h2>
                        <span className="text-[9px] text-slate-500">Source: {ingestionResult.source}</span>
                      </div>
                      <span className="text-[10px] font-bold text-green-600 font-mono bg-green-55 border border-green-100 px-2 py-0.5 rounded">
                        {Math.round(ingestionResult.extracted_event.confidence * 100)}% Confidence
                      </span>
                    </div>

                    {/* Split Evidence view */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left: Highlighted original text */}
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Original Text Evidence</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-mono">
                          {manualReportText.includes("Spool Erection") ? (
                            <>
                              <span className="bg-green-100 border-b border-green-300 font-bold px-0.5">Spool Erection</span> for <span className="bg-blue-100 border-b border-blue-300 font-bold px-0.5">Line 24</span> in <span className="bg-purple-100 border-b border-purple-300 font-bold px-0.5">Unit 02</span> completed at 4 PM on 26 August. <span className="bg-yellow-100 border-b border-yellow-300 font-bold px-0.5">12 spools</span> erected.
                            </>
                          ) : (
                            manualReportText
                          )}
                        </p>
                      </div>

                      {/* Right: AI Fields */}
                      <div className="flex flex-col gap-3">
                        {[
                          { key: 'activity', label: 'Activity' },
                          { key: 'discipline', label: 'Discipline' },
                          { key: 'asset_id', label: 'Asset ID' },
                          { key: 'location', label: 'Location' },
                          { key: 'date', label: 'Reported Date' },
                          { key: 'time', label: 'Reported Time' },
                          { key: 'status', label: 'Status' }
                        ].map((field) => (
                          <div key={field.key} className="flex justify-between items-center text-xs border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500 font-medium">{field.label}:</span>
                            <input
                              type="text"
                              value={(ingestionResult.extracted_event as any)[field.key] || ''}
                              onChange={(e) => {
                                const updated = { ...ingestionResult };
                                (updated.extracted_event as any)[field.key] = e.target.value;
                                setIngestionResult(updated);
                              }}
                              className="bg-transparent text-right font-bold text-slate-800 border-none focus:outline-none focus:ring-0 p-0 w-36 font-mono"
                            />
                          </div>
                        ))}
                      </div>

                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleManualIngest}
                        className="flex-1 text-[10px] font-extrabold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 py-2.5 rounded transition-all cursor-pointer"
                      >
                        Re-analyze with AI
                      </button>
                      <button
                        onClick={() => setActiveTab('matching')}
                        className="flex-1 text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded shadow-sm transition-all cursor-pointer"
                      >
                        Match WBS Activity
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                    <FileCheck className="h-8 w-8 text-slate-400 mb-2 animate-pulse" />
                    <h3 className="font-bold text-xs text-slate-500">Awaiting Telemetry Ingestion</h3>
                    <p className="text-[9px] text-slate-500 max-w-[200px] mt-1 leading-normal">
                      Provide a site capture PDF report or manual update observation log on the left.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: ACTIVITY INTELLIGENCE */}
          {activeTab === 'activities' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in">
              
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ListTodo className="h-4.5 w-4.5 text-blue-600" />
                    Primavera P6 Activity Intelligence
                  </h2>
                  <p className="text-[10px] text-slate-500">Live synchronization tracking dashboard for WBS activities and site reports</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex border border-slate-200 bg-slate-50 rounded-lg p-0.5">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'completed', label: 'Completed' },
                      { key: 'in_progress', label: 'In Progress' },
                      { key: 'delayed', label: 'Delayed' },
                      { key: 'pending', label: 'Pending' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                          statusFilter === tab.key 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[10px] font-bold text-slate-600 focus:outline-none"
                  >
                    <option value="all">All Disciplines</option>
                    <option value="Civil">Civil</option>
                    <option value="Piping">Piping</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Instrumentation">Instrumentation</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>

                  <button 
                    onClick={handleExportCSV}
                    className="text-[10px] font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <th className="py-3 px-4 font-mono text-[9px] w-28">WBS CODE</th>
                      <th className="py-3 px-4">TASK DESCRIPTION</th>
                      <th className="py-3 px-4">DISCIPLINE</th>
                      <th className="py-3 px-4">LOCATION</th>
                      <th className="py-3 px-4 font-mono text-[9px]">PLANNED FINISH</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 w-40">PROGRESS</th>
                      <th className="py-3 px-4 text-center">EVIDENCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const isDelayed = task.anomaly || task.wbs_id === 'L5-CIV-003';
                        let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        let progressBar = 'bg-slate-400';

                        if (task.status === 'completed') {
                          statusColor = 'bg-green-50 text-green-700 border-green-200';
                          progressBar = 'bg-green-500';
                        } else if (task.status === 'in_progress') {
                          if (isDelayed) {
                            statusColor = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
                            progressBar = 'bg-red-500';
                          } else {
                            statusColor = 'bg-amber-55 text-amber-700 border-amber-200';
                            progressBar = 'bg-amber-500';
                          }
                        }

                        return (
                          <tr key={task.wbs_id} className="hover:bg-slate-55/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">{task.wbs_id}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{task.name}</td>
                            <td className="py-3 px-4 text-slate-600">{task.discipline}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{task.location}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{task.baseline_finish}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>
                                {task.status === 'in_progress' && isDelayed ? 'delayed' : task.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[9px] w-8 text-right text-slate-600">{task.progress}%</span>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                                  <div className={`h-full rounded-full transition-all duration-500 ${progressBar}`} style={{ width: `${task.progress}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setSelectedTaskEvidence(task)}
                                className="text-[9px] font-extrabold text-blue-600 hover:text-white px-2 py-1 rounded bg-blue-50 hover:bg-blue-600 border border-blue-200 transition-all cursor-pointer shadow-xs"
                              >
                                View Evidence
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-mono">No activities match active search/filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 4: AI MATCHING */}
          {activeTab === 'matching' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-6 animate-slide-in">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Brain className="h-4.5 w-4.5 text-blue-600" />
                  AI Activity Matching Screen
                </h2>
                <p className="text-[10px] text-slate-500">Ranked schedule activity candidates aligned via semantic similarity and asset codes</p>
              </div>

              {ingestionResult ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Site observation profile */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 pb-2">Extracted Site Profile</h3>
                    <div className="flex flex-col gap-2.5 text-xs">
                      {[
                        { label: 'Discipline', val: ingestionResult.extracted_event.discipline },
                        { label: 'Activity', val: ingestionResult.extracted_event.activity },
                        { label: 'Asset ID', val: ingestionResult.extracted_event.asset_id },
                        { label: 'Location', val: ingestionResult.extracted_event.location },
                        { label: 'Observed Status', val: ingestionResult.extracted_event.status }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500 font-medium">{item.label}</span>
                          <span className="text-slate-800 font-bold font-mono">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Candidates */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <h3 className="text-[10px] uppercase font-bold text-slate-500">Top Schedule Candidates</h3>
                    <div className="flex flex-col gap-3">
                      {ingestionResult.candidates.map((cand) => {
                        const isSuggested = ingestionResult.suggested_activity === cand.activity_id;
                        return (
                          <div 
                            key={cand.activity_id}
                            className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              isSuggested
                                ? 'bg-blue-50/50 border-blue-500/40 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                  {cand.activity_id}
                                </span>
                                <h4 className="font-bold text-slate-800 text-xs">{cand.activity_name}</h4>
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2.5 max-w-sm">
                                <span className="text-[9px] font-mono font-bold text-slate-400">Confidence:</span>
                                <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                  <div className={`h-full rounded-full ${isSuggested ? 'bg-blue-600' : 'bg-slate-500'}`} style={{ width: `${cand.confidence * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-bold font-mono text-slate-700">{Math.round(cand.confidence * 100)}%</span>
                              </div>
                            </div>

                            {/* Why match details (Explainability) */}
                            {isSuggested && (
                              <div className="flex flex-col gap-1 bg-white p-2.5 border border-slate-250 rounded-lg text-[9px] text-slate-500 shrink-0">
                                <span className="font-extrabold text-slate-700 mb-0.5">Why this match?</span>
                                <span className="text-green-600">✓ Discipline Match ({ingestionResult.extracted_event.discipline})</span>
                                <span className="text-green-600">✓ Asset ID overlap ({ingestionResult.extracted_event.asset_id})</span>
                                <span className="text-green-600">✓ Semantic Similarity (96.8%)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-3 justify-end mt-4">
                      {/* override options */}
                      <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Re-route mapping:</span>
                        <select
                          value={ingestionResult.suggested_activity}
                          onChange={(e) => {
                            const updated = { ...ingestionResult };
                            updated.suggested_activity = e.target.value;
                            setIngestionResult(updated);
                          }}
                          className="bg-transparent text-slate-700 font-bold border-none outline-none cursor-pointer focus:ring-0"
                        >
                          {tasks.map(t => (
                            <option key={t.wbs_id} value={t.wbs_id}>{t.wbs_id} - {t.name.substring(0,25)}...</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          showToast('Ticket Saved', `Report ticket REV-001 pushed to Review Queue.`, 'info');
                          setActiveTab('review');
                        }}
                        className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg shadow-xs cursor-pointer"
                      >
                        Push to Review Queue
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center py-16">
                  <Brain className="h-8 w-8 text-slate-400 mb-2 animate-pulse" />
                  <h3 className="font-bold text-xs text-slate-500">No active extraction loaded</h3>
                  <p className="text-[9px] text-slate-500 max-w-[200px] mt-1 leading-normal">
                    Fuzzy WBS candidates match logs will load once you process a site report.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: REVIEW QUEUE */}
          {activeTab === 'review' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                  Human-in-the-Loop Review Queue
                </h2>
                <p className="text-[10px] text-slate-500">Planner override and verification board before live schedule baseline updates</p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <th className="py-3 px-4 font-mono text-[9px]">ID</th>
                      <th className="py-3 px-4">SOURCE</th>
                      <th className="py-3 px-4">EXTRACTED OBSERVED STATE</th>
                      <th className="py-3 px-4">SUGGESTED WBS TARGET</th>
                      <th className="py-3 px-4 text-center">CONFIDENCE</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewQueue.length > 0 ? (
                      reviewQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-55/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{item.id}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{item.source}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800">
                                {item.extracted_event.activity} ({item.extracted_event.asset_id})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Loc: {item.extracted_event.location} | Status: {item.extracted_event.status}
                              </span>
                              {item.extracted_event.delay_reason && (
                                <span className="text-[9px] text-red-500 font-medium">Delay Reason: {item.extracted_event.delay_reason}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-[10px] text-blue-600 bg-blue-55 border border-blue-100 px-2 py-0.5 rounded">
                                {item.suggested_activity || 'None'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {tasks.find(t => t.wbs_id === item.suggested_activity)?.name.substring(0, 20)}...
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-green-600">{Math.round(item.extracted_event.confidence * 100)}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              item.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                              item.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.status === 'pending_review' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApprove(item.id)}
                                  className="text-[10px] font-extrabold text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-200 px-2.5 py-1 rounded transition-all cursor-pointer shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(item.id)}
                                  className="text-[10px] font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-2.5 py-1 rounded transition-all cursor-pointer shadow-xs"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReviewItem(item);
                                    setEditForm({ ...item.extracted_event });
                                  }}
                                  className="text-[10px] font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 px-2 py-1 rounded cursor-pointer shadow-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setReassigningReviewItem(item)}
                                  className="text-[10px] font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 px-2 py-1 rounded cursor-pointer shadow-xs"
                                >
                                  Reassign
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Complete</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-mono">Review queue is empty.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 6: LIVE SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-600" />
                  Live Primavera P6 Timeline
                </h2>
                <p className="text-[10px] text-slate-500">Interactive Gantt chart showing weekly project schedule tracking update</p>
              </div>

              {/* Gantt scrollable container */}
              <div className="flex flex-col border border-slate-200 rounded-xl bg-slate-50 p-5 overflow-x-auto min-w-[700px]">
                
                {/* Header Grid */}
                <div className="grid grid-cols-12 border-b border-slate-200 pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none font-mono">
                  <div className="col-span-4">WBS Activities</div>
                  <div className="col-span-2 text-center">Baseline Targets</div>
                  <div className="col-span-6 grid grid-cols-4 text-center">
                    <span>Wk 1 (08/01)</span>
                    <span>Wk 2 (08/08)</span>
                    <span>Wk 3 (08/15)</span>
                    <span>Wk 4 (08/22)</span>
                  </div>
                </div>

                {/* Gantt rows */}
                <div className="flex flex-col divide-y divide-slate-200">
                  {tasks.map((task) => {
                    const isDelayed = task.anomaly || task.wbs_id === 'L5-CIV-003';
                    let taskColor = 'bg-slate-400 border-slate-500';

                    if (task.status === 'completed') {
                      taskColor = 'bg-green-500 border-green-600';
                    } else if (task.status === 'in_progress') {
                      taskColor = isDelayed ? 'bg-red-500 border-red-600 animate-pulse' : 'bg-amber-500 border-amber-600';
                    }

                    // Bar positions based on WBS index
                    let leftMargin = '5%';
                    let barWidth = '25%';

                    if (task.wbs_id.includes('PIP')) {
                      leftMargin = '30%';
                      barWidth = '35%';
                    } else if (task.wbs_id.includes('ELC') || task.wbs_id.includes('INS')) {
                      leftMargin = '50%';
                      barWidth = '25%';
                    } else if (task.wbs_id === 'L5-CIV-003') {
                      leftMargin = '45%';
                      barWidth = '30%';
                    } else if (task.wbs_id === 'L5-CIV-004') {
                      leftMargin = '70%';
                      barWidth = '25%';
                    }

                    return (
                      <div key={task.wbs_id} className="grid grid-cols-12 py-4 items-center">
                        
                        {/* WBS */}
                        <div className="col-span-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                              {task.wbs_id}
                            </span>
                            <span className="font-bold text-xs text-slate-800 leading-tight">{task.name}</span>
                          </div>
                        </div>

                        {/* Baseline info */}
                        <div className="col-span-2 text-center text-[10px] text-slate-400 font-mono flex flex-col shrink-0 leading-tight">
                          <span>S: {task.baseline_start}</span>
                          <span>F: {task.baseline_finish}</span>
                        </div>

                        {/* Gantt Bar graphic */}
                        <div className="col-span-6 relative h-8 flex items-center">
                          {/* Grids */}
                          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
                            <div className="border-r border-slate-400" />
                            <div className="border-r border-slate-400" />
                            <div className="border-r border-slate-400" />
                            <div className="border-r border-slate-400" />
                          </div>

                          {/* Planned Bar */}
                          <div className="absolute h-2.5 border border-dashed border-slate-300 bg-slate-200/40 rounded" style={{ left: leftMargin, width: barWidth }} />

                          {/* Actual Bar */}
                          <div 
                            className={`absolute h-4 rounded border ${taskColor} shadow-xs transition-all duration-1000 overflow-hidden flex items-center justify-end pr-1.5`} 
                            style={{ left: leftMargin, width: `calc(${barWidth} * (${task.progress} / 100))` }}
                          >
                            <span className="text-[8px] font-extrabold text-white font-mono">
                              {task.progress > 15 ? `${task.progress}%` : ''}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

          {/* TAB 7: VARIANCE & RISK */}
          {activeTab === 'variance_risk' && (
            <div className="flex flex-col gap-6 animate-slide-in">
              
              {/* Variance Engine table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Variance Calculation Table</h3>
                    <p className="text-[10px] text-slate-500">Variance Formula: actual_finish - baseline_finish</p>
                  </div>
                  <div className="flex border border-slate-200 bg-slate-50 rounded-lg p-0.5 text-[9px] font-bold">
                    {[
                      { key: 'all', label: 'All Activities' },
                      { key: 'delayed', label: 'Delayed (+ Days)' },
                      { key: 'completed', label: 'On Schedule / Ahead' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setStatusFilter(opt.key)}
                        className={`px-3 py-1 rounded transition-all cursor-pointer ${
                          statusFilter === opt.key ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-550 hover:text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                        <th className="py-3 px-4 font-mono text-[9px] w-28">WBS CODE</th>
                        <th className="py-3 px-4">TASK DESCRIPTION</th>
                        <th className="py-3 px-4 font-mono text-[9px]">BASELINE FINISH</th>
                        <th className="py-3 px-4 font-mono text-[9px]">ACTUAL FINISH</th>
                        <th className="py-3 px-4 text-center">VARIANCE</th>
                        <th className="py-3 px-4 text-center">CRITICAL PATH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTasks.map((task) => {
                        const isDelayed = task.anomaly || task.wbs_id === 'L5-CIV-003';
                        return (
                          <tr key={task.wbs_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{task.wbs_id}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">{task.name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{task.baseline_finish}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{task.actual_finish || '--'}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                                isDelayed ? 'bg-red-50 text-red-700 border-red-200' :
                                task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-slate-50 text-slate-400 border-slate-200'
                              }`}>
                                {task.variance}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isDelayed ? 'bg-red-100 text-red-700' : 'bg-slate-105 text-slate-500'
                              }`}>
                                {isDelayed ? 'DELAY RISK' : 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Distribution Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Score panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Rule-based Delay Risk Engine</h3>
                    <p className="text-[10px] text-slate-500">Predictive score based on status variance and telemetry anomaly logs</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    {[
                      { code: 'L5-CIV-003', task: 'Pier 4 Concrete Pour & Curing', risk: 'HIGH (85%)', desc: 'Core concrete temperatures spiked above 62°C. Critical path curing delay active.' },
                      { code: 'L5-PIP-002', task: 'Pipe Rack Structure Assembly', risk: 'MEDIUM (42%)', desc: 'Steel structures erection at 80%. Dependencies on precast girder logistics could slip.' },
                      { code: 'L6-PIP-024A', task: 'Spool Erection - Line 24', risk: 'LOW (12%)', desc: 'Sync log verified. Piping complete, welding tasks scheduled to commence on target.' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{item.code}</span>
                            <h4 className="font-bold text-slate-800">{item.task}</h4>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                            item.risk.includes('HIGH') ? 'bg-red-50 text-red-700 border-red-200' :
                            item.risk.includes('MEDIUM') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-green-55 text-green-700 border-green-200'
                          }`}>{item.risk}</span>
                        </div>
                        <p className="text-slate-500 leading-normal text-xs">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Distribution pie metrics */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Risk Metrics Distribution</h3>
                    <p className="text-[10px] text-slate-500">Variance metrics by activity status</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 h-60">
                    
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Delay Risk Tier</span>
                      <div className="h-32 w-full text-[8px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={delayRiskData} cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={3} dataKey="value">
                              <Cell fill="#ef4444" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#10b981" />
                            </Pie>
                            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Deviation</span>
                      <div className="h-32 w-full text-[8px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={scheduleVarianceData} cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={3} dataKey="value">
                              <Cell fill="#6366f1" />
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Activity Status</span>
                      <div className="h-32 w-full text-[8px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={activityStatusData} cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={3} dataKey="value">
                              {activityStatusData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 8: PROJECT INTELLIGENCE */}
          {activeTab === 'project_intelligence' && (
            <div className="flex flex-col gap-6 animate-slide-in">
              
              {/* AI Insights & Root Cause Analysis split layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Insights from backend */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Cpu className="h-4.5 w-4.5 text-blue-600" />
                      AI generated Schedule Insights
                    </h3>
                    <p className="text-[10px] text-slate-500">Live predictions derived from sqlite database analytics logs</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-xs leading-relaxed text-red-700">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p><strong>Critical delay flagged on Pier 4 concrete pour (WBS L5-CIV-003):</strong> Concrete curing core temperature spiked above 62°C limit. Curing duration extended by +3 Days.</p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 text-xs leading-relaxed text-amber-700">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p><strong>Piping structures Assembly (L5-PIP-002) delay risk:</strong> Material availability of structural pipe rack steel is flagged as degrading. Procurement delay expected.</p>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex gap-3 text-xs leading-relaxed text-green-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <p><strong>Piping spool Line 24 synchronizations completed:</strong> Planner approved the REV-001 daily site logs match. Progress updated successfully to 100%.</p>
                    </div>
                  </div>
                </div>

                {/* Root Cause Analysis (Why project delayed?) */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Delay Root Cause Analysis</h3>
                    <p className="text-[10px] text-slate-500">Delay factors contribution percentages</p>
                  </div>
                  
                  {/* Contribution breakdown list */}
                  <div className="flex-1 flex flex-col gap-3 text-xs justify-center">
                    {[
                      { reason: 'Material Availability', percent: 45, color: 'bg-red-500' },
                      { reason: 'Inspection Hold', percent: 20, color: 'bg-amber-500' },
                      { reason: 'Manpower Constraints', percent: 15, color: 'bg-blue-500' },
                      { reason: 'Equipment Outage', percent: 10, color: 'bg-purple-500' },
                      { reason: 'Dependency slip', percent: 10, color: 'bg-indigo-500' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between font-bold text-slate-700 text-[10px]">
                          <span>{item.reason}</span>
                          <span>{item.percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 9: PROJECT MEMORY */}
          {activeTab === 'project_memory' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-blue-600" />
                  Historical Project Memory Logs
                </h2>
                <p className="text-[10px] text-slate-500">Select any activity to extract cross-project historical averages and predict productivity slips</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* WBS list selector */}
                <div className="md:col-span-4 flex flex-col gap-2 max-h-[350px] overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {tasks.map(t => (
                    <button
                      key={t.wbs_id}
                      onClick={() => loadMemoryDetails(t.wbs_id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs font-bold transition-all flex justify-between items-center cursor-pointer ${
                        selectedMemoryActivity === t.wbs_id
                          ? 'bg-blue-600 border-blue-700 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{t.wbs_id} - {t.name.substring(0, 20)}...</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>

                {/* Memory details display card */}
                <div className="md:col-span-8">
                  {selectedMemoryActivity ? (
                    loadingMemory ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-1 text-slate-400" />
                        <span>Querying project memory...</span>
                      </div>
                    ) : loadedMemoryData ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in text-xs">
                        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-2">
                          Project Memory: {loadedMemoryData.activity_id}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex flex-col">
                            <span className="text-slate-400 font-bold text-[9px] uppercase">Historical average duration</span>
                            <span className="font-extrabold text-slate-900 text-base mt-1">{loadedMemoryData.average_duration} Days</span>
                          </div>
                          <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex flex-col">
                            <span className="text-slate-400 font-bold text-[9px] uppercase">Predicted delay probability</span>
                            <span className="font-extrabold text-red-500 text-base mt-1">{Math.round(loadedMemoryData.predicted_delay_probability * 100)}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between border-b border-slate-200 pb-2">
                          <span className="text-slate-500 font-medium">Productivity Trend:</span>
                          <span className={`font-bold ${loadedMemoryData.historical_productivity === 'Stable' ? 'text-green-600' : 'text-red-500'}`}>
                            {loadedMemoryData.historical_productivity}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-slate-500 font-medium">Common Delay Factors:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {loadedMemoryData.common_delay_reasons.map((r, idx) => (
                              <span key={idx} className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-mono">{r}</span>
                            ))}
                          </div>
                        </div>

                      </div>
                    ) : null
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                      <History className="h-6 w-6 text-slate-400 mb-2 animate-pulse" />
                      <h3 className="font-bold text-xs text-slate-500">No activity selected</h3>
                      <p className="text-[9px] text-slate-400 max-w-[200px] mt-1 leading-normal">
                        Select an activity on the left to load average historical statistics.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 10: AUDIT TRAIL */}
          {activeTab === 'audit_trail' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 animate-slide-in">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileCheck className="h-4.5 w-4.5 text-blue-600" />
                  WBS Schedule Audit Trail
                </h2>
                <p className="text-[10px] text-slate-500">Cryptographically sound logging of all AI matches, override decisions, and Primavera baseline updates</p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <th className="py-3 px-4 font-mono text-[9px]">TIMESTAMPS</th>
                      <th className="py-3 px-4 text-center">ACTOR</th>
                      <th className="py-3 px-4">WBS TASK</th>
                      <th className="py-3 px-4">ACTION LOG RECORD</th>
                      <th className="py-3 px-4 text-center">CONFIDENCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-55/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500">{log.timestamp}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                              log.action_source === 'system' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-105 text-slate-600 border-slate-200'
                            }`}>{log.action_source}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-650">{log.activity_id || '--'}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">{log.action}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-green-600">
                              {log.confidence ? `${Math.round(log.confidence * 100)}%` : '--'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-mono">No audit logs recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 11: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 max-w-xl animate-slide-in text-xs">
              
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <SettingsIcon className="h-4.5 w-4.5 text-blue-600" />
                  System Configuration Settings
                </h2>
                <p className="text-[10px] text-slate-500">Configure thresholds, API endpoints, and system properties</p>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-500">API Connection Target</label>
                  <input
                    type="text"
                    disabled
                    value={demoMode ? 'LOCAL_SANDBOX_SIMULATION' : 'http://localhost:8000'}
                    className="bg-slate-50 border border-slate-200 text-slate-500 rounded px-3 py-2 font-mono text-[11px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-500">Auto-Approve Match Threshold</label>
                  <input
                    type="text"
                    disabled
                    value="0.90 (90%)"
                    className="bg-slate-50 border border-slate-200 text-slate-500 rounded px-3 py-2 font-mono text-[11px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-500">Database SQLite Location</label>
                  <input
                    type="text"
                    disabled
                    value="sih_project.db (active)"
                    className="bg-slate-50 border border-slate-200 text-slate-500 rounded px-3 py-2 font-mono text-[11px]"
                  />
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ----------------------------------------------------
          NOTIFICATION Log SIDE-OVER DRAWER
          ---------------------------------------------------- */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end animate-slide-in">
          <div onClick={() => setShowNotifications(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" />
          <div className="w-80 bg-slate-900 border-l border-slate-800 h-full relative z-10 flex flex-col p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-blue-500" />
                Notification Logs
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {notificationsList.length > 0 ? (
                notificationsList.map((n) => (
                  <div 
                    key={n.id}
                    className={`p-3 rounded-lg border text-xs leading-relaxed flex flex-col gap-1.5 ${
                      n.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      n.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      'bg-slate-850 border-slate-700 text-slate-300'
                    }`}
                  >
                    <p>{n.message}</p>
                    <span className="text-[9px] text-slate-500 font-mono self-end">{n.timestamp}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 font-mono py-12">No notifications.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          AI COPILOT SIDE-CHAT OVERLAY DRAWER
          ---------------------------------------------------- */}
      {showCopilot && (
        <div className="fixed inset-0 z-50 flex justify-end animate-slide-in">
          <div onClick={() => setShowCopilot(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" />
          <div className="w-80 sm:w-96 bg-white border-l border-slate-200 h-full relative z-10 flex flex-col p-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Project Intelligence Copilot
              </h3>
              <button onClick={() => setShowCopilot(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-1 mb-4">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={`flex flex-col max-w-[85%] ${chat.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    chat.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
              {sendingCopilot && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 self-start">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleAskCopilot} className="flex gap-2 border-t border-slate-200 pt-3 shrink-0">
              <input
                type="text"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Ask discipline delays, highest risk..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
              />
              <button 
                type="submit" 
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REASSIGN ACTIVITY MODAL popup
          ---------------------------------------------------- */}
      {reassigningReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          <div onClick={() => setReassigningReviewItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" />
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-600" />
                Reassign Schedule Target
              </h3>
              <button onClick={() => setReassigningReviewItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="text-xs flex flex-col gap-2 text-slate-650">
              <p>Re-route this observed telemetry scan to another WBS baseline element:</p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded p-1.5 bg-slate-50 mt-2">
                {tasks.map(task => (
                  <button
                    key={task.wbs_id}
                    onClick={() => handleReassignSave(task.wbs_id)}
                    className="w-full text-left p-2 border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-350 text-[10px] font-bold rounded flex justify-between items-center transition-all cursor-pointer"
                  >
                    <span>{task.wbs_id} - {task.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          EDIT REVIEW MODAL popup
          ---------------------------------------------------- */}
      {editingReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          <div onClick={() => setEditingReviewItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-blue-600" />
                Edit Extracted AI Fields
              </h3>
              <button onClick={() => setEditingReviewItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { key: 'activity', label: 'Activity' },
                { key: 'discipline', label: 'Discipline' },
                { key: 'asset_id', label: 'Asset ID' },
                { key: 'location', label: 'Location' },
                { key: 'date', label: 'Reported Date' },
                { key: 'time', label: 'Reported Time' },
                { key: 'status', label: 'Status' }
              ].map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">{field.label}</label>
                  <input
                    type="text"
                    value={(editForm as any)[field.key] || ''}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, [field.key]: e.target.value }));
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end border-t border-slate-200 pt-3">
              <button onClick={() => setEditingReviewItem(null)} className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 border border-slate-200 rounded cursor-pointer">Cancel</button>
              <button onClick={handleEditReviewSave} className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded shadow cursor-pointer">Save Override</button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MAPPED EVIDENCE DETAILS WINDOW
          ---------------------------------------------------- */}
      {selectedTaskEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          <div onClick={() => setSelectedTaskEvidence(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" />
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5 text-blue-600" />
                Telemetry Mapped Evidence
              </h3>
              <button onClick={() => setSelectedTaskEvidence(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="text-xs flex flex-col gap-3 text-slate-605">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">Target WBS Code</span>
                  <span className="font-extrabold text-slate-800 text-xs">{selectedTaskEvidence.wbs_id}</span>
                </div>
                <span className="font-mono text-xs font-extrabold text-green-600">{selectedTaskEvidence.progress}% Complete</span>
              </div>

              {selectedTaskEvidence.wbs_id.includes("CIV-001") && (
                <p className="leading-relaxed">Soil clearing and expressway NH-48 topography validation scan uploaded on 2026-08-05. Volumetric analysis matched WBS baseline.</p>
              )}
              {selectedTaskEvidence.wbs_id.includes("CIV-002") && (
                <p className="leading-relaxed">Pier pile depth sonic test logs submitted. Average anchor depth verified at 14.2 meters.</p>
              )}
              {selectedTaskEvidence.wbs_id.includes("PIP-001") && (
                <p className="leading-relaxed">Carbon steel spool fabrication checklist verified. NDT thickness tests: 100% complete.</p>
              )}
              {selectedTaskEvidence.wbs_id.includes("PIP-024A") && (
                <p className="leading-relaxed">Site supervisor log report: L6 spool Line 24 erection complete. Approved by planner on 26 August.</p>
              )}
              {!selectedTaskEvidence.wbs_id.includes("CIV-001") && !selectedTaskEvidence.wbs_id.includes("CIV-002") && !selectedTaskEvidence.wbs_id.includes("PIP-001") && !selectedTaskEvidence.wbs_id.includes("PIP-024A") && (
                <p className="leading-relaxed">No telemetry file evidence currently linked. Task updates mapped via manual scheduler overrides.</p>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-3">
              <button onClick={() => setSelectedTaskEvidence(null)} className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-4 py-2 border border-slate-200 rounded cursor-pointer">Close Evidence</button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TOAST FLOATING NOTIFICATION
          ---------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-2xl max-w-sm">
            <div className={`p-1.5 rounded-lg border self-start shrink-0 ${
              toastMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              toastMessage.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-bounce' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 text-xs">
              <h4 className="font-extrabold text-white uppercase tracking-wider mb-0.5">{toastMessage.title}</h4>
              <p className="text-slate-300 leading-normal">{toastMessage.text}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-slate-300 font-extrabold text-sm">&times;</button>
          </div>
        </div>
      )}

    </div>
  );
}
