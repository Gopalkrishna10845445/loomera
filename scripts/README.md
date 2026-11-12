# LOOMERA — Visual Regression & Quality Assurance Scripts

This directory contains standalone Python-based visual regression testing and Chrome DevTools Protocol (CDP) capture scripts used during Phase 1 and Phase 2 visual parity audits.

---

## Script Index

| Script | Purpose |
| :--- | :--- |
| `capture_baseline.py` | Captures baseline full-page screenshots of the production storefront across viewport dimensions. |
| `capture_after.py` | Captures post-migration rendering screenshots for side-by-side visual difference evaluation. |
| `capture_cdp.py` | Interacts via Chrome DevTools Protocol (CDP) to inspect sub-pixel layout shifts, font loading, and paint timings. |
| `capture_clean.py` | Captures screenshots with modals, banners, and third-party widgets dismissed. |
| `capture_qa.py` | Multi-viewport screenshot capture suite (Desktop 1440px, Tablet 768px, Mobile 390px, Foldable 320px). |
| `capture_sections.py` | Captures targeted DOM elements (Hero banner, New Arrivals grid, Craftsmanship story, Footer). |
| `generate_all_qa_evidence.py` | Orchestrates a complete QA capture run and outputs audit images into `artifacts/`. |
| `run_functional_audit.py` | Executes headless browser interactions (cart opening, category chip clicks, modal triggers). |
| `test_and_capture_collections.py` | Tests collection filtering UI and captures resulting viewports. |
| `test_cdp.py` | Validates CDP connection and browser automation driver. |
| `test_functional.py` | End-to-end user journey verification (browse -> add to cart -> checkout modal). |
| `verify_and_capture_collections.py` | Verifies dynamic category routing `/collections/[category]` and captures rendering evidence. |

---

## Prerequisites & Execution

These scripts require Python 3.10+ and the `playwright` package:

```bash
pip install playwright
playwright install chromium
```

To run a visual regression capture against a running local development server (`http://localhost:3000`):

```bash
python scripts/capture_qa.py
```
Outputs are written to `artifacts/visual-audit/` (ignored by Git).
