import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLng } from "leaflet";
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

let statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";
let inventoryOfCoins: Coin[] = [];

const currentPosition = playerMarker.getLatLng();
const geoSnapShots = new Map<string, string>();
let board = new Board(config.tileDegrees, config.neighborhoodSize);
const pits = new Map<string, leaflet.Layer>();

save("intialState");

// update status panel and inventory with geocache
function makeGeocache(cell: Cell): leaflet.Layer | undefined {
  const geoCell = [cell.i, cell.j].toString();
  const bounds = board.getCellBounds(cell);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  const geoCache = new Geocache(cell, inventoryOfCoins, statusPanel);

  pit.bindPopup(() => {
    
    // if (geoSnapShots.has(geoCell)) {
    //   if (pits.has(geoCell)) pit.removeFrom(map);
    //   const momento = geoSnapShots.get(geoCell)!;
    //   geoCache.fromMomento(momento);

    // }

    const output = geoCache.setupPit();
    if (output) {
      inventoryOfCoins = output.inventoryOfCoins as Coin[];
      statusPanel = output.statusPanel;
    }
    const momento = geoCache.toMomento();
    geoSnapShots.set(geoCell, momento);
    return output.container;
  });

  pit.addTo(map);
  pits.set(geoCell, pit);
  const momento = geoCache.toMomento();
  geoSnapShots.set(geoCell, momento);
  return pit;
}

generateCacheLocations(currentPosition);

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

const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", reset);

function reset() {
  const answer = window.prompt("Reset Progress?")?.toLowerCase().trim();
  if (answer === "no") return;
  else if (answer === "yes") {
    pits.forEach((pit) => map.removeLayer(pit));
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
  };

  localStorage.setItem(stateName, JSON.stringify(gameState));
}

const loadButton = document.querySelector("#load")!;
loadButton.addEventListener("click", () => {
  load("saveState");
});

function load(stateName: string) {
  const savedGameState = localStorage.getItem(stateName);
  if (savedGameState) {
    const gameState = JSON.parse(savedGameState) as SaveState;
    statusPanel.innerHTML = gameState.statusPanel;
    inventoryOfCoins = gameState.inventoryOfCoins;
    geoSnapShots.clear();
    gameState.geoSnapShots.forEach(([key, value]) => {
      geoSnapShots.set(key, value);
    });

    playerMarker.setLatLng(gameState.currentPosition);
    map.setView(gameState.currentPosition);
    const pos = new LatLng(
      gameState.currentPosition.lat,
      gameState.currentPosition.lng
    );

    generateCacheLocations(pos);
  }
}
