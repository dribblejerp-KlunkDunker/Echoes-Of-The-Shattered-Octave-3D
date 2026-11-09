"""Build the complete Shattered Octave Books bundle from this repo.

Input is the repo's own ``story/`` tree -- markdown is the source of truth. Every
markdown file is mirrored into a staging folder, a PDF is built beside each
content document with wkhtmltopdf, page numbers are stamped afterwards with
pypdf + reportlab, and the whole thing is zipped as "Shattered Octave Books.zip".

Earlier revisions of this script expected the project docs dumped into
/mnt/user-data/outputs/projectdocs/ and restructured a pre-existing bundle
folder. Both are gone: the docs now live in the repo, so the script walks the
tree instead of carrying a routing table.

Usage:  python3 story/tools/build_bundle.py [staging-dir]

Notes worth keeping:
  * wkhtmltopdf's --footer-center [page] is silently ignored by the installed
    unpatched-Qt build, which is why page numbers are stamped afterwards.
  * pip install needs --break-system-packages in this container.
  * House style: Letter, 22/20/24/24mm margins, DejaVu Serif 11.5pt justified,
    page break before each h2.
"""
import io
import pathlib
import shutil
import subprocess
import sys
import zipfile

import re

import markdown
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

HERE = pathlib.Path(__file__).resolve()
STORY = HERE.parent.parent                      # the repo's story/ tree
BUNDLE_NAME = "Shattered Octave Books"

# Markdown that is mirrored but gets no PDF of its own.
#   - Chapters/ is Book One split up; the full-manuscript PDF covers it
#   - READMEs and the handoff note are repo housekeeping, not reading matter
NO_PDF_DIRS = {"Chapters"}
NO_PDF_NAMES = {"README.md", "_rebuild-progress.md"}
SKIP_DIRS = {"tools"}

CSS = """
<style>
@page { margin: 0; }
body { display:block !important; max-width:none !important; padding:0 !important; gap:0 !important;
       font:11.5pt/1.62 "DejaVu Serif", Georgia, serif !important; color:#111 !important;
       background:#fff !important; text-align:justify; }
h1 { font-family:"DejaVu Sans",Helvetica,sans-serif; font-size:19pt; text-align:left; margin:0 0 4pt; }
h2 { font-family:"DejaVu Sans",Helvetica,sans-serif; font-size:15pt; letter-spacing:.06em;
     text-align:left; margin:0 0 2pt; %(brk)s }
h3 { font-family:"DejaVu Serif",Georgia,serif; font-size:13pt; font-style:italic; font-weight:normal;
     text-align:left; margin:0 0 14pt; color:#333; }
h4,h5,h6 { font-family:"DejaVu Sans",Helvetica,sans-serif; text-align:left; }
h1,h2,h3,h4 { page-break-after:avoid; }
p { margin:0 0 8pt; orphans:3; widows:3; }
blockquote { font-style:italic; color:#333; border:0 !important; margin:10pt 26pt 14pt;
             font-size:10.5pt; text-align:left; page-break-inside:avoid; }
blockquote p { margin:0 0 3pt; }
hr { border:0; border-top:1px solid rgba(0,0,0,.25); width:28%%; margin:13pt auto; }
table { font-size:9pt; border-collapse:collapse; width:100%%; page-break-inside:avoid; margin:8pt 0 12pt; }
th,td { border:1px solid rgba(0,0,0,.25); padding:3pt 5pt; text-align:left; vertical-align:top; }
th { background:rgba(0,0,0,.05); font-family:"DejaVu Sans",Helvetica,sans-serif; font-size:8.5pt; }
</style>
"""


def wk(src, dest, title):
    subprocess.run(["wkhtmltopdf", "--quiet", "--enable-local-file-access", "--page-size", "Letter",
                    "--margin-top", "22mm", "--margin-bottom", "20mm",
                    "--margin-left", "24mm", "--margin-right", "24mm",
                    "--title", title, str(src), str(dest)], check=True)


def number(path):
    reader = PdfReader(str(path))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, start=1):
        if i > 1:
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=letter)
            c.setFont("Times-Roman", 9)
            c.setFillGray(0.35)
            c.drawCentredString(letter[0] / 2, 32, str(i))
            c.save()
            buf.seek(0)
            page.merge_page(PdfReader(buf).pages[0])
        writer.add_page(page)
    with open(path, "wb") as f:
        writer.write(f)
    return len(reader.pages)


# These documents contain no real HTML, but the game-text ones are full of
# angle-bracket placeholders (<name>, <TAB>, <first sentence of ...>) that the
# markdown converter would otherwise swallow as unknown tags. Escape those, and
# only those, so the PDF reads what the markdown says. Blockquote ">" at the
# start of a line is untouched.
PLACEHOLDER = re.compile(r"<([A-Za-z][^<>\n]{0,60})>")


def escape_placeholders(text):
    return PLACEHOLDER.sub(lambda m: "&lt;" + m.group(1) + "&gt;", text)


def pdf_from_markdown(md_path, dest, title, tmp, breaks=True):
    body = markdown.markdown(escape_placeholders(md_path.read_text(encoding="utf-8")),
                             extensions=["nl2br", "tables"])
    t = tmp / (dest.stem[:60] + ".html")
    t.write_text("<!doctype html><html><head><meta charset=utf-8>"
                 + (CSS % {"brk": "page-break-before:always;" if breaks else ""})
                 + "</head><body>" + body + "</body></html>", encoding="utf-8")
    wk(t, dest, title)
    return number(dest)


def sources():
    """Every markdown file under story/, as paths relative to story/."""
    out = []
    for p in sorted(STORY.rglob("*.md")):
        rel = p.relative_to(STORY)
        if set(rel.parts[:-1]) & SKIP_DIRS:
            continue
        out.append(rel)
    return out


def wants_pdf(rel):
    return rel.name not in NO_PDF_NAMES and not (set(rel.parts[:-1]) & NO_PDF_DIRS)


def main():
    staging = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 \
        else pathlib.Path.home() / "bundle-build"
    root = staging / BUNDLE_NAME
    tmp = staging / "html"
    if root.exists():
        shutil.rmtree(root)
    tmp.mkdir(parents=True, exist_ok=True)

    built, copied = [], 0
    for rel in sources():
        dest_md = root / rel
        dest_md.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(STORY / rel, dest_md)
        copied += 1
        if wants_pdf(rel):
            pages = pdf_from_markdown(dest_md, dest_md.with_suffix(".pdf"),
                                      dest_md.stem, tmp)
            built.append((str(rel.with_suffix("")), pages))

    zip_path = staging / f"{BUNDLE_NAME}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(root.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(staging))

    print("BUILT:")
    for name, pages in built:
        print(f"  {name}  ({pages} pp)")
    print(f"\n{copied} markdown files mirrored, {len(built)} PDFs built.")
    print(f"ZIP: {zip_path}  ({zip_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
