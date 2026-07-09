// localpulse/app/src/hooks/usePlaceSearch.js
//
// Debounced place search against our own /geocode endpoint (server-side
// Nominatim). Shared by LocationPickerScreen and the location step of
// OnboardingScreen. Debounced to stay well inside the 1 req/sec policy.
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client.js';

const DEBOUNCE_MS = 220;

export function usePlaceSearch(query) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0); // guards against out-of-order responses

  const search = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); setSearching(false); return; }
    const mySeq = ++seq.current;
    setSearching(true);
    try {
      const data = await api.searchPlaces(trimmed);
      // A slower request for an earlier prefix must not clobber newer results.
      if (mySeq !== seq.current) return;
      setResults(data.results ?? []);
    } catch (e) {
      if (mySeq === seq.current) setResults([]);
    } finally {
      if (mySeq === seq.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => timer.current && clearTimeout(timer.current);
  }, [query, search]);

  return { results, searching };
}