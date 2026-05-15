import {
  getTodayStats,
  getTodayTickets,
  callNextCustomer,
  markCurrentAsDone,
  resetQueue,
  listenToQueueUpdates,
} from "./firebase.js";
import { protectPage, initLogoutButtons } from "./auth.js";

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

// ==================== UI UPDATE FUNCTIONS ====================

/**
 * Update sidebar stats
 */
function updateSideStats(stats) {
  const statWaiting = document.getElementById("stat_waiting");
  const statServing = document.getElementById("stat_serving");
  const statDone = document.getElementById("stat_done");
  const statTotal = document.getElementById("stat_total");

  if (statWaiting) statWaiting.textContent = stats.waiting;
  if (statServing) statServing.textContent = stats.serving;
  if (statDone) statDone.textContent = stats.done;
  if (statTotal) statTotal.textContent = stats.total;
}

/**
 * Update now serving display
 */
function updateNowServing(currentTicket) {
  const servingNumber = document.getElementById("side_serving_number");
  const servingName = document.getElementById("side_serving_name");
  const servingPurpose = document.getElementById("side_serving_purpose");

  if (currentTicket) {
    if (servingNumber) {
      servingNumber.textContent = String(currentTicket.queueNumber).padStart(
        3,
        "0",
      );
    }
    if (servingName) servingName.textContent = currentTicket.fullName;
    if (servingPurpose)
      servingPurpose.textContent = `Service: ${currentTicket.purpose}`;
  } else {
    if (servingNumber) servingNumber.textContent = "---";
    if (servingName) servingName.textContent = "No customer yet";
    if (servingPurpose) servingPurpose.textContent = "";
  }
}

/**
 * Render queue table
 */
function renderQueueTable(tickets, filter = "all") {
  const tbody = document.getElementById("table_body");
  if (!tbody) return;

  // Filter tickets
  let filtered = tickets;
  if (filter !== "all") {
    filtered = tickets.filter((t) => t.status === filter);
  }

  // Sort by queue number
  filtered.sort((a, b) => a.queueNumber - b.queueNumber);

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr class="empty_row"><td colspan="7">NO RECORDS YET</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((ticket, index) => {
      const statusClass = `status-${ticket.status}`;
      return `
      <tr class="${statusClass}">
        <td>${String(ticket.queueNumber).padStart(3, "0")}</td>
        <td>${escapeHtml(ticket.fullName)}</td>
        <td>${escapeHtml(ticket.email)}</td>
        <td>${escapeHtml(ticket.purpose)}</td>
        <td>${ticket.timeIssued}</td>
        <td><span class="status-badge status-${ticket.status}">${ticket.status.toUpperCase()}</span></td>
        <td>
          <button class="btn-action btn-delete" data-id="${ticket.id}" title="Delete ticket">×</button>
        </td>
      </tr>
    `;
    })
    .join("");

  // Add delete handlers
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", handleDeleteTicket);
  });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle Call Next button
 */
async function handleCallNext() {
  try {
    const button = document.getElementById("btn_call_next");
    button.disabled = true;
    button.textContent = "⏳ Loading...";

    const ticket = await callNextCustomer();

    button.disabled = false;
    button.textContent = "▶ CALL NEXT";

    if (ticket) {
      console.log("Called customer:", ticket.queueNumber);
    } else {
      console.log("No more customers in queue");
    }
  } catch (error) {
    console.error("Error calling next customer:", error);
    const button = document.getElementById("btn_call_next");
    button.disabled = false;
    button.textContent = "▶ CALL NEXT";
  }
}

/**
 * Handle Mark as Done button
 */
async function handleMarkDone() {
  try {
    const button = document.getElementById("btn_mark_done");
    button.disabled = true;
    button.textContent = "⏳ Processing...";

    const success = await markCurrentAsDone();

    button.disabled = false;
    button.textContent = "✓ MARK AS DONE";

    if (success) {
      console.log("Marked customer as done");
    }
  } catch (error) {
    console.error("Error marking as done:", error);
    const button = document.getElementById("btn_mark_done");
    button.disabled = false;
    button.textContent = "✓ MARK AS DONE";
  }
}

/**
 * Handle Reset button
 */
async function handleReset() {
  if (
    !confirm(
      "⚠️ Are you sure you want to reset the entire queue? This cannot be undone.",
    )
  ) {
    return;
  }

  try {
    const button = document.getElementById("btn_reset");
    button.disabled = true;
    button.textContent = "↺ Resetting...";

    await resetQueue();

    button.disabled = false;
    button.textContent = "↺ RESET ALL";

    console.log("Queue reset successfully");
  } catch (error) {
    console.error("Error resetting queue:", error);
    const button = document.getElementById("btn_reset");
    button.disabled = false;
    button.textContent = "↺ RESET ALL";
  }
}

/**
 * Handle filter tab changes
 */
function handleFilterChange(e) {
  const activeTab = document.querySelector(".filter_tab.active");
  if (activeTab) activeTab.classList.remove("active");

  e.target.classList.add("active");
  const filter = e.target.dataset.filter;

  // Re-render table with new filter
  loadQueueTable(filter);
}

/**
 * Handle delete ticket
 */
async function handleDeleteTicket(e) {
  if (!confirm("Delete this ticket?")) return;

  // This would need additional Firebase function to delete
  console.log("Delete ticket feature needs implementation");
}

// ==================== INITIALIZATION ====================

/**
 * Load and display queue table
 */
async function loadQueueTable(filter = "all") {
  try {
    const tickets = await getTodayTickets();
    renderQueueTable(tickets, filter);
  } catch (error) {
    console.error("Error loading queue table:", error);
  }
}

/**
 * Initialize dashboard page
 */
export function initDashboard() {
  console.log("Initializing dashboard...");

  // Check authentication
  protectPage();

  // Update clock and date
  updateClock();
  updateDate();
  setInterval(updateClock, 1000);

  // Setup button event listeners
  const btnCallNext = document.getElementById("btn_call_next");
  const btnMarkDone = document.getElementById("btn_mark_done");
  const btnReset = document.getElementById("btn_reset");

  if (btnCallNext) btnCallNext.addEventListener("click", handleCallNext);
  if (btnMarkDone) btnMarkDone.addEventListener("click", handleMarkDone);
  if (btnReset) btnReset.addEventListener("click", handleReset);

  // Setup filter tabs
  document.querySelectorAll(".filter_tab").forEach((tab) => {
    tab.addEventListener("click", handleFilterChange);
  });

  // Setup logout buttons
  initLogoutButtons();

  // Load initial data
  loadInitialData();

  // Setup real-time listener
  setupRealtimeListener();
}

/**
 * Load initial dashboard data
 */
async function loadInitialData() {
  try {
    const stats = await getTodayStats();
    updateSideStats(stats);
    updateNowServing(stats.currentServing);

    const tickets = await getTodayTickets();
    renderQueueTable(tickets, "all");
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
}

/**
 * Setup real-time listener for queue updates
 */
function setupRealtimeListener() {
  const unsubscribe = listenToQueueUpdates((tickets) => {
    console.log("Dashboard queue updated:", tickets);

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

    updateSideStats(stats);
    updateNowServing(stats.currentServing);

    // Update table based on current filter
    const activeFilter =
      document.querySelector(".filter_tab.active")?.dataset.filter || "all";
    renderQueueTable(tickets, activeFilter);
  });

  return unsubscribe;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
