import { metros, type ComboMetro } from "./combos";

export interface StateGroup {
  state: string;
  stateAbbr: string;
  metros: ComboMetro[];
}

// Groups the flat 400-metro list by state, alphabetically by state name,
// cities alphabetical within each state. Single source of truth for every
// nav/menu surface that needs a state->city hierarchy.
export function groupMetrosByState(): StateGroup[] {
  const byAbbr = new Map<string, StateGroup>();

  for (const metro of metros) {
    const existing = byAbbr.get(metro.stateAbbr);
    if (existing) {
      existing.metros.push(metro);
    } else {
      byAbbr.set(metro.stateAbbr, { state: metro.state, stateAbbr: metro.stateAbbr, metros: [metro] });
    }
  }

  const groups = Array.from(byAbbr.values());
  for (const group of groups) {
    group.metros.sort((a, b) => a.city.localeCompare(b.city));
  }
  groups.sort((a, b) => a.state.localeCompare(b.state));
  return groups;
}
