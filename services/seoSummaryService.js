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

        // Parse multiple date formats
        function parseDocDate(str) {
            // Format 1: DD-MM-YYYY
            let match = str.match(/(\d{2})-(\d{2})-(\d{4})/);
            if (match) {
                return new Date(`${match[3]}-${match[2]}-${match[1]}`);
            }

            // Format 2: "D Month YYYY" or "DD Month YYYY"
            const months = {
                january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
                july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
            };

            match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
            if (match) {
                const day = parseInt(match[1]);
                const month = months[match[2].toLowerCase()];
                const year = parseInt(match[3]);
                if (month) return new Date(year, month - 1, day);
            }

            return null;
        }

        let targetHeading = null;
        let foundSections = [];

        // ✅ Find sections with date ranges
        $("*").each((i, el) => {
            const text = $(el).text().trim();

            // Look for date range patterns
            if (text.includes("to") && text.match(/\d{2}-\d{2}-\d{4}/)) {
                console.log(`📄 Found date section: ${text.substring(0, 50)}`);

                const parts = text.split(/\s+to\s+/);
                if (parts.length >= 2) {
                    const secStart = parseDocDate(parts[0].trim());
                    const secEnd = parseDocDate(parts[1].trim());

                    if (secStart && secEnd) {
                        // Check for overlap
                        const hasOverlap = !(secEnd < reportStart || secStart > reportEnd);
                        const sameStart =
                            secStart.getDate() === reportStart.getDate() &&
                            secStart.getMonth() === reportStart.getMonth() &&
                            secStart.getFullYear() === reportStart.getFullYear();

                        if (hasOverlap || sameStart) {
                            targetHeading = el;
                            console.log(`✅ MATCHED: ${text}`);
                        }

                        foundSections.push({
                            element: el,
                            text: text,
                            secStart,
                            secEnd
                        });
                    }
                }
            }
        });

        let sectionHTML = "";

        if (targetHeading) {
            console.log(`✅ Using matched section`);

            sectionHTML += $.html(targetHeading);

            // ✅ Get NEXT SIBLINGS (content after heading)
            let next = $(targetHeading).next();
            let contentAdded = 0;
            const MAX_ELEMENTS = 50; // Prevent infinite loops

            while (next.length && contentAdded < MAX_ELEMENTS) {
                const text = next.text().trim();

                // Stop at next date section
                if (text.includes("to") && text.match(/\d{2}-\d{2}-\d{4}/)) {
                    console.log(`🛑 Stopping at next section`);
                    break;
                }

                sectionHTML += $.html(next);
                contentAdded++;
                next = next.next();
            }

            console.log(`✅ Extracted ${contentAdded} content elements`);
        } else {
            if (foundSections.length > 0) {
                const latestSection = foundSections[foundSections.length - 1];
                console.log(`✅ Fallback: Using latest section`);

                sectionHTML += $.html(latestSection.element);

                let next = $(latestSection.element).next();
                let contentAdded = 0;
                const MAX_ELEMENTS = 50;

                while (next.length && contentAdded < MAX_ELEMENTS) {
                    const text = next.text().trim();
                    if (text.includes("to") && text.match(/\d{2}-\d{2}-\d{4}/)) {
                        break;
                    }
                    sectionHTML += $.html(next);
                    contentAdded++;
                    next = next.next();
                }
            } else {
                console.log("⚠️ No date sections found");
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
    h1, h2, h3, h4 { color: #1a73e8; margin-top: 20px; }
    p { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f0f5ff; font-weight: bold; }
    ul, ol { padding-left: 20px; margin-bottom: 10px; }
</style>
</head>
<body>
    <div class="report-header">
        <h1>📊 SEO Performance Report</h1>
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