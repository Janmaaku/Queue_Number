// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNVlxUjdrqWSqjFxFRmHS0pjDeWRYj2o8",
  authDomain: "queue-number-a70f0.firebaseapp.com",
  databaseURL: "https://queue-number-a70f0-default-rtdb.firebaseio.com",
  projectId: "queue-number-a70f0",
  storageBucket: "queue-number-a70f0.firebasestorage.app",
  messagingSenderId: "135302326058",
  appId: "1:135302326058:web:9d7e16ace295003ac06053",
  measurementId: "G-8TEVZ0KR1K",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ==================== QUEUE MANAGEMENT FUNCTIONS ====================

/**
 * Generate a new queue number based on today's highest number
 */
export async function generateQueueNumber() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueRef = ref(database, `queue/${today}`);
    const snapshot = await get(queueRef);

    let maxNumber = 0;
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((ticket) => {
        const num = parseInt(ticket.queueNumber);
        if (num > maxNumber) maxNumber = num;
      });
    }

    return maxNumber + 1;
  } catch (error) {
    console.error("Error generating queue number:", error);
    return 1;
  }
}

/**
 * Submit a new ticket to Firebase
 */
export async function submitTicket(fullName, email, purpose) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueNumber = await generateQueueNumber();
    const now = new Date();
    const timeIssued = now.toLocaleTimeString("en-US", { hour12: false });

    const ticketData = {
      queueNumber: queueNumber,
      fullName: fullName,
      email: email,
      purpose: purpose,
      timeIssued: timeIssued,
      status: "waiting", // waiting, serving, done
      position: 0,
      createdAt: now.getTime(),
      date: today,
    };

    const ticketRef = push(ref(database, `queue/${today}`));
    await set(ticketRef, ticketData);

    return {
      success: true,
      queueNumber: queueNumber,
      position: await getQueuePosition(today, queueNumber),
    };
  } catch (error) {
    console.error("Error submitting ticket:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get position in queue for a specific ticket
 */
export async function getQueuePosition(date, queueNumber) {
  try {
    const queueRef = ref(database, `queue/${date}`);
    const snapshot = await get(queueRef);

    if (!snapshot.exists()) return 0;

    let position = 0;
    const data = snapshot.val();

    Object.values(data).forEach((ticket) => {
      if (ticket.status === "waiting" && ticket.queueNumber < queueNumber) {
        position++;
      }
    });

    return position + 1;
  } catch (error) {
    console.error("Error getting queue position:", error);
    return 0;
  }
}

/**
 * Get today's queue statistics
 */
export async function getTodayStats() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueRef = ref(database, `queue/${today}`);
    const snapshot = await get(queueRef);

    let stats = {
      total: 0,
      waiting: 0,
      serving: 0,
      done: 0,
      currentServing: null,
    };

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((ticket) => {
        stats.total++;
        if (ticket.status === "waiting") stats.waiting++;
        else if (ticket.status === "serving") {
          stats.serving++;
          stats.currentServing = ticket;
        } else if (ticket.status === "done") stats.done++;
      });
    }

    return stats;
  } catch (error) {
    console.error("Error getting stats:", error);
    return { total: 0, waiting: 0, serving: 0, done: 0, currentServing: null };
  }
}

/**
 * Get all tickets for today
 */
export async function getTodayTickets() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueRef = ref(database, `queue/${today}`);
    const snapshot = await get(queueRef);

    if (!snapshot.exists()) return [];

    const tickets = [];
    const data = snapshot.val();

    Object.entries(data).forEach(([id, ticket]) => {
      tickets.push({
        id: id,
        ...ticket,
      });
    });

    // Sort by queue number
    return tickets.sort((a, b) => a.queueNumber - b.queueNumber);
  } catch (error) {
    console.error("Error getting today's tickets:", error);
    return [];
  }
}

/**
 * Call next customer in queue
 */
export async function callNextCustomer() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tickets = await getTodayTickets();

    // Mark previous serving as done
    for (const ticket of tickets) {
      if (ticket.status === "serving") {
        const ticketRef = ref(database, `queue/${today}/${ticket.id}`);
        await update(ticketRef, { status: "done" });
        break;
      }
    }

    // Find first waiting ticket
    for (const ticket of tickets) {
      if (ticket.status === "waiting") {
        const ticketRef = ref(database, `queue/${today}/${ticket.id}`);
        await update(ticketRef, { status: "serving" });
        return ticket;
      }
    }

    return null;
  } catch (error) {
    console.error("Error calling next customer:", error);
    return null;
  }
}

/**
 * Mark current customer as done
 */
export async function markCurrentAsDone() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tickets = await getTodayTickets();

    for (const ticket of tickets) {
      if (ticket.status === "serving") {
        const ticketRef = ref(database, `queue/${today}/${ticket.id}`);
        await update(ticketRef, { status: "done" });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error marking as done:", error);
    return false;
  }
}

/**
 * Reset entire queue for today
 */
export async function resetQueue() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueRef = ref(database, `queue/${today}`);
    await remove(queueRef);
    return true;
  } catch (error) {
    console.error("Error resetting queue:", error);
    return false;
  }
}

/**
 * Listen to real-time queue updates
 */
export function listenToQueueUpdates(callback) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const queueRef = ref(database, `queue/${today}`);

    const unsubscribe = onValue(queueRef, (snapshot) => {
      if (snapshot.exists()) {
        const tickets = [];
        const data = snapshot.val();

        Object.entries(data).forEach(([id, ticket]) => {
          tickets.push({
            id: id,
            ...ticket,
          });
        });

        tickets.sort((a, b) => a.queueNumber - b.queueNumber);
        callback(tickets);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up listener:", error);
    return () => {};
  }
}

/**
 * Get currently serving customer
 */
export async function getCurrentlyServing() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tickets = await getTodayTickets();

    for (const ticket of tickets) {
      if (ticket.status === "serving") {
        return ticket;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting current customer:", error);
    return null;
  }
}

export { database };
