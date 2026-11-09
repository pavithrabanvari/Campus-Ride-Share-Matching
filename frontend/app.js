const $ = (id) => document.getElementById(id);
const form = $("search-form");
const grid = $("results-grid");
let toastTimer;
const authToken = () => localStorage.getItem("campusRideToken");
const authHeaders = () => authToken() ? { Authorization: `Bearer ${authToken()}` } : {};

function departureDate() {
  const [hours, minutes] = $('departure-time').value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
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
      <div class="ride-meta"><span>◷ ${escapeHtml($('departure-time').value)}</span><span>↔ ${Math.round(match.time_delta_min)} min flex</span><span class="seat-icon">♧ ${match.available_seats} ${match.available_seats === 1 ? "seat" : "seats"}</span><button class="message-link" data-driver="${escapeHtml(match.driver_name)}" data-id="${escapeHtml(match.offer_id)}">Say hello ↗</button><button class="message-link book-ride" data-id="${escapeHtml(match.offer_id)}">Request seat</button></div>
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
    desired_time_min: Math.floor(departureDate().getTime() / 60000)
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
    const departure = departureDate();
    const timeWindow = Number($("time-window").value);
    const start = new Date(departure.getTime() - timeWindow * 60000);
    const end = new Date(departure.getTime() + timeWindow * 60000);
    const params = new URLSearchParams({
      originLat: String(request.pickup_lat), originLng: String(request.pickup_lon),
      destinationLat: String(request.dropoff_lat), destinationLng: String(request.dropoff_lon),
      radiusKm: "5", departureFrom: start.toISOString(), departureTo: end.toISOString(),
      desiredTime: departure.toISOString()
    });
    const searchResponse = await fetch(`/api/rides/search?${params}`);
    const searchPayload = await searchResponse.json();
    if (!searchResponse.ok) throw new Error(searchPayload.error || searchPayload.message || "Ride search failed.");
    const response = await fetch("/api/matches/rank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: searchPayload.request || request, offers: searchPayload.offers, max_time_window_min: timeWindow })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.message || "Something went wrong while finding rides.");
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
    if (!response.ok) throw new Error(payload.detail || payload.message || "Message could not be sent.");
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
    if (!response.ok) throw new Error(payload.detail || payload.message || "Messages could not be loaded.");
    const messages = payload.messages || [];
    $("message-count").textContent = String(messages.length);
    list.innerHTML = messages.length ? messages.map((message) => `<article style="padding:12px;border:1px solid #e9ede8;border-radius:9px"><strong style="font-size:11px">${escapeHtml(message.sender_id === "campus_rider" ? `You → ${message.recipient_id.replace("driver_", "")}` : message.sender_id)}</strong><p style="margin:6px 0 0;color:#75827a;font-size:11px;line-height:1.5;overflow-wrap:anywhere">${escapeHtml(message.content)}</p></article>`).join("") : `<div style="padding:30px 10px;text-align:center;font-size:11px;color:#929c94">Your conversations will show up here.</div>`;
  } catch (exception) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#9d5944;font-size:11px">${escapeHtml(exception.message)}</div>`;
  }
}

async function loadMyRides() {
  const list = $("my-rides-grid");
  if (!authToken()) { list.innerHTML = '<div class="empty-state"><h3>Sign in to see your rides</h3></div>'; return; }
  try {
    const response = await fetch('/api/rides/mine', { headers: authHeaders() }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Could not load your rides.');
    list.innerHTML = payload.offers.length ? payload.offers.map((ride) => `<article class="ride-card"><span class="step-kicker">${escapeHtml(ride.status)}</span><h3>${escapeHtml(ride.originAddress)} → ${escapeHtml(ride.destinationAddress)}</h3><p>${new Date(ride.departureTime).toLocaleString()} · ${ride.availableSeats} seat(s) · ${escapeHtml(ride.vehicleType || 'Car')}</p><p>${escapeHtml(ride.vehicleDetails || '')} ${escapeHtml(ride.notes || '')}</p>${ride.status === 'ACTIVE' ? `<button class="message-link edit-ride" data-id="${ride._id}" data-origin="${escapeHtml(ride.originAddress)}" data-destination="${escapeHtml(ride.destinationAddress)}" data-seats="${ride.availableSeats}">Edit ride</button><button class="message-link cancel-ride" data-id="${ride._id}">Cancel ride</button>` : ''}</article>`).join('') : '<div class="empty-state"><h3>No rides offered yet</h3><p>Publish a ride and it will show up here.</p></div>';
  } catch (error) { list.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`; }
}

async function authenticate() {
  if (authToken()) { localStorage.removeItem('campusRideToken'); $('auth-button').textContent = 'Sign in'; loadMyRides(); showToast('Signed out.'); return; }
  const email = prompt('Your campus email'); if (!email) return; const password = prompt('Password'); if (!password) return;
  try {
    let response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); let payload = await response.json();
    if (!response.ok) { const name = prompt('No account signed in. Enter your name to create one, or cancel.'); if (!name) throw new Error(payload.message || 'Sign in failed.'); response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) }); payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Registration failed.'); response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Sign in failed.'); }
    localStorage.setItem('campusRideToken', payload.token); $('auth-button').textContent = 'Sign out'; loadMyRides(); showToast(`Welcome${payload.name ? `, ${payload.name}` : ''}!`);
  } catch (error) { showToast(error.message); }
}

async function publishRide(event) {
  event.preventDefault(); const errorBox = $('offer-error'); errorBox.hidden = true;
  if (!authToken()) { showToast('Sign in before publishing a ride.'); authenticate(); return; }
  const data = new FormData(event.currentTarget); const departureTime = new Date(`${data.get('date')}T${data.get('time')}`);
  if (!Number.isFinite(departureTime.getTime()) || departureTime <= new Date()) { errorBox.textContent = 'Choose a departure date and time in the future.'; errorBox.hidden = false; return; }
  const button = event.currentTarget.querySelector('button[type=submit]'); button.disabled = true; button.querySelector('span:first-child').textContent = 'Publishing…';
  const body = { originAddress: data.get('originAddress'), originCoordinates: { lat: Number(data.get('originLat')), lng: Number(data.get('originLng')) }, destinationAddress: data.get('destinationAddress'), destinationCoordinates: { lat: Number(data.get('destinationLat')), lng: Number(data.get('destinationLng')) }, departureTime: departureTime.toISOString(), availableSeats: Number(data.get('availableSeats')), vehicleType: data.get('vehicleType'), vehicleDetails: data.get('vehicleDetails'), notes: data.get('notes') };
  try { const response = await fetch('/api/rides/offers', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Ride could not be published.'); event.currentTarget.reset(); showToast('Your ride has been published.'); await loadMyRides(); }
  catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
  finally { button.disabled = false; button.querySelector('span:first-child').textContent = 'Publish ride'; }
}

async function bookRide(id) {
  if (!authToken()) { showToast('Sign in to request a seat.'); return authenticate(); }
  try { const response = await fetch(`/api/rides/offers/${encodeURIComponent(id)}/book`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ seats: 1 }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Seat request failed.'); showToast(payload.message); form.requestSubmit(); }
  catch (error) { showToast(error.message); }
}

form.addEventListener("submit", searchRides);
$("offer-form").addEventListener('submit', publishRide);
$('auth-button').addEventListener('click', authenticate);
if (authToken()) { $('auth-button').textContent = 'Sign out'; loadMyRides(); }
$("my-rides-grid").addEventListener('click', async (event) => {
  const edit = event.target.closest('.edit-ride');
  if (edit) {
    const originAddress = prompt('Pickup location', edit.dataset.origin); if (originAddress === null) return;
    const destinationAddress = prompt('Destination', edit.dataset.destination); if (destinationAddress === null) return;
    const availableSeats = Number(prompt('Available seats', edit.dataset.seats)); if (!Number.isInteger(availableSeats) || availableSeats < 1 || availableSeats > 20) return showToast('Enter a whole number of seats from 1 to 20.');
    try { const response = await fetch(`/api/rides/offers/${encodeURIComponent(edit.dataset.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ originAddress, destinationAddress, availableSeats }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Update failed.'); showToast('Ride updated.'); loadMyRides(); } catch (error) { showToast(error.message); }
    return;
  }
  const button = event.target.closest('.cancel-ride'); if (!button || !confirm('Cancel this ride?')) return;
  try { const response = await fetch(`/api/rides/offers/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE', headers: authHeaders() }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Cancellation failed.'); showToast('Ride cancelled.'); loadMyRides(); } catch (error) { showToast(error.message); }
});
grid.addEventListener('click', (event) => { const button = event.target.closest('.book-ride'); if (button) bookRide(button.dataset.id); });
grid.addEventListener("click", (event) => {
  const button = event.target.closest(".message-link:not(.book-ride)");
  if (button) messageDriver(button.dataset.driver, button.dataset.id);
});
$("messages-link").addEventListener("click", (event) => { event.preventDefault(); loadMessages(); });
$("messages-close").addEventListener("click", () => $("messages-dialog").close());
$("help-button").addEventListener("click", () => showToast("Search rides by route and departure time. Messages are kept in memory for this prototype."));
form.requestSubmit();
