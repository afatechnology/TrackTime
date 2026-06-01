export type User = {
  id: number;
  name: string;
  email: string;
};

export type Project = {
  uuid: string;
  name: string;
  description: string | null;
  color: string;
  is_archived: number;
  client_name: string | null;
  hourly_rate: number | null;
};

export type ActiveTimer = {
  uuid: string;
  project_uuid: string;
  project_name: string;
  project_color: string;
  started_at: string;
  status: 'running' | 'paused';
  task_title: string | null;
  notes: string | null;
  total_seconds: number;
};

export type TimeEntry = {
  uuid: string;
  project_uuid: string;
  project_name: string;
  project_color: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  notes: string | null;
  task_title: string | null;
  total_seconds: number;
};
