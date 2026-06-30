"""
M3U / M3U8 extended playlist parser.

Parses the #EXTM3U + #EXTINF + url-line format used by virtually every
free IPTV source (iptv-org, Free-TV, etc). Pulls out the attributes we
care about (logo, group/category, tvg-id, tvg-name) and the stream url.
"""
import re
from dataclasses import dataclass, field

EXTINF_ATTR_RE = re.compile(r'([a-zA-Z0-9\-]+)="([^"]*)"')


@dataclass
class RawChannel:
    name: str
    url: str
    logo: str = ""
    group: str = "Uncategorized"
    tvg_id: str = ""
    country: str = ""


def parse_m3u(text: str, default_group: str = "") -> list[RawChannel]:
    """Parse raw M3U text into a flat list of RawChannel entries.

    Tolerant of: CRLF/LF, blank lines, missing attributes, comments
    other than #EXTINF, and trailing whitespace. Lines that don't match
    the expected shape are skipped rather than raising.
    """
    channels: list[RawChannel] = []
    pending_attrs: dict[str, str] | None = None
    pending_name = ""

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("#EXTINF:"):
            attrs = dict(EXTINF_ATTR_RE.findall(line))
            comma_idx = line.rfind(",")
            name = line[comma_idx + 1:].strip() if comma_idx != -1 else "Unknown"
            pending_attrs = attrs
            pending_name = name or "Unknown"
            continue

        if line.startswith("#"):
            # Any other tag (#EXTGRP, #EXTVLCOPT, #EXTM3U, etc) - ignore.
            continue

        # A bare line after an #EXTINF is the stream URL.
        if pending_attrs is not None and (line.startswith("http://") or line.startswith("https://")):
            channels.append(
                RawChannel(
                    name=pending_name,
                    url=line,
                    logo=pending_attrs.get("tvg-logo", ""),
                    group=pending_attrs.get("group-title", default_group) or default_group or "Uncategorized",
                    tvg_id=pending_attrs.get("tvg-id", ""),
                    country=pending_attrs.get("tvg-country", ""),
                )
            )
            pending_attrs = None
            pending_name = ""

    return channels


_QUALITY_SUFFIX_RE = re.compile(r'\s*[\(\[]\s*(\d{3,4}p|hd|fhd|uhd|4k|sd)\s*[\)\]]\s*$', re.IGNORECASE)
_QUALITY_WORD_RE = re.compile(r'\b(hd|fhd|uhd|4k|sd|backup|raw)\b', re.IGNORECASE)


def clean_display_name(name: str) -> str:
    """Strip trailing resolution/quality noise like "(1080p)" or "HD" from a
    channel name for display, without touching the rest of the name."""
    cleaned = _QUALITY_SUFFIX_RE.sub('', name).strip()
    return cleaned or name


def _normalize_name(name: str) -> str:
    """Collapse a channel name to a key used for de-duplication / fallback grouping.

    Strips common quality/region suffixes like "HD", "(720p)", bracketed
    notes, extra whitespace, and lowercases everything, so that e.g.
    "BBC News HD" and "BBC News" group together as fallback sources for the
    same logical channel.
    """
    n = name.lower()
    n = re.sub(r'\(.*?\)', '', n)          # drop parenthetical notes
    n = re.sub(r'\[.*?\]', '', n)          # drop bracketed notes
    n = _QUALITY_WORD_RE.sub('', n)
    n = re.sub(r'[^a-z0-9]+', ' ', n)
    return n.strip()


@dataclass
class GroupedChannel:
    name: str
    logo: str
    group: str
    tvg_id: str
    sources: list[str] = field(default_factory=list)


def group_with_fallbacks(raw_channels: list[RawChannel]) -> list[GroupedChannel]:
    """Group raw channel entries that represent the same logical channel.

    Channels are grouped by normalized name (and tvg-id when present) so
    that multiple stream URLs for "the same channel" become an ordered
    fallback list (`sources`). The first entry encountered determines the
    display name/logo/group used for the merged result.
    """
    by_key: dict[str, GroupedChannel] = {}
    order: list[str] = []

    for ch in raw_channels:
        key = ch.tvg_id.strip().lower() if ch.tvg_id.strip() else _normalize_name(ch.name)
        if not key:
            key = ch.name.lower()

        if key not in by_key:
            by_key[key] = GroupedChannel(
                name=clean_display_name(ch.name),
                logo=ch.logo,
                group=ch.group,
                tvg_id=ch.tvg_id,
                sources=[ch.url],
            )
            order.append(key)
        else:
            existing = by_key[key]
            if ch.url not in existing.sources:
                existing.sources.append(ch.url)
            if not existing.logo and ch.logo:
                existing.logo = ch.logo

    return [by_key[k] for k in order]
