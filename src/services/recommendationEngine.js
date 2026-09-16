/**
 * Deterministic Recommendation Engine
 * Evaluates syllabus, weakness, and practice state to answer:
 * "What should I study right now?"
 */
export const getNextBestAction = (subjects = [], topics = []) => {
  if (!subjects.length || !topics.length) {
    return {
      title: 'Build Your Syllabus',
      subtitle: 'Add subjects and topics to start receiving daily study recommendations.',
      subject: null,
      topic: null,
      suggestedMinutes: 30,
      suggestedQuestions: 0,
      type: 'SETUP'
    };
  }

  // 1. Check for Weak topics that need revision/practice urgently
  const weakTopics = topics.filter(t => !t.parentId && (t.status === 'WEAK' || (t.confidenceScore && t.confidenceScore < 40)));
  if (weakTopics.length > 0) {
    // Sort by lowest confidence score or oldest study date
    const target = weakTopics.sort((a, b) => (a.confidenceScore || 0) - (b.confidenceScore || 0))[0];
    const subject = subjects.find(s => s.id === target.subjectId);
    return {
      title: `${subject?.name || 'Subject'} — ${target.name}`,
      subtitle: `Accuracy/Confidence is low (${target.confidenceScore || 25}%). Reinforce with retrieval & practice.`,
      subject,
      topic: target,
      suggestedMinutes: 45,
      suggestedQuestions: 15,
      type: 'WEAK_REVISION'
    };
  }

  // 2. Check for In-Progress / Practicing topics
  const practicingTopics = topics.filter(t => !t.parentId && (t.status === 'PRACTICING' || t.status === 'LEARNING'));
  if (practicingTopics.length > 0) {
    const target = practicingTopics[0];
    const subject = subjects.find(s => s.id === target.subjectId);
    return {
      title: `${subject?.name || 'Subject'} — ${target.name}`,
      subtitle: target.status === 'LEARNING' ? 'Complete learning concept and initiate recall testing.' : 'Solve 15-20 practice questions to solidify mastery.',
      subject,
      topic: target,
      suggestedMinutes: 45,
      suggestedQuestions: target.status === 'PRACTICING' ? 15 : 5,
      type: target.status === 'PRACTICING' ? 'PRACTICE' : 'LEARN'
    };
  }

  // 3. Next unstarted topic
  const unstarted = topics.filter(t => !t.parentId && t.status === 'NOT_STARTED');
  if (unstarted.length > 0) {
    const target = unstarted[0];
    const subject = subjects.find(s => s.id === target.subjectId);
    return {
      title: `${subject?.name || 'Subject'} — ${target.name}`,
      subtitle: 'Next topic in syllabus queue. 45 min focus block.',
      subject,
      topic: target,
      suggestedMinutes: 45,
      suggestedQuestions: 10,
      type: 'NEW_TOPIC'
    };
  }

  // 4. All topics completed! Recommend revision on oldest mastered
  const mastered = topics.filter(t => !t.parentId && t.status === 'MASTERED');
  const target = mastered[0] || topics[0];
  const subject = subjects.find(s => s.id === target.subjectId);
  return {
    title: `${subject?.name || 'Subject'} — ${target.name}`,
    subtitle: 'Syllabus covered! Maintain retention through spaced recall practice.',
    subject,
    topic: target,
    suggestedMinutes: 30,
    suggestedQuestions: 15,
    type: 'SPACED_REVIEW'
  };
};
