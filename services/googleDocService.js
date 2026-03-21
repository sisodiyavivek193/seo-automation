const axios = require("axios");
const { getLatestWeekHTML } = require("./googleDocExtractor");  // Use existing

// ✅ Fetch Google Doc by URL
exports.fetchGoogleDocContent = async (docUrl, startDate, endDate) => {
    try {
        if (!docUrl) return "";

        // Extract doc ID from URL
        const docIdMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (!docIdMatch) return "";

        const docId = docIdMatch[1];

        // ✅ Use existing getLatestWeekHTML function
        const htmlContent = await getLatestWeekHTML(docId, startDate, endDate);
        return htmlContent;

    } catch (error) {
        console.error("Google Doc fetch error:", error.message);
        return "";
    }
};