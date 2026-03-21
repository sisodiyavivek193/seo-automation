const axios = require("axios");
const cheerio = require("cheerio");

async function getGoogleDocHTML(docId) {
    const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
    const response = await axios.get(url);
    return response.data;
}

async function getLatestWeekHTML(docId, startDate, endDate) {
    const fullHTML = await getGoogleDocHTML(docId);
    const $ = cheerio.load(fullHTML);

    const reportStart = new Date(startDate);
    const reportEnd = new Date(endDate);

    // DD-MM-YYYY string ko Date object mein convert karo
    function parseDocDate(str) {
        const match = str.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (!match) return null;
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
    }

    let targetHeading = null;

    // Saari headings aur paragraphs scan karo
    $("h1, h2, h3, h4, p").each((i, el) => {
        const text = $(el).text().trim();

        // Format match: "09-03-2026  to  13-03-2026"
        if (text.includes(" to ") && text.match(/\d{2}-\d{2}-\d{4}/)) {
            const parts = text.split(/\s+to\s+/);
            if (parts.length !== 2) return;

            const secStart = parseDocDate(parts[0].trim());
            const secEnd = parseDocDate(parts[1].trim());

            if (!secStart || !secEnd) return;

            // Exact match — cron ki startDate se doc heading ki startDate match karo
            const sameStart =
                secStart.getDate() === reportStart.getDate() &&
                secStart.getMonth() === reportStart.getMonth() &&
                secStart.getFullYear() === reportStart.getFullYear();

            // Ya range overlap check
            const overlap = secStart >= reportStart && secEnd <= reportEnd;

            if (sameStart || overlap) {
                targetHeading = el;
                return false; // loop band karo
            }
        }
    });

    let sectionHTML = "";

    if (targetHeading) {
        console.log(`✅ Matching section found: ${$(targetHeading).text().trim()}`);

        // Heading ka HTML
        sectionHTML += $.html(targetHeading);

        // Heading ke baad ka content — next date heading tak
        let next = $(targetHeading).next();
        while (next.length) {
            const text = next.text().trim();

            // Agar next element bhi date heading hai toh rok do
            if (
                text.includes(" to ") &&
                text.match(/\d{2}-\d{2}-\d{4}/) &&
                (next.is("h1") || next.is("h2") || next.is("h3") || next.is("h4") || next.is("p"))
            ) {
                break;
            }

            sectionHTML += $.html(next);
            next = next.next();
        }
    } else {
        // Fallback: doc ki pehli heading ka content use karo
        console.log("⚠️ Matching section not found — using first section as fallback");

        const firstHeading = $("h1, h2, h3, h4, p").filter((i, el) => {
            const text = $(el).text().trim();
            return text.includes(" to ") && text.match(/\d{2}-\d{2}-\d{4}/);
        }).first();

        if (firstHeading.length) {
            sectionHTML += $.html(firstHeading);
            let next = firstHeading.next();
            while (next.length) {
                const text = next.text().trim();
                if (
                    text.includes(" to ") &&
                    text.match(/\d{2}-\d{2}-\d{4}/)
                ) break;
                sectionHTML += $.html(next);
                next = next.next();
            }
        } else {
            // Koi bhi section nahi mila — pura doc use karo
            console.log("⚠️ No date sections found — using full document");
            sectionHTML = $("body").html();
        }
    }

    // Final HTML with styling
    return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
            line-height: 1.7;
            font-size: 14px;
        }
        h1, h2, h3, h4 {
            color: #1a73e8;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        p { margin-bottom: 10px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }
        td, th {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th { background: #f0f5ff; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        img { max-width: 100%; height: auto; }
        ul, ol { padding-left: 20px; margin-bottom: 10px; }
        li { margin-bottom: 4px; }
        .report-header {
            border-bottom: 2px solid #1a73e8;
            padding-bottom: 12px;
            margin-bottom: 24px;
        }
        .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #1a73e8;
        }
    </style>
    </head>
    <body>
        <div class="report-header">
            <div class="report-title">📊 SEO Performance Report</div>
        </div>
        ${sectionHTML}
    </body>
    </html>`;
}

module.exports = { getGoogleDocHTML, getLatestWeekHTML };
