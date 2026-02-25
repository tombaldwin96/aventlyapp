/**
 * In-memory flags for performer dashboard (e.g. "visited availability tab", "progress section dismissed").
 * Used when AsyncStorage is unavailable (web/simulator with native module null)
 * so the progress bar still updates within the same session.
 */
let visitedAvailabilityTab = false;
let progressSectionDismissed = false;

export function setVisitedAvailabilityTab(): void {
  visitedAvailabilityTab = true;
}

export function getVisitedAvailabilityTab(): boolean {
  return visitedAvailabilityTab;
}

export function setProgressSectionDismissed(): void {
  progressSectionDismissed = true;
}

export function getProgressSectionDismissed(): boolean {
  return progressSectionDismissed;
}
