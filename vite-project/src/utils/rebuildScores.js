import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

/**
 * Rebuilds user scores from historical submissions.
 * Source of truth: submissions.scoreDelta
 */
export async function rebuildUserScores() {
  // 1️⃣ Fetch all submissions
  const subSnap = await getDocs(collection(db, "submissions"));

  const scoreMap = {};

  subSnap.docs.forEach(docSnap => {
    const { userId, scoreDelta } = docSnap.data();

    if (!userId || typeof scoreDelta !== "number") return;

    scoreMap[userId] = (scoreMap[userId] || 0) + scoreDelta;
  });

  // 2️⃣ Update each user's score
  const userIds = Object.keys(scoreMap);

  for (const userId of userIds) {
    await updateDoc(doc(db, "users", userId), {
      score: scoreMap[userId]
    });
  }

  console.log("✅ User scores rebuilt successfully");
}
