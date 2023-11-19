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
  private inventoryOfCoins: Coin[];
  private statusPanel: HTMLDivElement;

  constructor(cell: Cell, inventoryOfCoins: Coin[], statusPanel: HTMLDivElement) {
    this.cell = cell;
    this.container = document.createElement("div")!;
    this.container.id = "geocache-container";

    // Create the description element
    const description = document.createElement("div")!;
    description.id = "description";
    const span = document.createElement("span")!;
    span.id = "value";
    description.innerHTML = `There is a pit here at "${cell.i},${cell.j}". It has value `;
    description.appendChild(span);
    this.container.appendChild(description);

    // Create the coins element
    const coinsContainer = document.createElement("div")!;
    coinsContainer.style.height = "100px";
    coinsContainer.style.overflowY = "scroll";
    coinsContainer.id = "coins";
    this.container.appendChild(coinsContainer);

    const pokeButton = document.createElement("button")!;
    pokeButton.id = "poke";
    pokeButton.innerText = "poke";
    const pullButton = document.createElement("button")!;
    pullButton.id = "pull";
    pullButton.innerText = "pull";
    this.container.appendChild(pokeButton);
    this.container.appendChild(pullButton);

    this.generateCoins();
    // this.updateDescription();

    const pull = this.container.querySelector<HTMLButtonElement>("#pull")!;
    pull.addEventListener("click", () => {
      return this.handlePull();
    });

    const poke = this.container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      return this.handlePoke();
    });

    this.inventoryOfCoins = inventoryOfCoins;
    this.statusPanel = statusPanel;

    return;
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
      container: this.container,
    };
    return JSON.stringify(snapshot);
  }

  fromMomento(momento: string): void {
    const state: Geocache = JSON.parse(momento) as Geocache;
    this.coins = state.coins.map((coin: Coin) => ({ ...coin }));
    this.container = state.container;
  }

  setupPit() {
    return {
      container: this.container,
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
  }

  private handlePoke() {
    if (!this.coins.length) return undefined;
    const cachedCoin: Coin = this.coins.shift()!;
    this.updateDescription();
    this.coins.length.toString();
    this.inventoryOfCoins.push(cachedCoin);
    this.statusPanel.innerHTML = `${this.inventoryOfCoins.length} points accumulated`;
    return;
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
}
