"""Gera slides PNG para um carrossel do Instagram.

Exemplo:
    python gerar_carrossel_instagram.py --config carrossel.json

O arquivo JSON deve conter:
{
  "textos": ["Primeiro slide", "Segundo slide"],
  "tema": {
    "cor_fundo": "#121212",
    "cor_texto": "#FFFFFF",
    "fonte": "C:/Windows/Fonts/arial.ttf"
  }
}
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageColor, ImageDraw, ImageFont


LARGURA = 1080
ALTURA = 1350
MARGEM_HORIZONTAL = 110
MARGEM_VERTICAL = 140
TAMANHO_FONTE = 76
TAMANHO_NUMERACAO = 32
ESPACAMENTO_LINHAS = 18


def carregar_fonte(caminho: str | Path, tamanho: int) -> ImageFont.FreeTypeFont:
    caminho = Path(caminho).expanduser()
    if not caminho.is_file():
        raise FileNotFoundError(f"Fonte não encontrada: {caminho}")
    return ImageFont.truetype(str(caminho), tamanho)


def quebrar_texto(
    texto: str,
    desenho: ImageDraw.ImageDraw,
    fonte: ImageFont.FreeTypeFont,
    largura_maxima: int,
) -> list[str]:
    """Quebra o texto por palavras, preservando quebras de linha explícitas."""
    linhas: list[str] = []

    for paragrafo in texto.splitlines() or [""]:
        palavras = paragrafo.split()
        if not palavras:
            linhas.append("")
            continue

        linha_atual = palavras[0]
        for palavra in palavras[1:]:
            candidata = f"{linha_atual} {palavra}"
            caixa = desenho.textbbox((0, 0), candidata, font=fonte)
            if caixa[2] - caixa[0] <= largura_maxima:
                linha_atual = candidata
            else:
                linhas.append(linha_atual)
                linha_atual = palavra
        linhas.append(linha_atual)

    return linhas


def ajustar_texto(
    texto: str,
    desenho: ImageDraw.ImageDraw,
    caminho_fonte: str | Path,
    largura_maxima: int,
    altura_maxima: int,
) -> tuple[list[str], ImageFont.FreeTypeFont, int]:
    """Reduz a fonte, quando necessário, para que o texto caiba no slide."""
    for tamanho in range(TAMANHO_FONTE, 31, -2):
        fonte = carregar_fonte(caminho_fonte, tamanho)
        linhas = quebrar_texto(texto, desenho, fonte, largura_maxima)
        caixa = desenho.multiline_textbbox(
            (0, 0), "\n".join(linhas), font=fonte, spacing=ESPACAMENTO_LINHAS,
            align="center",
        )
        if caixa[3] - caixa[1] <= altura_maxima:
            return linhas, fonte, tamanho

    raise ValueError("O texto é longo demais para caber no slide com legibilidade.")


def gerar_carrossel(
    textos: list[str],
    tema: dict[str, str],
    pasta_saida: str | Path = "output",
) -> list[Path]:
    if not textos or not all(isinstance(texto, str) and texto.strip() for texto in textos):
        raise ValueError("'textos' deve ser uma lista não vazia de textos.")

    campos = {"cor_fundo", "cor_texto", "fonte"}
    ausentes = campos - tema.keys()
    if ausentes:
        raise ValueError(f"Campos ausentes no tema: {', '.join(sorted(ausentes))}")

    cor_fundo = ImageColor.getrgb(tema["cor_fundo"])
    cor_texto = ImageColor.getrgb(tema["cor_texto"])
    fonte_numeracao = carregar_fonte(tema["fonte"], TAMANHO_NUMERACAO)
    pasta = Path(pasta_saida)
    pasta.mkdir(parents=True, exist_ok=True)
    arquivos: list[Path] = []

    for indice, texto in enumerate(textos, start=1):
        imagem = Image.new("RGB", (LARGURA, ALTURA), cor_fundo)
        desenho = ImageDraw.Draw(imagem)
        linhas, fonte, _ = ajustar_texto(
            texto.strip(), desenho, tema["fonte"],
            LARGURA - 2 * MARGEM_HORIZONTAL,
            ALTURA - 2 * MARGEM_VERTICAL,
        )
        texto_formatado = "\n".join(linhas)
        caixa = desenho.multiline_textbbox(
            (0, 0), texto_formatado, font=fonte,
            spacing=ESPACAMENTO_LINHAS, align="center",
        )
        altura_texto = caixa[3] - caixa[1]
        y = (ALTURA - altura_texto) / 2 - caixa[1]
        desenho.multiline_text(
            (LARGURA / 2, y), texto_formatado, font=fonte,
            fill=cor_texto, anchor="ma", align="center",
            spacing=ESPACAMENTO_LINHAS,
        )

        numeracao = f"{indice:02d} / {len(textos):02d}"
        desenho.text(
            (LARGURA - 60, ALTURA - 55), numeracao,
            font=fonte_numeracao, fill=cor_texto, anchor="rs",
        )

        destino = pasta / f"slide_{indice:02d}.png"
        imagem.save(destino, "PNG", optimize=True)
        arquivos.append(destino)

    return arquivos


def ler_configuracao(caminho: str | Path) -> dict[str, Any]:
    with Path(caminho).open("r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera um carrossel 1080x1350 em PNG.")
    parser.add_argument("--config", required=True, help="Arquivo JSON com textos e tema.")
    parser.add_argument("--output", default="output", help="Pasta de saída (padrão: output).")
    args = parser.parse_args()

    config = ler_configuracao(args.config)
    arquivos = gerar_carrossel(config["textos"], config["tema"], args.output)
    print(f"{len(arquivos)} slide(s) gerado(s) em: {Path(args.output).resolve()}")


if __name__ == "__main__":
    main()
