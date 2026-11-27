export const scenario = {
  name: 'Community Food Network',
  description: 'Fictional food pantry',
  mission: 'Help more neighbors reliably access nutritious food.',
  staff: ['Executive Director', 'Operations Director', 'Donation Specialist'],
  closing: 'A clear path forward. Yours to keep.',
} as const;

export const duration = 37.5;
export const headingHalfFade = 0.17;
export const timeline = {
  people: 0.9,
  contributions: [3.05, 3.99, 5],
  mapHeading: 6.77,
  connectHeading: 13.29,
  planHeading: 22.59,
  deliverHeading: 30.59,
} as const;

export const stages = [
  { name: 'Listen', start: 0, hold: 6.17, headline: 'Start with people.', status: 'Staff knowledge, processes and systems gathered.' },
  { name: 'Map', start: timeline.mapHeading, hold: 12.79, headline: 'See how the organization works.', status: 'Four separate systems receive information from their existing processes.' },
  { name: 'Connect', start: timeline.connectHeading, hold: 21.89, headline: 'Reveal the connections worth making.', status: 'Three proposed connections are visible.' },
  { name: 'Plan', start: timeline.planHeading, hold: duration, headline: 'Decide what to do first.', status: 'The ranked opportunities form a completed, client-owned data strategy.' },
] as const;

export const items = [
  { id: 'obs-demand', label: 'Changing demand', kind: 'obs', person: 0 },
  { id: 'obs-coverage', label: 'Volunteer coverage', kind: 'obs', person: 0 },
  { id: 'proc-scheduling', label: 'Volunteer scheduling', kind: 'proc', person: 0 },
  { id: 'sys-volunteer', label: 'Volunteer system', kind: 'sys', person: 0 },
  { id: 'obs-stock', label: 'Stock planning', kind: 'obs', person: 1 },
  { id: 'proc-distribution', label: 'Food distribution', kind: 'proc', person: 1 },
  { id: 'sys-service', label: 'Service records', kind: 'sys', person: 1 },
  { id: 'proc-donations', label: 'Food donations', kind: 'proc', person: 1 },
  { id: 'sys-inventory', label: 'Inventory spreadsheet', kind: 'sys', person: 1 },
  { id: 'obs-overlap', label: 'Possible donor overlap', kind: 'obs', person: 2 },
  { id: 'proc-fundraising', label: 'Fundraising', kind: 'proc', person: 2 },
  { id: 'sys-donor', label: 'Donor CRM', kind: 'sys', person: 2 },
] as const;

export const flows = [
  { process: 'proc-donations', system: 'sys-inventory' },
  { process: 'proc-distribution', system: 'sys-service' },
  { process: 'proc-scheduling', system: 'sys-volunteer' },
  { process: 'proc-fundraising', system: 'sys-donor' },
] as const;

export const opportunities = [
  { id: 1, label: 'Match food to demand.', systems: ['sys-inventory', 'sys-service'], rank: 1, matrix: [0.72, 0.34] },
  { id: 2, label: 'Schedule volunteers when needed.', systems: ['sys-service', 'sys-volunteer'], rank: 0, matrix: [0.25, 0.31] },
  { id: 3, label: 'Identify volunteers who also donate.', systems: ['sys-volunteer', 'sys-donor'], rank: 2, matrix: [0.25, 0.77] },
] as const;

export const quadrants = ['Quick wins', 'Strategic builds', 'Lower priority', 'Reconsider'] as const;
export const priorities = ['Now', 'Next', 'Later'] as const;
export function quadrant([effort, benefit]: readonly [number, number]) {
  return quadrants[(effort >= 0.5 ? 1 : 0) + (benefit >= 0.5 ? 2 : 0)];
}

export const rankedOpportunities = [...opportunities].sort((a, b) => a.rank - b.rank);

export const exampleText = {
  listen: 'Listen to the Executive Director, Operations Director and Donation Specialist. Their observations about demand, stock, volunteer coverage and possible donor overlap inform the strategy.',
  map: 'Food donations feed inventory records. Food distribution feeds service records. Scheduling feeds the volunteer system, and fundraising feeds the donor CRM. These systems are separate in this example.',
  plan: 'The client receives a current-state map, ranked opportunities and a written implementation sequence they own.',
};

export const headings = [
  ...stages.map(({ start, headline }, stage) => ({ time: start, text: headline, stage })),
  { time: timeline.deliverHeading, text: 'Leave with a plan that belongs to you.', stage: stages.length - 1 },
];

export function headingAt(time: number) {
  const index = headings.findLastIndex(heading => time >= heading.time);
  const current = headings[index];
  const upcoming = headings[index + 1];
  const fadeIn = index === 0 ? 1 : (time - current.time) / headingHalfFade;
  const fadeOut = upcoming ? (upcoming.time - time) / headingHalfFade : 1;
  return { ...current, opacity: Math.min(1, fadeIn, fadeOut) };
}
