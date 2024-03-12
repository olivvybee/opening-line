import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';
import { config as loadEnv } from 'dotenv';

const TMDB_API_URL = 'https://api.themoviedb.org/3/discover/movie';

interface TMDBMovie {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

interface TMDBResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface MovieData {
  id: number;
  name: string;
  year: number;
  processed: boolean;
}

const getReleaseYear = async () => {
  const thisYear = new Date().getFullYear();

  while (true) {
    const { year } = await inquirer.prompt([
      {
        name: 'year',
        message: 'Choose a release year:',
        type: 'number',
      },
    ]);

    if (isNaN(year) || year < 1900 || year > thisYear) {
      console.error(`Year must be a number between 1900 and ${thisYear}.`);
    } else {
      return year;
    }
  }
};

const makeRequest = async (year: number, page: number = 1) => {
  const API_KEY = process.env.TMDB_API_KEY;
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set. Check your .env file.');
  }

  const query = new URLSearchParams({
    api_key: API_KEY,
    primary_release_year: year.toString(),
    page: page.toString(),
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    'vote_count.gte': '500',
  });

  const response = await fetch(`${TMDB_API_URL}?${query.toString()}`);
  const json = (await response.json()) as TMDBResponse;
  return json;
};

const getMoviesFromReleaseYear = async (year: number): Promise<MovieData[]> => {
  const intialResponse = await makeRequest(year);
  const movies = intialResponse.results;

  const pages = intialResponse.total_pages;

  for (let page = 2; page <= pages; page++) {
    const pageResponse = await makeRequest(year, page);
    movies.push(...pageResponse.results);
  }

  return movies.map((movie) => ({
    id: movie.id,
    name: movie.title,
    year,
    processed: false,
  }));
};

const saveNewMovies = (movies: MovieData[]) => {
  const filepath = path.resolve('.', 'movies.json');
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, '[]');
  }

  const contents = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(contents) as MovieData[];

  const existingIds = data.map((movie) => movie.id);
  const newMovies = movies.filter((movie) => !existingIds.includes(movie.id));

  newMovies.forEach((movie) => {
    data.push(movie);
  });

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
};

const run = async () => {
  loadEnv();
  const releaseYear = await getReleaseYear();
  const movies = await getMoviesFromReleaseYear(releaseYear);
  saveNewMovies(movies);
};

run();
