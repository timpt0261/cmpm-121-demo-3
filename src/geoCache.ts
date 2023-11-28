import { LatLngBounds, Layer, Map, rectangle } from "leaflet";
import { Cell } from "./board";
import luck from "./luck";

export interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export interface Coin {
  cell: Cell;
  serial: number;
}

export interface GeoCacheOutput {
  inventoryOfCoins: Coin[];
  statusPanel: HTMLElement;
}
export class Geocache implements Momento<string> {
  private readonly cell: Cell;
  private coins: Coin[] = [];
  private container: HTMLDivElement;
  private description = document.createElement("div")!;
  private coinsContainer = document.createElement("div")!;
  private inventoryOfCoins: Coin[];
  private statusPanel: HTMLDivElement;
  private updateGeoSnapshot: (geoCell: string, geoSnapshot: string) => void;

  constructor(
    cell: Cell,
    inventoryOfCoins: Coin[],
    statusPanel: HTMLDivElement,
    updateGeoSnapshot: (geoCell: string, geoSnapshot: string) => void
  ) {
    this.cell = cell;
    this.updateGeoSnapshot = updateGeoSnapshot;
    this.container = document.createElement("div")!;
    this.container.id = "geocache-container";

    // Create the description element
    this.description = document.createElement("div")!;
    this.description.id = "description";
    const span = document.createElement("span")!;
    span.id = "value";
    this.description.innerHTML = `There is a pit here at "${cell.i},${cell.j}". It has value `;
    this.description.appendChild(span);
    this.container.appendChild(this.description);

    // Create the coins element
    this.coinsContainer.style.height = "100px";
    this.coinsContainer.style.overflowY = "scroll";
    this.coinsContainer.id = "coins";
    this.container.appendChild(this.coinsContainer);

    this.createPokeAndPull();
    this.generateCoins();
    this.createPullandPush();
    this.inventoryOfCoins = inventoryOfCoins;
    this.statusPanel = statusPanel;

    return;
  }

  private createPokeAndPull() {
    const pokeButton = document.createElement("button")!;
    pokeButton.id = "poke";
    pokeButton.innerText = "poke";

    const pullButton = document.createElement("button")!;
    pullButton.id = "pull";
    pullButton.innerText = "pull";
    this.container.appendChild(pokeButton);
    this.container.appendChild(pullButton);
  }

  private generateCoins(): void {
    let textLines = "";
    const initialValue = Math.floor(
      luck([this.cell.i, this.cell.j, "initialValue"].toString()) * 100
    );
    for (let line = 1; line <= initialValue; line++) {
      this.coins.push({ cell: this.cell, serial: line });
      textLines += `<p> Coin  i:${this.cell.i}  j:${this.cell.j} serial:${line}</p>`;
    }

    const coinsContainer =
      this.container.querySelector<HTMLDivElement>("#coins")!;
    coinsContainer.innerHTML = textLines;
  }

  toMomento(): string {
    const snapshot = {
      coins: [...this.coins],
      container: this.container.innerHTML,
    };
    return JSON.stringify(snapshot);
  }

  fromMomento(momento: string): void {
    const state = JSON.parse(momento) as { coins: Coin[]; container: string };
    // Clear existing coins and update with the saved state
    this.coins = state.coins;

    // Update the container's inner HTML with the saved state
    this.container.innerHTML = state.container;

    // Reattach event listeners for poke and pull buttons
    this.createPullandPush();
  }

  private createPullandPush() {
    const pull = this.container.querySelector<HTMLButtonElement>("#pull")!;
    pull.addEventListener("click", () => {
      return this.handlePull();
    });

    const poke = this.container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      return this.handlePoke();
    });
  }

  updateGlobals() {
    this.updateDescription();
    return {
      inventoryOfCoins: this.inventoryOfCoins,
      statusPanel: this.statusPanel,
    };
  }

  private handlePull() {
    if (!this.inventoryOfCoins.length) return undefined;
    const cachedCoin = this.inventoryOfCoins.shift()!;
    this.statusPanel.innerHTML = `${this.inventoryOfCoins.length} points accumulated`;
    this.coins.push(cachedCoin);
    this.updateDescription();
    const geoSnapshot = this.toMomento();
    this.updateGeoSnapshot([this.cell.i, this.cell.j].toString(), geoSnapshot);

    return geoSnapshot;
  }

  private handlePoke() {
    if (!this.coins.length) return undefined;
    const cachedCoin: Coin = this.coins.shift()!;
    this.updateDescription();
    this.coins.length.toString();
    this.inventoryOfCoins.push(cachedCoin);
    this.statusPanel.innerHTML = `${this.inventoryOfCoins.length} points accumulated`;
    const geoSnapshot = this.toMomento();
    this.updateGeoSnapshot([this.cell.i, this.cell.j].toString(), geoSnapshot);

    return geoSnapshot;
  }

  private updateDescription(): void {
    const description =
      this.container.querySelector<HTMLDivElement>("#description")!;
    const valueSpan = description.querySelector<HTMLSpanElement>("#value")!;
    valueSpan.innerText = this.coins.length.toString();

    const coinsContainer =
      this.container.querySelector<HTMLDivElement>("#coins")!;
    let updatedTextLines = "";
    this.coins.forEach((coin) => {
      updatedTextLines += `<p> Coin  i:${coin.cell.i}  j:${coin.cell.j} serial:${coin.serial}</p>`;
    });
    coinsContainer.innerHTML = updatedTextLines;
  }

  public createPopUp(bounds: LatLngBounds, map: Map) {
    const popUp = rectangle(bounds) as Layer;
    popUp.bindPopup(this.container);
    popUp.addTo(map);
    return popUp;
  }
}
