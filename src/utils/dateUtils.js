export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getDaysRemaining = (targetDate) => {
  if (!targetDate) return 0;
  const diff = new Date(targetDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const pad = (n) => String(n).padStart(2, '0');

export const formatClockTime = (date = new Date()) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateDisplay = (dateString, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', options);
};

export const addDaysToDate = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
