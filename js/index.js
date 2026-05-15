import {
  getTodayStats,
  listenToQueueUpdates,
  getCurrentlyServing,
} from "../firebase/firebase.js";

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format time display
 */
function formatTime(hours = 0, minutes = 0, seconds = 0) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Update clock display
 */
function updateClock() {
  const now = new Date();
  const clock = document.getElementById("clock");

  if (clock) {
    clock.textContent = formatTime(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );
  }
}

/**
 * Update date display
 */
function updateDate() {
  const dateStr = document.getElementById("date_str");
  if (dateStr) {
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    dateStr.textContent = now.toLocaleDateString("en-US", options);
  }
}

// ==================== DISPLAY UPDATES ====================

/**
 * Update stats display
 */
function updateStats(stats) {
  const statServed = document.getElementById("stat_served");
  const statWaiting = document.getElementById("stat_waiting");
  const statTotal = document.getElementById("stat_total");

  if (statServed) statServed.textContent = stats.done;
  if (statWaiting) statWaiting.textContent = stats.waiting;
  if (statTotal) statTotal.textContent = stats.total;
}

/**
 * Update queue chips (waiting queue display)
 */
function updateQueueChips(tickets) {
  const queueChips = document.getElementById("queue_chips");
  if (!queueChips) return;

  // Get waiting tickets
  const waitingTickets = tickets
    .filter((t) => t.status === "waiting")
    .slice(0, 8);

  if (waitingTickets.length === 0) {
    queueChips.innerHTML = '<span class="chip_empty">NO QUEUE</span>';
    return;
  }

  queueChips.innerHTML = "";
  waitingTickets.forEach((ticket, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = String(ticket.queueNumber).padStart(3, "0");

    if (index === 0) chip.classList.add("chip_next");

    queueChips.appendChild(chip);
  });
}

/**
 * Update current serving display
 */
function updateServingDisplay(currentTicket) {
  const queueNumber = document.getElementById("queue_number");
  const customerName = document.getElementById("customer_name");
  const customerPurpose = document.getElementById("customer_purpose");

  if (currentTicket) {
    if (queueNumber) {
      queueNumber.textContent = String(currentTicket.queueNumber).padStart(
        3,
        "0",
      );
      queueNumber.classList.add("serving-update");
      setTimeout(() => queueNumber.classList.remove("serving-update"), 600);
    }
    if (customerName) customerName.textContent = currentTicket.fullName;
    if (customerPurpose) customerPurpose.textContent = currentTicket.purpose;
  } else {
    if (queueNumber) queueNumber.textContent = "---";
    if (customerName) customerName.textContent = "WAITING FOR NEXT CUSTOMER";
    if (customerPurpose) customerPurpose.textContent = "";
  }
}

/**
 * Initialize display page
 */
export function initDisplayPage() {
  console.log("Initializing display page...");

  // Update clock and date
  updateClock();
  updateDate();
  setInterval(updateClock, 1000);

  // Initial stats load
  loadInitialStats();

  // Listen to real-time updates
  setupRealtimeListener();
}

/**
 * Load initial stats
 */
async function loadInitialStats() {
  try {
    const stats = await getTodayStats();
    updateStats(stats);

    if (stats.currentServing) {
      updateServingDisplay(stats.currentServing);
    }
  } catch (error) {
    console.error("Error loading initial stats:", error);
  }
}

/**
 * Setup real-time listener for queue updates
 */
function setupRealtimeListener() {
  const unsubscribe = listenToQueueUpdates((tickets) => {
    console.log("Queue updated:", tickets);

    // Update stats
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

    updateStats(stats);
    updateQueueChips(tickets);
    updateServingDisplay(stats.currentServing);
  });

  // Return unsubscribe function for cleanup (optional)
  return unsubscribe;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDisplayPage);
} else {
  initDisplayPage();
}
