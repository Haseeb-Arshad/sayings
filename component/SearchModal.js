'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';

import axios from '../utils/axiosInstance';
import styles from '../styles/SearchModal.module.css';

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

function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('searchHistory');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushHistory(nextQuery) {
  if (typeof window === 'undefined') return;
  const q = String(nextQuery || '').trim();
  if (!q) return;

  const current = getHistory();
  const next = [q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  window.localStorage.setItem('searchHistory', JSON.stringify(next));
}

export default function SearchModal({ triggerClassName, triggerVariant = 'input' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ posts: [], users: [], topics: [] });
  const [queryId, setQueryId] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [emotion, setEmotion] = useState('');
  const [creator, setCreator] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [history, setHistory] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);

  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    setHistory(getHistory());
  }, [open]);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await axios.get('/search/trending', { params: { limit: 10 }, silent: true });
      setTrendingTopics(res.data.topics || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTrending();
    }
  }, [open, fetchTrending]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = e.key?.toLowerCase?.() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen(true);
      }

      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const onOpenEvent = () => setOpen(true);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('search:open', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('search:open', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setLoading(false);
      setError('');
      setResults({ posts: [], users: [], topics: [] });
      setQueryId(null);
      setNextCursor(null);
      setFiltersOpen(false);
    }
  }, [open]);

  const runTypeahead = useCallback(async (searchTerm) => {
    const q = String(searchTerm || '').trim();
    if (!q) {
      setResults({ posts: [], users: [], topics: [] });
      setQueryId(null);
      setNextCursor(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.get('/search', {
        params: {
          q,
          sort: 'relevance',
          typeahead: true,
          track: false,
          ...(topic ? { topic } : {}),
          ...(emotion ? { emotion } : {}),
          ...(creator ? { creator } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
        silent: true,
      });

      setResults(res.data.results || { posts: [], users: [], topics: [] });
      setQueryId(res.data.queryId || null);
      setNextCursor(res.data.nextCursor || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search.');
    } finally {
      setLoading(false);
    }
  }, [topic, emotion, creator, from, to]);

  const debouncedTypeahead = useMemo(() => debounce(runTypeahead, 300), [runTypeahead]);

  useEffect(() => {
    debouncedTypeahead(query);
    return () => debouncedTypeahead.cancel();
  }, [query, debouncedTypeahead]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (topic) chips.push({ key: 'topic', label: `Topic: ${topic}` });
    if (emotion) chips.push({ key: 'emotion', label: `Emotion: ${emotion}` });
    if (creator) chips.push({ key: 'creator', label: `Creator: @${creator.replace(/^@/, '')}` });
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

  const goToSearchPage = (q) => {
    const params = new URLSearchParams();
    params.set('q', q);
    if (topic) params.set('topic', topic);
    if (emotion) params.set('emotion', emotion);
    if (creator) params.set('creator', creator.replace(/^@/, ''));
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    pushHistory(q);
    setOpen(false);
    router.push(`/search?${params.toString()}`);
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

  const onResultClick = async (item, type, position) => {
    const q = String(query || '').trim();
    if (q) pushHistory(q);

    await trackClick({
      targetType: type,
      targetId: item.id || item._id || item.name || item.topic,
      position,
    });

    if (type === 'topic') {
      setTopic(item.name);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    setOpen(false);

    if (type === 'post') {
      router.push(`/post/${item.id || item._id}`);
      return;
    }

    if (type === 'user') {
      router.push(`/${item.username}`);
    }
  };

  return (
    <>
      {triggerVariant === 'input' ? (
        <button
          type="button"
          className={`${styles.triggerInput} ${triggerClassName || ''}`}
          onClick={() => setOpen(true)}
          aria-label="Open search"
        >
          <FaSearch className={styles.triggerIcon} />
          <span className={styles.triggerPlaceholder}>Search…</span>
          <span className={styles.triggerHint} aria-hidden="true">
            ⌘K
          </span>
        </button>
      ) : (
        <button
          type="button"
          className={`${styles.triggerButton} ${triggerClassName || ''}`}
          onClick={() => setOpen(true)}
          aria-label="Open search"
        >
          <FaSearch />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.18 }}
            >
              <div className={styles.header}>
                <div className={styles.searchRow}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    ref={inputRef}
                    className={styles.input}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search transcripts, topics, creators…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const q = String(query || '').trim();
                        if (q) goToSearchPage(q);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={() => setOpen(false)}
                    aria-label="Close search"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className={styles.toolsRow}>
                  <button
                    type="button"
                    className={styles.filtersButton}
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    Filters
                  </button>

                  {activeChips.length > 0 && (
                    <div className={styles.chips}>
                      {activeChips.map((chip) => (
                        <button
                          type="button"
                          key={chip.key}
                          className={styles.chip}
                          onClick={() => clearChip(chip.key)}
                          aria-label={`Remove filter ${chip.label}`}
                        >
                          {chip.label} <span aria-hidden="true">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {filtersOpen && (
                    <motion.div
                      className={styles.filtersPanel}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className={styles.filtersGrid}>
                        <label className={styles.filterField}>
                          <span>Topic</span>
                          <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Technology"
                          />
                        </label>

                        <label className={styles.filterField}>
                          <span>Emotion</span>
                          <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
                            <option value="">Any</option>
                            <option value="POSITIVE">POSITIVE</option>
                            <option value="NEGATIVE">NEGATIVE</option>
                            <option value="NEUTRAL">NEUTRAL</option>
                          </select>
                        </label>

                        <label className={styles.filterField}>
                          <span>Creator</span>
                          <input
                            value={creator}
                            onChange={(e) => setCreator(e.target.value)}
                            placeholder="username"
                          />
                        </label>

                        <label className={styles.filterField}>
                          <span>From</span>
                          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </label>

                        <label className={styles.filterField}>
                          <span>To</span>
                          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.content}>
                {error && <div className={styles.error}>{error}</div>}

                {!query.trim() ? (
                  <div className={styles.discovery}>
                    {history.length > 0 && (
                      <div className={styles.section}>
                        <div className={styles.sectionTitle}>Recent</div>
                        <div className={styles.pills}>
                          {history.map((h) => (
                            <button
                              key={h}
                              type="button"
                              className={styles.pill}
                              onClick={() => setQuery(h)}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.section}>
                      <div className={styles.sectionTitle}>Trending topics</div>
                      <div className={styles.pills}>
                        {trendingTopics.map((t) => (
                          <button
                            key={t.id || t.name}
                            type="button"
                            className={styles.pill}
                            onClick={() => {
                              setTopic(t.name);
                              setQuery(t.name);
                            }}
                          >
                            #{t.name}
                          </button>
                        ))}
                        {trendingTopics.length === 0 && <div className={styles.muted}>No trending topics yet.</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loading ? (
                      <div className={styles.loading}>Searching…</div>
                    ) : (
                      <>
                        <div className={styles.section}>
                          <div className={styles.sectionTitle}>Posts</div>
                          {results.posts.length === 0 ? (
                            <div className={styles.muted}>No matching posts.</div>
                          ) : (
                            <ul className={styles.list}>
                              {results.posts.map((p, idx) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    className={styles.resultRow}
                                    onClick={() => onResultClick(p, 'post', idx)}
                                  >
                                    <div className={styles.resultMain}>
                                      <div className={styles.resultTitle}>
                                        <HighlightedText text={p.title || p.user?.username || 'Post'} query={query} />
                                      </div>
                                      <div className={styles.resultSubtitle}>
                                        <HighlightedText text={p.snippet || ''} query={query} />
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className={styles.section}>
                          <div className={styles.sectionTitle}>Creators</div>
                          {results.users.length === 0 ? (
                            <div className={styles.muted}>No matching creators.</div>
                          ) : (
                            <ul className={styles.list}>
                              {results.users.map((u, idx) => (
                                <li key={u.id}>
                                  <button
                                    type="button"
                                    className={styles.resultRow}
                                    onClick={() => onResultClick(u, 'user', idx)}
                                  >
                                    <div className={styles.userRow}>
                                      <img
                                        src={u.avatar || '/placeholder-avatar.png'}
                                        alt=""
                                        className={styles.avatar}
                                      />
                                      <div className={styles.resultMain}>
                                        <div className={styles.resultTitle}>
                                          <HighlightedText text={`@${u.username}`} query={query} />
                                        </div>
                                        {u.bio && <div className={styles.resultSubtitle}><HighlightedText text={u.bio} query={query} /></div>}
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className={styles.section}>
                          <div className={styles.sectionTitle}>Topics</div>
                          {results.topics.length === 0 ? (
                            <div className={styles.muted}>No matching topics.</div>
                          ) : (
                            <div className={styles.pills}>
                              {results.topics.map((t, idx) => (
                                <button
                                  key={t.id || t.name}
                                  type="button"
                                  className={styles.pill}
                                  onClick={() => onResultClick(t, 'topic', idx)}
                                >
                                  #<HighlightedText text={t.name} query={query} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={styles.footerRow}>
                          <button
                            type="button"
                            className={styles.viewAll}
                            onClick={() => {
                              const q = String(query || '').trim();
                              if (q) goToSearchPage(q);
                            }}
                          >
                            View all results{nextCursor ? ' (more)' : ''}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
