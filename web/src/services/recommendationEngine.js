export function getDailyRecommendations(topics, sessions, examGoal) {
  if (!examGoal || topics.length === 0) return [];

  const now = new Date();
  const examDate = new Date(examGoal.examDate);
  const diffTime = examDate - now;
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const proximityMultiplier = 1.0 + (30.0 / (daysRemaining + 10.0));

  // Build a map of subjectId -> last studied timestamp
  const lastStudiedMap = {};
  sessions.forEach(s => {
    if (s.subjectId && s.completedDurationSeconds > 0) {
      const dateVal = new Date(s.date).getTime();
      if (!lastStudiedMap[s.subjectId] || lastStudiedMap[s.subjectId] < dateVal) {
        lastStudiedMap[s.subjectId] = dateVal;
      }
    }
  });

  const statusWeights = {
    'NEEDS_REVISION': 1.0,
    'IN_PROGRESS': 0.7,
    'NOT_STARTED': 0.4,
    'COMPLETED': 0.0
  };

  const scoredTopics = topics.map(topic => {
    const statusWeight = statusWeights[topic.status] !== undefined ? statusWeights[topic.status] : 0.0;
    if (statusWeight === 0.0) return { ...topic, dps: -1 };

    // Calculate days since last studied
    const lastStudiedTime = lastStudiedMap[topic.subjectId];
    let recencyDays = 99; // Default if never studied
    if (lastStudiedTime) {
      recencyDays = Math.min(99, (now.getTime() - lastStudiedTime) / (1000 * 60 * 60 * 24));
    }

    const dps = ((recencyDays * 0.5) + (statusWeight * 40.0)) * proximityMultiplier;
    return { ...topic, dps };
  });

  // Filter out completed/invalid, sort descending, return top 3
  return scoredTopics
    .filter(t => t.dps >= 0)
    .sort((a, b) => b.dps - a.dps)
    .slice(0, 3);
}
