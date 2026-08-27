import api from './api';

export interface WBSTask {
  wbs_id: string;
  name: string;
  planned_date: string;
  status: 'completed' | 'in_progress' | 'pending' | 'delayed';
  progress: number;
  anomaly: boolean;
  variance: string;
  discipline: string;
  asset: string;
  location: string;
  baseline_start: string;
  baseline_finish: string;
  actual_start?: string;
  actual_finish?: string;
}

export interface Activity {
  id: string;
  project_id: string;
  parent_id?: string;
  level: number;
  activity_code: string;
  name: string;
  discipline: string;
  location: string;
  baseline_start: string;
  baseline_finish: string;
  actual_start?: string;
  actual_finish?: string;
  status: string;
  progress: number;
  quantity?: number;
  unit?: string;
  risk_level: string;
  variance_days: number;
}

export const getWbsTasks = async (): Promise<WBSTask[]> => {
  const { data } = await api.get<WBSTask[]>('/api/v1/wbs-tasks');
  return data;
};

export const resetSchedule = async (): Promise<{ status: string; data: WBSTask[] }> => {
  const { data } = await api.post<{ status: string; data: WBSTask[] }>('/api/v1/reset');
  return data;
};

// Standard CRUD Activities API
export const getActivities = async (filters?: Record<string, string>): Promise<Activity[]> => {
  const params = new URLSearchParams(filters).toString();
  const url = `/api/activities${params ? `?${params}` : ''}`;
  const { data } = await api.get<{ success: boolean; data: Activity[] }>(url);
  return data.data;
};

export const getActivity = async (id: string): Promise<Activity> => {
  const { data } = await api.get<{ success: boolean; data: Activity }>(`/api/activities/${id}`);
  return data.data;
};

export const createActivity = async (activity: Partial<Activity>): Promise<Activity> => {
  const { data } = await api.post<{ success: boolean; data: Activity }>('/api/activities', activity);
  return data.data;
};

export const patchActivity = async (id: string, updates: Partial<Activity>): Promise<void> => {
  await api.patch(`/api/activities/${id}`, updates);
};

export const resetDemoDataOnBackend = async (): Promise<void> => {
  await api.post('/api/demo/reset');
};
