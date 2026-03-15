const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendReportEmail(toEmail, pdfPath, clientName, startDate, endDate) {

    // Date format: "8 Mar 2026"
    const formatDate = (date) => new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const period = `${formatDate(startDate)} – ${formatDate(endDate)}`;
    const currentYear = new Date().getFullYear();

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; }
            .wrapper { max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 36px 40px; text-align: center; }
            .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
            .header p { color: #c2d8ff; font-size: 13px; margin-top: 6px; }
            .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #fff; font-size: 12px; padding: 4px 14px; border-radius: 20px; margin-top: 12px; border: 1px solid rgba(255,255,255,0.3); }
            .body { padding: 36px 40px; }
            .greeting { font-size: 16px; color: #333; font-weight: 600; margin-bottom: 12px; }
            .intro { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 24px; }
            .highlights { background: #f0f5ff; border-left: 4px solid #1a73e8; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px; }
            .highlights p { font-size: 13px; color: #444; font-weight: 600; margin-bottom: 10px; }
            .highlights ul { padding-left: 18px; }
            .highlights ul li { font-size: 13px; color: #555; line-height: 2; }
            .cta-text { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 28px; }
            .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
            .signature { font-size: 13px; color: #666; line-height: 1.8; }
            .signature strong { color: #333; font-size: 14px; }
            .footer { background: #f9fafb; padding: 18px 40px; text-align: center; border-top: 1px solid #eee; }
            .footer p { font-size: 11px; color: #aaa; }
        </style>
    </head>
    <body>
        <div class="wrapper">

            <div class="header">
                <h1>📊 SEO Performance Report</h1>
                <p>Detailed analysis for your review</p>
                <span class="badge">📅 ${period}</span>
            </div>

            <div class="body">
                <p class="greeting">Hi ${clientName},</p>
                <p class="intro">
                    I hope you're doing well! Please find attached your <strong>SEO Performance Report</strong> 
                    for the period <strong>${period}</strong>.
                </p>

                <div class="highlights">
                    <p>📌 This report covers:</p>
                    <ul>
                        <li>✅ Keyword Rankings & Movement</li>
                        <li>✅ Organic Traffic Performance</li>
                        <li>✅ Backlinks Progress</li>
                        <li>✅ On-Page & Technical SEO Updates</li>
                        <li>✅ Content & Optimization Work Done</li>
                    </ul>
                </div>

                <p class="cta-text">
                    Please review the attached PDF report at your convenience. 
                    If you have any questions, need clarification, or would like to schedule 
                    a call to discuss the results — feel free to reply to this email. We're always happy to help!
                </p>

                <hr class="divider">

                <div class="signature">
                    <strong>Vivek Sisodiya</strong><br>
                    SEO Strategist &amp; Automation Lead<br>
                    📧 ${process.env.EMAIL_USER}<br>
                    🌐 your-agency.com
                </div>
            </div>

            <div class="footer">
                <p>© ${currentYear} Your Agency. This is an automated report email.</p>
            </div>

        </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: `"SEO Reports" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `📊 SEO Report – ${clientName} | ${period}`,
        html: htmlBody,
        attachments: [
            {
                filename: `SEO-Report-${clientName}-${formatDate(startDate)}.pdf`,
                path: pdfPath
            }
        ]
    });

    console.log("📧 Report email sent to:", toEmail);
}

module.exports = sendReportEmail;