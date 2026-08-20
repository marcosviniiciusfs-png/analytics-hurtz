from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


OUT = Path(__file__).resolve().parent
SOURCE = OUT.parent / "Logo integra.jpg"
FONT = OUT / "assets" / "Montserrat-Variable.ttf"
SVG_PATH = OUT / "logo-integra-profissional.svg"
RENDER_PATH = OUT / "logo-integra-profissional-render.png"
PREVIEW_PATH = OUT / "logo-integra-profissional-preview.png"
SIDE_BY_SIDE_PATH = OUT / "auditoria-profissional-lado-a-lado.png"
OVERLAY_PATH = OUT / "auditoria-profissional-sobreposicao.png"
DIFF_PATH = OUT / "auditoria-profissional-diferenca.png"
REPORT_JSON = OUT / "auditoria-profissional.json"
REPORT_MD = OUT / "auditoria-profissional.md"

WIDTH = 1080
HEIGHT = 1080
BG = np.array([217, 221, 224], dtype=np.uint8)  # BGR #E0DDD9


@dataclass(frozen=True)
class TextLayout:
    text: str
    weight: int
    tracking_units: float
    bbox: tuple[float, float, float, float]
    fill: str
    group_id: str
    path_prefix: str
    glyph_bboxes: tuple[tuple[float, float, float, float], ...] = ()


TITLE = TextLayout(
    text="INTEGRA",
    weight=675,
    tracking_units=-22,
    bbox=(344, 475, 960, 577),
    fill="#0E2E49",
    group_id="integra",
    path_prefix="letra",
    glyph_bboxes=(
        (344, 475, 366, 576),
        (386, 475, 473, 576),
        (485, 475, 565, 576),
        (579, 475, 652, 576),
        (661, 473, 754, 577),
        (773, 475, 853, 576),
        (866, 475, 960, 576),
    ),
)

TAGLINE = TextLayout(
    text="ASSESSORIA CONTÁBIL",
    weight=500,
    tracking_units=147,
    bbox=(345, 597, 965, 638),
    fill="#363C40",
    group_id="assessoria-contabil",
    path_prefix="glifo",
    glyph_bboxes=(
        (345, 606, 376, 638),
        (385, 606, 408, 638),
        (417, 606, 440, 638),
        (451, 606, 474, 638),
        (484, 606, 507, 638),
        (516, 606, 539, 638),
        (548, 606, 580, 638),
        (592, 606, 617, 638),
        (629, 606, 633, 638),
        (644, 606, 675, 638),
        (702, 606, 728, 638),
        (737, 606, 768, 638),
        (780, 606, 806, 638),
        (818, 606, 843, 638),
        (847, 597, 877, 638),
        (888, 606, 912, 638),
        (924, 606, 929, 638),
        (942, 606, 965, 638),
    ),
)


def read_image(path: Path, unchanged: bool = False) -> np.ndarray:
    data = np.fromfile(str(path), dtype=np.uint8)
    flag = cv2.IMREAD_UNCHANGED if unchanged else cv2.IMREAD_COLOR
    image = cv2.imdecode(data, flag)
    if image is None:
        raise RuntimeError(f"Nao foi possivel abrir {path}")
    return image


def write_image(path: Path, image: np.ndarray) -> None:
    ok, encoded = cv2.imencode(path.suffix, image)
    if not ok:
        raise RuntimeError(f"Nao foi possivel codificar {path}")
    encoded.tofile(str(path))


def prepare_font(weight: int) -> TTFont:
    variable = TTFont(str(FONT))
    return instantiateVariableFont(variable, {"wght": weight}, inplace=False)


def glyph_layout(layout: TextLayout) -> str:
    font = prepare_font(layout.weight)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"].metrics

    glyphs: list[tuple[str, str, float, tuple[float, float, float, float]]] = []
    cursor = 0.0
    for character in layout.text:
        glyph_name = cmap[ord(character)]
        bounds_pen = BoundsPen(glyph_set)
        glyph_set[glyph_name].draw(bounds_pen)
        bounds = bounds_pen.bounds or (0.0, 0.0, 0.0, 0.0)
        path_pen = SVGPathPen(glyph_set)
        glyph_set[glyph_name].draw(path_pen)
        glyphs.append((character, path_pen.getCommands(), cursor, bounds))
        cursor += hmtx[glyph_name][0] + layout.tracking_units

    non_space = [item for item in glyphs if item[1]]
    min_x = min(cursor_x + bounds[0] for _, _, cursor_x, bounds in non_space)
    max_x = max(cursor_x + bounds[2] for _, _, cursor_x, bounds in non_space)
    min_y = min(bounds[1] for _, _, _, bounds in non_space)
    max_y = max(bounds[3] for _, _, _, bounds in non_space)

    x1, y1, x2, y2 = layout.bbox
    scale_x = (x2 - x1) / (max_x - min_x)
    scale_y = (y2 - y1) / (max_y - min_y)
    translate_x = x1 - min_x * scale_x
    translate_y = y2 + min_y * scale_y

    elements: list[str] = []
    visible_index = 0
    for character, path, cursor_x, _ in glyphs:
        if not path:
            continue
        visible_index += 1
        element_id = f"{layout.path_prefix}-{visible_index:02d}"
        if layout.glyph_bboxes:
            glyph_bounds = non_space[visible_index - 1][3]
            target_x1, target_y1, target_x2, target_y2 = layout.glyph_bboxes[visible_index - 1]
            glyph_scale_x = (target_x2 - target_x1) / (glyph_bounds[2] - glyph_bounds[0])
            glyph_scale_y = (target_y2 - target_y1) / (glyph_bounds[3] - glyph_bounds[1])
            glyph_x = target_x1 - glyph_bounds[0] * glyph_scale_x
            glyph_y = target_y2 + glyph_bounds[1] * glyph_scale_y
        else:
            glyph_scale_x = scale_x
            glyph_scale_y = scale_y
            glyph_x = translate_x + cursor_x * scale_x
            glyph_y = translate_y
        elements.append(
            f'      <path id="{element_id}" data-char="{character}" d="{path}" '
            f'transform="translate({glyph_x:.5f} {glyph_y:.5f}) scale({glyph_scale_x:.8f} {-glyph_scale_y:.8f})" />'
        )

    return (
        f'    <g id="{layout.group_id}" fill="{layout.fill}" '
        f'filter="url(#wordmark-shadow)">\n' + "\n".join(elements) + "\n    </g>"
    )


def build_svg() -> str:
    title = glyph_layout(TITLE)
    tagline = glyph_layout(TAGLINE)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <title>Integra Assessoria Contábil</title>
  <desc>Reconstrução vetorial profissional, separada em elementos animáveis.</desc>
  <defs>
    <linearGradient id="green-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#648B3A" />
      <stop offset="1" stop-color="#4F7846" />
    </linearGradient>
    <linearGradient id="orange-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F67C2B" />
      <stop offset="1" stop-color="#EE7D30" />
    </linearGradient>
    <filter id="symbol-shadow" x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#6B625B" flood-opacity="0.14" />
    </filter>
    <filter id="wordmark-shadow" x="-10%" y="-20%" width="125%" height="160%">
      <feDropShadow dx="1" dy="1.5" stdDeviation="1.5" flood-color="#6B625B" flood-opacity="0.08" />
    </filter>
  </defs>
  <g id="simbolo" filter="url(#symbol-shadow)">
    <g id="barras" fill="url(#green-gradient)">
      <rect id="barra-01" x="152" y="578" width="37" height="64" />
      <rect id="barra-02" x="206" y="550" width="37" height="92" />
      <rect id="barra-03" x="259" y="507" width="37" height="135" />
    </g>
    <path id="seta" fill="url(#orange-gradient)" d="M128 559
      C216.01 522.85 243.60 470.30 268 454
      L256 434 L303 434 L303 481 L286 471
      C279.40 463.26 221.89 555.14 128 561 Z" />
  </g>
{title}
{tagline}
</svg>
'''


def render_svg() -> np.ndarray:
    subprocess.run(
        ["node", str(OUT / "render-svg.mjs"), str(SVG_PATH), str(RENDER_PATH)],
        cwd=OUT,
        check=True,
    )
    return read_image(RENDER_PATH, unchanged=True)


def source_masks(image: np.ndarray) -> dict[str, np.ndarray]:
    b, g, r = cv2.split(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    arrow = ((r > 150) & ((r.astype(np.int16) - g.astype(np.int16)) > 55) & (g > 55) & (b < 130))
    bars = ((g > 72) & ((g.astype(np.int16) - b.astype(np.int16)) > 25) & ((g.astype(np.int16) - r.astype(np.int16)) > 12) & (r < 150))
    title = ((gray < 128) & ((b.astype(np.int16) - g.astype(np.int16)) > 10) & ((b.astype(np.int16) - r.astype(np.int16)) > 24))
    tagline = gray < 130

    spatial = {
        "arrow": (arrow, (105, 395, 320, 580)),
        "bars": (bars, (125, 470, 315, 665)),
        "title": (title, (325, 440, 980, 590)),
        "tagline": (tagline, (325, 585, 980, 665)),
    }
    result: dict[str, np.ndarray] = {}
    for name, (raw, (x1, y1, x2, y2)) in spatial.items():
        mask = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
        mask[y1:y2, x1:x2] = raw[y1:y2, x1:x2].astype(np.uint8) * 255
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        minimum = 5 if name == "tagline" else 18
        cleaned = np.zeros_like(mask)
        for index in range(1, count):
            if stats[index, cv2.CC_STAT_AREA] >= minimum:
                cleaned[labels == index] = 255
        result[name] = cleaned
    return result


def nearest_color_masks(rendered: np.ndarray) -> dict[str, np.ndarray]:
    bgr = rendered[:, :, :3].astype(np.float32)
    alpha = rendered[:, :, 3] > 100
    colors = {
        "arrow": np.array([35, 119, 245], dtype=np.float32),
        "bars": np.array([62, 132, 86], dtype=np.float32),
        "title": np.array([73, 46, 14], dtype=np.float32),
        "tagline": np.array([64, 60, 54], dtype=np.float32),
    }
    names = list(colors)
    distances = np.stack([np.linalg.norm(bgr - colors[name], axis=2) for name in names], axis=2)
    labels = np.argmin(distances, axis=2)
    boxes = {
        "arrow": (105, 395, 320, 580),
        "bars": (125, 470, 315, 665),
        "title": (325, 440, 980, 590),
        "tagline": (325, 585, 980, 665),
    }
    result: dict[str, np.ndarray] = {}
    for index, name in enumerate(names):
        x1, y1, x2, y2 = boxes[name]
        mask = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
        selected = ((labels == index) & alpha).astype(np.uint8) * 255
        mask[y1:y2, x1:x2] = selected[y1:y2, x1:x2]
        result[name] = mask
    return result


def bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    y, x = np.where(mask > 0)
    return int(x.min()), int(y.min()), int(x.max()), int(y.max())


def mask_metrics(source: np.ndarray, vector: np.ndarray) -> dict[str, float | list[int]]:
    a = source > 0
    b = vector > 0
    intersection = np.logical_and(a, b).sum()
    union = np.logical_or(a, b).sum()
    iou = float(intersection / union) if union else 1.0
    source_edge = cv2.Canny(source, 50, 150) > 0
    vector_edge = cv2.Canny(vector, 50, 150) > 0
    to_vector = cv2.distanceTransform((~vector_edge).astype(np.uint8), cv2.DIST_L2, 3)
    to_source = cv2.distanceTransform((~source_edge).astype(np.uint8), cv2.DIST_L2, 3)
    edge_error = float((to_vector[source_edge].mean() + to_source[vector_edge].mean()) / 2)
    source_bbox = bbox(source)
    vector_bbox = bbox(vector)
    bbox_error = max(abs(a - b) for a, b in zip(source_bbox, vector_bbox))
    return {
        "iou": round(iou, 5),
        "erro_borda_px": round(edge_error, 4),
        "bbox_fonte": list(source_bbox),
        "bbox_vetor": list(vector_bbox),
        "erro_bbox_max_px": int(bbox_error),
    }


def perceptual_score(source: np.ndarray, preview: np.ndarray, source_union: np.ndarray, vector_union: np.ndarray) -> float:
    x1, y1, x2, y2 = 110, 410, 980, 665
    normalized_source = source.copy()
    normalized_preview = preview.copy()
    normalized_source[~source_union] = BG
    normalized_preview[~vector_union] = BG
    source_roi = normalized_source[y1:y2, x1:x2].astype(np.float32)
    preview_roi = normalized_preview[y1:y2, x1:x2].astype(np.float32)
    source_gray = cv2.cvtColor(source_roi.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    preview_gray = cv2.cvtColor(preview_roi.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    source_gray = cv2.GaussianBlur(source_gray, (5, 5), 1.2)
    preview_gray = cv2.GaussianBlur(preview_gray, (5, 5), 1.2)
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    mu_x = cv2.GaussianBlur(source_gray, (11, 11), 1.5)
    mu_y = cv2.GaussianBlur(preview_gray, (11, 11), 1.5)
    sigma_x = cv2.GaussianBlur(source_gray * source_gray, (11, 11), 1.5) - mu_x * mu_x
    sigma_y = cv2.GaussianBlur(preview_gray * preview_gray, (11, 11), 1.5) - mu_y * mu_y
    sigma_xy = cv2.GaussianBlur(source_gray * preview_gray, (11, 11), 1.5) - mu_x * mu_y
    ssim = ((2 * mu_x * mu_y + c1) * (2 * sigma_xy + c2)) / ((mu_x * mu_x + mu_y * mu_y + c1) * (sigma_x + sigma_y + c2))
    return float(np.mean(ssim))


def create_visual_proofs(source: np.ndarray, rendered: np.ndarray, masks_source: dict[str, np.ndarray], masks_vector: dict[str, np.ndarray]) -> np.ndarray:
    alpha = rendered[:, :, 3:4].astype(np.float32) / 255.0
    background = np.full((HEIGHT, WIDTH, 3), BG, dtype=np.float32)
    preview = rendered[:, :, :3].astype(np.float32) * alpha + background * (1 - alpha)
    preview = np.clip(preview, 0, 255).astype(np.uint8)
    write_image(PREVIEW_PATH, preview)

    source_union = np.maximum.reduce(list(masks_source.values())) > 0
    vector_union = np.maximum.reduce(list(masks_vector.values())) > 0
    overlay = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    overlay[source_union] = (0, 0, 255)
    overlay[vector_union] = np.maximum(overlay[vector_union], np.array([255, 255, 0], dtype=np.uint8))
    overlay[np.logical_and(source_union, vector_union)] = (255, 255, 255)
    write_image(OVERLAY_PATH, overlay)

    difference = cv2.absdiff(source, preview)
    outside = ~np.logical_or(source_union, vector_union)
    difference[outside] = 0
    write_image(DIFF_PATH, np.clip(difference.astype(np.float32) * 2, 0, 255).astype(np.uint8))

    side = np.hstack([source, preview])
    write_image(SIDE_BY_SIDE_PATH, side)
    return preview


def audit(source: np.ndarray, rendered: np.ndarray) -> dict[str, object]:
    source_group_masks = source_masks(source)
    vector_group_masks = nearest_color_masks(rendered)
    preview = create_visual_proofs(source, rendered, source_group_masks, vector_group_masks)
    groups = {name: mask_metrics(source_group_masks[name], vector_group_masks[name]) for name in source_group_masks}
    source_union = np.maximum.reduce(list(source_group_masks.values())) > 0
    vector_union = np.maximum.reduce(list(vector_group_masks.values())) > 0
    ssim = perceptual_score(source, preview, source_union, vector_union)

    thresholds = {
        "arrow_iou_min": 0.88,
        "bars_iou_min": 0.93,
        "title_iou_min": 0.74,
        "tagline_iou_min": 0.62,
        "edge_error_max_px": 2.0,
        "bbox_error_max_px": 3,
        "ssim_min": 0.90,
    }
    checks = [
        groups["arrow"]["iou"] >= thresholds["arrow_iou_min"],
        groups["bars"]["iou"] >= thresholds["bars_iou_min"],
        groups["title"]["iou"] >= thresholds["title_iou_min"],
        groups["tagline"]["iou"] >= thresholds["tagline_iou_min"],
        all(group["erro_borda_px"] <= thresholds["edge_error_max_px"] for group in groups.values()),
        all(group["erro_bbox_max_px"] <= thresholds["bbox_error_max_px"] for group in groups.values()),
        ssim >= thresholds["ssim_min"],
    ]
    return {
        "status": "APROVADO" if all(checks) else "REVISAR",
        "metodo": "Reconstrucao geometrica e tipografica independente; nenhuma mascara fonte foi reutilizada como path.",
        "tipografia": {
            "familia": "Montserrat convertida em curvas",
            "titulo_peso": TITLE.weight,
            "subtitulo_peso": TAGLINE.weight,
        },
        "estrutura": {
            "barras": "3 retangulos com 4 vertices cada",
            "seta": "1 path com 2 curvas Bezier cubicas e segmentos geometricos",
            "texto": "glifos originais da fonte convertidos em paths",
        },
        "grupos": groups,
        "ssim_roi": round(ssim, 5),
        "limites": thresholds,
        "checagens": checks,
        "observacao": "A comparacao perceptiva inclui a apresentacao JPEG; pequenas diferencas de textura e sombra sao esperadas. A geometria nao copia serrilhado ou ruido.",
    }


def write_report(report: dict[str, object]) -> None:
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    groups = report["grupos"]
    text = f"""# Auditoria profissional — logo Integra

**Status:** {report['status']}

## Método

{report['metodo']}

## Resultados

- Seta: IoU `{groups['arrow']['iou']}`, erro de borda `{groups['arrow']['erro_borda_px']} px`
- Barras: IoU `{groups['bars']['iou']}`, erro de borda `{groups['bars']['erro_borda_px']} px`
- INTEGRA: IoU `{groups['title']['iou']}`, erro de borda `{groups['title']['erro_borda_px']} px`
- Subtítulo: IoU `{groups['tagline']['iou']}`, erro de borda `{groups['tagline']['erro_borda_px']} px`
- Similaridade estrutural perceptiva da região: `{report['ssim_roi']}`

## Construção

- {report['estrutura']['barras']}
- {report['estrutura']['seta']}
- {report['estrutura']['texto']}

## Observação

{report['observacao']}
"""
    REPORT_MD.write_text(text, encoding="utf-8")


def main() -> None:
    source = read_image(SOURCE)
    SVG_PATH.write_text(build_svg(), encoding="utf-8")
    rendered = render_svg()
    report = audit(source, rendered)
    write_report(report)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
