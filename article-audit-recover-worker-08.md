# Editorial audit — Worker-08 recovery

## Before editing

- **Slug:** `how-to-create-complex-excel-formulas-easily`
- **Published:** 2026-01-21
- **Previous update:** 2026-02-08
- **Editorial priority:** The source had a generic meta description, a category mismatch, repeated keyphrase use, mixed Excel/Google Sheets positioning, a duplicate internal link, an unverified product comparison, and an appended array-formula section in a different format.
- **Primary search intent:** Teach a reader how to design, assemble, test, and debug a complex Excel formula.
- **Primary keyphrase:** `how to create complex Excel formulas easily`.
- **Supporting concepts:** advanced Excel formulas, XLOOKUP, LET, FILTER, formula troubleshooting, helper cells.
- **Internal-cannibalization decision:** Keep this page as a formula-construction tutorial. Link to the AI formula generator or Formula Builder Pro only as optional tools; do not make it a general browser-tools article or duplicate a formula-error troubleshooting page.
- **Competitor gap:** Formula listicles name advanced functions but often omit a method for decomposing requirements, testing edge cases, checking compatibility, and handing the workbook to another person. This rewrite owns that process.

## Sources consulted

1. Microsoft Support, “XLOOKUP function”: https://support.microsoft.com/en-us/excel/functions/xlookup-function
2. Microsoft Support, “Evaluate a nested formula one step at a time”: https://support.microsoft.com/en-us/office/evaluate-a-nested-formula-one-step-at-a-time-59a201ae-7e7a-4c15-bfca-8f7c3ff7c3d6
3. ExtensionTo, “Formula Builder Pro”: `/extension/formula-builder-pro`

## Edit plan and decisions

1. Keep the article's tutorial intent but reorganize it around a four-stage construction method.
2. Replace broad function claims with tested examples for AND/IF, XLOOKUP, LET, FILTER, and IFS.
3. Add the XLOOKUP compatibility warning for Excel 2016 and 2019 based on Microsoft documentation.
4. Explain helper cells, reference locking, data types, error handling, and boundary cases.
5. Remove unsupported performance and “game-changer” language and avoid claiming that a browser tool validates every workbook.
6. Remove the duplicate internal link and irrelevant Quick Screenshot Lite promotion.
7. Keep one restrained, contextual Formula Builder Pro mention and include privacy guidance for sensitive data.
8. Keep the existing assigned featured image; no image was copied from another article.

## After editing

- Category is corrected to `Spreadsheets & Productivity`.
- `status` remains `published` for normal indexing.
- `updated_at` is advanced to 2026-08-22.
- No shared index or sitemap file was edited on this worker branch.
- Validation required before merge: index sync, build, typecheck, performance, SEO, links, and `git diff --check`.
