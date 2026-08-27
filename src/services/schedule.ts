import api from './api';

export interface ScheduleUpdatePayload {
  activity_id: string;
  actual_start?: string;
  actual_finish?: string;
  progress: number;
  status: string;
}

export interface ScheduleUpdateResponse {
  variance_days: number;
}

export const updateSchedule = async (payload: ScheduleUpdatePayload): Promise<ScheduleUpdateResponse> => {
  const { data } = await api.post<{ success: boolean; data: ScheduleUpdateResponse }>('/api/schedule/update', payload);
  return data.data;
};
