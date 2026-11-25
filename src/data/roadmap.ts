export const systems = {
  program: { name: 'Program records', detail: 'Program records supply the fields and figures used in grant reporting.' },
  donor: { name: 'Donor CRM', detail: 'Donor records can be connected to volunteer records and included in shared reporting.' },
  volunteer: { name: 'Volunteer system', detail: 'Volunteer records can be connected to donor records and included in shared reporting.' },
  reconciliation: { name: 'Manual reconciliation', detail: 'Staff currently bring records from separate systems together by hand.' },
  grants: { name: 'Grant reporting', detail: 'Grant reports rely on consistent definitions and reconciled records from upstream systems.' },
} as const;

export type SystemId = keyof typeof systems;

export const phases = ['Now', 'Next', 'Later'] as const;
export const quadrants = [
  { name: 'Quick wins', effort: 'lower', value: 'higher' },
  { name: 'Strategic builds', effort: 'higher', value: 'higher' },
  { name: 'Lower priority', effort: 'lower', value: 'lower' },
  { name: 'Reconsider', effort: 'higher', value: 'lower' },
] as const;

interface Opportunity {
  id: number;
  name: string;
  explanation: string;
  systems: readonly SystemId[];
  effort: 'lower' | 'higher';
  value: 'lower' | 'higher';
  phase: (typeof phases)[number];
}

export const opportunities: readonly Opportunity[] = [
  {
    id: 1, name: 'Standardize reporting definitions',
    explanation: 'Agree on consistent program fields and definitions before changing how the reports are assembled.',
    systems: ['program', 'reconciliation', 'grants'], effort: 'lower', value: 'higher', phase: 'Now',
  },
  {
    id: 2, name: 'Automate monthly reporting',
    explanation: 'Connect the existing program exports to reduce manual reconciliation in monthly grant reporting.',
    systems: ['program', 'reconciliation', 'grants'], effort: 'lower', value: 'higher', phase: 'Next',
  },
  {
    id: 3, name: 'Connect donor and volunteer records',
    explanation: 'Identify records that belong to the same person across the donor and volunteer systems.',
    systems: ['donor', 'volunteer', 'reconciliation'], effort: 'higher', value: 'higher', phase: 'Next',
  },
  {
    id: 4, name: 'Develop shared reporting views',
    explanation: 'Build shared views after the underlying data and reporting definitions are stable.',
    systems: ['program', 'donor', 'volunteer', 'grants'], effort: 'higher', value: 'higher', phase: 'Later',
  },
  {
    id: 5, name: 'Refresh internal templates',
    explanation: 'Refresh templates after the foundational work has clarified what the team needs to report.',
    systems: ['reconciliation'], effort: 'lower', value: 'lower', phase: 'Later',
  },
];
