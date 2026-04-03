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
});
