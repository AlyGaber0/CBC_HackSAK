// lib/nih.ts
import type { NihSource } from './types';

// MedlinePlus Connect:patient-readable condition summaries
export async function fetchMedlinePlus(
  conditionTerm: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(conditionTerm);
    const url = `https://connect.nlm.nih.gov/connect/service?mainSearchCriteria.v.dn=${encoded}&knowledgeResponseType=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.feed?.entry?.[0];
    if (!entry) return null;
    return {
      source: 'medlineplus',
      title: entry.title?.['_value'] ?? conditionTerm,
      url: entry.link?.[0]?.href ?? 'https://medlineplus.gov',
      excerpt: entry.summary?.['_value']?.replace(/<[^>]*>/g, '').slice(0, 300) ?? '',
    };
  } catch {
    return null;
  }
}

// PubMed E-utilities:single search call only (no summary round-trip)
export async function fetchPubMed(
  query: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(`${query}[Title/Abstract] AND (clinical[Title] OR guideline[Title])`);
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=1&retmode=json&usehistory=n`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(2500) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const pmid = searchData?.esearchresult?.idlist?.[0];
    if (!pmid) return null;

    // Use search metadata directly:skip the second summary fetch
    const translationStack = searchData?.esearchresult?.translationstack;
    const termUsed = Array.isArray(translationStack)
      ? translationStack.find((t: { term?: string }) => t?.term)?.term ?? query
      : query;

    return {
      source: 'pubmed',
      title: `PubMed: ${termUsed.replace(/\[.*?\]/g, '').trim()}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      excerpt: `Relevant clinical literature found (PMID: ${pmid}). Source: PubMed / NCBI.`,
    };
  } catch {
    return null;
  }
}

// RxNorm:validate and normalize medication names
export async function lookupRxNorm(
  medicationName: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(medicationName);
    const rxcuiUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encoded}`;
    const rxcuiRes = await fetch(rxcuiUrl, { signal: AbortSignal.timeout(2500) });
    if (!rxcuiRes.ok) return null;
    const rxcuiData = await rxcuiRes.json();
    const rxcui = rxcuiData?.idGroup?.rxnormId?.[0];
    if (!rxcui) return null;

    return {
      source: 'rxnorm',
      title: `${medicationName} (RxNorm verified)`,
      url: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`,
      excerpt: `RxNorm CUI: ${rxcui}. Standardized medication reference from the National Library of Medicine.`,
    };
  } catch {
    return null;
  }
}

// OpenFDA FAERS:adverse event data for medication symptoms
export async function fetchOpenFDA(
  medicationName: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(medicationName);
    const url = `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encoded}"&limit=1&count=patient.reaction.reactionmeddrapt.exact`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    const topReactions = data?.results?.slice(0, 3).map((r: { term: string }) => r.term).join(', ');
    if (!topReactions) return null;

    return {
      source: 'openfda',
      title: `${medicationName}:FDA Adverse Event Data`,
      url: `https://www.fda.gov/safety/faers-public-dashboard`,
      excerpt: `Most reported adverse reactions: ${topReactions}. Source: FDA FAERS database.`,
    };
  } catch {
    return null;
  }
}

// Gather all relevant NIH context for a case
export async function gatherNihContext(params: {
  symptomDescription: string;
  symptomType: string;
  medications: string[];
}): Promise<{ sources: NihSource[]; contextText: string }> {
  const results = await Promise.allSettled([
    fetchMedlinePlus(params.symptomType || params.symptomDescription),
    fetchPubMed(`${params.symptomType} red flags warning signs`),
    params.medications[0] ? lookupRxNorm(params.medications[0]) : Promise.resolve(null),
    params.medications[0] ? fetchOpenFDA(params.medications[0]) : Promise.resolve(null),
  ]);

  const sources: NihSource[] = results
    .filter((r): r is PromiseFulfilledResult<NihSource | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((s): s is NihSource => s !== null);

  const contextText = sources
    .map(s => `[${s.source.toUpperCase()}] ${s.title}: ${s.excerpt}`)
    .join('\n\n');

  return { sources, contextText };
}
