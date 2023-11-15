import leaflet from "leaflet";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell> = new Map<string, Cell>();

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) this.knownCells.set(key, cell);
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const lat = Math.round(point.lat / this.tileWidth);
    const lng = Math.round(point.lng / this.tileWidth);

    return this.getCanonicalCell({ i: lat, j: lng });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const lat = cell.i * this.tileWidth;
    const lng = cell.j * this.tileWidth;
    const corner1 = leaflet.latLng(lat, lng);
    const corner2 = leaflet.latLng(lat + this.tileWidth, lng + this.tileWidth);
    return leaflet.latLngBounds(corner1, corner2);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    this.knownCells.clear();
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        const newLat = point.lat + i * this.tileWidth;
        const newLng = point.lng + j * this.tileWidth;
        const newLatLng = leaflet.latLng(newLat, newLng);
        const cell = this.getCellForPoint(newLatLng);
        resultCells.push(cell);
      }
    }

    return resultCells;
  }
}
