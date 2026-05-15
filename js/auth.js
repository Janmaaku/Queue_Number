// Simple authentication system with localStorage
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

/**
 * Initialize login page
 */
export function initLoginPage() {
  const loginForm = document.getElementById("login_form");
  const errorMsg = document.getElementById("login_error");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!loginForm) return;

  // Clear inputs
  usernameInput.value = "";
  passwordInput.value = "";
  errorMsg.textContent = "";

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin(usernameInput.value, passwordInput.value, errorMsg);
  });

  // Allow Enter key to submit
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleLogin(usernameInput.value, passwordInput.value, errorMsg);
    }
  });
}

/**
 * Handle login submission
 */
function handleLogin(username, password, errorElement) {
  errorElement.textContent = "";

  if (!username || !password) {
    errorElement.textContent = "Please enter username and password";
    return;
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Store login in localStorage
    localStorage.setItem("queuetek_admin_logged_in", "true");
    localStorage.setItem("queuetek_admin_login_time", new Date().getTime());

    // Redirect to dashboard
    window.location.href = "./dashboard.html";
  } else {
    errorElement.textContent = "Invalid username or password";
    // Shake animation
    errorElement.parentElement.classList.add("shake");
    setTimeout(() => {
      errorElement.parentElement.classList.remove("shake");
    }, 500);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return localStorage.getItem("queuetek_admin_logged_in") === "true";
}

/**
 * Get login session info
 */
export function getLoginSession() {
  return {
    isLoggedIn: isAuthenticated(),
    loginTime: localStorage.getItem("queuetek_admin_login_time"),
  };
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem("queuetek_admin_logged_in");
  localStorage.removeItem("queuetek_admin_login_time");
  window.location.href = "./login.html";
}

/**
 * Protect dashboard pages - redirect to login if not authenticated
 */
export function protectPage() {
  if (!isAuthenticated()) {
    window.location.href = "./login.html";
  }
}

/**
 * Initialize logout buttons
 */
export function initLogoutButtons() {
  const logoutButtons = document.querySelectorAll(".btn_logout, [data-logout]");
  logoutButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        logout();
      }
    });
  });
}
