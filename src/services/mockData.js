export const dashboardMetrics = {
  totalScreenings: 1245,
  highRisk: 84,
  reviewRequired: 156,
  completed: 1005
};

export const recentScreenings = [
  {
    id: "SCR-2023-8942",
    timestamp: "2023-10-25T14:32:00Z",
    subjectName: "John Doe",
    documentType: "Passport",
    risk: "HIGH",
    status: "REVIEW_REQUIRED"
  },
  {
    id: "SCR-2023-8941",
    timestamp: "2023-10-25T14:15:00Z",
    subjectName: "Jane Smith",
    documentType: "National ID",
    risk: "LOW",
    status: "COMPLETED"
  },
  {
    id: "SCR-2023-8940",
    timestamp: "2023-10-25T13:45:00Z",
    subjectName: "Robert Johnson",
    documentType: "Driver License",
    risk: "MEDIUM",
    status: "REVIEW_REQUIRED"
  }
];

export const mockAlerts = [
  {
    id: 1,
    type: "critical",
    message: "Multiple high-risk documents detected from Region A.",
    time: "2 hours ago"
  },
  {
    id: 2,
    type: "warning",
    message: "System load high. Processing may be delayed by 2-3 seconds.",
    time: "5 hours ago"
  }
];
