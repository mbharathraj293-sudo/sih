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
  FileCheck
} from 'lucide-react';
import { getWbsTasks, resetSchedule, WBSTask } from './services/activities';
import { uploadTelemetry, IngestionResult, ExtractedEvent } from './services/ingestion';
import { getReviewQueue, approveReviewItem, rejectReviewItem, editReviewItem, reassignReviewItem, ReviewItem } from './services/review';
import { getAnalytics, getProjectMemory, getNotifications, NotificationItem, ProjectMemoryItem, AnalyticsData } from './services/analytics';

// Curated colors for dark theme charts
const COLORS = ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#6366f1', '#a855f7'];

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Navigation Routing State
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'ingestion' | 'matching' | 'review' | 'schedule' | 'variance' | 'risk' | 'memory' | 'settings'>('overview');
  
  // Local UI Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  
  // Notification Slide-over Panel State
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Anomaly Resolution Modal State
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyResolving, setAnomalyResolving] = useState(false);
  
  // Mapped Evidence Modal State
  const [selectedTaskEvidence, setSelectedTaskEvidence] = useState<WBSTask | null>(null);

  // Edit Review Modal State
  const [editingReviewItem, setEditingReviewItem] = useState<ReviewItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedEvent>>({});
  
  // Reassign Activity Modal State
  const [reassigningReviewItem, setReassigningReviewItem] = useState<ReviewItem | null>(null);

  // Ingestion File & Text Upload UI State
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'parsing' | 'done'>('idle');
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [manualReportText, setManualReportText] = useState('Verify concrete curing progress on Pier 4. We are at 50% completion, flagging concrete core temperature core logs at 62°C (hot).');
  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Demo / Simulation Mode State
  const [demoMode, setDemoMode] = useState(false);
  const [localWbsTasks, setLocalWbsTasks] = useState<WBSTask[]>([]);
  const [localReviewQueue, setLocalReviewQueue] = useState<ReviewItem[]>([]);
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);
  const [localTerminalLogs, setLocalTerminalLogs] = useState<string[]>([
    'SYSTEM: Telemetry broker online. Standby mode active.',
    'PRIMAVERA P6: Initialized bridge schedule synchronization layer.',
    'AI CORE: Dynamic fuzzy matching engine loaded. Core model version 2.4.1.'
  ]);

  // Backend connection health tracking
  const [backendConnected, setBackendConnected] = useState(true);

  // Helper to add terminal logs
  const addTerminalLog = (log: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLocalTerminalLogs(prev => [...prev, `[${time}] ${log}`]);
  };

  // Toast Trigger
  const showToast = (title: string, text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 5500);
  };

  // ----------------------------------------------------
  // Local Demo / Simulation Data Initializer
  // ----------------------------------------------------
  const loadDemoData = () => {
    setLocalWbsTasks([
      {
        wbs_id: "WBS 1.1",
        name: "NH-48 Expressway Site Clearing & Excavation",
        planned_date: "2026-08-01",
        status: "completed",
        progress: 100,
        anomaly: false,
        variance: "0 Days",
        discipline: "Civil",
        asset: "Expressway NH-48",
        location: "Sector A",
        baseline_start: "2026-08-01",
        baseline_finish: "2026-08-05",
        actual_start: "2026-08-01",
        actual_finish: "2026-08-05"
      },
      {
        wbs_id: "WBS 1.2",
        name: "Foundation Pile Installation for Pier 1-3",
        planned_date: "2026-08-10",
        status: "completed",
        progress: 100,
        anomaly: false,
        variance: "0 Days",
        discipline: "Civil",
        asset: "Piers 1-3",
        location: "Sector A",
        baseline_start: "2026-08-06",
        baseline_finish: "2026-08-15",
        actual_start: "2026-08-06",
        actual_finish: "2026-08-15"
      },
      {
        wbs_id: "WBS 1.3",
        name: "Pier 4 Concrete Pour & Curing",
        planned_date: "2026-08-20",
        status: "in_progress",
        progress: 50,
        anomaly: true,
        variance: "+3 Days (Est)",
        discipline: "Civil",
        asset: "Pier 4",
        location: "Sector B",
        baseline_start: "2026-08-16",
        baseline_finish: "2026-08-23",
        actual_start: "2026-08-16",
        actual_finish: undefined
      },
      {
        wbs_id: "WBS 1.4",
        name: "Precast Girder Assembly & Deck Erection",
        planned_date: "2026-09-02",
        status: "pending",
        progress: 0,
        anomaly: false,
        variance: "--",
        discipline: "Piping",
        asset: "Girders A-D",
        location: "Sector B",
        baseline_start: "2026-08-24",
        baseline_finish: "2026-09-05",
        actual_start: undefined,
        actual_finish: undefined
      }
    ]);

    setLocalReviewQueue([
      {
        id: "REV-001",
        source: "Drone Orthophoto (DJI RTK)",
        extracted_event: {
          discipline: "Piping",
          activity: "Spool Erection",
          asset_id: "Line 24",
          location: "Unit 02",
          date: "2026-08-26",
          time: "16:00",
          status: "completed",
          quantity: 12,
          unit: "spools",
          delay_reason: undefined,
          confidence: 0.96
        },
        suggested_activity: "WBS 1.4",
        status: "pending_review",
        reason: "High semantic similarity & matching location/asset ID",
        candidates: [
          { wbs_id: "WBS 1.4", name: "Precast Girder Assembly & Deck Erection", confidence: 0.96 },
          { wbs_id: "WBS 1.3", name: "Pier 4 Concrete Pour & Curing", confidence: 0.78 },
          { wbs_id: "WBS 1.2", name: "Foundation Pile Installation for Pier 1-3", confidence: 0.64 }
        ]
      },
      {
        id: "REV-002",
        source: "Daily Site Log PDF",
        extracted_event: {
          discipline: "Civil",
          activity: "Pier Curing",
          asset_id: "Pier 4",
          location: "Sector B",
          date: "2026-08-25",
          time: "11:30",
          status: "in_progress",
          quantity: 50,
          unit: "percent",
          delay_reason: "Thermal core temperature threshold exceeded",
          confidence: 0.88
        },
        suggested_activity: "WBS 1.3",
        status: "pending_review",
        reason: "Explicit reference to Pier 4 and curing status",
        candidates: [
          { wbs_id: "WBS 1.3", name: "Pier 4 Concrete Pour & Curing", confidence: 0.88 },
          { wbs_id: "WBS 1.2", name: "Foundation Pile Installation for Pier 1-3", confidence: 0.45 }
        ]
      }
    ]);

    setLocalNotifications([
      { id: "notif-1", message: "2 new reports require planner review.", timestamp: "10:15 AM", type: "info", read: false },
      { id: "notif-2", message: "Activity WBS 1.2 baseline synchronized.", timestamp: "09:30 AM", type: "success", read: false },
      { id: "notif-3", message: "Thermal curing anomaly flagged on Pier 4.", timestamp: "08:00 AM", type: "warning", read: true }
    ]);

    addTerminalLog("DEMO: Loaded realistic project baseline. WBS 1.3 has active anomaly.");
  };

  // ----------------------------------------------------
  // React Query Hooks (fetching from real API)
  // ----------------------------------------------------
  const { data: apiTasks, isError: errorTasks } = useQuery({
    queryKey: ['wbs-tasks'],
    queryFn: getWbsTasks,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiReviewQueue } = useQuery({
    queryKey: ['review-queue'],
    queryFn: getReviewQueue,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: _apiAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: _apiProjectMemory } = useQuery({
    queryKey: ['project-memory'],
    queryFn: getProjectMemory,
    enabled: !demoMode,
    retry: 1,
  });

  const { data: apiNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: !demoMode,
    retry: 1,
  });

  // Track API Connection Status
  useEffect(() => {
    if (errorTasks) {
      setBackendConnected(false);
      // Auto-toggle to demo mode if connection fails and warn
      if (!demoMode) {
        showToast('API Server Disconnected', 'Failed to connect to FastAPI backend. Enabling Demo / Simulation Mode automatically.', 'warning');
        setDemoMode(true);
      }
    } else if (apiTasks) {
      setBackendConnected(true);
    }
  }, [errorTasks, apiTasks, demoMode]);

  // Load Demo Data Scenario initially if demo mode is enabled
  useEffect(() => {
    if (demoMode && localWbsTasks.length === 0) {
      loadDemoData();
    }
  }, [demoMode, localWbsTasks.length]);

  // Get active tasks list based on Demo Mode toggle
  const tasks: WBSTask[] = demoMode ? localWbsTasks : (apiTasks || []);
  const reviewQueue: ReviewItem[] = demoMode ? localReviewQueue : (apiReviewQueue || []);
  const notificationsList: NotificationItem[] = demoMode ? localNotifications : (apiNotifications || []);

  // Compute stats dynamically from the current active tasks & review queues
  const totalActivities = tasks.length;
  const completedActivities = tasks.filter(t => t.status === 'completed').length;
  const inProgressActivities = tasks.filter(t => t.status === 'in_progress').length;
  const delayedActivities = tasks.filter(t => t.status === 'in_progress' && t.anomaly).length;
  const aiMatchedReports = reviewQueue.filter(r => r.status !== 'pending_review').length;
  const reviewRequiredCount = reviewQueue.filter(r => r.status === 'pending_review').length;

  // ----------------------------------------------------
  // Global Filters & Search Logic
  // ----------------------------------------------------
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.wbs_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.discipline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && task.status === 'completed') ||
      (statusFilter === 'in_progress' && task.status === 'in_progress' && !task.anomaly) ||
      (statusFilter === 'delayed' && task.status === 'in_progress' && task.anomaly) ||
      (statusFilter === 'pending' && task.status === 'pending');

    const matchesDiscipline = disciplineFilter === 'all' || task.discipline.toLowerCase() === disciplineFilter.toLowerCase();
    const matchesLocation = locationFilter === 'all' || task.location.toLowerCase() === locationFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDiscipline && matchesLocation;
  });

  // ----------------------------------------------------
  // Data Ingestion upload pipeline simulation
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
    // Simulated upload trigger for file dialog fallback
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

  const processIngestFile = (file: File) => {
    setIsUploadingLocal(true);
    setProcessingState('uploading');
    setUploadProgress(0);
    addTerminalLog(`INGEST: Uploading site report "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);

    // Animate upload progress bar
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessingState('parsing');
          addTerminalLog(`AI_CORE: Ingestion complete. Running computer vision & NLP extraction heuristics...`);
          
          // Parse after simulated processing delay
          setTimeout(() => {
            handleFinalInferenceResult(file.name, `Parsed content from file: ${file.name}`);
          }, 1500);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handleManualIngest = () => {
    if (manualReportText.trim() === '') return;
    setIsUploadingLocal(true);
    setProcessingState('parsing');
    setUploadProgress(100);
    addTerminalLog(`INGEST: Parsing manual telemetry report: "${manualReportText.substring(0, 40)}..."`);
    
    setTimeout(() => {
      handleFinalInferenceResult('Manual Report Input', manualReportText);
    }, 1500);
  };

  const handleFinalInferenceResult = async (sourceName: string, text: string) => {
    if (demoMode) {
      // Simulate client-side extraction result
      const textLower = text.toLowerCase();
      const extracted: ExtractedEvent = {
        discipline: "Civil",
        activity: "Concrete Construction",
        asset_id: "General Site",
        location: "Sector A",
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        status: "in_progress",
        quantity: 1.0,
        unit: "unit",
        delay_reason: undefined,
        confidence: 0.85
      };

      if (textLower.includes('piping') || textLower.includes('spool') || textLower.includes('line')) {
        extracted.discipline = "Piping";
        extracted.activity = "Spool Erection";
        extracted.asset_id = "Line 24";
        extracted.location = "Unit 02";
        extracted.quantity = 12;
        extracted.unit = "spools";
      } else if (textLower.includes('pier 4') || textLower.includes('curing') || textLower.includes('pour')) {
        extracted.discipline = "Civil";
        extracted.activity = "Pier Concrete Pouring";
        extracted.asset_id = "Pier 4";
        extracted.location = "Sector B";
        extracted.quantity = 100;
        extracted.unit = "percent";
      }

      if (textLower.includes('complete') || textLower.includes('done') || textLower.includes('finish') || textLower.includes('curing complete')) {
        extracted.status = "completed";
        extracted.confidence = 0.96;
      } else if (textLower.includes('anomaly') || textLower.includes('hot') || textLower.includes('variance') || textLower.includes('delay')) {
        extracted.status = "in_progress";
        extracted.delay_reason = "Thermal curing logs anomaly";
        extracted.confidence = 0.88;
      }

      const candidates = extracted.discipline === "Piping" ? [
        { wbs_id: "WBS 1.4", name: "Precast Girder Assembly & Deck Erection", confidence: 0.94 },
        { wbs_id: "WBS 1.3", name: "Pier 4 Concrete Pour & Curing", confidence: 0.52 }
      ] : [
        { wbs_id: "WBS 1.3", name: "Pier 4 Concrete Pour & Curing", confidence: 0.96 },
        { wbs_id: "WBS 1.2", name: "Foundation Pile Installation for Pier 1-3", confidence: 0.44 }
      ];

      const newId = `REV-00${localReviewQueue.length + 1}`;
      const mockResult: IngestionResult = {
        review_id: newId,
        source: sourceName,
        extracted_event: extracted,
        suggested_activity: candidates[0].wbs_id,
        candidates
      };

      setIngestionResult(mockResult);
      // Append to local queue
      const newItem: ReviewItem = {
        id: newId,
        source: sourceName,
        extracted_event: extracted,
        suggested_activity: candidates[0].wbs_id,
        status: 'pending_review',
        reason: `Fuzzy similarity match on ${extracted.activity}`,
        candidates
      };
      
      setLocalReviewQueue(prev => [newItem, ...prev]);
      setLocalNotifications(prev => [
        { id: `notif-${Date.now()}`, message: `New report ${newId} queued for review.`, timestamp: "Just Now", type: "info", read: false },
        ...prev
      ]);
      
      setIsUploadingLocal(false);
      setProcessingState('done');
      showToast('AI Ingestion Complete', `Extracted report successfully, queued as ${newId} with ${Math.round(extracted.confidence * 100)}% confidence.`, 'success');
      addTerminalLog(`AI_CORE: Extraction success. Linked suggested WBS: ${mockResult.suggested_activity}`);
      setActiveTab('matching');
    } else {
      // Direct API Call via Axios
      try {
        const result = await uploadTelemetry(sourceName === 'Manual Report Input' ? undefined : new File([text], sourceName), sourceName === 'Manual Report Input' ? text : undefined);
        setIngestionResult(result);
        
        // Refresh Tanstack queries
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        setIsUploadingLocal(false);
        setProcessingState('done');
        showToast('AI Ingestion Complete', `Backend validated telemetry and created review ticket.`, 'success');
        addTerminalLog(`API: Telemetry upload response returned ID ${result.review_id}. Matched activity WBS ${result.suggested_activity}`);
        setActiveTab('matching');
      } catch (err) {
        console.error(err);
        setIsUploadingLocal(false);
        setProcessingState('idle');
        showToast('Ingestion Error', 'Unable to upload file to the server. Please check the backend connection.', 'warning');
        addTerminalLog('ERROR: Backend upload pipeline failed. Ingestion aborted.');
      }
    }
  };

  // ----------------------------------------------------
  // Review Queue Approve / Reject Actions
  // ----------------------------------------------------
  const handleApprove = async (id: string) => {
    addTerminalLog(`PLANNER: Approving report ticket ${id}...`);
    if (demoMode) {
      // Find item
      const itemIndex = localReviewQueue.findIndex(r => r.id === id);
      if (itemIndex === -1) return;

      const item = localReviewQueue[itemIndex];
      const updatedQueue = [...localReviewQueue];
      updatedQueue[itemIndex] = { ...item, status: 'approved' };
      setLocalReviewQueue(updatedQueue);

      // Update WBS task
      const targetWbs = item.suggested_activity;
      if (targetWbs) {
        const taskIndex = localWbsTasks.findIndex(t => t.wbs_id === targetWbs);
        if (taskIndex !== -1) {
          const updatedWbs = [...localWbsTasks];
          updatedWbs[taskIndex] = {
            ...updatedWbs[taskIndex],
            progress: 100,
            status: 'completed',
            variance: '0 Days',
            anomaly: false,
            actual_finish: item.extracted_event.date
          };
          setLocalWbsTasks(updatedWbs);
          addTerminalLog(`WBS_SYNC: Primavera P6 database synced. Task ${targetWbs} progress updated to 100%.`);
        }
      }

      showToast('WBS Activity Approved', `Ticket ${id} verified. WBS Schedule updated immediately.`, 'success');
    } else {
      try {
        await approveReviewItem(id);
        queryClient.invalidateQueries({ queryKey: ['wbs-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        showToast('WBS Activity Approved', `Schedule updated via API successfully.`, 'success');
        addTerminalLog(`API: Review item ${id} approval successfully pushed to backend.`);
      } catch (err) {
        showToast('Approval Error', 'Backend failed to process approval.', 'warning');
      }
    }
  };

  const handleReject = async (id: string) => {
    addTerminalLog(`PLANNER: Rejecting report ticket ${id}...`);
    if (demoMode) {
      setLocalReviewQueue(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      showToast('Report Rejected', `Ticket ${id} marked as rejected.`, 'info');
    } else {
      try {
        await rejectReviewItem(id);
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        showToast('Report Rejected', `Ticket status updated to rejected.`, 'info');
      } catch (err) {
        showToast('Rejection Error', 'Failed to reject.', 'warning');
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
            }
          };
        }
        return r;
      }));
      setEditingReviewItem(null);
      showToast('Report Edited', `Ticket ${id} fields updated locally.`, 'success');
    } else {
      try {
        await editReviewItem(id, editForm);
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
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
    addTerminalLog(`PLANNER: Reassigning ticket ${id} from ${reassigningReviewItem.suggested_activity} to ${wbsId}...`);
    
    if (demoMode) {
      setLocalReviewQueue(prev => prev.map(r => {
        if (r.id === id) {
          const selectedTask = localWbsTasks.find(t => t.wbs_id === wbsId);
          return {
            ...r,
            suggested_activity: wbsId,
            reason: `Manually reassigned to ${selectedTask?.name || wbsId}`
          };
        }
        return r;
      }));
      setReassigningReviewItem(null);
      showToast('Reassigned WBS Code', `Ticket ${id} reassigned to ${wbsId}.`, 'success');
    } else {
      try {
        await reassignReviewItem(id, wbsId);
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        setReassigningReviewItem(null);
        showToast('Reassigned WBS Code', 'Reassignment saved to API server.', 'success');
      } catch (err) {
        showToast('Reassign Error', 'Failed to reassign activity.', 'warning');
      }
    }
  };

  // ----------------------------------------------------
  // Anomaly Resolution Trigger
  // ----------------------------------------------------
  const handleResolveAnomaly = () => {
    setAnomalyResolving(true);
    addTerminalLog('ANOMALY_BOT: Initiating Primavera P6 resolution sequence for WBS 1.3 concrete pour thermal delay...');
    
    setTimeout(() => {
      if (demoMode) {
        setLocalWbsTasks(prev => prev.map(t => {
          if (t.wbs_id === 'WBS 1.3') {
            return {
              ...t,
              progress: 100,
              status: 'completed',
              variance: '0 Days',
              anomaly: false,
              actual_finish: '2026-08-27'
            };
          }
          return t;
        }));
        setLocalNotifications(prev => [
          { id: `notif-${Date.now()}`, message: "Thermal variance on Pier 4 resolved & synced.", timestamp: "Just Now", type: "success", read: false },
          ...prev
        ]);
        showToast('Anomaly Resolved', 'Pier 4 Concrete curing anomaly cleared. Schedule critical path recalculated.', 'success');
      } else {
        // Run API clear sequence via db reset or mock endpoint update
        // We'll call the ingestion legacy reset endpoint or approve REV-002 which represents the Pier 4 report
        handleApprove('REV-002');
      }
      setAnomalyResolving(false);
      setShowAnomalyModal(false);
      addTerminalLog('ANOMALY_BOT: Successfully synchronized schedule baseline. Delta updated to 0 Days.');
    }, 2000);
  };

  // Trigger Local Scenario Simulation
  const handleLoadSimulationScenario = () => {
    loadDemoData();
    showToast('Simulation Scenario Loaded', 'Demo project clearing, piling, curing logs and anomalies loaded.', 'info');
    setActiveTab('overview');
  };

  // Trigger Database Reset (Demo reset button)
  const handleResetDb = async () => {
    addTerminalLog('SYSTEM: Triggering scheduling database reset request...');
    if (demoMode) {
      loadDemoData();
      showToast('Database State Reset', 'Local database rolled back to baseline layout.', 'success');
    } else {
      try {
        await resetSchedule();
        queryClient.invalidateQueries({ queryKey: ['wbs-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        showToast('Database State Reset', 'API server rolled back to baseline layout.', 'success');
        addTerminalLog('API: Scheduling database successfully reset.');
      } catch (err) {
        showToast('Reset Error', 'Failed to clear database.', 'warning');
      }
    }
  };

  // ----------------------------------------------------
  // Chart Helper Calculations
  // ----------------------------------------------------
  // Compute chart data dynamically if in Demo Mode, else use API analytics metrics
  const isWbs13Complete = tasks.find(t => t.wbs_id === 'WBS 1.3')?.status === 'completed';

  const lineChartData = [
    { week: 'Wk 1', Planned: 20, Actual: 20 },
    { week: 'Wk 2', Planned: 45, Actual: 45 },
    { week: 'Wk 3', Planned: 60, Actual: 58 },
    { week: 'Wk 4', Planned: 68, Actual: isWbs13Complete ? 72 : 62 }
  ];

  const disciplineProgressData = [
    { discipline: 'Civil', progress: 83 },
    { discipline: 'Piping', progress: tasks.find(t => t.wbs_id === 'WBS 1.4')?.progress || 0 },
    { discipline: 'Electrical', progress: 0 },
    { discipline: 'Instrumentation', progress: 0 },
    { discipline: 'Mechanical', progress: 0 },
    { discipline: 'HSE', progress: 100 }
  ];

  const matchingPerformanceData = [
    { name: 'Auto Matched', value: 75 },
    { name: 'Planner Reviewed', value: 20 },
    { name: 'Unmatched', value: 5 }
  ];

  const delayRiskData = [
    { name: 'High', value: delayedActivities },
    { name: 'Medium', value: inProgressActivities - delayedActivities },
    { name: 'Low', value: completedActivities }
  ];

  const scheduleVarianceData = [
    { name: 'Ahead', value: 0 },
    { name: 'On Time', value: completedActivities },
    { name: 'Delayed', value: delayedActivities }
  ];

  const activityStatusData = [
    { name: 'Completed', value: completedActivities },
    { name: 'In Progress', value: inProgressActivities },
    { name: 'Not Started', value: tasks.filter(t => t.status === 'pending').length },
    { name: 'Blocked', value: delayedActivities }
  ];

  // UI helpers to trigger tab routing from clicking KPI cards
  const navigateToFilteredActivities = (filter: string) => {
    setStatusFilter(filter);
    setActiveTab('activities');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex font-sans relative overflow-x-hidden selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Background glowing effects */}
      <div className="absolute inset-0 grid-overlay opacity-[0.03] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ----------------------------------------------------
          SIDEBAR NAVIGATION
          ---------------------------------------------------- */}
      <aside className="w-64 shrink-0 bg-slate-950/80 border-r border-slate-800/80 backdrop-blur-md flex flex-col z-30">
        {/* Logo Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-md shadow-blue-500/10">
            <HardHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight uppercase">
              SYNTARX CC
            </h1>
            <p className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">Command Center v1.2</p>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'activities', label: 'Activity Intelligence', icon: ListTodo },
            { id: 'ingestion', label: 'Data Ingestion', icon: FileUp },
            { id: 'matching', label: 'AI Matching', icon: Brain },
            { id: 'review', label: 'Review Queue', icon: CheckSquare, badge: reviewRequiredCount },
            { id: 'schedule', label: 'Schedule Timeline', icon: Calendar },
            { id: 'variance', label: 'Variance Analysis', icon: TrendingUp },
            { id: 'risk', label: 'Risk Intelligence', icon: AlertTriangle },
            { id: 'memory', label: 'Project Memory', icon: History },
            { id: 'settings', label: 'System Settings', icon: SettingsIcon }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600/15 text-blue-400 border-r-2 border-blue-500 shadow-inner'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync / Connection Status Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
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
            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 text-[9px] text-amber-300 font-mono flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>SIMULATION ACTIVE</span>
            </div>
          )}
        </div>
      </aside>

      {/* ----------------------------------------------------
          MAIN SCREEN CONTAINER
          ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 z-10">

        {/* ----------------------------------------------------
            TOP NAVBAR
            ---------------------------------------------------- */}
        <header className="border-b border-slate-800/80 bg-slate-950/40 sticky top-0 z-20 backdrop-blur-md">
          <div className="px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Global Search Bar */}
            <div className="flex items-center relative max-w-sm w-full">
              <Search className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
              <input 
                type="text"
                placeholder="Global search (WBS, assets, status, text)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-blue-500 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            {/* Quick Actions & Demo Settings */}
            <div className="flex items-center gap-4 shrink-0">
              
              {/* Load Scenario Button */}
              {demoMode && (
                <button
                  onClick={handleLoadSimulationScenario}
                  className="text-xs font-bold text-amber-400 hover:text-white bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Load Simulation</span>
                </button>
              )}

              {/* Demo Mode Switch */}
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wide">DEMO MODE</span>
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none relative ${demoMode ? 'bg-blue-600' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${demoMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Sync Primavera Button */}
              <button 
                onClick={handleResetDb}
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900/50 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Database</span>
              </button>

              {/* Notification Bell */}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-200 bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-900 transition-all focus:outline-none shrink-0 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {notificationsList.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-[#0b0f19]" />
                )}
              </button>

              <div className="h-6 w-[1px] bg-slate-850" />

              {/* User Profile */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-full border border-slate-800 bg-slate-900 text-slate-300 font-bold text-xs select-none">
                  PL
                </div>
                <div className="hidden md:block">
                  <span className="block text-[11px] font-bold text-white leading-tight">Planner Reviewer</span>
                  <span className="block text-[9px] text-slate-500 font-mono">SECTOR B LEAD</span>
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* ----------------------------------------------------
            MAIN LAYOUT WRAPPER
            ---------------------------------------------------- */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

          {/* ----------------------------------------------------
              ENTERPRISE KPI METRIC RIBBON
              ---------------------------------------------------- */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Activities', value: totalActivities, key: 'all', border: 'border-slate-800 hover:border-blue-500/30' },
              { label: 'Completed', value: completedActivities, key: 'completed', border: 'border-slate-800 hover:border-emerald-500/30' },
              { label: 'In Progress', value: inProgressActivities - delayedActivities, key: 'in_progress', border: 'border-slate-800 hover:border-amber-500/30' },
              { label: 'Delayed / Anomaly', value: delayedActivities, key: 'delayed', border: 'border-slate-800 hover:border-red-500/40', badge: delayedActivities > 0 },
              { label: 'AI Matched', value: aiMatchedReports, key: 'approved', border: 'border-slate-800 hover:border-indigo-500/30' },
              { label: 'Review Required', value: reviewRequiredCount, key: 'pending_review', border: 'border-slate-800 hover:border-pink-500/30', alert: reviewRequiredCount > 0 }
            ].map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (kpi.key === 'delayed' && delayedActivities > 0) {
                    setShowAnomalyModal(true);
                  } else {
                    navigateToFilteredActivities(kpi.key);
                  }
                }}
                className={`bg-slate-900/40 backdrop-blur-sm border ${kpi.border} rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer relative overflow-hidden group select-none`}
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block group-hover:text-blue-400 transition-colors">
                  {kpi.label}
                </span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <h3 className="font-extrabold text-2xl text-white tracking-tight">
                    {kpi.value}
                  </h3>
                  {kpi.alert && (
                    <span className="text-[9px] text-pink-400 font-bold px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 animate-pulse">
                      Needs Action
                    </span>
                  )}
                  {kpi.badge && (
                    <span className="text-[9px] text-red-400 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 animate-bounce">
                      Active Conflict
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
              
              {/* Row 1: KPI Visualizations and Core charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: S-Curve Progress */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">Planned vs. Actual S-Curve</h3>
                      <p className="text-[10px] text-slate-500">Cumulative schedule progress percentage</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="h-48 w-full text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="week" stroke="#64748b" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1' }} />
                        <Legend verticalAlign="top" height={24} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                        <Line type="monotone" dataKey="Planned" name="Planned Baseline" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="Actual" name="Actual Progress" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Discipline Progress */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">Discipline Completion Progress</h3>
                      <p className="text-[10px] text-slate-500">Progress percentage by WBS discipline</p>
                    </div>
                    <Layers className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="h-48 w-full text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disciplineProgressData} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                        <YAxis dataKey="discipline" type="category" stroke="#64748b" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1' }} />
                        <Bar dataKey="progress" name="Completion %" fill="#10b981" radius={[0, 4, 4, 0]}>
                          {disciplineProgressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: AI Matching Performance */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">AI Matching Performance</h3>
                      <p className="text-[10px] text-slate-500">Telemetry-to-WBS automation ratio</p>
                    </div>
                    <Brain className="h-4 w-4 text-purple-500" />
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
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1' }} />
                        <Legend verticalAlign="bottom" height={24} iconSize={6} wrapperStyle={{ fontSize: '9px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Row 2: Analytics Panels, Project Intelligence, CV Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Project Intelligence AI Insights */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">Project Intelligence</h3>
                      <p className="text-[10px] text-slate-500">Real-time scheduling risk insights</p>
                    </div>
                    <Cpu className="h-4 w-4 text-pink-500" />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3">
                    {[
                      { icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', text: '1 activity (WBS 1.3 Concrete Pour) is trending 3 days behind baseline schedule due to curing temperatures.' },
                      { icon: TrendingDown, color: 'text-red-400 bg-red-500/10 border-red-500/20', text: 'Material supply chain variance is flagged: Precast Deck Assembly components are delayed.' },
                      { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20', text: 'Piling installations (WBS 1.2) successfully completed. Structural integrity data approved.' },
                      { icon: Brain, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', text: 'AI confidence index matches are high (average 92.4% confidence across 5 ingest logs).' }
                    ].map((insight, idx) => {
                      const InsightIcon = insight.icon;
                      return (
                        <div key={idx} className={`p-3 rounded-lg border flex gap-3 text-xs leading-relaxed ${insight.color}`}>
                          <InsightIcon className="h-5 w-5 shrink-0 mt-0.5" />
                          <p>{insight.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Automated Variance Detection CV Log Terminal */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <TerminalIcon className="h-4.5 w-4.5 text-blue-500" />
                      In-Memory Broker Logs
                    </h3>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 font-mono uppercase tracking-widest animate-pulse">
                      Live Stream
                    </span>
                  </div>
                  
                  {/* Console Interface */}
                  <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-3.5 font-mono text-[9px] text-blue-400 flex flex-col gap-2 h-64 overflow-y-auto select-text shadow-inner">
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

                {/* Summary Flow Visualizer Card */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">System Architecture</h3>
                    <p className="text-[10px] text-slate-500">End-to-end automation telemetry pipeline</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 text-xs">
                    {[
                      { num: '01', title: 'Data Ingestion', desc: 'Drone PDF, CSV, TXT telemetry scans.' },
                      { num: '02', title: 'AI Extraction', desc: 'Identify activities, structures & quantities.' },
                      { num: '03', title: 'Fuzzy Matcher', desc: 'Maps telemetry to schedule candidate WBS codes.' },
                      { num: '04', title: 'Planner Review', desc: 'Planner verifies extraction on Review Queue.' },
                      { num: '05', title: 'Schedule Update', desc: 'Approve to instantly update P6 baseline states.' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-900/20 hover:bg-slate-900/50 border border-transparent hover:border-slate-800 rounded-lg transition-all group">
                        <span className="text-[11px] font-mono font-extrabold text-blue-500 group-hover:text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded">
                          {step.num}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-xs">{step.title}</h4>
                          <p className="text-[10px] text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ACTIVITY INTELLIGENCE */}
          {activeTab === 'activities' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
              
              {/* Filter Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-blue-500" />
                    WBS Activity Intelligence Table
                  </h2>
                  <p className="text-[10px] text-slate-500">Search and filter active construction schedule activities</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  
                  {/* Status Tab Filters */}
                  <div className="flex border border-slate-800 bg-slate-950/40 rounded-lg p-0.5">
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
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer ${
                          statusFilter === tab.key 
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' 
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Discipline Dropdown Filter */}
                  <select
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    className="bg-slate-950/40 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Disciplines</option>
                    <option value="civil">Civil</option>
                    <option value="piping">Piping</option>
                  </select>

                  {/* Location Dropdown Filter */}
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="bg-slate-950/40 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Locations</option>
                    <option value="sector a">Sector A</option>
                    <option value="sector b">Sector B</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-800/80 rounded-lg overflow-x-auto bg-slate-950/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 font-semibold text-slate-400 select-none">
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
                  <tbody className="divide-y divide-slate-850/50">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        let statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                        let progressBar = 'bg-slate-700';

                        if (task.status === 'completed') {
                          statusColor = 'bg-green-500/10 text-green-400 border-green-500/20';
                          progressBar = 'bg-green-500';
                        } else if (task.status === 'in_progress') {
                          if (task.anomaly) {
                            statusColor = 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse';
                            progressBar = 'bg-red-500';
                          } else {
                            statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                            progressBar = 'bg-amber-500';
                          }
                        }

                        return (
                          <tr key={task.wbs_id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{task.wbs_id}</td>
                            <td className="py-3 px-4 font-bold text-slate-100">{task.name}</td>
                            <td className="py-3 px-4 text-slate-400">{task.discipline}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{task.location}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{task.baseline_finish}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {task.status === 'in_progress' && task.anomaly ? 'delayed' : task.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[9px] w-8 text-right text-slate-300">
                                  {task.progress}%
                                </span>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${progressBar}`}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setSelectedTaskEvidence(task)}
                                className="text-[10px] font-extrabold text-blue-400 hover:text-white px-2 py-1 rounded bg-blue-500/5 hover:bg-blue-500/20 border border-blue-500/10 cursor-pointer"
                              >
                                View Mapped
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-mono">
                          No tasks match the active filters or query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DATA INGESTION */}
          {activeTab === 'ingestion' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Ingestion upload panel */}
              <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileUp className="h-4.5 w-4.5 text-blue-500" />
                    Multi-Modal Data Ingestion Zone
                  </h2>
                  <p className="text-[10px] text-slate-500">Provide drone orthophotos, core sensor temperature logs, or text reports</p>
                </div>

                {/* Upload drag dropzone */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerIngestionClick}
                  className={`border border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-full mb-3 shadow-md">
                    {processingState === 'parsing' ? (
                      <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                    ) : processingState === 'uploading' ? (
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    ) : (
                      <UploadCloud className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  
                  <h3 className="font-bold text-xs text-slate-300 mb-0.5">Drag telemetry files here</h3>
                  <p className="text-[9px] text-slate-500 max-w-[240px] mb-4">Supports site PDF reports, CSV logs, TXT sensor scans.</p>
                  
                  {processingState !== 'idle' ? (
                    <div className="w-48 flex flex-col gap-1.5">
                      <div className="flex justify-between text-[8px] font-mono text-slate-400">
                        <span>{processingState === 'uploading' ? 'UPLOADING' : 'PARSING RAW CODES'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      className="text-[10px] font-bold px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      Process Site File Capture
                    </button>
                  )}
                </div>

                <div className="h-[1px] bg-slate-850" />

                {/* Manual Text Ingest Area */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Manual Field Observation Log
                  </label>
                  <textarea
                    value={manualReportText}
                    onChange={(e) => setManualReportText(e.target.value)}
                    placeholder="Describe observations, progress, structures, and delays manually..."
                    className="bg-slate-950/40 border border-slate-800 hover:border-slate-700 focus:border-blue-500 text-slate-200 text-xs rounded-lg p-3 h-24 resize-none focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleManualIngest}
                    disabled={isUploadingLocal}
                    className="self-end text-[10px] font-extrabold text-blue-400 hover:text-white flex items-center gap-1 py-1 px-3 hover:bg-blue-500/10 border border-blue-500/10 rounded cursor-pointer disabled:opacity-40"
                  >
                    {isUploadingLocal ? 'Analyzing...' : 'Parse Observations'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

              {/* Extraction result card */}
              <div className="flex flex-col justify-between">
                {ingestionResult ? (
                  <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4 h-full animate-slide-in">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h2 className="font-bold text-sm text-white flex items-center gap-2">
                          <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                          AI Extraction Result Card
                        </h2>
                        <span className="text-[9px] text-slate-500">Source: {ingestionResult.source}</span>
                      </div>
                      
                      {/* Confidence Score Bar */}
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-green-400 font-mono bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                          {Math.round(ingestionResult.extracted_event.confidence * 100)}% Confidence
                        </span>
                      </div>
                    </div>

                    {/* Editable Form Fields */}
                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      {[
                        { key: 'activity', label: 'Identified Activity' },
                        { key: 'discipline', label: 'Discipline' },
                        { key: 'asset_id', label: 'Target Asset' },
                        { key: 'location', label: 'Location' },
                        { key: 'date', label: 'Reported Date' },
                        { key: 'time', label: 'Reported Time' },
                        { key: 'status', label: 'Status (completed/in_progress)' },
                        { key: 'quantity', label: 'Quantity' },
                        { key: 'unit', label: 'Unit' },
                        { key: 'delay_reason', label: 'Anomaly / Delay Reason' }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col gap-1">
                          <label className="text-[10px] font-extrabold text-slate-500">{field.label}</label>
                          <input
                            type="text"
                            value={(ingestionResult.extracted_event as any)[field.key] || ''}
                            onChange={(e) => {
                              const updated = { ...ingestionResult };
                              (updated.extracted_event as any)[field.key] = e.target.value;
                              setIngestionResult(updated);
                            }}
                            className="bg-slate-950/40 border border-slate-850 focus:border-blue-500 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none transition-all"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleManualIngest}
                        className="flex-1 text-[10px] font-extrabold text-slate-300 hover:text-white bg-slate-900 border border-slate-850 hover:border-slate-700 py-2.5 rounded transition-all cursor-pointer"
                      >
                        Reprocess with AI
                      </button>
                      <button
                        onClick={() => setActiveTab('matching')}
                        className="flex-1 text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded shadow-lg shadow-blue-500/10 transition-all cursor-pointer"
                      >
                        Match WBS Activity
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-850 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                    <FileCheck className="h-8 w-8 text-slate-600 mb-2" />
                    <h3 className="font-bold text-xs text-slate-400">Waiting for Ingestion</h3>
                    <p className="text-[9px] text-slate-600 max-w-[200px] mt-1 leading-normal">
                      Provide a drone orthophoto or sensor telemetry log on the left to extract values.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: AI MATCHING */}
          {activeTab === 'matching' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-6">
              
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <Brain className="h-4.5 w-4.5 text-blue-500" />
                  AI Activity Matching Analysis
                </h2>
                <p className="text-[10px] text-slate-500">Fuzzy semantic alignments mapping extracted observations to baseline schedule WBS elements</p>
              </div>

              {ingestionResult ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-in">
                  
                  {/* Event Profile Summary */}
                  <div className="lg:col-span-1 bg-slate-950/40 border border-slate-850 rounded-xl p-4.5 flex flex-col gap-3">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 pb-2">
                      Extracted Site Profile
                    </h3>
                    <div className="flex flex-col gap-2.5 text-xs">
                      {[
                        { label: 'Discipline', val: ingestionResult.extracted_event.discipline },
                        { label: 'Activity', val: ingestionResult.extracted_event.activity },
                        { label: 'Asset ID', val: ingestionResult.extracted_event.asset_id },
                        { label: 'Location', val: ingestionResult.extracted_event.location },
                        { label: 'Date/Time', val: `${ingestionResult.extracted_event.date} @ ${ingestionResult.extracted_event.time}` },
                        { label: 'Observed Status', val: ingestionResult.extracted_event.status }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-900/40 pb-1.5">
                          <span className="text-slate-500 font-medium">{item.label}</span>
                          <span className="text-slate-200 font-bold font-mono">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Candidates List */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400">
                      Top Matching Schedule Activities
                    </h3>

                    <div className="flex flex-col gap-3">
                      {ingestionResult.candidates.map((cand) => {
                        const isSuggested = ingestionResult.suggested_activity === cand.wbs_id;
                        return (
                          <div 
                            key={cand.wbs_id}
                            className={`p-4 border rounded-xl flex items-center justify-between transition-all duration-300 ${
                              isSuggested
                                ? 'bg-blue-600/10 border-blue-500/40 shadow-inner shadow-blue-500/5'
                                : 'bg-slate-950/20 border-slate-850 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                  {cand.wbs_id}
                                </span>
                                <h4 className="font-bold text-white text-xs leading-tight">{cand.name}</h4>
                              </div>
                              
                              {/* Confidence rating progress bar */}
                              <div className="flex items-center gap-3 mt-2.5 max-w-sm">
                                <span className="text-[9px] font-mono font-bold text-slate-400">Confidence:</span>
                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isSuggested ? 'bg-blue-500' : 'bg-slate-600'}`}
                                    style={{ width: `${cand.confidence * 100}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold font-mono ${isSuggested ? 'text-blue-400' : 'text-slate-400'}`}>
                                  {Math.round(cand.confidence * 100)}%
                                </span>
                              </div>
                            </div>

                            {/* Why this match checklists */}
                            {isSuggested && (
                              <div className="hidden md:flex flex-col gap-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80 text-[9px] text-slate-400 shrink-0 font-medium">
                                <span className="font-bold text-slate-300 mb-0.5">Fuzzy Link Heuristics:</span>
                                <span className="text-green-400">✓ Discipline Match ({ingestionResult.extracted_event.discipline})</span>
                                <span className="text-green-400">✓ Location Match ({ingestionResult.extracted_event.location})</span>
                                <span className="text-green-400">✓ Semantic Similarity (96.8%)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 justify-end mt-4">
                      {/* Dropdown override selection */}
                      <div className="flex items-center gap-2 border border-slate-800 rounded-lg px-3 py-1 bg-slate-950/40 text-xs">
                        <span className="text-slate-500 font-medium">Manually Link:</span>
                        <select
                          value={ingestionResult.suggested_activity}
                          onChange={(e) => {
                            const updated = { ...ingestionResult };
                            updated.suggested_activity = e.target.value;
                            setIngestionResult(updated);
                          }}
                          className="bg-transparent text-slate-300 font-bold border-none outline-none cursor-pointer focus:ring-0"
                        >
                          {tasks.map(t => (
                            <option key={t.wbs_id} value={t.wbs_id}>{t.wbs_id} - {t.name.substring(0, 20)}...</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          showToast('Ticket Sent', `Ingested event queued for planner authorization.`, 'info');
                          setActiveTab('review');
                        }}
                        className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg shadow-lg shadow-blue-500/10 cursor-pointer"
                      >
                        Push to Review Queue
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/20 border border-slate-850 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center py-16">
                  <Brain className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <h3 className="font-bold text-xs text-slate-400">No telemetry file selected</h3>
                  <p className="text-[9px] text-slate-600 max-w-[200px] mt-1 leading-normal">
                    Fuzzy matching candidates will load once you process a site report capture.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: REVIEW QUEUE */}
          {activeTab === 'review' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
              
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-blue-500" />
                  Planner Review Queue
                </h2>
                <p className="text-[10px] text-slate-500">Authorize incoming telemetry reports before modifying scheduling engines</p>
              </div>

              {/* Table list */}
              <div className="border border-slate-800/80 rounded-lg overflow-x-auto bg-slate-950/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 font-semibold text-slate-400">
                      <th className="py-3 px-4 font-mono text-[9px]">ID</th>
                      <th className="py-3 px-4">SOURCE</th>
                      <th className="py-3 px-4">EXTRACTED SITE EVENT</th>
                      <th className="py-3 px-4">SUGGESTED WBS</th>
                      <th className="py-3 px-4 text-center">CONFIDENCE</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {reviewQueue.length > 0 ? (
                      reviewQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{item.id}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-300">{item.source}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-200">
                                {item.extracted_event.activity} - {item.extracted_event.asset_id}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Location: {item.extracted_event.location} | Discipline: {item.extracted_event.discipline}
                              </span>
                              {item.extracted_event.delay_reason && (
                                <span className="text-[9px] text-red-400 font-medium">
                                  Delay: {item.extracted_event.delay_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-extrabold text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded w-fit">
                                {item.suggested_activity || 'None'}
                              </span>
                              <span className="text-[9px] text-slate-500 truncate max-w-[180px]">
                                {tasks.find(t => t.wbs_id === item.suggested_activity)?.name || 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-green-400">
                              {Math.round(item.extracted_event.confidence * 100)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              item.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              item.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.status === 'pending_review' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApprove(item.id)}
                                  className="text-[10px] font-extrabold text-green-400 hover:text-white bg-green-500/5 hover:bg-green-600 border border-green-500/20 px-2.5 py-1 rounded cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(item.id)}
                                  className="text-[10px] font-extrabold text-red-400 hover:text-white bg-red-500/5 hover:bg-red-600 border border-red-500/20 px-2.5 py-1 rounded cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReviewItem(item);
                                    setEditForm({ ...item.extracted_event });
                                  }}
                                  className="text-[10px] font-extrabold text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setReassigningReviewItem(item)}
                                  className="text-[10px] font-extrabold text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700 cursor-pointer"
                                >
                                  Reassign
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-500 font-mono">
                          Review queue is empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 6: SCHEDULE TIMELINE */}
          {activeTab === 'schedule' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
              
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-500" />
                  Primavera P6 Gantt Schedule
                </h2>
                <p className="text-[10px] text-slate-500">Visual Gantt timeline charting baseline targets vs actual telemetry observations</p>
              </div>

              {/* Gantt Timeline Visual */}
              <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950/20 p-5 overflow-x-auto min-w-[700px]">
                
                {/* Header Grid */}
                <div className="grid grid-cols-12 border-b border-slate-800 pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none font-mono">
                  <div className="col-span-4">WBS Activities</div>
                  <div className="col-span-2 text-center">Baseline Scope</div>
                  <div className="col-span-6 grid grid-cols-4 text-center">
                    <span>Wk 1</span>
                    <span>Wk 2</span>
                    <span>Wk 3</span>
                    <span>Wk 4</span>
                  </div>
                </div>

                {/* Rows */}
                <div className="flex flex-col divide-y divide-slate-900">
                  {tasks.map((task) => {
                    let taskColor = 'bg-slate-700 border-slate-600';

                    if (task.status === 'completed') {
                      taskColor = 'bg-green-500 border-green-600';
                    } else if (task.status === 'in_progress') {
                      taskColor = task.anomaly ? 'bg-red-500 border-red-600 animate-pulse' : 'bg-amber-500 border-amber-600';
                    }

                    // Simulated bar positions based on WBS ID
                    let leftMargin = '0%';
                    let barWidth = '25%';

                    if (task.wbs_id === 'WBS 1.2') {
                      leftMargin = '20%';
                      barWidth = '33%';
                    } else if (task.wbs_id === 'WBS 1.3') {
                      leftMargin = '45%';
                      barWidth = '28%';
                    } else if (task.wbs_id === 'WBS 1.4') {
                      leftMargin = '70%';
                      barWidth = '25%';
                    }

                    return (
                      <div key={task.wbs_id} className="grid grid-cols-12 py-4 items-center">
                        {/* Title details */}
                        <div className="col-span-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                              {task.wbs_id}
                            </span>
                            <span className="font-bold text-xs text-slate-200 leading-tight">{task.name}</span>
                          </div>
                        </div>

                        {/* Date info */}
                        <div className="col-span-2 text-center text-[10px] text-slate-500 font-mono flex flex-col gap-0.5 shrink-0">
                          <span>S: {task.baseline_start}</span>
                          <span>F: {task.baseline_finish}</span>
                        </div>

                        {/* Gantt Bar Chart Panel */}
                        <div className="col-span-6 relative h-10 flex items-center">
                          {/* Weekly division grids */}
                          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                            <div className="border-r border-slate-900/50" />
                            <div className="border-r border-slate-900/50" />
                            <div className="border-r border-slate-900/50" />
                            <div className="border-r border-slate-900/50" />
                          </div>

                          {/* Planned Baseline Bar */}
                          <div 
                            className="absolute h-3 border border-dashed border-slate-800 bg-slate-900/30 rounded"
                            style={{ left: leftMargin, width: barWidth }}
                          />

                          {/* Actual Progress Bar */}
                          <div 
                            className={`absolute h-4 rounded shadow-sm border ${taskColor} transition-all duration-1000 overflow-hidden flex items-center justify-end pr-1`}
                            style={{ 
                              left: leftMargin, 
                              width: `calc(${barWidth} * (${task.progress} / 100))` 
                            }}
                          >
                            <span className="text-[8px] font-extrabold text-slate-950 font-mono">
                              {task.progress > 20 ? `${task.progress}%` : ''}
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

          {/* TAB 7: VARIANCE ANALYSIS */}
          {activeTab === 'variance' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
                    Planned vs. Actual Variance Analysis
                  </h2>
                  <p className="text-[10px] text-slate-500">Calculate variance schedules: Schedule Variance = Actual Finish - Baseline Finish</p>
                </div>
                
                {/* Variance Quick Filter options */}
                <div className="flex border border-slate-800 bg-slate-950/40 rounded-lg p-0.5 text-[9px] font-bold">
                  {[
                    { key: 'all', label: 'All Activities' },
                    { key: 'delayed', label: 'Critical Variance (+ Days)' },
                    { key: 'completed', label: 'On Schedule (0 Days)' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setStatusFilter(opt.key)}
                      className={`px-3 py-1 rounded transition-all cursor-pointer ${
                        statusFilter === opt.key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variance Table */}
              <div className="border border-slate-800/80 rounded-lg overflow-x-auto bg-slate-950/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 font-semibold text-slate-400 select-none">
                      <th className="py-3 px-4 font-mono text-[9px] w-28">WBS CODE</th>
                      <th className="py-3 px-4">TASK DESCRIPTION</th>
                      <th className="py-3 px-4 font-mono text-[9px]">BASELINE START</th>
                      <th className="py-3 px-4 font-mono text-[9px]">BASELINE FINISH</th>
                      <th className="py-3 px-4 font-mono text-[9px]">ACTUAL START</th>
                      <th className="py-3 px-4 font-mono text-[9px]">ACTUAL FINISH</th>
                      <th className="py-3 px-4 text-center">VARIANCE</th>
                      <th className="py-3 px-4 text-center">CRITICAL PATH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {filteredTasks.map((task) => {
                      const isDelayed = task.status === 'in_progress' && task.anomaly;
                      
                      return (
                        <tr key={task.wbs_id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{task.wbs_id}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-100">{task.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{task.baseline_start}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{task.baseline_finish}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{task.actual_start || '--'}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{task.actual_finish || '--'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                              isDelayed ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              task.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              'bg-slate-850 text-slate-500 border-slate-800'
                            }`}>
                              {task.variance}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isDelayed ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-900 text-slate-600'
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
          )}

          {/* TAB 8: RISK INTELLIGENCE */}
          {activeTab === 'risk' && (
            <div className="flex flex-col gap-6">
              
              {/* Risks summary header */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Predictive Delay Risks list */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">Predictive Schedule Delay Risks</h3>
                    <p className="text-[10px] text-slate-500">Upcoming calendar activities susceptible to supply chain and logistical delays</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3.5 text-xs">
                    {[
                      { code: 'WBS 1.4', task: 'Precast Girder Assembly & Deck Erection', risk: 'HIGH (42% delay risk)', desc: 'Material supply lead times on structural assemblies are delayed by 5 days. Contingency plans recommended.' },
                      { code: 'WBS 1.3', task: 'Pier 4 Concrete Pour & Curing', risk: 'RESOLVED', desc: 'Concrete curing temperatures reached expected threshold. Core strength logs validated complete.' },
                      { code: 'WBS 1.2', task: 'Foundation Pile Installation', risk: 'LOW', desc: 'Soil structural integrity validation scans verified. Ground anchors completed on budget.' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-extrabold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                            <h4 className="font-bold text-white leading-tight">{item.task}</h4>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            item.risk.includes('HIGH') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            item.risk.includes('RESOLVED') ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            'bg-slate-850 text-slate-500'
                          }`}>
                            {item.risk}
                          </span>
                        </div>
                        <p className="text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delay Risk distribution charts */}
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">Risk Distribution Metrics</h3>
                    <p className="text-[10px] text-slate-500">Variance risk distribution across activities</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 h-64">
                    
                    {/* Risk Donut Chart */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-extrabold text-slate-500 mb-2">Activities by Risk Tier</span>
                      <div className="h-40 w-full text-[9px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={delayRiskData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={48}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#ef4444" /> {/* High */}
                              <Cell fill="#f59e0b" /> {/* Medium */}
                              <Cell fill="#10b981" /> {/* Low */}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-2">
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> High</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Med</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Low</span>
                      </div>
                    </div>

                    {/* Schedule Variance Chart */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-extrabold text-slate-500 mb-2">Schedule Deviation</span>
                      <div className="h-40 w-full text-[9px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={scheduleVarianceData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={48}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#6366f1" /> {/* Ahead */}
                              <Cell fill="#10b981" /> {/* On Time */}
                              <Cell fill="#ef4444" /> {/* Delayed */}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-2">
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Ahead</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> OnTime</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Delay</span>
                      </div>
                    </div>

                    {/* Activity Status Chart */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-extrabold text-slate-500 mb-2">Activity Status</span>
                      <div className="h-40 w-full text-[9px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={activityStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={48}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {activityStatusData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-2 text-[8px] font-bold text-slate-400 mt-2">
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Comp</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> InProg</span>
                        <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Pend</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 9: PROJECT MEMORY */}
          {activeTab === 'memory' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4">
              
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-blue-500" />
                  Historical Project Memory Logs
                </h2>
                <p className="text-[10px] text-slate-500">Cross-project duration averages, productivity trends, and recurring delay reasons</p>
              </div>

              {/* Memory List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { activity: 'Pipe Spool Erection', duration: '4.3 Days', commonDelay: 'Material availability', productivity: 'Improving', risk: '27%', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
                  { activity: 'Concrete Pouring & Curing', duration: '6.1 Days', commonDelay: 'Weather conditions', productivity: 'Stable', risk: '15%', color: 'border-green-500/20 text-green-400 bg-green-500/5' },
                  { activity: 'Foundation Excavation', duration: '12.5 Days', commonDelay: 'Soil structural variance', productivity: 'Improving', risk: '8%', color: 'border-purple-500/20 text-purple-400 bg-purple-500/5' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex flex-col gap-3 shadow-md hover:border-slate-700 transition-all">
                    <h3 className="font-bold text-white text-sm">{item.activity}</h3>
                    
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Average Historical Duration:</span>
                        <span className="text-slate-200 font-bold">{item.duration}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Common Delay Factor:</span>
                        <span className="text-slate-200 font-bold">{item.commonDelay}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Productivity Trend:</span>
                        <span className="text-slate-200 font-bold">{item.productivity}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Predicted Delay Risk:</span>
                        <span className="text-red-400 font-extrabold">{item.risk}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-card flex flex-col gap-4 max-w-2xl">
              
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <SettingsIcon className="h-4.5 w-4.5 text-blue-500" />
                  System Configuration Settings
                </h2>
                <p className="text-[10px] text-slate-500">Verify endpoints, base URL fallbacks, and local simulation configurations</p>
              </div>

              <div className="flex flex-col gap-4 mt-2 text-xs">
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-400">VITE_API_BASE_URL (Active Base URL)</label>
                  <input
                    type="text"
                    disabled
                    value={demoMode ? 'CLIENT_SIDE_FALLBACK_SIMULATION' : 'http://localhost:8000/api/v1'}
                    className="bg-slate-950/80 border border-slate-850 text-slate-400 rounded px-3 py-2 font-mono text-[11px] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-400">Primavera Scheduling Engine Target</label>
                  <input
                    type="text"
                    disabled
                    value="Bridge_Alpha_P2_Rev4"
                    className="bg-slate-950/80 border border-slate-850 text-slate-400 rounded px-3 py-2 font-mono text-[11px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-400">Neo4j Database Instance Connection</label>
                  <input
                    type="text"
                    disabled
                    value="bolt://localhost:7687 (Disconnected fallback)"
                    className="bg-slate-950/80 border border-slate-850 text-slate-400 rounded px-3 py-2 font-mono text-[11px]"
                  />
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* ----------------------------------------------------
          NOTIFICATION PANEL (SLIDE-OVER)
          ---------------------------------------------------- */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end animate-slide-in">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowNotifications(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" 
          />

          {/* Drawer container */}
          <div className="w-80 bg-slate-950 border-l border-slate-800/80 h-full relative z-10 flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-blue-500" />
                Notification Log
              </h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer focus:outline-none"
              >
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
                      'bg-slate-900/60 border-slate-850 text-slate-300'
                    }`}
                  >
                    <p>{n.message}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>{n.timestamp}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-600 font-mono py-12">
                  No notifications recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ANOMALY RESOLUTION MODAL
          ---------------------------------------------------- */}
      {showAnomalyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          {/* Overlay */}
          <div 
            onClick={() => setShowAnomalyModal(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer" 
          />

          {/* Modal Container */}
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4 animate-slide-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                Active Anomaly Resolution Modal
              </h3>
              <button 
                onClick={() => setShowAnomalyModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="text-xs flex flex-col gap-3.5 leading-relaxed text-slate-300">
              
              <div>
                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Conflict Target</span>
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">WBS 1.3</span>
                  <h4 className="font-extrabold text-white">Pier 4 Concrete Pour & Curing Curing Logs Anomaly</h4>
                </div>
              </div>

              {/* Visual Variance CAD compare */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex flex-col gap-2">
                <span className="font-bold text-[10px] text-slate-400">Design CAD Baseline vs actual point cloud scan</span>
                
                {/* SVG Visual Graphic Overlay */}
                <div className="h-32 bg-[#0b0f19] border border-slate-850 rounded flex items-center justify-center relative overflow-hidden">
                  
                  {/* Grid background lines */}
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="border-r border-b border-slate-800" />
                    ))}
                  </div>

                  {/* CAD line (perfect blue box) */}
                  <svg className="absolute inset-0 w-full h-full">
                    <rect x="25%" y="20%" width="50%" height="60%" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="3 3" />
                    <text x="26%" y="30%" fill="#2563eb" className="text-[8px] font-mono font-extrabold">CAD BASELINE PROFILE</text>
                    
                    {/* Laser scan line (wavy red box) */}
                    <rect x="27%" y="22%" width="46%" height="58%" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                    <text x="28%" y="75%" fill="#ef4444" className="text-[8px] font-mono font-extrabold">ACTUAL FIELD LASER SCAN</text>
                  </svg>

                  <div className="absolute top-2 right-2 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded text-[8px] font-mono text-red-400 font-extrabold">
                    Volumetric Deviation: -8.4m³
                  </div>
                </div>
              </div>

              {/* Thermal Curing Temperature Logs Chart */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex flex-col gap-2">
                <span className="font-bold text-[10px] text-slate-400">Thermal Curing Sensor Profile (Pier 4)</span>
                
                <div className="h-32 bg-[#0b0f19] border border-slate-850 rounded flex items-center justify-center relative overflow-hidden text-[8px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { h: '0h', Ambient: 28, Core: 32 },
                      { h: '12h', Ambient: 30, Core: 48 },
                      { h: '24h', Ambient: 29, Core: 62 }, // core temperature spike
                      { h: '36h', Ambient: 31, Core: 59 },
                      { h: '48h', Ambient: 30, Core: 52 }
                    ]} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="h" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a' }} />
                      <Legend verticalAlign="top" height={16} iconSize={4} wrapperStyle={{ fontSize: '8px' }} />
                      <Line type="monotone" dataKey="Ambient" stroke="#10b981" strokeWidth={1} dot={{ r: 1 }} />
                      <Line type="monotone" dataKey="Core" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded text-[8px] font-mono text-amber-400 font-extrabold">
                    Max Spike: 62°C (Limit: 55°C)
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 justify-end border-t border-slate-850 pt-3">
              <button
                onClick={() => setShowAnomalyModal(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-white px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
              >
                Close Inspector
              </button>
              <button
                onClick={handleResolveAnomaly}
                disabled={anomalyResolving}
                className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-lg shadow-blue-500/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {anomalyResolving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Clearing & Syncing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    Resolve & Sync Primavera P6
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MAPPED EVIDENCE INSPECTOR POPUP
          ---------------------------------------------------- */}
      {selectedTaskEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          {/* Overlay */}
          <div 
            onClick={() => setSelectedTaskEvidence(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer" 
          />

          {/* Modal Container */}
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5 text-blue-500" />
                Telemetry Mapped Evidence
              </h3>
              <button 
                onClick={() => setSelectedTaskEvidence(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="text-xs flex flex-col gap-3 text-slate-300">
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-850">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">WBS Code & Name</span>
                  <span className="font-extrabold text-white text-xs">{selectedTaskEvidence.wbs_id} - {selectedTaskEvidence.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-green-400">{selectedTaskEvidence.progress}% Complete</span>
              </div>

              {selectedTaskEvidence.wbs_id === 'WBS 1.1' && (
                <div className="flex flex-col gap-2">
                  <p className="leading-relaxed">Site clearing drone scan captured on 2026-08-05. Topographical grid clearing matches spec.</p>
                  <div className="h-28 bg-slate-900 border border-slate-850 rounded flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-mono">[Cleared orthophoto grid capture]</span>
                  </div>
                </div>
              )}

              {selectedTaskEvidence.wbs_id === 'WBS 1.2' && (
                <div className="flex flex-col gap-2">
                  <p className="leading-relaxed">Piling depth validation sensor log uploaded on 2026-08-15. Depth average: 14.2m. Deviation: 0.1%.</p>
                  <div className="h-28 bg-slate-900 border border-slate-850 rounded flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-mono">[Sonic integrity piling records log]</span>
                  </div>
                </div>
              )}

              {selectedTaskEvidence.wbs_id === 'WBS 1.3' && (
                <div className="flex flex-col gap-2">
                  <p className="leading-relaxed">Concrete pour lidar scan uploaded on 2026-08-25. Pour volume validation matching 50% target.</p>
                  <div className="h-28 bg-slate-900 border border-slate-850 rounded flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-mono">[Concrete core sensor temperature log]</span>
                  </div>
                </div>
              )}

              {selectedTaskEvidence.wbs_id === 'WBS 1.4' && (
                <div className="flex flex-col gap-2">
                  <p className="leading-relaxed">No telemetry captures currently mapped to girder installation. Pending site drone flight scan.</p>
                  <div className="h-28 bg-slate-900 border border-slate-850 rounded flex items-center justify-center border-dashed">
                    <span className="text-[10px] text-slate-500 font-mono">[Drone flight pending upload]</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-850 pt-3">
              <button
                onClick={() => setSelectedTaskEvidence(null)}
                className="text-[10px] font-bold text-slate-300 hover:text-white px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded transition-all cursor-pointer"
              >
                Close Evidence
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          EDIT REVIEW DIALOG MODAL
          ---------------------------------------------------- */}
      {editingReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          {/* Overlay */}
          <div 
            onClick={() => setEditingReviewItem(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer" 
          />

          {/* Modal Container */}
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-blue-500" />
                Edit Extracted Event Details
              </h3>
              <button 
                onClick={() => setEditingReviewItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { key: 'activity', label: 'Activity' },
                { key: 'discipline', label: 'Discipline' },
                { key: 'asset_id', label: 'Asset ID' },
                { key: 'location', label: 'Location' },
                { key: 'date', label: 'Date' },
                { key: 'time', label: 'Time' },
                { key: 'status', label: 'Status' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'unit', label: 'Unit' },
                { key: 'delay_reason', label: 'Delay Reason' }
              ].map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">{field.label}</label>
                  <input
                    type="text"
                    value={(editForm as any)[field.key] || ''}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, [field.key]: e.target.value }));
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end border-t border-slate-850 pt-3">
              <button
                onClick={() => setEditingReviewItem(null)}
                className="text-[10px] font-bold text-slate-300 hover:text-white px-3 py-1.5 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditReviewSave}
                className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded shadow cursor-pointer"
              >
                Save Edits
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REASSIGN ACTIVITY MODAL
          ---------------------------------------------------- */}
      {reassigningReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
          {/* Overlay */}
          <div 
            onClick={() => setReassigningReviewItem(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer" 
          />

          {/* Modal Container */}
          <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-xl p-5 relative z-10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-500" />
                Reassign WBS Activity
              </h3>
              <button 
                onClick={() => setReassigningReviewItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="text-xs flex flex-col gap-2 text-slate-300">
              <p>Select another construction scheduling baseline activity to map this report to:</p>
              
              <div className="flex flex-col gap-1.5 mt-2 max-h-48 overflow-y-auto">
                {tasks.map(task => (
                  <button
                    key={task.wbs_id}
                    onClick={() => handleReassignSave(task.wbs_id)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-850 bg-slate-900/30 hover:bg-slate-900 hover:border-slate-700 text-xs flex items-center justify-between group transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-extrabold text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
                        {task.wbs_id}
                      </span>
                      <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{task.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-850 pt-3">
              <button
                onClick={() => setReassigningReviewItem(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-white px-3 py-1.5 bg-slate-900 border border-slate-850 rounded cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          FLOATING SUCCESS TOAST NOTIFICATION
          ---------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-4 flex items-start gap-3 shadow-2xl max-w-sm backdrop-blur-md">
            <div className={`p-1.5 rounded-lg border self-start shrink-0 ${
              toastMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              toastMessage.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-bounce' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              <CheckCircle className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-0.5">{toastMessage.title}</h4>
              <p className="text-[11px] leading-relaxed text-slate-400">{toastMessage.text}</p>
            </div>
            
            <button 
              onClick={() => setToastMessage(null)}
              className="text-slate-600 hover:text-slate-400 text-sm font-bold focus:outline-none px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
