import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLng, Polyline } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board";
import { Geocache } from "./geoCache";

interface Coin {
  cell: Cell;
  serial: number;
}

interface SaveState {
  statusPanel: string;
  inventoryOfCoins: Coin[];
  currentPosition: { lat: number; lng: number };
  geoSnapShots: [string, string][];
  pathWayHistory: string; // Change the type to [number, number][]
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
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
let inventoryOfCoins: Coin[] = [];

const currentPosition: LatLng = playerMarker.getLatLng();
const geoSnapShots = new Map<string, string>();
let board = new Board(config.tileDegrees, config.neighborhoodSize);
const popUps = new Map<string, leaflet.Layer>();
const pathWayHistory: LatLng[] = [];
const pathWayHistoryLine = new Polyline(pathWayHistory, { color: "red" }).addTo(
  map
);

// update status panel and inventory with geocache
function makeGeocache(cell: Cell) {
  const geoCell = [cell.i, cell.j].toString();
  const bounds = board.getCellBounds(cell);

  const updateGeoSnapshot = (geoCell: string, geoSnapshot: string) => {
    geoSnapShots.set(geoCell, geoSnapshot);
  };

  const geoCache = new Geocache(
    cell,
    inventoryOfCoins,
    statusPanel,
    updateGeoSnapshot
  );
  if (popUps.has(geoCell)) {
    const momento = geoSnapShots.get(geoCell)!;
    geoCache.fromMomento(momento);
    const update = geoCache.toMomento();
    geoSnapShots.set(geoCell, update);
    return;
  }
  const popUp = geoCache.createPopUp(bounds, map);
  popUps.set(geoCell, popUp);
  const momento = geoCache.toMomento();
  geoSnapShots.set(geoCell, momento);
  return;
}

generateCacheLocations(currentPosition);
save("intialState");

function generateCacheLocations(position: leaflet.LatLng) {
  for (const cell of board.getCellsNearPoint(position)) {
    if (luck([cell.i, cell.j].toString()) < config.pitSpawnProbability) {
      makeGeocache(cell);
    }
  }
}

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
  pathWayHistory.push(leaflet.latLng(position.lat, position.lng));
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

  pathWayHistory.push(leaflet.latLng(position.lat, position.lng));
  pathWayHistoryLine.setLatLngs([...pathWayHistory]);

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

const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", reset);

function reset() {
  const answer = window.prompt("Reset Progress?")?.toLowerCase().trim();
  if (answer === "no") return;
  else if (answer === "yes") {
    popUps.forEach((pit) => map.removeLayer(pit));
    board = new Board(config.tileDegrees, config.neighborhoodSize);
    load("intialState");
    localStorage.removeItem("saveState");
  }
}

const saveButton = document.querySelector("#save")!;
saveButton.addEventListener("click", () => {
  save("saveState");
});

function save(stateName: string) {
  const gameState: SaveState = {
    statusPanel: statusPanel.innerHTML,
    inventoryOfCoins: inventoryOfCoins,
    currentPosition: {
      lat: currentPosition.lat,
      lng: currentPosition.lng,
    },
    geoSnapShots: [...geoSnapShots],
    pathWayHistory: JSON.stringify(pathWayHistory),
  };

  localStorage.setItem(stateName, JSON.stringify(gameState));
}

const loadButton = document.querySelector("#load")!;
loadButton.addEventListener("click", () => {
  load("saveState");
});

function load(stateName: string) {
  const savedGameState = localStorage.getItem(stateName);

  if (!savedGameState) {
    return;
  }

  const gameState = JSON.parse(savedGameState) as SaveState;
  const updateGeoSnapshot = (geoCell: string, geoSnapshot: string) => {
    geoSnapShots.set(geoCell, geoSnapshot);
  };

  statusPanel.innerHTML = gameState.statusPanel;
  inventoryOfCoins = gameState.inventoryOfCoins;
  geoSnapShots.clear();

  gameState.geoSnapShots.forEach(([key, value]) => {
    const cellCoordinates = key.split(",").map(Number);
    const cell: Cell = { i: cellCoordinates[0], j: cellCoordinates[1] };
    const bounds = board.getCellBounds(cell);

    const geoCache = new Geocache(
      cell,
      inventoryOfCoins,
      statusPanel,
      updateGeoSnapshot
    );

    geoCache.fromMomento(value);

    if (popUps.has(key)) {
      const popUp = popUps.get(key)!;
      popUp.removeFrom(map);
    }

    const popUp = geoCache.createPopUp(bounds, map);
    popUps.set(key, popUp);
  });

  playerMarker.setLatLng(gameState.currentPosition);
  map.setView(gameState.currentPosition);

  // Update the pathWayHistory and pathWayHistoryLine
  const loadedPathWayHistory = JSON.parse(gameState.pathWayHistory) as LatLng[];
  pathWayHistory.length = 0;
  pathWayHistory.push(...loadedPathWayHistory);
  pathWayHistoryLine.setLatLngs([...loadedPathWayHistory]);
}
