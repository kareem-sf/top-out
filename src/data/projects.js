// Levels. Each is a real kind of job in a real place; the market sets the currency and prices.
export const PROJECTS = [
  { id: 'villa', name: 'Villa', city: 'New Cairo', market: 'eg', target: 10, metal: 'copper', speed: { base: 4.2, inc: 0.16, max: 8.5 } },
  { id: 'midrise', name: 'Mid-rise', city: 'Dubai Marina', market: 'ae', target: 16, metal: 'brass', speed: { base: 4.8, inc: 0.16, max: 9.5 } },
  { id: 'tower', name: 'Tower', city: 'Riyadh', market: 'sa', target: 28, metal: 'verdigris', speed: { base: 5.2, inc: 0.15, max: 10.5 } },
  { id: 'skyscraper', name: 'Skyscraper', city: 'Downtown Dubai', market: 'ae', target: 45, metal: 'steel', speed: { base: 5.6, inc: 0.14, max: 11.5 } },
  { id: 'megatall', name: 'Megatall', city: 'NEOM', market: 'sa', target: 70, metal: 'rosegold', speed: { base: 6, inc: 0.13, max: 12.5 } },
];

// Brand metals: [light, dark]
export const METALS = {
  copper: ['#F0A35A', '#C0582A'],
  brass: ['#EDCB72', '#A07A22'],
  verdigris: ['#7CCBB0', '#2B8068'],
  steel: ['#98BBE2', '#3A6394'],
  rosegold: ['#E8A598', '#B76E79'],
};

// Contract value per m² of built floor, indicative mid-2025.
export const RATE_PER_M2 = { eg: 14000, ae: 4500, sa: 4000 };

export function projectById(id) {
  return PROJECTS.find((p) => p.id === id) || PROJECTS[0];
}

export function nextProject(id) {
  const i = PROJECTS.findIndex((p) => p.id === id);
  return PROJECTS[i + 1] || null;
}
