export interface DailyMetric {
  date: string;
  workHours: number;
  sleepHours: number;
  meetingDensity: number; // 0-10 scale
  sentimentScore: number; // -1 (negative) to 1 (positive)
  burnoutRiskScore: number; // 0-100
  userMood?: string;
}

export interface AnalysisResult {
  riskScore: number;
  riskLevel: 'Relaxed' | 'Balanced' | 'Stressed' | 'Overloaded';
  emotionalDebt: number; // 0-100 theoretical accumulation
  keyDrivers: string[];
  recommendation: string;
  summary: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  JOURNAL = 'JOURNAL',
  CHAT = 'CHAT',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface UserProfile {
  name: string;
  role: string;
  department: string;
}

export interface DepartmentData {
  name: string;
  risk: number;
  trend: 'rising' | 'falling' | 'stable';
  topStressor: string;
  details: string;
  intervention: string;
}

export const MOCK_DEPARTMENT_DATA: DepartmentData[] = [
  {
    name: 'Tech Team',
    risk: 85,
    trend: 'rising',
    topStressor: 'Meeting Overload',
    details: 'Team reports 40% increase in recurring meetings.',
    intervention: 'Suggest "No-Meeting Fridays"'
  },
  {
    name: 'Sales',
    risk: 65,
    trend: 'stable',
    topStressor: 'Quota Pressure',
    details: 'End of quarter rush is causing standard stress spikes.',
    intervention: 'Encourage short breaks every 2 hours'
  },
  {
    name: 'HR',
    risk: 45,
    trend: 'falling',
    topStressor: 'Conflict Resolution',
    details: 'Handling recent re-org questions.',
    intervention: 'Provided "De-escalation" workshop'
  },
  {
    name: 'Marketing',
    risk: 55,
    trend: 'stable',
    topStressor: 'Campaign Deadlines',
    details: 'Upcoming launch causing late nights.',
    intervention: 'Adjusted sprint velocity'
  },
  {
    name: 'Product',
    risk: 72,
    trend: 'rising',
    topStressor: 'Scope Creep',
    details: 'Last minute feature requests.',
    intervention: 'Review roadmap boundaries'
  },
  {
    name: 'Design',
    risk: 30,
    trend: 'falling',
    topStressor: 'Feedback Loops',
    details: 'Waiting on stakeholder approvals.',
    intervention: 'Async approval process'
  }
];