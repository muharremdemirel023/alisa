#!/usr/bin/env python3
"""Import raw route-plan records from a PDF and write them as JSON.

Usage:
    python tools/pdf_engine/route_plan_parser.py \
        "tools/pdf_engine/samples/12.06.2026 Rut Planı.pdf"

The PDF text is treated as source evidence: ``raw_block`` is sliced directly
from the extracted text and is never stripped, normalized, or reconstructed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


DATE_AT_LINE_START_RE = re.compile(
    r"(?m)^(?P<date>\d{2}\.\d{2}\.\d{4})(?=\s)"
)
PLATE_RE = re.compile(
    r"(?<![0-9A-ZÇĞİÖŞÜ])"
    r"(?P<plate>\d{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4})"
    r"(?![0-9A-ZÇĞİÖŞÜ])",
    re.IGNORECASE,
)

# Explicit names prevent a personnel name from accidentally being consumed as
# part of a multi-word region. Unknown regions still get a conservative
# one-token fallback in ``parse_header``.
KNOWN_REGIONS = ("İSTANBUL", "KOCAELİ", "TEKİRDAĞ")
REGION_RE = "|".join(re.escape(region) for region in KNOWN_REGIONS)
KNOWN_HEADER_RE = re.compile(
    rf"(?P<date>\d{{2}}\.\d{{2}}\.\d{{4}})\s+"
    rf"(?P<region>{REGION_RE})\s+"
    rf"(?P<personnel>.+?)\s+"
    rf"(?P<plate>\d{{2}}\s*[A-ZÇĞİÖŞÜ]{{1,3}}\s*\d{{2,4}})"
    rf"(?:\s|$)",
    re.IGNORECASE,
)
FALLBACK_HEADER_RE = re.compile(
    r"(?P<date>\d{2}\.\d{2}\.\d{4})\s+"
    r"(?P<region>[A-ZÇĞİÖŞÜ]+)\s+"
    r"(?P<personnel>.+?)\s+"
    r"(?P<plate>\d{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4})"
    r"(?:\s|$)",
    re.IGNORECASE,
)

PROVINCE_PATTERNS = (
    re.compile(r"(?im)^\s*(?:İL|PROVİNCE)\s*[:\-]\s*(?P<value>[^\r\n]+)"),
    re.compile(r"(?im)^\s*(?:İL|PROVİNCE)\s+(?P<value>[^\r\n:]+)$"),
)
DISTRICT_PATTERNS = (
    re.compile(r"(?im)^\s*(?:İLÇE|ILCE|DISTRICT)\s*[:\-]\s*(?P<value>[^\r\n]+)"),
    re.compile(r"(?im)^\s*(?:İLÇE|ILCE|DISTRICT)\s+(?P<value>[^\r\n:]+)$"),
)
MERCHANT_PATTERNS = (
    re.compile(
        r"(?im)\b(?:MERCHANT|MERCHANT\s*NO|MERCHANT_NO|"
        r"İŞYERİ|ISYERI|MÜŞTERİ|MUSTERI|BAYİ)\s*(?:NO|NUMARASI)?"
        r"\s*[:#\-]?\s*(?P<value>\d+)\b"
    ),
)

# PDF inline format: "{Province_word} {DISTRICT_UPPER} {merchant_digits}"
# e.g. "İstanbul BAĞCILAR 10438805", "Kocaeli İZMİT 2233810"
# Province keyword is mixed-case; district is all-uppercase Turkish; merchant is digits.
_KNOWN_PROVINCE_WORDS = r"(?:İstanbul|Kocaeli|Tekirdağ)"
INLINE_PROVINCE_DISTRICT_MERCHANT_RE = re.compile(
    rf"(?<!\w){_KNOWN_PROVINCE_WORDS}\s+"
    r"(?P<district>[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ]+)*)\s+"
    r"(?P<merchant>\d+)"
    r"(?!\d)",
    re.UNICODE,
)

# Normalise the mixed-case province keyword found in the inline pattern to the
# all-uppercase form used throughout the rest of the parsed output.
_PROVINCE_WORD_NORM: dict[str, str] = {
    "İstanbul": "İSTANBUL",
    "Kocaeli": "KOCAELİ",
    "Tekirdağ": "TEKİRDAĞ",
}


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract page text without applying content normalization."""
    reader_type = None
    try:
        from pypdf import PdfReader

        reader_type = PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader

            reader_type = PdfReader
        except ImportError as exc:
            raise RuntimeError(
                "PDF metni çıkarılamadı: 'pypdf' paketi gerekli "
                "(alternatif olarak mevcut bir 'PyPDF2' kurulumu da kullanılabilir)."
            ) from exc

    reader = reader_type(str(pdf_path))
    page_texts: list[str] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text is None:
            text = ""
        page_texts.append(text)
        if not text:
            print(
                f"Uyarı: {page_number}. sayfadan metin çıkarılamadı.",
                file=sys.stderr,
            )

    # A single newline is the page boundary emitted into the extraction stream.
    # Record blocks are subsequently direct slices of this exact string.
    return "\n".join(page_texts)


def split_raw_blocks(text: str) -> list[str]:
    """Split extracted text at dates occurring at the start of a line.

    Any document preamble is attached to the first dated record so source text
    is not silently discarded. Text after the final record remains in that
    record for the same reason.
    """
    starts = [match.start() for match in DATE_AT_LINE_START_RE.finditer(text)]
    if not starts:
        return []

    blocks: list[str] = []
    for index, start in enumerate(starts):
        block_start = 0 if index == 0 else start
        block_end = starts[index + 1] if index + 1 < len(starts) else len(text)
        blocks.append(text[block_start:block_end])
    return blocks


def clean_field(value: str) -> str:
    """Normalize a parsed field only; never use this for raw source fields."""
    return " ".join(value.split()).strip(" \t:;,-")


def first_matching_value(text: str, patterns: Iterable[re.Pattern[str]]) -> str:
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return clean_field(match.group("value"))
    return ""


def parse_header(raw_block: str) -> dict[str, str]:
    date_match = DATE_AT_LINE_START_RE.search(raw_block)
    if not date_match:
        return {
            "visit_date": "",
            "region": "",
            "personnel_name": "",
            "plate_no": "",
        }

    header_text = raw_block[date_match.start() :]
    header_match = KNOWN_HEADER_RE.match(header_text)
    if header_match is None:
        header_match = FALLBACK_HEADER_RE.match(header_text)

    if header_match:
        return {
            "visit_date": header_match.group("date"),
            "region": clean_field(header_match.group("region")).upper(),
            "personnel_name": clean_field(header_match.group("personnel")),
            "plate_no": re.sub(r"\s+", "", header_match.group("plate")).upper(),
        }

    plate_match = PLATE_RE.search(header_text.splitlines()[0])
    return {
        "visit_date": date_match.group("date"),
        "region": "",
        "personnel_name": "",
        "plate_no": (
            re.sub(r"\s+", "", plate_match.group("plate")).upper()
            if plate_match
            else ""
        ),
    }


def valid_visit_date(value: str) -> bool:
    if not value:
        return False
    try:
        datetime.strptime(value, "%d.%m.%Y")
    except ValueError:
        return False
    return True


def build_record(row_id: int, raw_block: str) -> dict[str, Any]:
    header = parse_header(raw_block)
    province = first_matching_value(raw_block, PROVINCE_PATTERNS)
    district = first_matching_value(raw_block, DISTRICT_PATTERNS)
    merchant_no = first_matching_value(raw_block, MERCHANT_PATTERNS)

    # For the currently documented format, region names are also province
    # names. Keep explicit province data authoritative when it exists.
    if not province and header["region"].upper() in KNOWN_REGIONS:
        province = header["region"]

    # Inline format: "{Province_word} {DISTRICT_UPPER} {merchant_digits}"
    # e.g. "İstanbul BAĞCILAR 10438805"  or  "Kocaeli İZMİT 2233810"
    # The label-based patterns above match nothing for this format, so we
    # apply the inline regex as a supplementary extraction.  Only fill in
    # fields that are still empty so we do not overwrite any authoritative
    # label-based data that might appear in other PDF variants.
    inline_match = INLINE_PROVINCE_DISTRICT_MERCHANT_RE.search(raw_block)
    if inline_match:
        if not district:
            district = inline_match.group("district").upper()
        if not merchant_no:
            merchant_no = inline_match.group("merchant")
        if not province:
            # Resolve the mixed-case province word to its normalised form.
            matched_word = inline_match.group(0).split()[0]
            province = _PROVINCE_WORD_NORM.get(matched_word, matched_word.upper())

    review_reasons: list[str] = []
    if not valid_visit_date(header["visit_date"]):
        review_reasons.append("visit_date_missing_or_invalid")
    if not header["region"]:
        review_reasons.append("region_missing")
    if not header["personnel_name"]:
        review_reasons.append("personnel_name_missing")
    if not header["plate_no"]:
        review_reasons.append("plate_no_missing")

    return {
        "row_id": row_id,
        "raw_block": raw_block,
        "raw_lines": raw_block.splitlines(),
        "visit_date": header["visit_date"],
        "region": header["region"],
        "personnel_name": header["personnel_name"],
        "plate_no": header["plate_no"],
        "province": province,
        "district": district,
        "merchant_no": merchant_no,  # Deliberately remains a string.
        "parse_status": "RAW_IMPORTED",
        "review_reasons": review_reasons,
    }


def count_non_empty(records: list[dict[str, Any]], field: str) -> dict[str, int]:
    counts = Counter(record[field] for record in records if record[field])
    return dict(sorted(counts.items()))


def build_output(source_file: str, text: str) -> dict[str, Any]:
    records = [
        build_record(row_id, raw_block)
        for row_id, raw_block in enumerate(split_raw_blocks(text), start=1)
    ]
    summary = {
        "by_personnel": count_non_empty(records, "personnel_name"),
        "by_plate": count_non_empty(records, "plate_no"),
        "by_province": count_non_empty(records, "province"),
        "by_district": count_non_empty(records, "district"),
        "review_required_count": sum(
            1 for record in records if record["review_reasons"]
        ),
    }
    return {
        "source_file": source_file,
        "total_records": len(records),
        "summary": summary,
        "records": records,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rut planı PDF dosyasını ham kayıt bloklarına ayırır."
    )
    parser.add_argument("pdf_file", help="İçe aktarılacak PDF dosyası")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pdf_path = Path(args.pdf_file)
    if not pdf_path.is_file():
        print(f"PDF dosyası bulunamadı: {pdf_path}", file=sys.stderr)
        return 1

    try:
        text = extract_pdf_text(pdf_path)
        payload = build_output(args.pdf_file, text)
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"İçe aktarma başarısız: {exc}", file=sys.stderr)
        return 1

    output_path = Path(__file__).resolve().parent / "output" / "route_plan_import.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"{payload['total_records']} kayıt yazıldı: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
