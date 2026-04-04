import { fetchMedlinePlus, fetchPubMed, lookupRxNorm, fetchOpenFDA, gatherNihContext } from '@/lib/nih';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockReset());

describe('fetchMedlinePlus', () => {
  it('returns a NihSource on valid response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        feed: {
          entry: [{
            title: { _value: 'Mole (Nevus)' },
            link: [{ href: 'https://medlineplus.gov/moles.html' }],
            summary: { _value: '<p>A mole is a common skin growth.</p>' },
          }],
        },
      }),
    });
    const result = await fetchMedlinePlus('mole');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('medlineplus');
    expect(result!.title).toBe('Mole (Nevus)');
    expect(result!.excerpt).not.toContain('<p>'); // HTML stripped
  });

  it('returns null on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await fetchMedlinePlus('anything');
    expect(result).toBeNull();
  });

  it('returns null on empty entry array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feed: { entry: [] } }),
    });
    const result = await fetchMedlinePlus('nonexistent');
    expect(result).toBeNull();
  });
});

describe('fetchPubMed', () => {
  it('returns a NihSource when PMID found and summary fetched', async () => {
    // First call: esearch returns a PMID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ esearchresult: { idlist: ['12345678'] } }),
    });
    // Second call: esummary returns article details
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          '12345678': { title: 'Chest pain differential diagnosis', source: 'JAMA', pubdate: '2023' },
        },
      }),
    });
    const result = await fetchPubMed('chest pain');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('pubmed');
    expect(result!.title).toBe('Chest pain differential diagnosis');
    expect(result!.url).toContain('12345678');
  });

  it('returns null when no PMID found in search results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ esearchresult: { idlist: [] } }),
    });
    const result = await fetchPubMed('very obscure condition');
    expect(result).toBeNull();
  });

  it('returns null when search fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await fetchPubMed('anything');
    expect(result).toBeNull();
  });

  it('returns null when summary fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ esearchresult: { idlist: ['99'] } }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await fetchPubMed('anything');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchPubMed('chest pain');
    expect(result).toBeNull();
  });
});

describe('lookupRxNorm', () => {
  it('returns RxNorm source with CUI when medication found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: { rxnormId: ['1049502'] } }),
    });
    const result = await lookupRxNorm('metformin');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('rxnorm');
    expect(result!.excerpt).toContain('1049502');
  });

  it('returns null when medication not found in RxNorm', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: {} }),
    });
    const result = await lookupRxNorm('unknowndrug');
    expect(result).toBeNull();
  });
});

describe('fetchOpenFDA', () => {
  it('returns an OpenFDA source with top reactions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { term: 'NAUSEA', count: 500 },
          { term: 'HEADACHE', count: 300 },
          { term: 'DIZZINESS', count: 200 },
          { term: 'FATIGUE', count: 100 },
        ],
      }),
    });
    const result = await fetchOpenFDA('metformin');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('openfda');
    expect(result!.excerpt).toContain('NAUSEA');
    expect(result!.excerpt).toContain('HEADACHE');
    expect(result!.title).toContain('metformin');
  });

  it('returns null when no results in FDA response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });
    const result = await fetchOpenFDA('unknowndrug');
    expect(result).toBeNull();
  });

  it('returns null on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await fetchOpenFDA('metformin');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));
    const result = await fetchOpenFDA('aspirin');
    expect(result).toBeNull();
  });
});

describe('lookupRxNorm (additional)', () => {
  it('returns null when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));
    const result = await lookupRxNorm('metformin');
    expect(result).toBeNull();
  });

  it('returns null on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await lookupRxNorm('metformin');
    expect(result).toBeNull();
  });
});

describe('gatherNihContext', () => {
  it('returns sources array and contextText string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        feed: { entry: [{ title: { _value: 'Rash' }, link: [{ href: 'http://example.com' }], summary: { _value: 'A rash is...' } }] },
        esearchresult: { idlist: [] },
        idGroup: {},
      }),
    });
    const { sources, contextText } = await gatherNihContext({
      symptomDescription: 'red rash on arm',
      symptomType: 'Rash / skin change',
      medications: [],
    });
    expect(Array.isArray(sources)).toBe(true);
    expect(typeof contextText).toBe('string');
  });

  it('includes medication lookups when medications provided', async () => {
    // MedlinePlus
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        feed: { entry: [{ title: { _value: 'Headache' }, link: [{ href: 'http://example.com' }], summary: { _value: 'Headache info' } }] },
      }),
    });
    // PubMed esearch — no results
    mockFetch.mockResolvedValueOnce({
      ok: true, json: async () => ({ esearchresult: { idlist: [] } }),
    });
    // RxNorm
    mockFetch.mockResolvedValueOnce({
      ok: true, json: async () => ({ idGroup: { rxnormId: ['161'] } }),
    });
    // OpenFDA
    mockFetch.mockResolvedValueOnce({
      ok: true, json: async () => ({ results: [{ term: 'NAUSEA', count: 10 }] }),
    });

    const { sources, contextText } = await gatherNihContext({
      symptomDescription: 'headache',
      symptomType: 'Pain',
      medications: ['aspirin'],
    });
    expect(sources.length).toBeGreaterThan(0);
    expect(contextText).toContain('[');
  });

  it('handles all NIH calls failing gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));
    const { sources, contextText } = await gatherNihContext({
      symptomDescription: 'cough',
      symptomType: 'Other',
      medications: [],
    });
    expect(sources).toEqual([]);
    expect(contextText).toBe('');
  });
});
