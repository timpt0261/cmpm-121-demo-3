import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board";
import { Geocache } from "./geoCache";

interface Coin {
  cell: Cell;
  serial: number;
}

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const config = {
  gamePlayZoomLevel: 19,
  tileDegrees: 1e-4,
  neighborhoodSize: 8,
  pitSpawnProbability: 0.1,
};

const mapContainer = document.querySelector<HTMLElement>("#map")!;
if (!mapContainer) {
  console.error("Map Container not found");
}
const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: config.gamePlayZoomLevel,
  minZoom: config.gamePlayZoomLevel,
  maxZoom: config.gamePlayZoomLevel,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    const localPostion = leaflet.latLng(
      position.coords.latitude,
      position.coords.longitude
    );
    generateCacheLocations(localPostion);
    playerMarker.setLatLng(localPostion);
    map.setView(playerMarker.getLatLng());
  });
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";
const inventoryOfCoins: Coin[] = [];

// modify to include current coins in inventory
const currentPosition = playerMarker.getLatLng();
const geoSnapShots = new Map<string, string>();
const board = new Board(config.tileDegrees, config.neighborhoodSize);

function makeGeocache(cell: Cell): leaflet.Layer | undefined {
  const geoCell = [cell.i, cell.j].toString();
  if (cell.i === 369988 && cell.j === -1220536) {
    const to = geoSnapShots.has(geoCell)!;
    console.log(to);
  }
  let geoCache: Geocache;
  if (geoSnapShots.has(geoCell)) {
    console.log("Cell already exists in geo shot");
    const momento = geoSnapShots.get(geoCell)!;
    geoCache = new Geocache({ i: 0, j: 0 });
    geoCache.fromMomento(momento);
    return;
  }

  geoCache = new Geocache(cell);
  const bounds = board.getCellBounds(cell);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(() => {
    return geoCache.setupPit(statusPanel, inventoryOfCoins);
  });

  pit.addTo(map);
  const momento = geoCache.toMomento();

  geoSnapShots.set(geoCell, momento);
  return pit;
}

generateCacheLocations(currentPosition);
console.log("GeoSnapShot :", geoSnapShots);

function generateCacheLocations(position: leaflet.LatLng) {
  for (const cell of board.getCellsNearPoint(position)) {
    if (luck([cell.i, cell.j].toString()) < config.pitSpawnProbability) {
      makeGeocache(cell);
    }
  }
}
console.log("a");

const dir = {
  directions: ["north", "south", "east", "west"],
  directionButtons: Array<HTMLButtonElement>(),
};

function handleButtonClick(
  this: HTMLButtonElement,
  _ev: MouseEvent,
  direction: string
) {
  const position = playerMarker.getLatLng();
  switch (direction) {
    case "north":
      position.lat += config.tileDegrees;
      break;
    case "south":
      position.lat -= config.tileDegrees;
      break;
    case "east":
      position.lng += config.tileDegrees;
      break;
    case "west":
      position.lng -= config.tileDegrees;
      break;
    default:
      console.error("Invalid direction");
  }
  playerMarker.setLatLng(position);
  map.setView(position);
  generateCacheLocations(position);
}

dir.directions.forEach((_dir) => {
  const selector = `#${_dir}`;
  const button: HTMLButtonElement = document.querySelector(selector)!;
  button.addEventListener("click", (ev: MouseEvent) =>
    handleButtonClick.call(button, ev, _dir)
  );
  dir.directionButtons.push(button);
});
