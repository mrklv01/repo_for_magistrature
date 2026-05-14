export interface Ticket {
  ticket_id: string;
  created_at: Date;
  accepted_at: Date;
  resolved_at: Date | null;
  category: string;
  type: string;
  description: string;
  priority: "P1" | "P2" | "P3" | "P4";
  assigned_to_hash: string;
  initiator_hash: string;
  approver_hash: string | null;
  stage: string;
}

export interface FeatureValues {
  tickets_per_week: number;
  avg_response_min: number;
  avg_execution_hours: number;
  execution_trend_slope: number;
  high_priority_share: number;
  after_hours_share: number;
  task_entropy: number;
  activity_gaps_count: number;
  unique_contacts: number;
  open_tickets_count: number;
  avg_description_length: number;
}

export interface TicketEvent {
  date: string;
  type: "p1_incident" | "activity_gap" | "after_hours_spike";
  label: string;
}

export interface EmployeeFeatures {
  employee_id: string;
  window_30d: FeatureValues;
  window_90d: FeatureValues;
  weekly_volume: { week: string; count: number }[];
  weekly_execution: { week: string; avg_hours: number }[];
  events: TicketEvent[];
}

export interface DepartmentStats {
  total_tickets: number;
  period_start: string;
  period_end: string;
  employee_count: number;
}

export interface ClaudeEmployeeResult {
  employee_id: string;
  burnout_risk: number;
  overload_category: "низкий" | "средний" | "высокий" | "критический";
  hiring_signal: boolean;
  key_drivers: string[];
  narrative: string;
}

export interface ClaudeResponse {
  department: {
    avg_burnout_risk: number;
    high_risk_count: number;
    narrative: string;
    key_observations: string[];
  };
  employees: ClaudeEmployeeResult[];
  hiring_forecast: {
    needed_hires_next_quarter: number;
    justification: string;
  };
}

/** hash → full name */
export type NameMap = Map<string, string>;

export interface HistoryRecord {
  analysis: import("@/lib/schemas").ClaudeAnalysis;
  features: EmployeeFeatures[];
  nameMap: [string, string][];
  metadata: DepartmentStats;
}

/** Intermediate type before anonymization */
export interface PreTicket {
  ticket_id: string;
  created_at: Date;
  accepted_at: Date;
  resolved_at: Date | null;
  category: string;
  type: string;
  description: string;
  priority: "P1" | "P2" | "P3" | "P4";
  assigned_to: string;
  initiator: string;
  approver: string;
  stage: string;
}
