import api from './api';
import { Candidate, ExtractedEvent } from './ai';

export interface IngestionResult {
  review_id: string;
  source: string;
  extracted_event: ExtractedEvent;
  suggested_activity: string;
  candidates: Candidate[];
}

export interface NormalizedReport {
  report_id: string;
  project_id: string;
  source_type: string;
  source_name: string;
  raw_text: string;
  discipline: string;
  reported_date: string;
  reported_by: string;
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

  const { data } = await api.post<IngestionResult>('/api/v1/telemetry/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const ingestTelemetryLegacy = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/v1/telemetry/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// Standard data capture pipelines
export const ingestText = async (text: string, projectId: string = 'proj-unit-02', discipline?: string, reportedBy?: string): Promise<NormalizedReport> => {
  const { data } = await api.post<{ success: boolean; data: NormalizedReport }>('/api/ingestion/text', {
    text,
    project_id: projectId,
    discipline,
    reported_by: reportedBy
  });
  return data.data;
};

export const ingestFile = async (file: File, fileType: 'pdf' | 'csv' | 'xlsx' | 'file', projectId: string = 'proj-unit-02', discipline?: string, reportedBy?: string): Promise<NormalizedReport> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project_id', projectId);
  if (discipline) formData.append('discipline', discipline);
  if (reportedBy) formData.append('reported_by', reportedBy);

  const endpoint = `/api/ingestion/${fileType}`;
  const { data } = await api.post<{ success: boolean; data: NormalizedReport }>(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data;
};
