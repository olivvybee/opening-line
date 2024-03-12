import { config as loadEnv } from 'dotenv';
import SrtParser, { Line } from 'srt-parser-2';
import inquirer from 'inquirer';

import { Entry, MovieData } from './types';
import {
  addEntry,
  loadMovieData,
  pickRandom,
  saveMovieData,
} from './scriptHelpers';

const OPEN_SUBTITLES_BASE_URL = 'https://api.opensubtitles.com/api/v1';
const TMDB_URL = 'https://www.themoviedb.org/movie';

interface OpenSubtitlesFile {
  file_id: number;
  cd_number: number;
  file_name: string;
}

interface OpenSubtitlesSubtitles {
  id: string;
  attributes: {
    files: OpenSubtitlesFile[];
  };
}

interface OpenSubtitlesSubtitlesResponse {
  total_pages: number;
  total_count: number;
  page: number;
  per_page: number;
  data: OpenSubtitlesSubtitles[];
}

interface OpenSubtitlesDownloadResponse {
  link: string;
  file_name: string;
}

const getUnprocessedMovie = (data: MovieData[]) => {
  const unprocessedMovies = data.filter((movie) => !movie.processed);
  return pickRandom(unprocessedMovies);
};

const markMovieAsProcessed = (data: MovieData[], movie: MovieData) => {
  movie.processed = true;

  const newData = data.filter((savedMovie) => savedMovie.id !== movie.id);
  newData.push(movie);

  saveMovieData(newData);
};

const getOpenSubtitlesHeaders = () => {
  loadEnv();

  const apiKey = process.env.OPEN_SUBTITLES_API_KEY;
  if (!apiKey) {
    throw new Error('OPEN_SUBTITLES_API_KEY is not set. Check your .env file.');
  }

  return {
    'Api-Key': apiKey,
    'User-Agent': 'Opening Line v1.0',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
};

const getSubtitleFileId = async (tmdbId: number) => {
  const query = new URLSearchParams({
    tmdb_id: tmdbId.toString(),
    languages: 'en',
    foreign_parts_only: 'exclude',
    trusted_sources: 'only',
    order_by: 'download_count',
    order_direction: 'desc',
  });
  const url = `${OPEN_SUBTITLES_BASE_URL}/subtitles?${query.toString()}`;

  const headers = getOpenSubtitlesHeaders();

  const response = await fetch(url, { headers });
  const json = (await response.json()) as OpenSubtitlesSubtitlesResponse;

  return json.data[0]?.attributes.files[0]?.file_id;
};

const downloadSubtitles = async (fileId: number): Promise<Line[]> => {
  const body = JSON.stringify({
    file_id: fileId.toString(),
  });
  const headers = getOpenSubtitlesHeaders();

  const url = `${OPEN_SUBTITLES_BASE_URL}/download`;

  const response = await fetch(url, { method: 'POST', headers, body });
  const json = (await response.json()) as OpenSubtitlesDownloadResponse;

  const downloadResponse = await fetch(json.link);
  const contents = await downloadResponse.text();

  const parser = new SrtParser();
  return parser.fromSrt(contents);
};

const getOpeningLine = async (subtitles: Line[]) => {
  const choices = subtitles
    .slice(0, 15)
    .map((line) => line.text)
    .map((text) => text.replace(/\n/g, ' ').replace(/<\w>/g, ''));

  const { lines } = await inquirer.prompt([
    {
      name: 'lines',
      message: 'Choose one or more lines:',
      type: 'checkbox',
      choices: [...choices, '(Skip movie)'],
      loop: false,
    },
  ]);

  if (lines === '(Skip movie)') {
    return null;
  }

  return lines.join(' ');
};

const createEntry = (movie: MovieData, openingLine: string) => {
  const entry: Entry = {
    movie: movie.name,
    year: movie.year,
    openingLine,
    url: `${TMDB_URL}/${movie.id}`,
  };

  addEntry(entry);
};

const run = async () => {
  const data = loadMovieData();
  const movie = getUnprocessedMovie(data);

  console.log(`Fetching subtitles for ${movie.name} (${movie.year})...`);

  const subtitleFileId = await getSubtitleFileId(movie.id);
  if (!subtitleFileId) {
    throw new Error('No subtitles found for movie');
  }

  const subtitles = await downloadSubtitles(subtitleFileId);
  if (!subtitles || !subtitles.length) {
    throw new Error('Failed to download subtitles');
  }

  const openingLine = await getOpeningLine(subtitles);
  if (openingLine) {
    createEntry(movie, openingLine);
    markMovieAsProcessed(data, movie);
  } else if (openingLine === null) {
    markMovieAsProcessed(data, movie);
  }
};

run();
