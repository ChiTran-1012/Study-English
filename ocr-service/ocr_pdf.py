
import sys
import json
import io
from pathlib import Path

import pymupdf
import pytesseract
from PIL import Image

# Đường dẫn Tesseract trên Windows
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_pdf_text(pdf_path: str):
    path = Path(pdf_path)

    if not path.is_file():
        raise FileNotFoundError("Không tìm thấy file PDF")

    pages = []

    with pymupdf.open(str(path)) as document:
        if not document.is_pdf:
            raise ValueError("File không phải PDF")

        # Giới hạn để tránh xử lý tài liệu quá lớn
        if document.page_count > 300:
            raise ValueError("PDF vượt quá 300 trang")

        for page_index, page in enumerate(document):
            # Render trang PDF thành ảnh 150 DPI
            pix = page.get_pixmap(
    dpi=200,
    colorspace=pymupdf.csRGB,
    alpha=False
)

            image = Image.open(
                io.BytesIO(pix.tobytes("png"))
            )

            # OCR tiếng Anh trước
            text = pytesseract.image_to_string(
                image,
                lang="eng",
                config="--psm 3"
            )

            pages.append({
                "pageNumber": page_index + 1,
                "content": text.strip()
            })

    return {
        "success": True,
        "totalPages": len(pages),
        "pages": pages
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError(
                "Cách dùng: python ocr_pdf.py <duong_dan_pdf>"
            )

        result = extract_pdf_text(sys.argv[1])

        print(json.dumps(
            result,
            ensure_ascii=False
        ))

    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error)
        }, ensure_ascii=False))
        sys.exit(1)
