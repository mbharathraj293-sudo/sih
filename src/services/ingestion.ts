import api from './api';
import { WBSTask } from './activities';

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
}

export interface Candidate {
  wbs_id: string;
  name: string;
  confidence: number;
}

export interface IngestionResult {
  review_id: string;
  source: string;
  extracted_event: ExtractedEvent;
  suggested_activity: string;
  candidates: Candidate[];
}

export const uploadTelemetry = async (
  file?: File,
  reportText?: string
): Promise<IngestionResult> => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (reportText) {
    formData.append('report_text', reportText);
  }

  const { data } = await api.post<IngestionResult>('/telemetry/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const ingestTelemetryLegacy = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/telemetry/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};
