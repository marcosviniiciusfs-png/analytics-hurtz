"""Interface gráfica do Gerador de Carrossel para Instagram."""

from __future__ import annotations

import os
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import colorchooser, filedialog, messagebox, ttk

from gerar_carrossel_instagram import gerar_carrossel


COR_JANELA = "#171717"
COR_PAINEL = "#222222"
COR_TEXTO = "#F5F5F5"
COR_DESTAQUE = "#7C5CFC"


def fonte_padrao() -> str:
    candidatos = [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arial.ttf",
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "segoeui.ttf",
    ]
    return str(next((fonte for fonte in candidatos if fonte.is_file()), candidatos[0]))


class AppCarrossel(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Gerador de Carrossel Instagram")
        self.geometry("920x720")
        self.minsize(760, 620)
        self.configure(bg=COR_JANELA)

        self.cor_fundo = tk.StringVar(value="#121212")
        self.cor_texto = tk.StringVar(value="#FFFFFF")
        self.fonte = tk.StringVar(value=fonte_padrao())
        self.saida = tk.StringVar(value=str(Path.home() / "Desktop" / "Carrossel Instagram"))
        self.status = tk.StringVar(value="Pronto para gerar.")

        self._configurar_estilos()
        self._montar_interface()

    def _configurar_estilos(self) -> None:
        estilo = ttk.Style(self)
        estilo.theme_use("clam")
        estilo.configure("TFrame", background=COR_JANELA)
        estilo.configure("Card.TFrame", background=COR_PAINEL)
        estilo.configure("TLabel", background=COR_JANELA, foreground=COR_TEXTO)
        estilo.configure("Card.TLabel", background=COR_PAINEL, foreground=COR_TEXTO)
        estilo.configure("Title.TLabel", font=("Segoe UI", 22, "bold"))
        estilo.configure("Hint.TLabel", foreground="#AAAAAA")
        estilo.configure(
            "Accent.TButton", background=COR_DESTAQUE, foreground="white",
            font=("Segoe UI", 11, "bold"), padding=(18, 12), borderwidth=0,
        )
        estilo.map("Accent.TButton", background=[("active", "#9279FF")])
        estilo.configure("TButton", font=("Segoe UI", 10), padding=(10, 7))
        estilo.configure("TEntry", fieldbackground="#303030", foreground="white", padding=8)

    def _montar_interface(self) -> None:
        principal = ttk.Frame(self, padding=28)
        principal.pack(fill="both", expand=True)

        ttk.Label(principal, text="Gerador de Carrossel", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            principal, text="Crie imagens 1080 × 1350 prontas para o Instagram.",
            style="Hint.TLabel",
        ).pack(anchor="w", pady=(3, 20))

        ttk.Label(principal, text="Textos dos slides").pack(anchor="w")
        ttk.Label(
            principal, text="Separe cada slide com uma linha contendo apenas ---",
            style="Hint.TLabel",
        ).pack(anchor="w", pady=(2, 7))

        caixa_texto = tk.Frame(principal, bg="#303030", highlightthickness=1, highlightbackground="#444444")
        caixa_texto.pack(fill="both", expand=True, pady=(0, 18))
        self.textos = tk.Text(
            caixa_texto, wrap="word", undo=True, bg="#303030", fg=COR_TEXTO,
            insertbackground="white", selectbackground=COR_DESTAQUE,
            relief="flat", padx=14, pady=12, font=("Segoe UI", 12),
        )
        barra = ttk.Scrollbar(caixa_texto, command=self.textos.yview)
        self.textos.configure(yscrollcommand=barra.set)
        barra.pack(side="right", fill="y")
        self.textos.pack(side="left", fill="both", expand=True)
        self.textos.insert(
            "1.0",
            "5 ideias para melhorar o seu conteúdo\n---\n"
            "Comece com uma promessa clara e específica.\n---\n"
            "Use exemplos para tornar conceitos concretos.\n---\n"
            "Finalize com uma chamada para ação simples.",
        )

        configuracoes = ttk.Frame(principal, style="Card.TFrame", padding=16)
        configuracoes.pack(fill="x")
        configuracoes.columnconfigure(1, weight=1)

        self._linha_cor(configuracoes, 0, "Cor de fundo", self.cor_fundo)
        self._linha_cor(configuracoes, 1, "Cor do texto", self.cor_texto)
        self._linha_arquivo(configuracoes, 2, "Fonte", self.fonte, self._escolher_fonte)
        self._linha_arquivo(configuracoes, 3, "Pasta de saída", self.saida, self._escolher_saida)

        rodape = ttk.Frame(principal)
        rodape.pack(fill="x", pady=(18, 0))
        ttk.Label(rodape, textvariable=self.status, style="Hint.TLabel").pack(side="left")
        self.botao_gerar = ttk.Button(
            rodape, text="Gerar carrossel", style="Accent.TButton", command=self._gerar,
        )
        self.botao_gerar.pack(side="right")

    def _linha_cor(self, pai: ttk.Frame, linha: int, rotulo: str, variavel: tk.StringVar) -> None:
        ttk.Label(pai, text=rotulo, style="Card.TLabel").grid(row=linha, column=0, sticky="w", padx=(0, 14), pady=5)
        ttk.Entry(pai, textvariable=variavel).grid(row=linha, column=1, sticky="ew", pady=5)
        ttk.Button(pai, text="Escolher", command=lambda: self._escolher_cor(variavel)).grid(row=linha, column=2, padx=(8, 0), pady=5)

    def _linha_arquivo(self, pai: ttk.Frame, linha: int, rotulo: str, variavel: tk.StringVar, comando) -> None:
        ttk.Label(pai, text=rotulo, style="Card.TLabel").grid(row=linha, column=0, sticky="w", padx=(0, 14), pady=5)
        ttk.Entry(pai, textvariable=variavel).grid(row=linha, column=1, sticky="ew", pady=5)
        ttk.Button(pai, text="Procurar", command=comando).grid(row=linha, column=2, padx=(8, 0), pady=5)

    def _escolher_cor(self, variavel: tk.StringVar) -> None:
        cor = colorchooser.askcolor(color=variavel.get(), parent=self)[1]
        if cor:
            variavel.set(cor.upper())

    def _escolher_fonte(self) -> None:
        caminho = filedialog.askopenfilename(
            parent=self, title="Escolha uma fonte",
            filetypes=[("Fontes TrueType e OpenType", "*.ttf *.otf"), ("Todos os arquivos", "*.*")],
        )
        if caminho:
            self.fonte.set(caminho)

    def _escolher_saida(self) -> None:
        caminho = filedialog.askdirectory(parent=self, title="Escolha a pasta de saída")
        if caminho:
            self.saida.set(caminho)

    def _obter_textos(self) -> list[str]:
        conteudo = self.textos.get("1.0", "end-1c")
        return [parte.strip() for parte in conteudo.split("\n---\n") if parte.strip()]

    def _gerar(self) -> None:
        try:
            self.botao_gerar.configure(state="disabled")
            self.status.set("Gerando imagens...")
            self.update_idletasks()
            arquivos = gerar_carrossel(
                self._obter_textos(),
                {"cor_fundo": self.cor_fundo.get(), "cor_texto": self.cor_texto.get(), "fonte": self.fonte.get()},
                self.saida.get(),
            )
            self.status.set(f"{len(arquivos)} slide(s) gerado(s) com sucesso.")
            abrir = messagebox.askyesno(
                "Carrossel gerado",
                f"{len(arquivos)} slide(s) foram salvos em:\n{Path(self.saida.get()).resolve()}\n\nAbrir a pasta?",
                parent=self,
            )
            if abrir:
                subprocess.Popen(["explorer", str(Path(self.saida.get()).resolve())])
        except Exception as erro:
            self.status.set("Não foi possível gerar o carrossel.")
            messagebox.showerror("Erro", str(erro), parent=self)
        finally:
            self.botao_gerar.configure(state="normal")


if __name__ == "__main__":
    app = AppCarrossel()
    app.mainloop()
