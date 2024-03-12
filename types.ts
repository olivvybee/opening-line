export interface MovieData {
  id: number;
  name: string;
  year: number;
  processed: boolean;
}

export interface Entry {
  openingLine: string;
  movie: string;
  year: number;
  url: string;
}
