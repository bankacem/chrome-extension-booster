import { notifyIndexing } from './google-indexing.js';

const SITEMAP_URL = 'https://aiprintverse.com/sitemap.xml';

// URLs marked as 'Sans objet' provided by the user
const SANS_OBJET_URLS = [
  "https://aiprintverse.com/blog/big-fan-of-human-rights-radicalized-by-basic-decency-retro-t",
  "https://aiprintverse.com/blog/canvas-prints-101-everything-you-need-to-know-before-you-buy",
  "https://aiprintverse.com/blog/cat-lover-gifts-2026-77-purr-fect-ideas-for-feline-fans",
  "https://aiprintverse.com/blog/couch-potato-shirts-2026-50-lazy-chic-designs-for-comfort-lo",
  "https://aiprintverse.com/blog/german-shepherd-shirts-2026-60-premium-designs-for-gsd-lover",
  "https://aiprintverse.com/blog/get-ready-to-blast-off-with-the-beam-me-up-this-place-sucks",
  "https://aiprintverse.com/blog/the-architectural-staple-why-slim-fit-black-v-neck-t-shirts",
  "https://aiprintverse.com/blog/the-invisible-layer-why-organic-cotton-white-v-nicks-are-the",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-custom-orders-in-fashion-elevating-you",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-custom-phone-cases-design-protection-a",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1991-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1992-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1993-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1994-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1995-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1996-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1997-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1998-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-1999-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2000-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2001-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2002-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2004-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2005-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2006-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2007-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2008-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2009-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-vintage-2010-birthday-shirts",
  "https://aiprintverse.com/blog/the-ultimate-guide-to-water-bottles-as-a-fashion-statement-h",
  "https://aiprintverse.com/blog/unleash-your-inner-bookworm-with-the-read-more-books-comfort",
  "https://aiprintverse.com/blog/unveiling-the-power-of-protest-pro-democracy-in-memoriam-sta",
  "https://aiprintverse.com/blog/vintage-goose-sweater-country-farmhouse-cottagecore-crewneck",
  "https://aiprintverse.com/blog/we-ride-at-dawn-funny-frog-and-goose-chaotic-meme-retro-shir",
  "https://aiprintverse.com/designs",
  "https://aiprintverse.com/designs/16661c9f-39f7-4599-9e9a-95eb300ca135",
  "https://aiprintverse.com/designs/1d33f924-6303-41dd-acb0-8835d8b6f2f9",
  "https://aiprintverse.com/designs/1e1190ab-30d4-4632-9af6-62d8fc9c0ca6",
  "https://aiprintverse.com/designs/207e8053-9d9c-4f36-a025-da6adca658bb",
  "https://aiprintverse.com/designs/227cdd95-b8b5-4443-989c-5e8b03304aa2",
  "https://aiprintverse.com/designs/311ac0b8-ac5e-4250-a806-0e6477f2e2cf",
  "https://aiprintverse.com/designs/38f7fcae-373b-44ea-ae6c-b0275598c6a6",
  "https://aiprintverse.com/designs/3a789cad-e516-4fdd-9e8b-532c9700540b",
  "https://aiprintverse.com/designs/3bf1a9ba-8e1f-4ba7-83be-7809612e3660",
  "https://aiprintverse.com/designs/561dbc8b-1ba9-437b-a61d-83cfbe1d326b",
  "https://aiprintverse.com/designs/563e5d72-3a67-4304-8430-7cb4edbaad9d",
  "https://aiprintverse.com/designs/56e2fcd6-b872-4ca2-b86c-37e3dacb84be",
  "https://aiprintverse.com/designs/5a3e0a9c-765f-40fc-8c94-94f30a48f11c",
  "https://aiprintverse.com/designs/602648a9-4f47-4693-b9d3-303037b43cf8",
  "https://aiprintverse.com/designs/61eb3539-7371-4f03-8b02-bb20e977cf57",
  "https://aiprintverse.com/designs/69eabf4d-599e-453e-a26d-9c6776865b4b",
  "https://aiprintverse.com/designs/6a0e15d9-580b-4e3a-b03f-e68689af0428",
  "https://aiprintverse.com/designs/6ea82aea-4f68-4ff7-90fc-fc58fc8b1c14",
  "https://aiprintverse.com/designs/70503943-6269-4e7f-bbcf-e3ed2d959333",
  "https://aiprintverse.com/designs/72d6b8e9-f900-42a8-975a-79b27c8a3ad8",
  "https://aiprintverse.com/designs/7a1913bb-6b7d-462b-9cd3-aae7575ede07",
  "https://aiprintverse.com/designs/7c93a25e-d1b2-496d-a654-d9ce21f2c740",
  "https://aiprintverse.com/designs/8c8a5b28-834d-4e69-b0f9-db33417e1479",
  "https://aiprintverse.com/designs/8efbabef-0888-4d02-9882-0b40659d4874",
  "https://aiprintverse.com/designs/903a6ae9-6d64-4a36-837a-b8d1e9f20c3d",
  "https://aiprintverse.com/designs/a1103dd5-3360-4555-9606-df38050bf157",
  "https://aiprintverse.com/designs/a9e1a25f-76b8-40c8-b417-0136f320e9b3",
  "https://aiprintverse.com/designs/aff1769a-9e51-44c8-9006-2819b7432b43",
  "https://aiprintverse.com/designs/b4242447-989d-4de2-9c62-ec9a9ff9997b",
  "https://aiprintverse.com/designs/b6da7f19-809b-490e-9ae7-a5b483908d95",
  "https://aiprintverse.com/designs/b7aef78a-b95b-4c4b-928d-c653d3b7ca6b",
  "https://aiprintverse.com/designs/b95b21d2-dbb5-474f-897d-3bad59916d7a",
  "https://aiprintverse.com/designs/bafb21f0-1157-4f0f-a4a3-ee26e3db021f",
  "https://aiprintverse.com/designs/be1ade61-c73a-461b-936a-a79bab688bdb",
  "https://aiprintverse.com/designs/bffa44b1-c063-47e8-af6b-e32d7006b9fc",
  "https://aiprintverse.com/designs/c6d0c787-164b-4a55-b45b-b13443f33257",
  "https://aiprintverse.com/designs/c9c191b8-3a5f-4d21-9c5c-73f97c5be49b",
  "https://aiprintverse.com/designs/cd44ffcd-6ffd-422f-8ded-ccd879525dd2",
  "https://aiprintverse.com/designs/d12c38ae-99d8-4100-a711-e45941b128d7",
  "https://aiprintverse.com/designs/d762553b-a3ad-430e-9d58-b6063875e27d",
  "https://aiprintverse.com/designs/d96e4499-43f6-4b5f-9371-a4fb6b2bc194",
  "https://aiprintverse.com/designs/e2933b77-96e6-4440-8cf5-6daefc317085",
  "https://aiprintverse.com/designs/e4531fcd-756d-46f2-9f5a-7c7475294b9f",
  "https://aiprintverse.com/designs/ec053350-9877-4bbd-8261-b2da1fd261b3",
  "https://aiprintverse.com/designs/eedc016c-6d62-4772-8fb8-00f851b5e65e",
  "https://aiprintverse.com/designs/f2042df3-633a-451f-9317-ea915ce8ff54",
  "https://aiprintverse.com/designs/f43cedc0-29ce-4de8-815f-8118990399da",
  "https://aiprintverse.com/designs/f896ec4e-9b5c-41eb-9878-4c3b2d2aaea6",
  "https://aiprintverse.com/designs/ffbc0455-623a-4dea-9e1a-3653c30c3f17"
];

async function indexAiPrintverse() {
  console.log(`[AiPrintverse-Indexing] Fetching sitemap from: ${SITEMAP_URL}`);

  try {
    const response = await fetch(SITEMAP_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    // Simple regex to extract <loc> URLs
    const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    const sitemapUrls: string[] = [];
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
      sitemapUrls.push(match[1]);
    }

    if (sitemapUrls.length === 0) {
      console.warn('[AiPrintverse-Indexing] No URLs found in sitemap.');
      return;
    }

    console.log(`[AiPrintverse-Indexing] Found ${sitemapUrls.length} URLs in sitemap.`);

    // Filter target URLs that are present in the sitemap
    const sitemapSet = new Set(sitemapUrls);
    const validUrls = SANS_OBJET_URLS.filter(url => {
      const exists = sitemapSet.has(url);
      if (!exists) {
        console.warn(`[AiPrintverse-Indexing] URL not found in sitemap: ${url}`);
      }
      return exists;
    });

    console.log(`[AiPrintverse-Indexing] Valid URLs to process: ${validUrls.length}`);

    let successCount = 0;
    let failCount = 0;
    const report: { url: string; status: string; error?: string }[] = [];

    // Limit to 200 per day as per Google Indexing API quota
    const limit = 200;
    const urlsToProcess = validUrls.slice(0, limit);

    for (const url of urlsToProcess) {
      try {
        console.log(`[AiPrintverse-Indexing] Processing: ${url}`);
        await notifyIndexing(url);
        successCount++;
        report.push({ url, status: '200 OK' });

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failCount++;
        const errorMsg = (error as Error).message;
        report.push({ url, status: 'ERROR', error: errorMsg });
        console.error(`[AiPrintverse-Indexing] Failed to notify ${url}:`, errorMsg);

        // Stop if we hit quota limits
        if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('429')) {
          console.error('[AiPrintverse-Indexing] Quota exceeded, stopping process.');
          break;
        }
      }
    }

    console.log('\n--- AiPrintverse Indexing Summary ---');
    console.log(`Total Target URLs: ${SANS_OBJET_URLS.length}`);
    console.log(`Verified in Sitemap: ${validUrls.length}`);
    console.log(`Successfully Submitted: ${successCount}`);
    console.log(`Failed Submissions: ${failCount}`);

    console.log('\n--- Detailed Report ---');
    console.table(report);

  } catch (error) {
    console.error('[AiPrintverse-Indexing] Error:', (error as Error).message);
    process.exit(1);
  }
}

indexAiPrintverse().catch(console.error);
