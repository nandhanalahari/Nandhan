export interface Match {
  score: number
  /** Indices into the label that matched, for highlighting. */
  indices: number[]
}

const isBoundary = (text: string, i: number) => i === 0 || /[\s\-_/.(]/.test(text[i - 1])

/**
 * Subsequence matcher with a preference for contiguous runs and word starts.
 * Returns null when the query is not a subsequence of the label and no
 * keyword contains every query term.
 */
export function fuzzyMatch(query: string, label: string, keywords = ''): Match | null {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, indices: [] }
  const t = label.toLowerCase()

  // Contiguous substring: the strongest and most readable highlight.
  const at = t.indexOf(q)
  if (at >= 0) {
    const indices = Array.from({ length: q.length }, (_, k) => at + k)
    return { score: 1000 - at + (isBoundary(t, at) ? 200 : 0) - t.length * 0.5, indices }
  }

  // Greedy subsequence, spaces in the query ignored.
  const chars = q.replace(/\s+/g, '')
  const indices: number[] = []
  let score = 0
  let ti = 0
  let prev = -2
  for (const ch of chars) {
    let found = -1
    // Prefer a word-start occurrence ahead, else the next occurrence.
    for (let j = ti; j < t.length; j++) {
      if (t[j] === ch && isBoundary(t, j)) {
        found = j
        break
      }
    }
    const next = t.indexOf(ch, ti)
    if (next === -1) {
      indices.length = 0
      break
    }
    if (found === -1 || next === prev + 1) found = next
    score += 10
    if (found === prev + 1) score += 15
    if (isBoundary(t, found)) score += 20
    score -= Math.min(found - ti, 10)
    indices.push(found)
    prev = found
    ti = found + 1
  }
  if (indices.length === chars.length) return { score, indices }

  // Fall back to keywords: every term must appear somewhere. No highlight.
  const hay = `${t} ${keywords.toLowerCase()}`
  const terms = q.split(/\s+/)
  if (terms.every((term) => hay.includes(term))) return { score: -100, indices: [] }
  return null
}
