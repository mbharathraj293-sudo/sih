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
  const { data } = await api.get<AnalyticsData>('/analytics');
  return data;
};

export const getProjectMemory = async (): Promise<ProjectMemoryItem[]> => {
  const { data } = await api.get<ProjectMemoryItem[]>('/project-memory');
  return data;
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const { data } = await api.get<NotificationItem[]>('/notifications');
  return data;
};

export const parseNlpLogLegacy = async (text: string): Promise<any> => {
  const { data } = await api.post('/nlp-log', { text });
  return data;
};

export const getSCurveData = async (): Promise<any[]> => {
  const { data } = await api.get<any[]>('/s-curve');
  return data;
};
