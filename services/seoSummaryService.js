const generateSEOSummary = (report) => {

    let summary = [];

    // traffic analysis
    if (report.traffic > 700) {
        summary.push("Traffic growth is strong.");
    } else if (report.traffic > 300) {
        summary.push("Traffic growth is moderate.");
    } else {
        summary.push("Traffic needs improvement.");
    }

    // keyword analysis
    if (report.keywords > 50) {
        summary.push("Keyword rankings performing well.");
    } else if (report.keywords > 20) {
        summary.push("Keyword ranking improving.");
    } else {
        summary.push("More keyword optimization required.");
    }

    // backlink analysis
    if (report.backlinks > 40) {
        summary.push("Backlink profile is strong.");
    } else if (report.backlinks > 15) {
        summary.push("Backlink profile healthy.");
    } else {
        summary.push("Need to build more backlinks.");
    }

    return summary.join(" ");
};

module.exports = generateSEOSummary;