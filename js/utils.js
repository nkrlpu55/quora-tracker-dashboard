import { db, collection, getDocs, updateDoc, doc, increment, Timestamp } from "./firebase-config.js";

function isWorkingDay(date) {
  const day = date.getDay(); // 0 = Sunday
  if (day === 0) return false;
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
  if (workingMinutes <= 480) return -1;
  return -3;
}

function getMissedCutoff(assignedAt) {
  const d = new Date(assignedAt);
  d.setDate(d.getDate() + 1);
  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(17, 0, 0, 0);
  return Timestamp.fromDate(d);
}

export async function checkAndApplyMissedPenalties() {
  const now = Timestamp.now();
  const snap = await getDocs(collection(db, "tasks"));

  for (const docSnap of snap.docs) {
    const task = docSnap.data();
    if (task.status !== "pending") continue;
    if (task.missedPenaltyApplied) continue;

    const cutoff = getMissedCutoff(task.assignedAt.toDate());
    if (now.toMillis() > cutoff.toMillis()) {
      await updateDoc(doc(db, "users", task.assignedTo), {
        score: increment(-5)
      });
      await updateDoc(doc(db, "tasks", docSnap.id), {
        status: "missed",
        missedPenaltyApplied: true,
        missedAt: Timestamp.now()
      });
    }
  }
}
