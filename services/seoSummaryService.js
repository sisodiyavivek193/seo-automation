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
                const date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                console.log(`✅ Parsed date: ${str} → ${date.toLocaleDateString('en-IN')}`);
                return date;
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
                if (month) {
                    const date = new Date(year, month - 1, day);
                    console.log(`✅ Parsed date: ${str} → ${date.toLocaleDateString('en-IN')}`);
                    return date;
                }
            }

            console.log(`❌ Failed to parse: ${str}`);
            return null;
        }

        let targetHeading = null;
        let foundSections = [];

        // ✅ Find sections with date ranges
        $("*").each((i, el) => {
            const text = $(el).text().trim();

            // ✅ Extract ONLY the date range pattern
            const dateMatch = text.match(/(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})/);

            if (dateMatch) {
                console.log(`📄 Found date section: ${dateMatch[0]}`);

                // ✅ Parse only the matched dates
                const secStart = parseDocDate(dateMatch[1]);
                const secEnd = parseDocDate(dateMatch[2]);

                if (secStart && secEnd) {
                    console.log(`📅 Section dates: ${secStart.toLocaleDateString('en-IN')} → ${secEnd.toLocaleDateString('en-IN')}`);

                    // Check for overlap
                    const hasOverlap = !(secEnd < reportStart || secStart > reportEnd);
                    const sameStart =
                        secStart.getDate() === reportStart.getDate() &&
                        secStart.getMonth() === reportStart.getMonth() &&
                        secStart.getFullYear() === reportStart.getFullYear();

                    console.log(`🔍 Match check: overlap=${hasOverlap}, sameStart=${sameStart}`);

                    if (hasOverlap || sameStart) {
                        targetHeading = el;
                        console.log(`✅ MATCHED THIS SECTION!`);
                    }

                    foundSections.push({
                        element: el,
                        text: dateMatch[0],
                        secStart,
                        secEnd
                    });
                }
            }
        });

        console.log(`\n🔍 Total sections found: ${foundSections.length}`);
        if (foundSections.length > 0) {
            console.log(`📋 Sections:`, foundSections.map(s => s.text));
        }
        console.log(`🎯 Target heading matched: ${!!targetHeading}`);

        let sectionHTML = "";

        if (targetHeading) {
            console.log(`✅ Using matched section`);
            console.log(`🔍 Heading element tag: ${targetHeading.name}`);

            sectionHTML += $.html(targetHeading);
            console.log(`✅ Added heading: ${sectionHTML.length} chars`);

            // ✅ Get NEXT SIBLINGS (content after heading)
            let current = $(targetHeading);
            let contentAdded = 0;
            const MAX_ELEMENTS = 100;

            while (contentAdded < MAX_ELEMENTS) {
                current = current.next();
                if (!current.length) {
                    console.log(`🛑 No more siblings`);
                    break;
                }

                const text = current.text().trim();

                // Stop at next date section
                if (text.match(/\d{2}-\d{2}-\d{4}\s+to\s+\d{2}-\d{2}-\d{4}/)) {
                    console.log(`🛑 Found next section, stopping`);
                    break;
                }

                const html = $.html(current);
                if (html && html.length > 0) {
                    sectionHTML += html;
                    contentAdded++;
                    console.log(`✅ Added element ${contentAdded}: ${text.substring(0, 40)}`);
                }
            }

            console.log(`✅ Total elements extracted: ${contentAdded}`);
            console.log(`📊 Total sectionHTML: ${sectionHTML.length} chars`);

        } else {
            console.log(`⚠️ No matched section found, using fallback`);

            if (foundSections.length > 0) {
                const latestSection = foundSections[foundSections.length - 1];
                console.log(`✅ Fallback: Using LATEST section: ${latestSection.text}`);

                sectionHTML += $.html(latestSection.element);
                console.log(`✅ Added heading: ${sectionHTML.length} chars`);

                let current = $(latestSection.element);
                let contentAdded = 0;
                const MAX_ELEMENTS = 100;

                while (contentAdded < MAX_ELEMENTS) {
                    current = current.next();
                    if (!current.length) {
                        console.log(`🛑 No more siblings in fallback`);
                        break;
                    }

                    const text = current.text().trim();
                    if (text.match(/\d{2}-\d{2}-\d{4}\s+to\s+\d{2}-\d{2}-\d{4}/)) {
                        console.log(`🛑 Found next section in fallback`);
                        break;
                    }

                    const html = $.html(current);
                    if (html && html.length > 0) {
                        sectionHTML += html;
                        contentAdded++;
                    }
                }

                console.log(`✅ Fallback: extracted ${contentAdded} elements`);
                console.log(`📊 Final sectionHTML: ${sectionHTML.length} chars`);
            } else {
                console.log("❌ NO DATE SECTIONS FOUND AT ALL");
            }
        }

        if (!sectionHTML || sectionHTML.length < 50) {
            console.warn(`⚠️ WARNING: sectionHTML is empty or too short (${sectionHTML.length} chars)`);
            console.log(`🔍 Content:`, sectionHTML.substring(0, 200));
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
    h1, h2, h3, h4 { color: #1a73e8; margin-top: 20px; margin-bottom: 10px; }
    p { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f0f5ff; font-weight: bold; }
    ul, ol { padding-left: 20px; margin-bottom: 10px; }
    li { margin-bottom: 5px; }
</style>
</head>
<body>
    <div class="report-header">
        <h1>📊 SEO Performance Report</h1>
    </div>
    ${sectionHTML}
</body>
</html>`;

        console.log(`\n✅ FINAL: Generated HTML with ${result.length} chars`);
        return result;

    } catch (error) {
        console.error(`❌ getLatestWeekHTML error:`, error.message);
        console.error(`Stack:`, error.stack);
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