import { submitTicket, getQueuePosition } from "../firebase/firebase.js";

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

/**
 * Calculate estimated wait time
 */
function getEstimatedWaitTime(position) {
  // Assuming 5 minutes per customer
  const minutesPerCustomer = 5;
  const waitMinutes = (position - 1) * minutesPerCustomer;

  if (waitMinutes === 0) {
    return "You're next!";
  } else if (waitMinutes < 60) {
    return `Estimated wait: ${waitMinutes} minutes`;
  } else {
    const hours = Math.floor(waitMinutes / 60);
    const mins = waitMinutes % 60;
    return `Estimated wait: ${hours}h ${mins}m`;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Initialize form page
 */
export function initFormPage() {
  console.log("Initializing form page...");

  // Update clock and date
  updateClock();
  updateDate();
  setInterval(updateClock, 1000);

  const form = document.getElementById("registration_form");
  if (!form) {
    console.error("Form not found");
    return;
  }

  form.addEventListener("submit", handleFormSubmit);

  // Button to start new registration
  const btnNew = document.getElementById("btn_new_ticket");
  if (btnNew) {
    btnNew.addEventListener("click", resetForm);
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const fullName = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const purpose = document.getElementById("purpose").value;
  const errorDiv = document.getElementById("form_error");

  // Validation
  if (!fullName || !email || !purpose) {
    errorDiv.textContent = "Please fill in all fields";
    return;
  }

  if (!isValidEmail(email)) {
    errorDiv.textContent = "Please enter a valid email address";
    return;
  }

  errorDiv.textContent = "";

  try {
    // Show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = "Processing...";
    button.disabled = true;

    // Submit ticket to Firebase
    const result = await submitTicket(fullName, email, purpose);

    console.log("result", result);
    if (result.success) {
      // Display ticket
      displayTicket(result.queueNumber, fullName, purpose, result.position);

      // Clear and disable form
      e.target.reset();
      e.target.style.opacity = "0.5";
      e.target.style.pointerEvents = "none";
    } else {
      errorDiv.textContent =
        result.error || "An error occurred. Please try again.";
      button.textContent = originalText;
      button.disabled = false;
    }
  } catch (error) {
    console.error("Form submission error:", error);
    errorDiv.textContent = "An error occurred. Please try again.";
    const button = e.target.querySelector('button[type="submit"]');
    button.textContent = "GET QUEUE NUMBER";
    button.disabled = false;
  }
}

/**
 * Display ticket result
 */
function displayTicket(queueNumber, fullName, purpose, position) {
  const ticketIdle = document.getElementById("ticket_idle");
  const ticketResult = document.getElementById("ticket_result");

  if (ticketIdle) ticketIdle.style.display = "none";

  if (ticketResult) {
    // Set ticket number
    const ticketNum = document.getElementById("ticket_number");
    if (ticketNum) {
      ticketNum.textContent = String(queueNumber).padStart(3, "0");
      // Add animation
      ticketNum.classList.add("pop-in");
    }

    // Set customer info
    const ticketNameEl = document.getElementById("ticket_name");
    const ticketPurposeEl = document.getElementById("ticket_purpose");
    const ticketTimeEl = document.getElementById("ticket_time");
    const ticketPositionEl = document.getElementById("ticket_position");
    const ticketWaitMsgEl = document.getElementById("ticket_wait_msg");

    if (ticketNameEl) ticketNameEl.textContent = fullName;
    if (ticketPurposeEl) ticketPurposeEl.textContent = purpose;

    const now = new Date();
    if (ticketTimeEl) {
      ticketTimeEl.textContent = now.toLocaleTimeString("en-US", {
        hour12: false,
      });
    }

    if (ticketPositionEl) ticketPositionEl.textContent = position;
    if (ticketWaitMsgEl) {
      ticketWaitMsgEl.textContent = getEstimatedWaitTime(position);
    }

    ticketResult.style.display = "block";
  }
}

/**
 * Reset form to initial state
 */
function resetForm() {
  const form = document.getElementById("registration_form");
  const ticketIdle = document.getElementById("ticket_idle");
  const ticketResult = document.getElementById("ticket_result");

  if (form) {
    form.reset();
    form.style.opacity = "1";
    form.style.pointerEvents = "auto";
  }

  if (ticketIdle) ticketIdle.style.display = "block";
  if (ticketResult) ticketResult.style.display = "none";

  const errorDiv = document.getElementById("form_error");
  if (errorDiv) errorDiv.textContent = "";

  // Focus on first input
  const firstInput = document.getElementById("full_name");
  if (firstInput) firstInput.focus();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormPage);
} else {
  initFormPage();
}
