#!/usr/bin/env python3
"""Fill missing `immatriculation` values in an Excel file by matching `actuel_km` to vehicles from the API.

Behavior:
- Dry-run by default: prints a summary and writes `--preview` CSV with candidates.
- Writes a corrected Excel when `--apply` is provided.
- Only fills rows where a UNIQUE vehicle is found within `--threshold` km.
- Produces two artifacts:
  - <output>-fixed.xlsx  (when --apply)
  - <output>-candidates.csv (always): shows best-match candidate(s) and reasons

Usage examples (PowerShell):
  # dry-run, inspect candidates
  .venv\Scripts\Activate; python tools\fill_immat_from_km.py --input "C:\path\to\Classeur12.xlsx"

  # apply fixes and write corrected file
  .venv\Scripts\Activate; python tools\fill_immat_from_km.py --input Classeur12.xlsx --apply --threshold 50

Requirements:
  - run from the repository root with backend venv activated
  - packages: pandas, requests, openpyxl (should be available in the project's venv)

"""
from __future__ import annotations
import argparse
import sys
import math
import requests
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List

API = "http://127.0.0.1:5000/api"


def normalize_plate(s: str) -> str:
    if s is None:
        return ""
    return str(s).strip().lower().replace('-', '').replace(' ', '')


def fetch_vehicles() -> List[Dict[str, Any]]:
    res = requests.get(f"{API}/vehicles", timeout=10)
    res.raise_for_status()
    return res.json()


def find_best_vehicle_by_km(vehicles: List[Dict[str, Any]], km_value: float, threshold: float):
    """Return (best_match, distance, unique_flag)
    best_match is the vehicle dict or None
    distance is absolute difference between vehicle.kilometrage_actuel and km_value
    unique_flag is True if the best match is unambiguous within threshold
    """
    candidates = []
    for v in vehicles:
        try:
            vk = v.get('kilometrage_actuel')
            if vk is None:
                continue
            dist = abs(float(vk) - float(km_value))
            candidates.append((dist, v))
        except Exception:
            continue
    if not candidates:
        return None, None, False
    candidates.sort(key=lambda x: x[0])
    best_dist, best_v = candidates[0]
    # check uniqueness: second best must be strictly farther by some margin
    if best_dist > threshold:
        return None, best_dist, False
    # Determine uniqueness: either only one candidate within threshold or gap to next > 1
    within = [c for c in candidates if c[0] <= threshold]
    if len(within) == 1:
        return best_v, best_dist, True
    # if multiple within threshold, check gap ratio
    if len(candidates) > 1:
        second_dist = candidates[1][0]
        # require a clear gap (e.g., second_dist - best_dist >= 5 or relative > 0.2)
        if (second_dist - best_dist) >= 5 or (best_dist > 0 and (second_dist - best_dist) / max(best_dist, 1) > 0.2):
            return best_v, best_dist, True
    return None, best_dist, False


def detect_actuel_km_column(columns: List[str]) -> str | None:
    lower = [str(c).strip().lower() for c in columns]
    candidates = [c for c in lower if 'actuel' in c and ('km' in c or 'kilom' in c)]
    if candidates:
        return columns[lower.index(candidates[0])]
    # fallback common names
    for alt in ('actuel_km', 'compteur', 'kilometrage', 'km actuel', 'km_actuel'):
        for c in columns:
            if alt in str(c).strip().lower():
                return c
    return None


def detect_plate_column(columns: List[str]) -> str | None:
    lower = [str(c).strip().lower() for c in columns]
    for alt in ('immatriculation', 'véhicule', 'vehicule', 'immat', 'plaque'):
        for c in columns:
            if alt in str(c).strip().lower():
                return c
    return None


def main(argv: List[str] | None = None) -> int:
    p = argparse.ArgumentParser(description='Fill immatriculation from actuel_km using vehicles API')
    p.add_argument('--input', '-i', required=True, help='Input Excel file (.xlsx)')
    p.add_argument('--output', '-o', help='Output base name (default: <input>-fixed.xlsx)')
    p.add_argument('--threshold', type=float, default=50.0, help='km threshold for matching (default 50)')
    p.add_argument('--apply', action='store_true', help='Write corrected Excel (otherwise dry-run)')
    p.add_argument('--force', action='store_true', help='Overwrite existing immatriculation values')
    p.add_argument('--preview', action='store_true', help='Also write a CSV with candidate info')
    args = p.parse_args(argv)

    inp = Path(args.input)
    if not inp.exists():
        print('ERROR: input file not found:', inp)
        return 2

    try:
        df = pd.read_excel(inp)
    except Exception as e:
        print('ERROR: failed to read Excel:', e)
        return 3

    plate_col = detect_plate_column(df.columns.tolist())
    km_col = detect_actuel_km_column(df.columns.tolist())
    print(f'Detected plate column: {plate_col!r}, km column: {km_col!r}')

    vehicles = fetch_vehicles()
    print(f'Fetched {len(vehicles)} vehicles from API')

    # Build index of normalized plates
    plate_index = {normalize_plate(v.get('immatriculation') or ''): v for v in vehicles if v.get('immatriculation')}

    rows = []
    candidates_rows = []
    filled = 0
    ambiguous = 0
    not_found = 0
    already = 0

    for idx, row in df.iterrows():
        orig_plate = None
        if plate_col:
            orig_plate = row.get(plate_col)
            if pd.isna(orig_plate):
                orig_plate = None
        km_val = None
        if km_col:
            km_val = row.get(km_col)
            # try numeric extraction if string
            try:
                if pd.isna(km_val):
                    km_val = None
                else:
                    km_val = float(str(km_val).replace(',', '.').strip())
            except Exception:
                km_val = None

        result = {'row_index': idx, 'orig_plate': orig_plate, 'km': km_val, 'action': None, 'matched_plate': None, 'match_dist': None, 'reason': None}

        if orig_plate and not args.force:
            result['action'] = 'skip_exists'
            already += 1
            rows.append(result)
            continue

        if not km_val:
            result['action'] = 'no_km'
            result['reason'] = 'missing_actuel_km'
            not_found += 1
            rows.append(result)
            continue

        # try exact km->vehicle matching
        best_v, dist, unique = find_best_vehicle_by_km(vehicles, km_val, args.threshold)
        result['match_dist'] = dist
        if best_v and unique:
            mp = best_v.get('immatriculation')
            result['matched_plate'] = mp
            result['action'] = 'fill'
            filled += 1
            # write to df only in apply mode
            if args.apply:
                if plate_col:
                    df.at[idx, plate_col] = mp
                else:
                    # create a new column
                    df['immatriculation'] = df.get('immatriculation')
                    df.at[idx, 'immatriculation'] = mp
        else:
            result['action'] = 'ambiguous' if best_v else 'no_match'
            result['reason'] = 'ambiguous_candidates' if best_v else 'no_candidates_within_threshold'
            ambiguous += 1 if best_v else 1
            # include top 3 candidates for diagnosis
            cand_list = []
            for d, v in sorted([(abs((v.get('kilometrage_actuel') or 0) - (km_val or 0)), v) for v in vehicles])[:3]:
                cand_list.append({'immat': v.get('immatriculation'), 'km': v.get('kilometrage_actuel'), 'dist': d})
            result['candidates'] = cand_list

        rows.append(result)

    base_out = args.output or (str(inp.with_name(inp.stem + '-fixed' + inp.suffix)))
    candidates_csv = Path(base_out).with_suffix('.candidates.csv')

    # Write candidates CSV for review
    cand_df = pd.json_normalize(rows)
    cand_df.to_csv(candidates_csv, index=False)
    print(f'Wrote candidates info to: {candidates_csv}')

    if args.apply:
        outpath = Path(base_out)
        df.to_excel(outpath, index=False)
        print(f'Wrote fixed Excel to: {outpath}')

    print('Summary: total_rows=%d filled=%d ambiguous=%d no_km_or_nomatch=%d already_present=%d' % (
        len(rows), filled, ambiguous, not_found, already
    ))

    # show sample
    sample = [r for r in rows if r['action'] in ('fill', 'ambiguous', 'no_match')][:10]
    print('\nSample diagnostics (first 10 relevant rows):')
    for s in sample:
        print(s)

    print('\nNext steps:')
    print('- Review the candidates CSV and the sample above.')
    print("- If results look good, re-run with --apply to write a corrected Excel, then upload it from the UI.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
