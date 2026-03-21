const axios = require("axios");
const cheerio = require("cheerio");

// ✅ 1. Fetch raw HTML from Google Docs
async function getGoogleDocHTML(docId) {
    try {
        const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
        console.log(`🔗 Fetching: ${url}`);
        const response = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        console.log(`✅ HTML fetched: ${response.data.length} chars`);
        return response.data;
    } catch (error) {
        console.error(`❌ getGoogleDocHTML error:`, error.message);
        return "";
    }
}

// ✅ 2. Extract section by date range
async function getLatestWeekHTML(docId, startDate, endDate) {
    try {
        const fullHTML = await getGoogleDocHTML(docId);
        if (!fullHTML) {
            console.warn("⚠️ No HTML content from Google Doc");
            return "";
        }

        const $ = cheerio.load(fullHTML);

        const reportStart = new Date(startDate);
        const reportEnd = new Date(endDate);

        console.log(`📅 Report period: ${reportStart.toLocaleDateString('en-IN')} → ${reportEnd.toLocaleDateString('en-IN')}`);

        // Parse DD-MM-YYYY format
        function parseDocDate(str) {
            const match = str.match(/(\d{2})-(\d{2})-(\d{4})/);
            if (!match) return null;
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
        }

        let targetHeading = null;
        let foundSections = [];

        // Scan all headings and paragraphs
        $("h1, h2, h3, h4, p, span").each((i, el) => {
            const text = $(el).text().trim();

            // Match format: "09-03-2026 to 13-03-2026" or "09-03-2026  to  13-03-2026"
            if (text.includes(" to ") && text.match(/\d{2}-\d{2}-\d{4}/)) {
                const parts = text.split(/\s+to\s+/);
                if (parts.length !== 2) return;

                const secStart = parseDocDate(parts[0].trim());
                const secEnd = parseDocDate(parts[1].trim());

                if (!secStart || !secEnd) return;

                foundSections.push({
                    element: el,
                    text: text,
                    secStart,
                    secEnd
                });

                console.log(`📄 Found section: ${text}`);

                // ✅ Check for date overlap
                const hasOverlap = !(secEnd < reportStart || secStart > reportEnd);

                // Or exact start date match
                const sameStart =
                    secStart.getDate() === reportStart.getDate() &&
                    secStart.getMonth() === reportStart.getMonth() &&
                    secStart.getFullYear() === reportStart.getFullYear();

                if (hasOverlap || sameStart) {
                    targetHeading = el;
                    console.log(`✅ MATCHED: ${text}`);
                    return false; // Stop loop
                }
            }
        });

        let sectionHTML = "";

        if (targetHeading) {
            console.log(`✅ Using matched section: ${$(targetHeading).text().trim()}`);

            sectionHTML += $.html(targetHeading);

            let next = $(targetHeading).next();
            while (next.length) {
                const text = next.text().trim();

                // Stop at next date section
                if (
                    text.includes(" to ") &&
                    text.match(/\d{2}-\d{2}-\d{4}/) &&
                    (next.is("h1") || next.is("h2") || next.is("h3") || next.is("h4") || next.is("p") || next.is("span"))
                ) {
                    console.log(`🛑 Stopping at next section: ${text}`);
                    break;
                }

                sectionHTML += $.html(next);
                next = next.next();
            }
        } else {
            console.log("⚠️ No exact match — trying fallback...");

            if (foundSections.length > 0) {
                // ✅ Use ONLY latest section (last one)
                const latestSection = foundSections[foundSections.length - 1];
                console.log(`✅ Fallback: Using LATEST section ONLY: ${latestSection.text}`);

                sectionHTML += $.html(latestSection.element);

                let next = $(latestSection.element).next();
                while (next.length) {
                    const text = next.text().trim();
                    // Stop at next date section
                    if (text.includes(" to ") && text.match(/\d{2}-\d{2}-\d{4}/)) {
                        console.log(`🛑 Stopping at next section`);
                        break;
                    }
                    sectionHTML += $.html(next);
                    next = next.next();
                }
            } else {
                // ✅ If no date sections, return empty (don't include full doc)
                console.log("⚠️ No date sections found — returning empty");
                sectionHTML = "";
            }
        }

        if (!sectionHTML) {
            console.warn("⚠️ No section content extracted");
            return "";
        }

        const result = `
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

        console.log(`✅ Final HTML: ${result.length} chars`);
        return result;

    } catch (error) {
        console.error(`❌ getLatestWeekHTML error:`, error.message);
        return "";
    }
}

// ✅ 3. Generate AI-friendly summary (for context)
const generateSEOSummary = (report) => {
    let summary = [];

    // Traffic analysis
    if (report.traffic > 700) {
        summary.push("Traffic growth is strong.");
    } else if (report.traffic > 300) {
        summary.push("Traffic growth is moderate.");
    } else {
        summary.push("Traffic needs improvement.");
    }

    // Keyword analysis
    if (report.keywords > 50) {
        summary.push("Keyword rankings performing well.");
    } else if (report.keywords > 20) {
        summary.push("Keyword ranking improving.");
    } else {
        summary.push("More keyword optimization required.");
    }

    // Backlink analysis
    if (report.backlinks > 40) {
        summary.push("Backlink profile is strong.");
    } else if (report.backlinks > 15) {
        summary.push("Backlink profile healthy.");
    } else {
        summary.push("Need to build more backlinks.");
    }

    return summary.join(" ");
};

// ✅ EXPORT - All three functions
module.exports = {
    getGoogleDocHTML,
    getLatestWeekHTML,
    generateSEOSummary
};