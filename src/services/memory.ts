import api from './api';

export interface ActivityMemory {
  activity_id: string;
  average_duration: number;
  historical_durations: number[];
  common_delay_reasons: string[];
  historical_productivity: string;
  predicted_duration: number;
  predicted_delay_probability: number;
  status?: string;
  message?: string;
}

export const getActivityMemory = async (activityId: string): Promise<ActivityMemory> => {
  const { data } = await api.get<{ success: boolean; data: ActivityMemory }>(`/api/memory/activity/${activityId}`);
  return data.data;
};
