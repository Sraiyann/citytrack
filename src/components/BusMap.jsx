
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  demoCenter,
  stopLocations,
  busRouteCoordinates,
} from "../data/mapData";

// Bus marker
const busIcon = (color, number, selected = false) =>
  L.divIcon({
    className: "custom-bus-marker",
    html: `<div style="
      background:${color};
      color:white;
      padding:7px 10px;
      border-radius:9px;
      font-weight:800;
      font-size:12px;
      border:${selected ? "3px solid #facc15" : "2px solid white"};
      box-shadow:0 3px 10px rgba(0,0,0,.3);
      white-space:nowrap;
      transform:${selected ? "scale(1.12)" : "scale(1)"};
    ">🚌 ${number}</div>`,
    iconSize: [70, 38],
    iconAnchor: [35, 19],
  });

// Bus stop marker
const stopIcon = L.divIcon({
  className: "custom-stop-marker",
  html: `<div style="
    width:14px;
    height:14px;
    background:#ffffff;
    border:4px solid #2563eb;
    border-radius:50%;
    box-shadow:0 1px 5px rgba(0,0,0,.2);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const selectedStopIcon = L.divIcon({
  className: "custom-stop-marker",
  html: `<div style="
    width:20px;
    height:20px;
    background:#facc15;
    border:4px solid #1d4ed8;
    border-radius:50%;
    box-shadow:0 0 0 7px rgba(250,204,21,.25);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Fix map size and refresh when container changes
function MapFix() {
  const map = useMap();

  useEffect(() => {
    let timers = [];

    const refreshMap = () => {
      map.invalidateSize({ pan: false });
    };

    // Refresh after map initially renders
    timers.push(setTimeout(refreshMap, 300));
    timers.push(setTimeout(refreshMap, 1000));
    timers.push(setTimeout(refreshMap, 2000));

    // Refresh when browser window resizes
    window.addEventListener("resize", refreshMap);

    // Refresh when browser tab becomes visible
    document.addEventListener("visibilitychange", refreshMap);

    // Watch map container size changes
    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        refreshMap();
      });

      resizeObserver.observe(map.getContainer());
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", refreshMap);
      document.removeEventListener("visibilitychange", refreshMap);
      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
}

// Move map when a bus or stop is selected
function MapController({ selectedBus, selectedStop }) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop) {
      const stop = stopLocations.find(
        (item) => item.name === selectedStop
      );

      if (stop) {
        map.flyTo(stop.position, 16, { duration: 1 });
      }

      return;
    }

    if (selectedBus) {
      const route = busRouteCoordinates[selectedBus.id];

      if (route && route.length > 1) {
        map.flyToBounds(route, {
          padding: [55, 55],
          maxZoom: 15,
          duration: 1,
        });
      }
    }
  }, [selectedBus, selectedStop, map]);

  return null;
}

// Main Bus Map
export default function BusMap({
  buses = [],
  userLocation,
  selectedBus,
  selectedStop,
  onSelectBus,
}) {
  const [busPositions, setBusPositions] = useState({});

  // Simulate moving buses
  useEffect(() => {
    const updatePositions = () => {
      const positions = {};

      buses.forEach((bus) => {
        const route = busRouteCoordinates[bus.id];

        if (!route || route.length < 2) return;

        const progress =
          (bus.progress + Date.now() / 5000) % 100;

        const segmentCount = route.length - 1;
        const scaledProgress = (progress / 100) * segmentCount;

        const segmentIndex = Math.min(
          Math.floor(scaledProgress),
          segmentCount - 1
        );

        const localProgress = scaledProgress - segmentIndex;

        const start = route[segmentIndex];
        const end = route[segmentIndex + 1];

        positions[bus.id] = {
          position: [
            start[0] + (end[0] - start[0]) * localProgress,
            start[1] + (end[1] - start[1]) * localProgress,
          ],
        };
      });

      setBusPositions(positions);
    };

    updatePositions();

    const interval = setInterval(updatePositions, 1500);

    return () => clearInterval(interval);
  }, [buses]);

  const routeStopNames = selectedBus
    ? selectedBus.route || []
    : stopLocations.map((stop) => stop.name);

  const visibleStops = stopLocations.filter((stop) =>
    routeStopNames.includes(stop.name)
  );

  return (
    <div className="map-container">
      <MapContainer
        center={demoCenter}
        zoom={13}
        minZoom={11}
        maxZoom={18}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "440px",
        }}
      >
        <MapFix />

        <MapController
          selectedBus={selectedBus}
          selectedStop={selectedStop}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle={true}
          keepBuffer={4}
        />

        {/* Bus routes */}
        {buses.map((bus) => {
          const route = busRouteCoordinates[bus.id];

          if (!route) return null;

          const isSelected = selectedBus?.id === bus.id;

          return (
            <Polyline
              key={`route-${bus.id}`}
              positions={route}
              pathOptions={{
                color: bus.color,
                weight: isSelected ? 7 : selectedBus ? 2 : 4,
                opacity: isSelected ? 1 : selectedBus ? 0.2 : 0.65,
              }}
            />
          );
        })}

        {/* Bus stops */}
        {visibleStops.map((stop, index) => {
          const isSelectedStop = selectedStop === stop.name;

          return (
            <Marker
              key={stop.name}
              position={stop.position}
              icon={isSelectedStop ? selectedStopIcon : stopIcon}
            >
              <Popup>
                <strong>{stop.name}</strong>
                <p>Bus stop {index + 1}</p>
              </Popup>
            </Marker>
          );
        })}

        {/* Moving buses */}
        {buses.map((bus) => {
          const currentPosition = busPositions[bus.id]?.position;

          if (!currentPosition) return null;

          const isSelected = selectedBus?.id === bus.id;

          return (
            <Marker
              key={bus.id}
              position={currentPosition}
              icon={busIcon(bus.color, bus.number, isSelected)}
              eventHandlers={{
                click: () => onSelectBus?.(bus),
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong>Bus {bus.number} — {bus.name}</strong>
                  <p>Next stop: {bus.nextStop}</p>
                  <p>ETA: {bus.eta} min</p>
                  <p>Status: {bus.status}</p>
                  <p>Speed: {bus.speed} km/h</p>
                  <small>Simulated demo location</small>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Passenger location */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Popup>Your current location</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
