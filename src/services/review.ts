import api from './api';
import { ExtractedEvent, Candidate } from './ingestion';
import { WBSTask } from './activities';

export interface ReviewItem {
  id: string;
  source: string;
  extracted_event: ExtractedEvent;
  suggested_activity?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reason: string;
  candidates: Candidate[];
}

export const getReviewQueue = async (): Promise<ReviewItem[]> => {
  const { data } = await api.get<ReviewItem[]>('/api/v1/review-queue');
  return data;
};

export const approveReviewItem = async (id: string): Promise<{ message: string; tasks: WBSTask[] }> => {
  const { data } = await api.post<{ message: string; tasks: WBSTask[] }>(`/api/v1/review-queue/${id}/approve`);
  return data;
};

export const rejectReviewItem = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(`/api/v1/review-queue/${id}/reject`);
  return data;
};

export const editReviewItem = async (
  id: string,
  event: Partial<ExtractedEvent>
): Promise<{ message: string; item: ReviewItem }> => {
  const { data } = await api.put<{ message: string; item: ReviewItem }>(`/api/v1/review-queue/${id}`, event);
  return data;
};

export const reassignReviewItem = async (
  id: string,
  wbsId: string
): Promise<{ message: string; item: ReviewItem }> => {
  const { data } = await api.post<{ message: string; item: ReviewItem }>(`/api/v1/review-queue/${id}/reassign`, {
    wbs_id: wbsId,
  });
  return data;
};
