import api from './api';

export interface ExtractedEvent {
  discipline: string;
  activity: string;
  asset_id: string;
  location: string;
  date: string;
  time: string;
  status: string;
  quantity?: number;
  unit?: string;
  delay_reason?: string;
  confidence: number;
  event_id?: string;
}

export interface Candidate {
  activity_id: string;
  activity_code: string;
  activity_name: string;
  confidence: number;
  reasons: string[];
}

export interface CopilotResponse {
  answer: string;
  data_points?: any;
}

export const aiExtract = async (reportId: string): Promise<ExtractedEvent> => {
  const { data } = await api.post<{ success: boolean; data: ExtractedEvent }>('/api/ai/extract', { report_id: reportId });
  return data.data;
};

export const aiMatch = async (projectId: string, extractedEvent: Partial<ExtractedEvent>): Promise<{ matches: Candidate[] }> => {
  const { data } = await api.post<{ success: boolean; data: { matches: Candidate[] } }>('/api/ai/match', {
    project_id: projectId,
    extracted_event: extractedEvent,
  });
  return data.data;
};

export const askCopilot = async (question: string): Promise<CopilotResponse> => {
  const { data } = await api.post<{ success: boolean; data: CopilotResponse }>('/api/copilot', { question });
  return data.data;
};
