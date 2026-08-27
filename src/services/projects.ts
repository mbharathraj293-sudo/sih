import api from './api';

export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export const getProjects = async (): Promise<Project[]> => {
  const { data } = await api.get<{ success: boolean; data: Project[] }>('/projects');
  return data.data;
};

export const getProject = async (id: string): Promise<Project> => {
  const { data } = await api.get<{ success: boolean; data: Project }>(`/projects/${id}`);
  return data.data;
};

export const createProject = async (project: Project): Promise<Project> => {
  const { data } = await api.post<{ success: boolean; data: Project }>('/projects', project);
  return data.data;
};
