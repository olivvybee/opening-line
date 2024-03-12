import path from 'path';
import fs from 'fs';

import { Entry, MovieData } from './types';

const getMoviesPath = () => path.resolve('.', 'movies.json');

export const loadMovieData = () => {
  const path = getMoviesPath();

  if (!fs.existsSync(path)) {
    return [];
  }

  const content = fs.readFileSync(path, 'utf-8');
  return JSON.parse(content) as MovieData[];
};

export const saveMovieData = (data: MovieData[]) => {
  const path = getMoviesPath();
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(path, content);
};

export const getEntriesPath = () => path.resolve('.', 'entries.json');

export const addEntry = (entry: Entry) => {
  const path = getEntriesPath();
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '[]');
  }

  const content = fs.readFileSync(path, 'utf-8');
  const entries = JSON.parse(content) as Entry[];

  entries.push(entry);

  const newContent = JSON.stringify(entries, null, 2);
  fs.writeFileSync(path, newContent);
};

export const pickRandom = <T>(array: Array<T>): T => {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
};
