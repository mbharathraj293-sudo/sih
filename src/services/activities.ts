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

export const getWbsTasks = async (): Promise<WBSTask[]> => {
  const { data } = await api.get<WBSTask[]>('/wbs-tasks');
  return data;
};

export const resetSchedule = async (): Promise<{ status: string; data: WBSTask[] }> => {
  const { data } = await api.post<{ status: string; data: WBSTask[] }>('/reset');
  return data;
};
