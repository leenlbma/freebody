#!/usr/bin/env python3
"""Turn a FreeBody import pack (JSON) into an import link.

把 FreeBody 导入包（JSON）转换为导入链接。只用 Python 标准库。

Usage / 用法:
    python3 make_link.py pack.json            # 输出链接 / print the link
    cat pack.json | python3 make_link.py -    # 从标准输入读取 / read from stdin
    python3 make_link.py pack.json --base https://example.org/freebody/ --plain

The payload is base64url (no padding). By default it is deflate-raw compressed
and prefixed with "z."; --plain emits uncompressed JSON instead.
载荷为无填充的 base64url；默认 deflate-raw 压缩并加 "z." 前缀，--plain 输出未压缩版本。
"""
import argparse, base64, json, sys, zlib

DEFAULT_BASE = "https://leenlbma.github.io/freebody/"
LINK_LIMIT = 1800  # 超过时建议改用粘贴导入 / beyond this, suggest pasting instead


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def basic_check(pack: dict) -> None:
    if pack.get("freebody") != "import" or pack.get("version") != 1:
        sys.exit('error: need "freebody": "import" and "version": 1')
    entries = pack.get("entries")
    if not isinstance(entries, list) or not entries:
        sys.exit("error: entries must be a non-empty array")
    seen = set()
    for i, e in enumerate(entries):
        for k in ("type", "id", "date"):
            if k not in e:
                sys.exit(f"error: entries[{i}] is missing {k}")
        key = (e["type"], e["id"])
        if key in seen:
            sys.exit(f"error: duplicate id {e['id']}")
        seen.add(key)


def make_link(pack: dict, base: str = DEFAULT_BASE, plain: bool = False) -> str:
    raw = json.dumps(pack, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if plain:
        payload = b64url(raw)
    else:
        co = zlib.compressobj(9, zlib.DEFLATED, -15)  # raw deflate, no zlib header
        payload = "z." + b64url(co.compress(raw) + co.flush())
    return base.split("#")[0] + "#import=" + payload


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", help="pack JSON file, or - for stdin")
    ap.add_argument("--base", default=DEFAULT_BASE, help="FreeBody URL (default: %(default)s)")
    ap.add_argument("--plain", action="store_true", help="do not compress")
    a = ap.parse_args()
    text = sys.stdin.read() if a.file == "-" else open(a.file, encoding="utf-8").read()
    pack = json.loads(text)
    basic_check(pack)
    link = make_link(pack, a.base, a.plain)
    print(link)
    if len(link) > LINK_LIMIT:
        print(f"warning: link is {len(link)} characters; chat apps may truncate it. "
              "Send the JSON for Paste import instead. / 链接较长，可能被截断，建议改用粘贴导入。", file=sys.stderr)


if __name__ == "__main__":
    main()
