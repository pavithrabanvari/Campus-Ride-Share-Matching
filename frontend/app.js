const sampleOffers = [
  { id: "offer-101", driver_name: "Aarav Nair", pickup_lat: 12.935, pickup_lon: 77.535, dropoff_lat: 12.972, dropoff_lon: 77.595, departure_time_min: 545, available_seats: 2, status: "active", pickup_name: "PES Main Gate", dropoff_name: "MG Road" },
  { id: "offer-102", driver_name: "Mira Sharma", pickup_lat: 12.936, pickup_lon: 77.537, dropoff_lat: 12.97, dropoff_lon: 77.592, departure_time_min: 550, available_seats: 1, status: "active", pickup_name: "PES Electronic City", dropoff_name: "Brigade Road" },
  { id: "offer-103", driver_name: "Rohan Iyer", pickup_lat: 12.93, pickup_lon: 77.53, dropoff_lat: 12.975, dropoff_lon: 77.6, departure_time_min: 535, available_seats: 3, status: "active", pickup_name: "Hosa Road Metro", dropoff_name: "MG Road" },
  { id: "offer-104", driver_name: "Ananya Rao", pickup_lat: 12.934, pickup_lon: 77.536, dropoff_lat: 12.973, dropoff_lon: 77.596, departure_time_min: 545, available_seats: 0, status: "active", pickup_name: "PES Main Gate", dropoff_name: "MG Road" },
  { id: "offer-105", driver_name: "Dev Kapoor", pickup_lat: 12.934, pickup_lon: 77.536, dropoff_lat: 12.973, dropoff_lon: 77.596, departure_time_min: 545, available_seats: 2, status: "cancelled", pickup_name: "PES Main Gate", dropoff_name: "MG Road" }
];

const $ = (id) => document.getElementById(id);
const form = $("search-form");
const grid = $("results-grid");
let toastTimer;

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderMatches(matches) {
  if (!matches.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⌖</div><h3>No rides along this route yet</h3><p>Try a wider time window or adjust your location coordinates.</p></div>`;
    $("results-title").textContent = "We’ll keep looking with you";
    $("result-status").textContent = "NO MATCHES JUST YET";
    return;
  }
  $("results-title").textContent = matches.length === 1 ? "One lovely way to go" : `${matches.length} rides worth a look`;
  $("result-status").textContent = `${matches.length} GOOD ${matches.length === 1 ? "FIT" : "FITS"}`;
  grid.innerHTML = matches.map((match, index) => `
    <article class="ride-card">
      <div class="ride-top"><div class="driver"><span class="driver-avatar" style="background:${["#eff2e9", "#f6ebe5", "#e9eef4", "#f4efdf"][index % 4]}">${escapeHtml(initials(match.driver_name))}</span><span class="driver-name">${escapeHtml(match.driver_name)}<small class="driver-label">Fellow student</small></span></div><span class="score">${Math.round(match.score)}% fit</span></div>
      <div class="ride-route"><div class="route-dots"><i></i><span></span><i></i></div><div><div class="route-stop">${escapeHtml(match.pickup)}</div><div class="route-stop">${escapeHtml(match.dropoff)}</div></div></div>
      <div class="ride-meta"><span>◷ ${escapeHtml($('departure-time').value)}</span><span>↔ ${Math.round(match.time_delta_min)} min flex</span><span class="seat-icon">♧ ${match.available_seats} ${match.available_seats === 1 ? "seat" : "seats"}</span><button class="message-link" data-driver="${escapeHtml(match.driver_name)}" data-id="${escapeHtml(match.offer_id)}">Say hello ↗</button></div>
    </article>`).join("");
}

async function searchRides(event) {
  event.preventDefault();
  const error = $("form-error");
  error.hidden = true;
  const number = (id) => Number($(id).value);
  const request = {
    pickup_lat: number("pickup-lat"), pickup_lon: number("pickup-lon"),
    dropoff_lat: number("dropoff-lat"), dropoff_lon: number("dropoff-lon"),
    desired_time_min: minutesFromTime($("departure-time").value)
  };
  if (Object.values(request).some((value) => !Number.isFinite(value)) || Math.abs(request.pickup_lat) > 90 || Math.abs(request.dropoff_lat) > 90 || Math.abs(request.pickup_lon) > 180 || Math.abs(request.dropoff_lon) > 180) {
    error.textContent = "Please check your coordinates. Latitude ranges from −90 to 90 and longitude from −180 to 180.";
    error.hidden = false;
    return;
  }
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.querySelector("span:first-child").textContent = "Finding your way…";
  try {
    const response = await fetch("/api/matches/rank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, offers: sampleOffers, max_time_window_min: Number($("time-window").value) })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Something went wrong while finding rides.");
    renderMatches(payload.matches || []);
    $("results").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (exception) {
    error.textContent = `${exception.message} Please try again.`;
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.querySelector("span:first-child").textContent = "Find my ride";
  }
}

async function messageDriver(driver, rideId) {
  const content = window.prompt(`Say hello to ${driver}`, `Hi ${driver.split(" ")[0]}! I’m interested in your ride. Is there a seat available?`);
  if (!content || !content.trim()) return;
  try {
    const response = await fetch("/api/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id: "campus_rider", recipient_id: `driver_${rideId}`, content: content.trim() })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Message could not be sent.");
    $("message-count").textContent = String(Number($("message-count").textContent) + 1);
    showToast(`Your note to ${driver.split(" ")[0]} has been sent.`);
    loadMessages();
  } catch (exception) {
    showToast(`${exception.message} Try again in a moment.`);
  }
}

async function loadMessages() {
  const list = $("message-list");
  list.innerHTML = `<div style="padding:20px;text-align:center;color:#929c94;font-size:11px">Loading your notes…</div>`;
  $("messages-dialog").showModal();
  try {
    const response = await fetch("/api/messages/campus_rider");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Messages could not be loaded.");
    const messages = payload.messages || [];
    $("message-count").textContent = String(messages.length);
    list.innerHTML = messages.length ? messages.map((message) => `<article style="padding:12px;border:1px solid #e9ede8;border-radius:9px"><strong style="font-size:11px">${escapeHtml(message.sender_id === "campus_rider" ? `You → ${message.recipient_id.replace("driver_", "")}` : message.sender_id)}</strong><p style="margin:6px 0 0;color:#75827a;font-size:11px;line-height:1.5;overflow-wrap:anywhere">${escapeHtml(message.content)}</p></article>`).join("") : `<div style="padding:30px 10px;text-align:center;font-size:11px;color:#929c94">Your conversations will show up here.</div>`;
  } catch (exception) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#9d5944;font-size:11px">${escapeHtml(exception.message)}</div>`;
  }
}

form.addEventListener("submit", searchRides);
grid.addEventListener("click", (event) => {
  const button = event.target.closest(".message-link");
  if (button) messageDriver(button.dataset.driver, button.dataset.id);
});
$("messages-link").addEventListener("click", (event) => { event.preventDefault(); loadMessages(); });
$("messages-close").addEventListener("click", () => $("messages-dialog").close());
$("help-button").addEventListener("click", () => showToast("Search rides by route and departure time. Messages are kept in memory for this prototype."));
form.requestSubmit();
