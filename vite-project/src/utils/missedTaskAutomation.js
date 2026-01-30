import {
  collection,
  getDocs,
  updateDoc,
  doc,
  increment,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase";

function isWorkingDay(date) {
  const day = date.getDay();
  if (day === 0) return false;
  if (day === 6) {
    const week = Math.ceil(date.getDate() / 7);
    if (week === 2) return false;
  }
  return true;
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
