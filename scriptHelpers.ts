import path from 'path';
import fs from 'fs';

import { MovieData } from './types';

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
