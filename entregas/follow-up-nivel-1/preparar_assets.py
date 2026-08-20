from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
ASSET = ROOT / "assets" / "editorial"

# A logo já possui transparência nativa. Mantém o original intacto e cria
# uma cópia de trabalho dentro do projeto.
logo = Image.open(r"C:\Users\Brito\Downloads\Design sem nome (8).png").convert("RGBA")
logo.save(ASSET / "logo-hurtz.png")

# Versão monocromática laranja, preservando exatamente a máscara da marca.
orange_logo = Image.new("RGBA", logo.size, (255, 90, 31, 0))
orange_logo.putalpha(logo.getchannel("A"))
orange_logo.save(ASSET / "logo-hurtz-laranja.png")

# Remove somente o branco conectado às bordas da ilustração. Áreas brancas
# internas, como camisa e detalhes, permanecem preservadas pelos contornos.
source = Image.open(ASSET / "d5-saida.png").convert("RGBA")
for point in [(0, 0), (source.width - 1, 0), (0, source.height - 1), (source.width - 1, source.height - 1)]:
    ImageDraw.floodfill(source, point, (255, 255, 255, 0), thresh=18)
# Contrai a máscara em um pixel para retirar o halo branco da antialiasagem.
alpha = source.getchannel("A").filter(ImageFilter.MinFilter(3))
source.putalpha(alpha)
source.save(ASSET / "d5-saida-transparente.png")

print(ASSET / "logo-hurtz.png")
print(ASSET / "logo-hurtz-laranja.png")
print(ASSET / "d5-saida-transparente.png")
