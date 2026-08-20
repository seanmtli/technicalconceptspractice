/**
 * Crawl free articles from ByteByteGo and Technically (both Substack-backed) into
 * the sources table, then link questions to sources by concept overlap.
 *
 * Idempotent and resumable: already-crawled URLs are skipped, raw HTML is cached
 * in scratch/crawl-cache/. Run with: npm run crawl-sources
 * Optional: CRAWL_LIMIT=40 caps new articles per publication for a quick pass.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';
import { SOURCE_SUMMARY_PROMPT, fillPrompt } from '../lib/prompts';
import { chatJson, CHEAP_MODEL } from '../lib/openrouter';

const CACHE_DIR = 'scratch/crawl-cache';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) datapractice-crawler (personal study tool)';
const LIMIT = process.env.CRAWL_LIMIT ? parseInt(process.env.CRAWL_LIMIT, 10) : Infinity;

const PUBLICATIONS = [
  { name: 'bytebytego' as const, base: 'https://blog.bytebytego.com' },
  { name: 'technically' as const, base: 'https://read.technically.dev' },
];

interface ArchivePost {
  title: string;
  canonical_url: string;
  audience: string;
  truncated_body_text?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchArchive(base: string): Promise<ArchivePost[]> {
  const posts: ArchivePost[] = [];
  for (let offset = 0; ; offset += 50) {
    const res = await fetch(`${base}/api/v1/archive?sort=new&offset=${offset}&limit=50`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) {
      console.warn(`archive fetch ${base} offset ${offset} -> ${res.status}; stopping enumeration`);
      break;
    }
    const batch = (await res.json()) as ArchivePost[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    posts.push(...batch);
    await sleep(1000);
  }
  return posts;
}

function extractText(html: string): string {
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
  return article
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);
}

async function fetchArticleText(url: string): Promise<string | null> {
  const cachePath = join(CACHE_DIR, createHash('md5').update(url).digest('hex') + '.html');
  if (existsSync(cachePath)) return extractText(readFileSync(cachePath, 'utf8'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1000);
  if (!res.ok) return null;
  const html = await res.text();
  writeFileSync(cachePath, html);
  return extractText(html);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars missing');
  const supabase = createClient<Database>(url, serviceKey);
  mkdirSync(CACHE_DIR, { recursive: true });

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, category, key_concepts, source_ids');
  if (qErr) throw qErr;
  const vocabulary = [...new Set(questions.flatMap((q) => q.key_concepts.map((c) => c.toLowerCase())))];

  const { data: existingRows, error: sErr } = await supabase.from('sources').select('url');
  if (sErr) throw sErr;
  const existing = new Set(existingRows.map((r) => r.url));

  // 1. Crawl each publication's free posts.
  for (const pub of PUBLICATIONS) {
    console.log(`\n== ${pub.name}: enumerating archive…`);
    const posts = await fetchArchive(pub.base);
    const free = posts.filter((p) => p.audience === 'everyone' && p.canonical_url);
    console.log(`${posts.length} posts, ${free.length} free`);

    let added = 0;
    for (const post of free) {
      if (added >= LIMIT) {
        console.log(`hit CRAWL_LIMIT=${LIMIT}; rerun to continue`);
        break;
      }
      if (existing.has(post.canonical_url)) continue;

      let body: string | null = null;
      try {
        body = await fetchArticleText(post.canonical_url);
      } catch {
        // fall through to truncated text
      }
      body = body || post.truncated_body_text || '';
      if (body.length < 200) {
        console.warn(`skip (no usable body): ${post.title}`);
        continue;
      }

      try {
        const { summary, concepts } = await chatJson<{ summary: string; concepts: string[] }>(
          fillPrompt(SOURCE_SUMMARY_PROMPT, {
            title: post.title,
            body,
            vocabulary: vocabulary.join(', '),
          }),
          { model: CHEAP_MODEL, maxTokens: 512 }
        );
        const tags = (Array.isArray(concepts) ? concepts : [])
          .filter((c): c is string => typeof c === 'string')
          .map((c) => c.toLowerCase().trim())
          .slice(0, 8);
        const { error } = await supabase.from('sources').upsert(
          {
            url: post.canonical_url,
            title: post.title,
            publication: pub.name,
            summary: typeof summary === 'string' ? summary : '',
            concepts: tags,
          },
          { onConflict: 'url' }
        );
        if (error) throw error;
        existing.add(post.canonical_url);
        added++;
        console.log(`+ [${pub.name}] ${post.title}`);
      } catch (e) {
        console.warn(`skip (summarize/upsert failed): ${post.title}`, e);
      }
    }
    console.log(`${pub.name}: ${added} new sources`);
  }

  // 2. Link questions to sources by normalized concept overlap (cap 3, best overlap first).
  const { data: sources, error: allErr } = await supabase.from('sources').select('id, concepts');
  if (allErr) throw allErr;
  let linked = 0;
  for (const q of questions) {
    const qConcepts = new Set(q.key_concepts.map((c) => c.toLowerCase()));
    const matches = sources
      .map((s) => ({ id: s.id, overlap: s.concepts.filter((c) => qConcepts.has(c)).length }))
      .filter((m) => m.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((m) => m.id);
    if (matches.length > 0) {
      const { error } = await supabase.from('questions').update({ source_ids: matches }).eq('id', q.id);
      if (error) throw error;
      linked++;
    }
  }
  console.log(
    `\nMatch report: ${linked}/${questions.length} questions linked (${Math.round((100 * linked) / questions.length)}%), ${sources.length} sources total`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
