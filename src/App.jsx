import { stopLocations } from "./data/mapData";
import "./App.css";
import { useEffect, useMemo, useState } from "react";

import {
  Bus,
  MapPin,
  Search,
  Clock,
  Navigation,
  LocateFixed,
  Activity,
  ArrowRight,
  Star,
  Heart,
  X,
  Menu,
  ChevronDown,
} from "lucide-react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import BusMap from "./components/BusMap";
import Login from "./components/Login";

import {
  buses,
  stops,
  recentJourneys,
} from "./data/mockData";

// ==========================================
// DISTANCE CALCULATOR (HAVERSINE)
// ==========================================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

// ==========================================
// MAIN APP
// ==========================================
function App() {
  // ==========================================
  // AUTHENTICATION
  // ==========================================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.error("Authentication error:", error);
        setAuthLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // ==========================================
  // JOURNEY AND BUS STATES
  // ==========================================
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busSearch, setBusSearch] = useState("");

  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");

  const [activePage, setActivePage] = useState("Home");
  const [showFavorites, setShowFavorites] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ==========================================
  // NEARBY BUS STOPS
  // ==========================================
  const nearbyStops = useMemo(() => {
    if (!userLocation) return [];

    return stopLocations
      .map((stop) => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          stop.position[0],
          stop.position[1]
        );

        return {
          ...stop,
          distance,
        };
      })
      .filter((stop) => stop.distance <= 2)
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation]);

  // ==========================================
  // FAVOURITES
  // ==========================================
  const [favorites, setFavorites] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("citytrack-favorites")
        ) || []
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "citytrack-favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  const toggleFavorite = (busId) => {
    setFavorites((previous) =>
      previous.includes(busId)
        ? previous.filter((id) => id !== busId)
        : [...previous, busId]
    );
  };

  // ==========================================
  // FILTER BUSES
  // ==========================================
  const displayedBuses = useMemo(() => {
    return buses.filter((bus) => {
      const matchesFrom = !from || bus.route.includes(from);
      const matchesTo = !to || bus.route.includes(to);

      const search = busSearch.trim().toLowerCase();

      const matchesSearch =
        !search ||
        bus.number.toLowerCase().includes(search) ||
        bus.id.toLowerCase().includes(search) ||
        bus.name.toLowerCase().includes(search);

      const matchesFavorite =
        !showFavorites || favorites.includes(bus.id);

      return (
        matchesFrom &&
        matchesTo &&
        matchesSearch &&
        matchesFavorite
      );
    });
  }, [from, to, busSearch, showFavorites, favorites]);

  // ==========================================
  // SCROLL NAVIGATION
  // ==========================================
  const scrollToSection = (sectionId, page) => {
    setActivePage(page);
    setMobileMenuOpen(false);

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ==========================================
  // BUS SEARCH
  // ==========================================
  const handleBusSearch = (value) => {
    setBusSearch(value);
    setShowFavorites(false);

    if (!value.trim()) {
      setSelectedBus(null);
      return;
    }

    const search = value.trim().toLowerCase();

    const match = buses.find(
      (bus) =>
        bus.number.toLowerCase() === search ||
        bus.id.toLowerCase() === search ||
        bus.name.toLowerCase().includes(search)
    );

    if (match) {
      setFrom("");
      setTo("");
      setSelectedBus(match);
      setSelectedStop(null);
      setActivePage("Tracking");
    }
  };

  // ==========================================
  // JOURNEY SEARCH
  // ==========================================
  const handleJourneySearch = () => {
    setShowFavorites(false);
    setBusSearch("");

    if (!from && !to) {
      alert("Please select a starting point or destination.");
      return;
    }

    const matches = buses.filter(
      (bus) =>
        (!from || bus.route.includes(from)) &&
        (!to || bus.route.includes(to))
    );

    if (matches.length === 0) {
      setSelectedBus(null);
      alert("No buses found for this journey.");
      return;
    }

    setSelectedBus(matches[0]);
    setSelectedStop(null);

    scrollToSection("map-section", "Tracking");
  };

  // ==========================================
  // USER LOCATION
  // ==========================================
  const handleLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationMessage("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(location);
        setLocationMessage("Your location was detected.");
      },
      (error) => {
        console.error("Location error:", error);

        if (error.code === 1) {
          setLocationMessage(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setLocationMessage(
            "Your location is currently unavailable."
          );
        } else if (error.code === 3) {
          setLocationMessage(
            "Location request timed out. Please try again."
          );
        } else {
          setLocationMessage(
            "Unable to detect your location."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  // ==========================================
  // AUTO DETECT LOCATION AFTER LOGIN
  // ==========================================
  useEffect(() => {
    if (user) {
      handleLocation();
    }
  }, [user]);

  // ==========================================
  // SELECT BUS
  // ==========================================
  const selectBus = (bus) => {
    setSelectedBus(bus);
    setSelectedStop(null);

    scrollToSection("map-section", "Tracking");
  };

  // ==========================================
  // SELECT STOP
  // ==========================================
  const selectStop = (stop) => {
    setSelectedStop(stop);
    setSelectedBus(null);

    scrollToSection("map-section", "Stops");
  };

  // ==========================================
  // RECENT JOURNEYS
  // ==========================================
  const selectRecentJourney = (journey) => {
    setFrom(journey.from);
    setTo(journey.to);
    setBusSearch("");
    setShowFavorites(false);

    const match = buses.find(
      (bus) =>
        bus.route.includes(journey.from) &&
        bus.route.includes(journey.to)
    );

    if (match) {
      setSelectedBus(match);
      setSelectedStop(null);
    }

    scrollToSection("map-section", "Tracking");
  };

  // ==========================================
  // DASHBOARD VALUES
  // ==========================================
  const averageEta = buses.length
    ? Math.round(
        buses.reduce((sum, bus) => sum + bus.eta, 0) /
          buses.length
      )
    : 0;

  // ==========================================
  // AUTH LOADING
  // ==========================================
  if (authLoading) {
    return (
      <div className="auth-loading">
        Loading CityTrack...
      </div>
    );
  }

  // ==========================================
  // LOGIN
  // ==========================================
  if (!user) {
    return <Login />;
  }

  // ==========================================
  // MAIN APP
  // ==========================================
  return (
    <div className="ct-app">

      {/* TOP NAVIGATION */}
      <header className="ct-header">
        <div className="ct-header-inner">

          <button
            className="ct-brand"
            onClick={() => scrollToSection("home-section", "Home")}
          >
            <span className="ct-brand-icon">
              <Bus size={25} />
            </span>

            <span>
              City<span className="ct-brand-highlight">Track</span>
              <small>YOUR CITY. YOUR BUS.</small>
            </span>
          </button>

          <nav
            className={`ct-nav ${
              mobileMenuOpen ? "ct-nav-open" : ""
            }`}
          >
            <button
              className={
                activePage === "Home" ? "ct-nav-active" : ""
              }
              onClick={() =>
                scrollToSection("home-section", "Home")
              }
            >
              Home
            </button>

            <button
              className={
                activePage === "Tracking" ? "ct-nav-active" : ""
              }
              onClick={() =>
                scrollToSection("map-section", "Tracking")
              }
            >
              Live Tracking
            </button>

            <button
              className={
                activePage === "Buses" ? "ct-nav-active" : ""
              }
              onClick={() => {
                setShowFavorites(false);
                scrollToSection("bus-section", "Buses");
              }}
            >
              Bus Routes
            </button>

            <button
              className={
                activePage === "Stops" ? "ct-nav-active" : ""
              }
              onClick={() =>
                scrollToSection("stops-section", "Stops")
              }
            >
              Bus Stops
            </button>

            <button
              className={
                activePage === "Favorites" ? "ct-nav-active" : ""
              }
              onClick={() => {
                setShowFavorites(true);
                setBusSearch("");
                setFrom("");
                setTo("");
                scrollToSection("bus-section", "Favorites");
              }}
            >
              <Heart size={16} />
              Favourites
            </button>
          </nav>

          <div className="ct-header-actions">
            <span className="ct-city-label">
              <MapPin size={16} />
              Kalaburagi
            </span>

            <button
              className="ct-logout"
              onClick={async () => {
                try {
                  await signOut(auth);
                  setSelectedBus(null);
                  setSelectedStop(null);
                } catch (error) {
                  console.error("Logout error:", error);
                  alert("Unable to logout. Please try again.");
                }
              }}
            >
              Logout
            </button>
          </div>

          <button
            className="ct-mobile-menu"
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main className="ct-main" id="home-section">

        {/* HERO */}
        <section className="ct-hero">
          <div className="ct-hero-content">
            <span className="ct-live-label">
              <span className="ct-live-dot"></span>
              LIVE CITY BUS INFORMATION
            </span>

            <h1>
              Your bus.
              <br />
              <span>Your time.</span>
              Your journey.
            </h1>

            <p>
              Find your bus, track it live and reach your
              destination without the wait.
            </p>

            <button
              className="ct-hero-button"
              onClick={() =>
                scrollToSection("journey-section", "Home")
              }
            >
              Plan your journey
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="ct-hero-visual">
            <div className="ct-hero-circle"></div>

            <div className="ct-hero-bus">
              <Bus size={150} strokeWidth={1.2} />
            </div>

            <div className="ct-hero-tag">
              <Activity size={17} />
              Live bus tracking
            </div>
          </div>
        </section>

        {/* JOURNEY PLANNER */}
        <section
          className="ct-journey-card"
          id="journey-section"
        >
          <div className="ct-section-title">
            <div>
              <span className="ct-kicker">
                LET'S GET YOU THERE
              </span>

              <h2>Where do you want to go?</h2>

              <p>Choose your stops to find available buses.</p>
            </div>

            <span className="ct-journey-icon">
              <Navigation size={25} />
            </span>
          </div>

          <div className="ct-journey-fields">
            <label className="ct-field">
              <span className="ct-field-icon ct-from-icon">
                <MapPin size={19} />
              </span>

              <span className="ct-field-content">
                <small>FROM</small>

                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  <option value="">Select starting point</option>

                  {stops.map((stop) => (
                    <option key={stop} value={stop}>
                      {stop}
                    </option>
                  ))}
                </select>
              </span>

              <ChevronDown size={17} />
            </label>

            <div className="ct-route-connector">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <label className="ct-field">
              <span className="ct-field-icon ct-to-icon">
                <Navigation size={19} />
              </span>

              <span className="ct-field-content">
                <small>TO</small>

                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <option value="">Select destination</option>

                  {stops.map((stop) => (
                    <option key={stop} value={stop}>
                      {stop}
                    </option>
                  ))}
                </select>
              </span>

              <ChevronDown size={17} />
            </label>

            <button
              className="ct-find-button"
              onClick={handleJourneySearch}
            >
              <Search size={19} />
              Find buses
            </button>
          </div>

          <div className="ct-quick-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Or search directly by bus number or name..."
              value={busSearch}
              onChange={(e) =>
                handleBusSearch(e.target.value)
              }
            />

            {busSearch && (
              <button
                onClick={() => handleBusSearch("")}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </section>

        {/* QUICK STATS */}
        <section className="ct-stats">
          <div className="ct-stat">
            <span className="ct-stat-icon ct-stat-blue">
              <Bus size={21} />
            </span>

            <div>
              <strong>{buses.length}</strong>
              <small>Available buses</small>
            </div>
          </div>

          <div className="ct-stat">
            <span className="ct-stat-icon ct-stat-green">
              <MapPin size={21} />
            </span>

            <div>
              <strong>{stops.length}</strong>
              <small>Bus stops</small>
            </div>
          </div>

          <div className="ct-stat">
            <span className="ct-stat-icon ct-stat-orange">
              <Clock size={21} />
            </span>

            <div>
              <strong>{averageEta} min</strong>
              <small>Average ETA</small>
            </div>
          </div>

          <div className="ct-stat">
            <span className="ct-stat-icon ct-stat-red">
              <Heart size={21} />
            </span>

            <div>
              <strong>{favorites.length}</strong>
              <small>Saved buses</small>
            </div>
          </div>
        </section>

        {/* LIVE MAP */}
        <section className="ct-map-section" id="map-section">
          <div className="ct-section-heading">
            <div>
              <span className="ct-kicker">
                EXPLORE YOUR CITY
              </span>

              <h2>Live bus tracking</h2>

              <p>
                {selectedBus
                  ? `Following Bus ${selectedBus.number}`
                  : selectedStop
                    ? `Selected stop: ${selectedStop}`
                    : "See buses and routes moving across the city."}
              </p>
            </div>

            <button
              className="ct-location-button"
              onClick={handleLocation}
            >
              <LocateFixed size={18} />
              My location
            </button>
          </div>

          {locationMessage && (
            <p className="ct-location-message">
              {locationMessage}
            </p>
          )}

          <div className="ct-map-frame">
            <BusMap
              buses={buses}
              userLocation={userLocation}
              selectedBus={selectedBus}
              selectedStop={selectedStop}
              onSelectBus={setSelectedBus}
            />
          </div>

          <div className="ct-map-footer">
            <span>
              <i className="ct-legend-blue"></i> Bus stops
            </span>

            <span>
              <i className="ct-legend-green"></i> Moving buses
            </span>

            <span>
              <i className="ct-legend-line"></i> Bus routes
            </span>

            <span className="ct-map-demo">
              Demo tracking data
            </span>
          </div>
        </section>

        {/* SELECTED BUS */}
        {selectedBus && (
          <section className="ct-selected-bus">
            <div className="ct-selected-heading">
              <div>
                <span className="ct-kicker">BUS INFORMATION</span>
                <h2>Bus {selectedBus.number}</h2>
                <p>{selectedBus.name}</p>
              </div>

              <button
                onClick={() => setSelectedBus(null)}
                aria-label="Clear selected bus"
              >
                <X size={20} />
              </button>
            </div>

            <div className="ct-selected-route">
              <strong>{selectedBus.from}</strong>
              <ArrowRight size={18} />
              <strong>{selectedBus.to}</strong>
            </div>

            <p className="ct-route-text">
              {selectedBus.route.join("  →  ")}
            </p>

            <div className="ct-selected-metrics">
              <div>
                <strong>{selectedBus.eta} min</strong>
                <small>Estimated arrival</small>
              </div>

              <div>
                <strong>{selectedBus.speed} km/h</strong>
                <small>Current speed</small>
              </div>

              <div>
                <strong>{selectedBus.occupancy}</strong>
                <small>Occupancy</small>
              </div>

              <div>
                <strong>{selectedBus.status}</strong>
                <small>Bus status</small>
              </div>
            </div>
          </section>
        )}

        {/* BUS LIST */}
        <section className="ct-buses-section" id="bus-section">
          <div className="ct-section-heading">
            <div>
              <span className="ct-kicker">FIND YOUR RIDE</span>

              <h2>
                {showFavorites
                  ? "Your favourite buses"
                  : "Available buses"}
              </h2>

              <p>{displayedBuses.length} buses found</p>
            </div>

            {showFavorites && (
              <button
                className="ct-text-button"
                onClick={() => setShowFavorites(false)}
              >
                Show all buses
              </button>
            )}
          </div>

          <div className="ct-bus-grid">
            {displayedBuses.length === 0 ? (
              <div className="ct-empty">
                <Bus size={35} />
                <h3>No buses found</h3>

                <p>
                  {showFavorites
                    ? "Save a bus using the star icon to see it here."
                    : "Try changing your search or journey stops."}
                </p>
              </div>
            ) : (
              displayedBuses.map((bus) => (
                <article
                  className={`ct-bus-card ${
                    selectedBus?.id === bus.id
                      ? "ct-bus-card-active"
                      : ""
                  }`}
                  key={bus.id}
                >
                  <div className="ct-bus-card-top">
                    <span
                      className="ct-bus-symbol"
                      style={{ color: bus.color }}
                    >
                      <Bus size={25} />
                    </span>

                    <button
                      className={`ct-fav-button ${
                        favorites.includes(bus.id)
                          ? "ct-fav-active"
                          : ""
                      }`}
                      onClick={() => toggleFavorite(bus.id)}
                      aria-label="Toggle favourite bus"
                      title="Toggle favourite"
                    >
                      <Star
                        size={19}
                        fill={
                          favorites.includes(bus.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>

                  <h3>Bus {bus.number}</h3>

                  <p className="ct-bus-name">{bus.name}</p>

                  <div className="ct-bus-route">
                    <span>{bus.from}</span>
                    <ArrowRight size={15} />
                    <span>{bus.to}</span>
                  </div>

                  <div className="ct-bus-card-bottom">
                    <div>
                      <strong>{bus.eta} min</strong>
                      <small>Arrival time</small>
                    </div>

                    <span className="ct-bus-status">
                      {bus.status}
                    </span>
                  </div>

                  <button
                    className="ct-track-button"
                    onClick={() => selectBus(bus)}
                  >
                    Track this bus
                    <ArrowRight size={17} />
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        {/* NEARBY BUS STOPS */}
        <section className="ct-stops-section" id="stops-section">
          <div className="ct-section-heading">
            <div>
              <span className="ct-kicker">
                YOUR NEAREST CONNECTIONS
              </span>

              <h2>Nearby bus stops</h2>

              <p>
                {userLocation
                  ? "Bus stops closest to your current location."
                  : "Detect your location to find nearby bus stops."}
              </p>
            </div>

            <button
              className="ct-location-button"
              onClick={handleLocation}
            >
              <LocateFixed size={18} />
              Find nearby
            </button>
          </div>

          {!userLocation ? (
            <div className="ct-empty">
              <MapPin size={35} />
              <h3>Location not detected</h3>
              <p>
                Allow location access to discover nearby bus stops.
              </p>
            </div>
          ) : nearbyStops.length === 0 ? (
            <div className="ct-empty">
              <MapPin size={35} />
              <h3>No bus stops nearby</h3>
              <p>
                There are no demo stops within 2 km of your location.
              </p>
            </div>
          ) : (
            <div className="ct-stops-grid">
              {nearbyStops.map((stop) => (
                <button
                  className={`ct-stop-card ${
                    selectedStop === stop.name
                      ? "ct-stop-active"
                      : ""
                  }`}
                  key={stop.name}
                  onClick={() => selectStop(stop.name)}
                >
                  <span>
                    <MapPin size={19} />
                  </span>

                  <div className="ct-nearby-stop-info">
                    <strong>{stop.name}</strong>

                    <small>
                      {stop.distance < 1
                        ? `${Math.round(
                            stop.distance * 1000
                          )} metres away`
                        : `${stop.distance.toFixed(2)} km away`}
                    </small>
                  </div>

                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* RECENT JOURNEYS */}
        <section className="ct-recent-section">
          <div className="ct-section-heading">
            <div>
              <span className="ct-kicker">QUICK ACCESS</span>
              <h2>Recent journeys</h2>
              <p>Plan a journey again with one click.</p>
            </div>
          </div>

          <div className="ct-recent-list">
            {recentJourneys.map((journey, index) => (
              <button
                className="ct-recent-card"
                key={index}
                onClick={() => selectRecentJourney(journey)}
              >
                <span className="ct-recent-icon">
                  <Navigation size={19} />
                </span>

                <span className="ct-recent-route">
                  <strong>{journey.from}</strong>
                  <small>to {journey.to}</small>
                </span>

                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="ct-footer">
          <div className="ct-footer-brand">
            <Bus size={21} />
            <strong>CityTrack</strong>
          </div>

          <p>© 2026 CityTrack · Smart City Bus Tracking System</p>

          <small>Bus locations and arrival times are demo data.</small>
        </footer>

      </main>
    </div>
  );
}

export default App;