const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortIssues(issues, sortBy) {
  const sorted = [...issues];
  if (sortBy === 'priority') {
    sorted.sort((a, b) => (a.business_impact_priority_rank ?? 999) - (b.business_impact_priority_rank ?? 999));
  } else if (sortBy === 'severity') {
    sorted.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));
  } else if (sortBy === 'confidence') {
    sorted.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  }
  return sorted;
}
