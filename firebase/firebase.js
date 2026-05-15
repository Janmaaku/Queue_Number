// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { limit } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js"; // Add limit to imports
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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
const db = getFirestore(app);
// ==================== QUEUE MANAGEMENT FUNCTIONS ====================

/**
 * Generate a new queue number based on today's highest number
 */
export async function generateQueueNumber() {
try {
    const today = new Date().toISOString().split("T")[0];
    const ticketsRef = collection(db, "tickets");
    
    const q = query(
      ticketsRef, 
      where("date", "==", today), 
      orderBy("queueNumber", "desc"), 
      limit(1)
    );
    
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const lastNumber = Number(snapshot.docs[0].data().queueNumber);
      console.log("Last queue number found:", lastNumber); // debug
      return lastNumber + 1;
    }

    console.log("No tickets today, starting at 1");
    return 1;
  } catch (error) {
    console.error("Generator Error — index may be missing:", error.message);
    throw error; // Don't silently return 1, let caller handle it
  }
}

/**
 * Submit a new ticket to Firebase
 */
export async function submitTicket(fullName, email, purpose) {
 try {
    const today = new Date().toISOString().split("T")[0];
    const nextNumber = await generateQueueNumber();
    const now = new Date();
    
    const stats = await getTodayStats();
    const initialStatus = (stats.total === 0) ? "serving" : "waiting";

    const ticketData = {
      queueNumber: nextNumber,
      fullName: fullName,
      email: email,
      purpose: purpose,
      timeIssued: now.toLocaleTimeString("en-US", { hour12: false }),
      status: initialStatus,
      createdAt: serverTimestamp(), 
      date: today,
    };

    await addDoc(collection(db, "tickets"), ticketData);

    return {
      success: true,
      queueNumber: nextNumber,
      position: await getQueuePosition(today, nextNumber),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get position in queue for a specific ticket
 */
export async function getQueuePosition(date, queueNumber) {
 try {
    const ticketsRef = collection(db, "tickets");
    const q = query(
      ticketsRef, 
      where("date", "==", date), 
      where("status", "==", "waiting"),
      where("queueNumber", "<", queueNumber)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size + 1;
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
    const tickets = await getTodayTickets();
    let stats = {
      total: tickets.length,
      waiting: 0,
      serving: 0,
      done: 0,
      currentServing: null,
    };

    tickets.forEach((ticket) => {
      if (ticket.status === "waiting") stats.waiting++;
      else if (ticket.status === "serving") {
        stats.serving++;
        stats.currentServing = ticket;
      } else if (ticket.status === "done") stats.done++;
    });

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
    const ticketsRef = collection(db, "tickets");
    const q = query(ticketsRef, where("date", "==", today), orderBy("queueNumber", "asc"));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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
    const tickets = await getTodayTickets();

    // 1. Mark previous serving as done
    const servingTicket = tickets.find(t => t.status === "serving");
    if (servingTicket) {
      await updateDoc(doc(db, "tickets", servingTicket.id), { status: "done" });
    }

    // 2. Find first waiting ticket
    const nextTicket = tickets.find(t => t.status === "waiting");
    if (nextTicket) {
      await updateDoc(doc(db, "tickets", nextTicket.id), { status: "serving" });
      return nextTicket;
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
    const tickets = await getTodayTickets();
    const servingTicket = tickets.find(t => t.status === "serving");

    if (servingTicket) {
      await updateDoc(doc(db, "tickets", servingTicket.id), { status: "done" });
      return true;
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
    const tickets = await getTodayTickets();
    const batch = writeBatch(db);
    
    tickets.forEach((ticket) => {
      const ticketRef = doc(db, "tickets", ticket.id);
      batch.delete(ticketRef);
    });

    await batch.commit();
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
 const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "tickets"), 
    where("date", "==", today), 
    orderBy("queueNumber", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tickets);
  }, (error) => {
    console.error("Listener error:", error);
  });
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

export { db };
