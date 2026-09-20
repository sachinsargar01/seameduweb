import { Alumni, SCUser } from '../types';

/**
 * Distributes unassigned or new alumni equally among active SC users.
 * Requirement:
 * - Difference between SC assignments must not exceed 1.
 * - Only ACTIVE SC users receive assignments.
 */
export function distributeAlumniEqually(
  alumniList: Alumni[],
  activeSCs: SCUser[],
  existingAlumniList: Alumni[] = []
): Alumni[] {
  if (activeSCs.length === 0) {
    // If no active SC, keep unassigned
    return alumniList.map(a => ({
      ...a,
      assignedSCId: '',
      assignedSCName: 'Unassigned',
    }));
  }

  // Count existing assignments per active SC
  const scAssignmentCounts: Record<string, number> = {};
  activeSCs.forEach(sc => {
    scAssignmentCounts[sc.id] = 0;
  });

  existingAlumniList.forEach(a => {
    if (a.assignedSCId && scAssignmentCounts[a.assignedSCId] !== undefined) {
      scAssignmentCounts[a.assignedSCId]++;
    }
  });

  // Distribute items one by one to the SC currently having the lowest assignment count
  // This guarantees that after distributing N items, max difference between any two SCs is <= 1.
  return alumniList.map(alumni => {
    // Find active SC with minimal count
    let minSC = activeSCs[0];
    let minCount = scAssignmentCounts[minSC.id];

    for (let i = 1; i < activeSCs.length; i++) {
      const sc = activeSCs[i];
      const count = scAssignmentCounts[sc.id];
      if (count < minCount) {
        minCount = count;
        minSC = sc;
      }
    }

    // Assign to minSC
    scAssignmentCounts[minSC.id]++;

    return {
      ...alumni,
      assignedSCId: minSC.id,
      assignedSCName: minSC.name,
    };
  });
}

/**
 * Validates distribution balance
 */
export function checkDistributionBalance(
  alumniList: Alumni[],
  activeSCs: SCUser[]
): { isBalanced: boolean; counts: Record<string, number>; diff: number } {
  const counts: Record<string, number> = {};
  activeSCs.forEach(sc => {
    counts[sc.id] = 0;
  });

  alumniList.forEach(a => {
    if (a.assignedSCId && counts[a.assignedSCId] !== undefined) {
      counts[a.assignedSCId]++;
    }
  });

  const values = Object.values(counts);
  if (values.length === 0) return { isBalanced: true, counts, diff: 0 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const diff = max - min;

  return {
    isBalanced: diff <= 1,
    counts,
    diff,
  };
}
