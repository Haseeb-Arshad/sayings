'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import debounce from 'lodash.debounce';

import axios from '../utils/axiosInstance';

import styles from '../styles/SearchPage.module.css';

function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenizeQuery(q) {
  return Array.from(
    new Set(
      String(q)
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length > 1)
    )
  );
}

function HighlightedText({ text, query }) {
  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  if (!text) return null;
  if (tokens.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const tokenSet = new Set(tokens);

  return (
    <>
      {String(text)
        .split(regex)
        .filter((p) => p.length > 0)
        .map((part, idx) => {
          const isMatch = tokenSet.has(part.toLowerCase());
          return isMatch ? (
            <mark key={idx} className={styles.mark}>
              {part}
            </mark>
          ) : (
            <span key={idx}>{part}</span>
          );
        })}
    </>
  );
}

function pushHistory(nextQuery) {
  if (typeof window === 'undefined') return;
  const q = String(nextQuery || '').trim();
  if (!q) return;

  try {
    const raw = window.localStorage.getItem('searchHistory');
    const parsed = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(parsed) ? parsed : [];
    const next = [q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    window.localStorage.setItem('searchHistory', JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');

  const [topic, setTopic] = useState('');
  const [emotion, setEmotion] = useState('');
  const [creator, setCreator] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [results, setResults] = useState({ posts: [], users: [], topics: [] });
  const [queryId, setQueryId] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hydratedParamsKey = useMemo(() => params.toString(), [params]);

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    setSort(params.get('sort') || 'relevance');
    setTopic(params.get('topic') || '');
    setEmotion(params.get('emotion') || '');
    setCreator(params.get('creator') || '');
    setFrom(params.get('from') || '');
    setTo(params.get('to') || '');
  }, [hydratedParamsKey]);

  const fetchResults = useCallback(
    async ({ q, cursor, append }) => {
      const trimmed = String(q || '').trim();
      if (!trimmed) {
        setResults({ posts: [], users: [], topics: [] });
        setNextCursor(null);
        setQueryId(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const res = await axios.get('/search', {
          params: {
            q: trimmed,
            sort,
            ...(topic ? { topic } : {}),
            ...(emotion ? { emotion } : {}),
            ...(creator ? { creator } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            ...(cursor ? { cursor } : {}),
            limit: 20,
          },
        });

        const next = res.data.results || { posts: [], users: [], topics: [] };

        setQueryId(res.data.queryId || null);
        setNextCursor(res.data.nextCursor || null);

        setResults((prev) => {
          if (!append) return next;
          return {
            posts: [...(prev.posts || []), ...(next.posts || [])],
            users: next.users || [],
            topics: next.topics || [],
          };
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to search.');
      } finally {
        setLoading(false);
      }
    },
    [sort, topic, emotion, creator, from, to]
  );

  const debouncedFetch = useMemo(() => debounce((q) => fetchResults({ q, cursor: null, append: false }), 250), [fetchResults]);

  useEffect(() => {
    debouncedFetch(query);
    return () => debouncedFetch.cancel();
  }, [query, debouncedFetch]);

  const updateUrl = (overrides = {}) => {
    const next = new URLSearchParams();
    const q = overrides.q ?? query;

    if (q) next.set('q', q);
    if (sort) next.set('sort', sort);
    if (topic) next.set('topic', topic);
    if (emotion) next.set('emotion', emotion);
    if (creator) next.set('creator', creator);
    if (from) next.set('from', from);
    if (to) next.set('to', to);

    router.push(`/search?${next.toString()}`);
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (topic) chips.push({ key: 'topic', label: `Topic: ${topic}` });
    if (emotion) chips.push({ key: 'emotion', label: `Emotion: ${emotion}` });
    if (creator) chips.push({ key: 'creator', label: `Creator: @${creator}` });
    if (from) chips.push({ key: 'from', label: `From: ${from}` });
    if (to) chips.push({ key: 'to', label: `To: ${to}` });
    return chips;
  }, [topic, emotion, creator, from, to]);

  const clearChip = (key) => {
    if (key === 'topic') setTopic('');
    if (key === 'emotion') setEmotion('');
    if (key === 'creator') setCreator('');
    if (key === 'from') setFrom('');
    if (key === 'to') setTo('');
  };

  const trackClick = async ({ targetType, targetId, position }) => {
    if (!queryId) return;
    try {
      await axios.post(
        '/search/analytics/click',
        { queryId, targetType, targetId, position },
        { silent: true }
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.page}>


      <div className={styles.container}>
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            onBlur={() => {
              const q = String(query || '').trim();
              if (q) pushHistory(q);
              updateUrl({ q });
            }}
          />

          <div className={styles.controls}>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={styles.select}>
              <option value="relevance">Relevance</option>
              <option value="recent">Recent</option>
            </select>

            <button type="button" className={styles.applyButton} onClick={() => updateUrl()}>
              Apply
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <label>
            <span>Topic</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label>
            <span>Emotion</span>
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              <option value="">Any</option>
              <option value="POSITIVE">POSITIVE</option>
              <option value="NEGATIVE">NEGATIVE</option>
              <option value="NEUTRAL">NEUTRAL</option>
            </select>
          </label>
          <label>
            <span>Creator</span>
            <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="username" />
          </label>
          <label>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {activeChips.length > 0 && (
          <div className={styles.chips}>
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className={styles.chip} onClick={() => clearChip(chip.key)}>
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2>Posts</h2>
          {results.posts.length === 0 && !loading ? (
            <div className={styles.muted}>No posts found.</div>
          ) : (
            <ul className={styles.list}>
              {results.posts.map((p, idx) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={styles.resultRow}
                    onClick={async () => {
                      await trackClick({ targetType: 'post', targetId: p.id, position: idx });
                      router.push(`/post/${p.id}`);
                    }}
                  >
                    <div className={styles.resultTitle}>
                      <HighlightedText text={p.title || p.user?.username || 'Post'} query={query} />
                      {p.user?.username && <span className={styles.by}> by @{p.user.username}</span>}
                    </div>
                    <div className={styles.resultSubtitle}>
                      <HighlightedText text={p.snippet || ''} query={query} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nextCursor && (
            <button
              type="button"
              className={styles.loadMore}
              disabled={loading}
              onClick={() => fetchResults({ q: query, cursor: nextCursor, append: true })}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>

        <div className={styles.section}>
          <h2>Creators</h2>
          {results.users.length === 0 && !loading ? (
            <div className={styles.muted}>No creators found.</div>
          ) : (
            <ul className={styles.list}>
              {results.users.map((u, idx) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className={styles.resultRow}
                    onClick={async () => {
                      await trackClick({ targetType: 'user', targetId: u.id, position: idx });
                      router.push(`/${u.username}`);
                    }}
                  >
                    <div className={styles.resultTitle}>
                      <HighlightedText text={`@${u.username}`} query={query} />
                    </div>
                    {u.bio && <div className={styles.resultSubtitle}><HighlightedText text={u.bio} query={query} /></div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.section}>
          <h2>Topics</h2>
          {results.topics.length === 0 && !loading ? (
            <div className={styles.muted}>No topics found.</div>
          ) : (
            <div className={styles.topics}>
              {results.topics.map((t) => (
                <button
                  key={t.id || t.name}
                  type="button"
                  className={styles.topicPill}
                  onClick={() => {
                    setTopic(t.name);
                    updateUrl();
                  }}
                >
                  #<HighlightedText text={t.name} query={query} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
