using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class Program {
    public static void Main(string[] args) {
        string outputPath = args.Length > 0 ? args[0] : "client/public/og-preview.png";
        int width = 1200;
        int height = 630;
        using (Bitmap bmp = new Bitmap(width, height))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // Background
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                new Rectangle(0, 0, width, height),
                ColorTranslator.FromHtml("#070b14"),
                ColorTranslator.FromHtml("#0f172a"),
                LinearGradientMode.ForwardDiagonal)) {
                g.FillRectangle(bgBrush, 0, 0, width, height);
            }

            // Glows
            using (SolidBrush glow1 = new SolidBrush(Color.FromArgb(30, 59, 130, 246))) {
                g.FillEllipse(glow1, 750, -80, 500, 500);
            }
            using (SolidBrush glow2 = new SolidBrush(Color.FromArgb(25, 16, 185, 129))) {
                g.FillEllipse(glow2, -50, 250, 450, 450);
            }

            // Badge Pill
            using (SolidBrush pillBg = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            using (Pen pillBorder = new Pen(ColorTranslator.FromHtml("#3b82f6"), 1.5f))
            using (Font badgeFont = new Font("Arial", 10.5f, FontStyle.Bold))
            using (SolidBrush badgeText = new SolidBrush(ColorTranslator.FromHtml("#60a5fa"))) {
                g.FillRectangle(pillBg, 80, 45, 330, 36);
                g.DrawRectangle(pillBorder, 80, 45, 330, 36);
                g.DrawString("COLLEGE PLACEMENT TRANSPARENCY", badgeFont, badgeText, 96, 54);
            }

            // Title
            using (Font titleFont = new Font("Arial", 34f, FontStyle.Bold))
            using (SolidBrush whiteBrush = new SolidBrush(Color.White)) {
                g.DrawString("Placement Reality : 3-Way Triangulation", titleFont, whiteBrush, 80, 100);
            }

            // Subtitle
            using (Font subFont = new Font("Arial", 16f, FontStyle.Regular))
            using (SolidBrush mutedBrush = new SolidBrush(ColorTranslator.FromHtml("#94a3b8"))) {
                g.DrawString("Contrasting Advertised Brochure Claims vs NIRF Affidavits vs Student Data", subFont, mutedBrush, 80, 160);
                g.DrawString("Retaliation-proof, verified data engine exposing median salary exaggerations.", subFont, mutedBrush, 80, 192);
            }

            // Cards helper
            Action<int, string, string, string, string, string> drawCard = (x, tag, label, value, sub, colHex) => {
                Color accent = ColorTranslator.FromHtml(colHex);
                using (SolidBrush cardBg = new SolidBrush(Color.FromArgb(240, 17, 24, 39)))
                using (Pen cardBorder = new Pen(accent, 1.8f))
                using (SolidBrush tagBrush = new SolidBrush(accent))
                using (SolidBrush valBrush = new SolidBrush(Color.White))
                using (SolidBrush lblBrush = new SolidBrush(ColorTranslator.FromHtml("#94a3b8")))
                using (SolidBrush subBrush = new SolidBrush(ColorTranslator.FromHtml("#cbd5e1")))
                using (Font tagFont = new Font("Arial", 9.5f, FontStyle.Bold))
                using (Font lblFont = new Font("Arial", 11.5f, FontStyle.Regular))
                using (Font valFont = new Font("Arial", 30f, FontStyle.Bold))
                using (Font subFootFont = new Font("Arial", 9.5f, FontStyle.Regular)) {
                    g.FillRectangle(cardBg, x, 255, 320, 220);
                    g.DrawRectangle(cardBorder, x, 255, 320, 220);
                    g.DrawString(tag, tagFont, tagBrush, x + 20, 275);
                    g.DrawString(label, lblFont, lblBrush, x + 20, 305);
                    g.DrawString(value, valFont, valBrush, x + 20, 345);
                    g.DrawString(sub, subFootFont, subBrush, x + 20, 420);
                }
            };

            drawCard(80, "1. ADVERTISED CLAIM", "College Brochure / PR Claim", "Rs 24.5 LPA", "Outlier / Peak package marketed", "#f43f5e");
            drawCard(440, "2. STATUTORY AFFIDAVIT", "Official NIRF Government Filing", "Rs 8.2 LPA", "Legally sworn median batch CTC", "#3b82f6");
            drawCard(800, "3. STUDENT REALITY", "Verified Student Aggregation", "Rs 7.8 LPA", "Real in-hand verified median", "#10b981");

            // Footer
            using (Pen divPen = new Pen(ColorTranslator.FromHtml("#1e293b"), 1f))
            using (Font footFont = new Font("Arial", 11f, FontStyle.Bold))
            using (SolidBrush footBrush = new SolidBrush(ColorTranslator.FromHtml("#64748b"))) {
                g.DrawLine(divPen, 80, 520, 1120, 520);
                g.DrawString("ZERO RETALIATION   *   COLLEGE EMAIL VERIFIED   *   INDEPENDENT NON-PROFIT MATRIX", footFont, footBrush, 80, 550);
            }

            bmp.Save(outputPath, ImageFormat.Png);
            Console.WriteLine("Saved banner to: " + outputPath);
        }
    }
}
