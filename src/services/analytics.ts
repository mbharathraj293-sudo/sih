import api from './api';

export interface KPIStats {
  total_activities: number;
  completed: number;
  in_progress: number;
  delayed: number;
  ai_matched: number;
  review_required: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface DisciplineProgressPoint {
  discipline: string;
  progress: number;
}

export interface AnalyticsData {
  kpis: KPIStats;
  charts: {
    discipline_progress: DisciplineProgressPoint[];
    matching_performance: ChartDataPoint[];
    delay_risk: ChartDataPoint[];
    variance_dist: ChartDataPoint[];
    activity_status: ChartDataPoint[];
  };
}

export interface ProjectMemoryItem {
  activity: string;
  average_duration: number;
  common_delay_reason: string;
  current_predicted_delay_risk: number;
  productivity_trend: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

export const getAnalytics = async (): Promise<AnalyticsData> => {
  const { data } = await api.get<AnalyticsData>('/api/v1/analytics');
  return data;
};

export const getProjectMemory = async (): Promise<ProjectMemoryItem[]> => {
  const { data } = await api.get<ProjectMemoryItem[]>('/api/v1/project-memory');
  return data;
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const { data } = await api.get<NotificationItem[]>('/api/v1/notifications');
  return data;
};

export const parseNlpLogLegacy = async (text: string): Promise<any> => {
  const { data } = await api.post('/api/v1/nlp-log', { text });
  return data;
};

export const getSCurveData = async (): Promise<any[]> => {
  const { data } = await api.get<any[]>('/api/v1/s-curve');
  return data;
};

export interface AuditLog {
  id: number;
  timestamp: string;
  action_source: string;
  report_id?: string;
  activity_id?: string;
  old_value?: string;
  new_value?: string;
  action: string;
  confidence?: number;
}

export interface SearchResults {
  activities: any[];
  reports: any[];
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const { data } = await api.get<{ success: boolean; data: AuditLog[] }>('/api/audit');
  return data.data;
};

export const searchProject = async (query: string): Promise<SearchResults> => {
  const { data } = await api.get<{ success: boolean; data: SearchResults }>(`/api/search?q=${encodeURIComponent(query)}`);
  return data.data;
};
