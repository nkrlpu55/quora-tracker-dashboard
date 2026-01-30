// utils/timeCalculator.js

function isWorkingDay(date) {
  const day = date.getDay(); // 0 = Sunday
  if (day === 0) return false;

  // Exclude 2nd Saturday
  if (day === 6) {
    const week = Math.ceil(date.getDate() / 7);
    if (week === 2) return false;
  }

  return true;
}

export function calculateWorkingMinutes(assignedAt, submittedAt) {
  let minutes = 0;
  let current = new Date(assignedAt);
  const end = new Date(submittedAt);

  while (current < end) {
    if (!isWorkingDay(current)) {
      current.setDate(current.getDate() + 1);
      current.setHours(9, 0, 0, 0);
      continue;
    }

    const start = new Date(current);
    start.setHours(9, 0, 0, 0);

    const finish = new Date(current);
    finish.setHours(17, 0, 0, 0);

    const from = current < start ? start : current;
    const to = end < finish ? end : finish;

    if (from < to) {
      minutes += (to - from) / 60000;
    }

    current.setDate(current.getDate() + 1);
    current.setHours(9, 0, 0, 0);
  }

  return Math.round(minutes);
}

export function resolveScore(workingMinutes) {
  if (workingMinutes <= 120) return 5;
  if (workingMinutes <= 240) return 3;
  if (workingMinutes <= 360) return 1;
  return -3;
}
