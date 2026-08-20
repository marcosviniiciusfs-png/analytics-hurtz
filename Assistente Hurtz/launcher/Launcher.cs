using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace HurtzLauncher
{
    internal sealed class RoundedPanel : Panel
    {
        public int Radius = 18;
        public Color BorderColor = Color.FromArgb(48, 255, 255, 255);

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = Rounded(rect, Radius))
            using (Pen pen = new Pen(BorderColor, 1))
            {
                Region = new Region(path);
                e.Graphics.DrawPath(pen, path);
            }
        }

        private static GraphicsPath Rounded(Rectangle r, int radius)
        {
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(r.X, r.Y, diameter, diameter, 180, 90);
            path.AddArc(r.Right - diameter, r.Y, diameter, diameter, 270, 90);
            path.AddArc(r.Right - diameter, r.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(r.X, r.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal sealed class LauncherForm : Form
    {
        private readonly string root;
        private readonly Label status;
        private Point dragOrigin;

        private static readonly Color Background = Color.FromArgb(14, 13, 12);
        private static readonly Color Surface = Color.FromArgb(27, 25, 23);
        private static readonly Color TextPrimary = Color.FromArgb(247, 243, 238);
        private static readonly Color TextMuted = Color.FromArgb(151, 143, 135);
        private static readonly Color Orange = Color.FromArgb(232, 119, 34);
        private static readonly Color Blue = Color.FromArgb(114, 168, 237);

        public LauncherForm()
        {
            root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory));
            Text = "Hurtz Launcher";
            ClientSize = new Size(1120, 590);
            BackColor = Background;
            ForeColor = TextPrimary;
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(1120, 590);
            MaximizeBox = false;
            Font = new Font("Segoe UI", 9F);
            DoubleBuffered = true;

            string iconPath = Path.Combine(root, "assets", "hurtz-logo.ico");
            if (File.Exists(iconPath)) Icon = new Icon(iconPath);

            Panel top = new Panel { Dock = DockStyle.Top, Height = 58, BackColor = Background };
            top.MouseDown += StartDrag;
            top.MouseMove += Drag;
            Controls.Add(top);

            PictureBox logo = new PictureBox {
                Location = new Point(28, 14), Size = new Size(32, 32),
                SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent
            };
            string logoPath = Path.Combine(root, "assets", "hurtz-logo.png");
            if (File.Exists(logoPath)) logo.Image = Image.FromFile(logoPath);
            top.Controls.Add(logo);

            Label brand = Label("HURTZ", 72, 15, 120, 18, 12F, FontStyle.Bold, TextPrimary);
            Label suite = Label("CENTRAL DE FERRAMENTAS", 72, 33, 180, 14, 7F, FontStyle.Bold, TextMuted);
            top.Controls.Add(brand);
            top.Controls.Add(suite);

            Button minimize = WindowButton("—", 1040);
            minimize.Click += delegate { WindowState = FormWindowState.Minimized; };
            Button close = WindowButton("×", 1078);
            close.Click += delegate { Close(); };
            top.Controls.Add(minimize);
            top.Controls.Add(close);

            Label eyebrow = Label("ESCOLHA COMO A HURTZ VAI AJUDAR", 42, 88, 500, 18, 8F, FontStyle.Bold, Orange);
            Label heading = Label("Três ferramentas. Um só ecossistema.", 42, 110, 760, 38, 23F, FontStyle.Bold, TextPrimary);
            Label description = Label(
                "Reuniões, atendimento humanizado no WhatsApp e extração de leads em um único lugar.",
                44, 153, 980, 30, 10F, FontStyle.Regular, TextMuted
            );
            Controls.Add(eyebrow);
            Controls.Add(heading);
            Controls.Add(description);

            Controls.Add(CreateMeetingCard());
            Controls.Add(CreateWhatsAppCard());
            Controls.Add(CreateLeadsCard());

            Panel footer = new Panel {
                Location = new Point(42, 538), Size = new Size(1036, 1),
                BackColor = Color.FromArgb(30, 255, 255, 255)
            };
            Controls.Add(footer);
            status = Label("Todos os componentes estão protegidos e separados.", 44, 552, 750, 20, 8F, FontStyle.Regular, TextMuted);
            Controls.Add(status);
            Controls.Add(Label("HURTZ LAUNCHER  •  v1.1.0", 900, 552, 178, 20, 7F, FontStyle.Bold, Color.FromArgb(95, 89, 84)));
        }

        private Control CreateMeetingCard()
        {
            RoundedPanel card = Card(42, 205, Orange);
            card.Controls.Add(Pill("DISPONÍVEL", 24, 23, Orange));
            card.Controls.Add(Label("Assistente de Reunião", 20, 58, 285, 28, 15F, FontStyle.Bold, TextPrimary));
            card.Controls.Add(Label(
                "Acompanha apresentações e chamadas em tempo real, transcreve canais separados e sugere respostas com base nos documentos.",
                20, 96, 286, 58, 8F, FontStyle.Regular, TextMuted
            ));
            card.Controls.Add(Feature("Transcrição e respostas ao vivo", 20, 163, Orange));
            card.Controls.Add(Feature("Documentos e próximos passos", 20, 188, Orange));
            Button open = ActionButton("ABRIR ASSISTENTE", 20, 229, 286, Orange, Color.White);
            open.Click += OpenMeetingAssistant;
            card.Controls.Add(open);
            return card;
        }

        private Control CreateWhatsAppCard()
        {
            Color green = Color.FromArgb(68, 215, 163);
            RoundedPanel card = Card(392, 205, green);
            card.Controls.Add(Pill("NOVO • MVP", 20, 23, green));
            card.Controls.Add(Label("Atendente WhatsApp", 20, 58, 285, 28, 15F, FontStyle.Bold, TextPrimary));
            card.Controls.Add(Label(
                "Atendimento humanizado conectado à Evolution API, com contexto, documentos, texto, áudio e transferência humana.",
                20, 96, 286, 58, 8F, FontStyle.Regular, TextMuted
            ));
            card.Controls.Add(Feature("Evolution API + Ollama + RAG", 20, 163, green));
            card.Controls.Add(Feature("Digitação, áudio e memória", 20, 188, green));
            Button open = ActionButton("ABRIR ATENDENTE WHATSAPP", 20, 229, 286, green, Color.FromArgb(10, 35, 27));
            open.Click += OpenWhatsAppAssistant;
            card.Controls.Add(open);
            return card;
        }

        private Control CreateLeadsCard()
        {
            RoundedPanel card = Card(742, 205, Blue);
            card.Controls.Add(Pill("NOVO • PRO", 20, 23, Blue));
            card.Controls.Add(Label("Extrator de Leads", 20, 58, 285, 28, 15F, FontStyle.Bold, TextPrimary));
            card.Controls.Add(Label(
                "Encontra oportunidades em comentários de posts públicos, organiza contatos e classifica a intenção de compra.",
                20, 96, 286, 58, 8F, FontStyle.Regular, TextMuted
            ));
            card.Controls.Add(Feature("Facebook e Instagram públicos", 20, 163, Blue));
            card.Controls.Add(Feature("Score, revisão e exportação CSV", 20, 188, Blue));
            Button open = ActionButton("ABRIR EXTRATOR DE LEADS", 20, 229, 286, Blue, Color.FromArgb(15, 26, 40));
            open.Click += OpenLeadsExtractor;
            card.Controls.Add(open);
            return card;
        }

        private RoundedPanel Card(int x, int y, Color accent)
        {
            RoundedPanel card = new RoundedPanel {
                Location = new Point(x, y), Size = new Size(326, 308),
                BackColor = Surface, BorderColor = Color.FromArgb(70, accent),
                Radius = 18
            };
            Panel stripe = new Panel { Dock = DockStyle.Top, Height = 3, BackColor = accent };
            card.Controls.Add(stripe);
            return card;
        }

        private Label Pill(string text, int x, int y, Color accent)
        {
            Label label = Label(text, x, y, 112, 22, 7F, FontStyle.Bold, accent);
            label.TextAlign = ContentAlignment.MiddleCenter;
            label.BackColor = Color.FromArgb(36, accent);
            return label;
        }

        private Label Feature(string text, int x, int y, Color accent)
        {
            Label label = Label("●  " + text, x, y, 286, 20, 8F, FontStyle.Regular, TextMuted);
            label.ForeColor = accent;
            return label;
        }

        private Button ActionButton(string text, int x, int y, int width, Color background, Color foreground)
        {
            Button button = new Button {
                Text = text, Location = new Point(x, y), Size = new Size(width, 42),
                FlatStyle = FlatStyle.Flat, BackColor = background, ForeColor = foreground,
                Cursor = Cursors.Hand, Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                TabStop = false
            };
            button.FlatAppearance.BorderSize = 0;
            return button;
        }

        private Button WindowButton(string text, int x)
        {
            Button button = new Button {
                Text = text, Location = new Point(x, 12), Size = new Size(32, 32),
                FlatStyle = FlatStyle.Flat, BackColor = Background, ForeColor = TextMuted,
                Font = new Font("Segoe UI", 13F), TabStop = false
            };
            button.FlatAppearance.BorderSize = 0;
            return button;
        }

        private static Label Label(string text, int x, int y, int width, int height, float size, FontStyle style, Color color)
        {
            return new Label {
                Text = text, Location = new Point(x, y), Size = new Size(width, height),
                Font = new Font("Segoe UI", size, style), ForeColor = color,
                BackColor = Color.Transparent, AutoEllipsis = true
            };
        }

        private void OpenMeetingAssistant(object sender, EventArgs e)
        {
            string script = Path.Combine(root, "ABRIR ASSISTENTE DE REUNIAO.vbs");
            if (!File.Exists(script)) {
                MessageBox.Show("O Assistente de Reunião não foi encontrado.", "Hurtz Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Process.Start(new ProcessStartInfo {
                FileName = "wscript.exe",
                Arguments = "\"" + script + "\"",
                WorkingDirectory = root,
                UseShellExecute = true
            });
            status.Text = "Assistente de Reunião iniciado.";
        }

        private void OpenLeadsExtractor(object sender, EventArgs e)
        {
            string script = Path.Combine(root, "extrator-leads", "ABRIR EXTRATOR DE LEADS.vbs");
            if (!File.Exists(script)) {
                MessageBox.Show("O Extrator de Leads não foi encontrado.", "Hurtz Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Process.Start(new ProcessStartInfo {
                FileName = "wscript.exe",
                Arguments = "\"" + script + "\"",
                WorkingDirectory = Path.Combine(root, "extrator-leads"),
                UseShellExecute = true
            });
            status.Text = "Extrator de Leads iniciado.";
        }

        private void OpenWhatsAppAssistant(object sender, EventArgs e)
        {
            string electron = Path.Combine(root, "overlay", "node_modules", "electron", "dist", "electron.exe");
            string desktop = Path.Combine(root, "assistente-whatsapp", "desktop");
            if (!File.Exists(electron) || !Directory.Exists(desktop)) {
                MessageBox.Show("O Atendente WhatsApp não foi encontrado.", "Hurtz Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            ProcessStartInfo desktopInfo = new ProcessStartInfo {
                FileName = electron,
                Arguments = "\"" + desktop + "\"",
                WorkingDirectory = desktop,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            desktopInfo.EnvironmentVariables["NODE_PATH"] = Path.Combine(root, "overlay", "node_modules");
            desktopInfo.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
            Process.Start(desktopInfo);
            status.Text = "Atendente Humanizado no WhatsApp iniciado.";
        }

        private void StartDrag(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left) dragOrigin = new Point(e.X, e.Y);
        }

        private void Drag(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left) {
                Location = new Point(Location.X + e.X - dragOrigin.X, Location.Y + e.Y - dragOrigin.Y);
            }
        }
    }

    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }
}
