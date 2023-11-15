// geocache.ts
import { Cell } from "./board";
import luck from "./luck";

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

interface Coin {
  cell: Cell;
  serial: number;
}

export class Geocache implements Momento<string> {
  private readonly cell: Cell;
  private  coins: Coin[] = [];
  private description: string;

  constructor(cell: Cell) {
    this.cell = cell;
    let textLines = "";
    const initialValue = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100
    );
    for (let line = 1; line <= initialValue; line++) {
      this.coins.push({ cell: cell, serial: line });
      textLines += `<p> Coin  i:${cell.i}  j:${cell.j} serial:${line}</p>`;
    }
    this.description = `
      <div id="description">There is a pit here at "${cell.i},${cell.j}". It has value <span id="value">${initialValue}</span>.</div>
      <div style="height: 100px; overflow-y: scroll;" id="coins">
        <p>Coins:</p>
        ${textLines}
      </div>
      <button id="poke">poke</button> 
      <button id="pull">pull</button> 
    `;

    return;
  }

  toMomento(): string {
    const snapshot = {
      coins: [...this.coins],
      description:this.description,
    };
    return JSON.stringify(snapshot);
  }

  fromMomento(momento: string): void {
    const state: Geocache = JSON.parse(momento) as Geocache;
    this.coins = state.coins.map((coin: Coin) => ({ ...coin }));
    this.description = state.description;
  }

  setupPit(
    statusPanel: HTMLElement,
    inventoryOfCoins: Coin[]
  ) {
    const container = document.createElement("div")!;
    container.innerHTML = this.description;

    container.addEventListener("click", (ev) => { 
      const target = ev.target as HTMLElement;
      if (target.id === "poke")
          this.handlePoke(container, inventoryOfCoins, statusPanel);
      else if (target.id === "pull")
        this.handlePull(container, inventoryOfCoins, statusPanel);
    });
    return container;
  }

  private handlePull(container: HTMLDivElement, inventoryOfCoins: Coin[], statusPanel: HTMLElement) {
    if (!inventoryOfCoins.length) return;
    const cachedCoin = inventoryOfCoins.shift()!;
    statusPanel.innerHTML = `${inventoryOfCoins.length} points accumulated`;
    this.coins.push(cachedCoin);
    this.updateDescription(container);
  }

  private handlePoke(container: HTMLDivElement, inventoryOfCoins: Coin[], statusPanel: HTMLElement) {
    if (!this.coins.length) return;
    const cachedCoin: Coin = this.coins.shift()!;
    this.updateDescription(container);
    this.coins.length.toString();
    inventoryOfCoins.push(cachedCoin);
    statusPanel.innerHTML = `${inventoryOfCoins.length} points accumulated`;
  }

  private updateDescription(container: HTMLElement):void {
    let updatedTextLines = "";
    this.coins.forEach((coin) => {
      updatedTextLines += `<p> Coin  i:${coin.cell.i}  j:${coin.cell.j} serial:${coin.serial}</p>`;
    });
    container.querySelector<HTMLDivElement>(
      "#description"
    )!.innerHTML = `There is a pit here at ${this.cell.i},${this.cell.j}. It has value <span id="value">${this.coins.length}</span>`;
    container.querySelector<HTMLDivElement>("#coins")!.innerHTML = `
    <p>Coins:</p>
        ${updatedTextLines}`;
    return;
  }
}
