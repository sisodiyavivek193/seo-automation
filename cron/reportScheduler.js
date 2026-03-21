const cron = require("node-cron");

const Client = require("../models/Client");
const Report = require("../models/Report");

const sendReportEmail = require("../services/emailService");
const { getLatestWeekHTML } = require("../services/seoSummaryService");
const { generatePDF } = require("../services/pdfService");

const { getWeeklyReportPeriod, getMonthlyReportPeriod } = require("../utils/reportPeriod");

console.log("⏰ Cron Scheduler Loaded");

// ─────────────────────────────────────────
// Helper — ek client ka report PREPARE karo (send nahi)
// CEO approval ke baad send hoga
// ─────────────────────────────────────────
async function prepareReportForClient(client, startDate, endDate, reportType) {

    console.log(`📊 Preparing report for: ${client.clientName}`);
    console.log(`📅 Period: ${startDate} → ${endDate}`);

    // Duplicate period check
    const startOfDay = new Date(startDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startDate); endOfDay.setHours(23, 59, 59, 999);

    const existing = await Report.findOne({
        clientId: client._id,
        startDate: { $gte: startOfDay, $lte: endOfDay }
    });
    if (existing) {
        console.log(`⚠️ Report already exists: ${client.clientName}`);
        return;
    }

    // Google Doc ID check
    if (!client.googleDocId) {
        console.log(`⚠️ No Google Doc ID for ${client.clientName}`);
        await Report.create({
            clientId: client._id,
            startDate,
            endDate,
            reportType,
            emailStatus: "failed",
            emailError: "Google Doc ID missing",
            status: "failed",
            approvalStatus: "pending_review"
        });
        return;
    }

    try {
        // Google Doc se content extract karo
        const rawHtml = await getLatestWeekHTML(client.googleDocId, startDate, endDate);

        // Report save karo — approval pending
        const report = await Report.create({
            clientId: client._id,
            startDate,
            endDate,
            reportType,
            emailStatus: "pending",
            status: "generated",
            approvalStatus: "pending_review",  // ✅ CEO review ka wait
            rawDocContent: rawHtml             // ✅ Original content save
        });

        console.log(`✅ Report prepared for CEO review: ${client.clientName} (ID: ${report._id})`);

    } catch (err) {
        console.error(`❌ Report prepare failed for ${client.clientName}:`, err.message);
        await Report.create({
            clientId: client._id,
            startDate,
            endDate,
            reportType,
            emailStatus: "failed",
            emailError: err.message,
            status: "failed",
            approvalStatus: "pending_review"
        });
    }
}

// ─────────────────────────────────────────
// Email send karo (approved reports ke liye)
// Yeh function reportController se call hoga
// ─────────────────────────────────────────
async function sendApprovedReport(reportId) {
    const Report = require("../models/Report");
    const Client = require("../models/Client");

    const report = await Report.findById(reportId).populate("clientId");
    if (!report) throw new Error("Report not found");

    const client = report.clientId;

    // Final content — AI rewritten ya original
    const finalContent = report.aiRewrittenContent || report.rawDocContent;

    if (!finalContent) throw new Error("Report content not found");

    const filePath = await generatePDF(finalContent, client.clientName);

    await Report.findByIdAndUpdate(reportId, { pdfPath: filePath });

    await sendReportEmail(
        client.email,
        filePath,
        client.clientName,
        report.startDate,
        report.endDate
    );

    await Report.findByIdAndUpdate(reportId, {
        emailStatus: "sent",
        emailSentAt: new Date(),
        approvalStatus: "approved"
    });

    await Client.findByIdAndUpdate(client._id, {
        lastReportSentAt: new Date()
    });

    console.log(`📧 Approved report sent to: ${client.email}`);
}

// ─────────────────────────────────────────
// CRON 1 — Har Saturday 9:00 AM IST
// UTC: 3:30 AM = "30 3 * * 6"
// ─────────────────────────────────────────
cron.schedule("30 3 * * 6", async () => {
    console.log("📅 Weekly cron running — Saturday 9AM IST");

    try {
        const clients = await Client.find({
            status: "active",
            reportFrequency: { $in: ["weekly", "both"] }
        });

        const { startDate, endDate } = getWeeklyReportPeriod();

        for (const client of clients) {
            await prepareReportForClient(client, startDate, endDate, "weekly");
        }

    } catch (err) {
        console.error("❌ Weekly cron error:", err.message);
    }
});

// ─────────────────────────────────────────
// CRON 2 — Har mahine 3 tarikh 9:00 AM IST
// UTC: 3:30 AM = "30 3 3 * *"
// ─────────────────────────────────────────
cron.schedule("30 3 3 * *", async () => {
    console.log("📅 Monthly cron running — 3rd of month 9AM IST");

    try {
        const clients = await Client.find({
            status: "active",
            reportFrequency: { $in: ["monthly", "both"] }
        });

        const { startDate, endDate } = getMonthlyReportPeriod();

        for (const client of clients) {
            await prepareReportForClient(client, startDate, endDate, "monthly");
        }

    } catch (err) {
        console.error("❌ Monthly cron error:", err.message);
    }
});

module.exports = { sendApprovedReport };


// const cron = require("node-cron");

// const Client = require("../models/Client");
// const Report = require("../models/Report");

// const sendReportEmail = require("../services/emailService");
// const { getLatestWeekHTML } = require("../services/googleDocsService"); // ✅ updated import
// const { generatePDF } = require("../services/pdfService");

// const { getWeeklyReportPeriod, getMonthlyReportPeriod } = require("../utils/reportPeriod");

// console.log("⏰ Cron Scheduler Loaded");

// // ─────────────────────────────────────────
// // Helper — ek client ko report bhejo
// // ─────────────────────────────────────────
// async function sendReportToClient(client, startDate, endDate, reportType) {

//     console.log(`📊 Generating report for: ${client.clientName}`);
//     console.log(`📅 Period: ${startDate} → ${endDate}`);

//     // Already sent today check
//     if (client.lastReportSentAt) {
//         const last = new Date(client.lastReportSentAt);
//         const today = new Date();
//         const sameDay =
//             last.getDate() === today.getDate() &&
//             last.getMonth() === today.getMonth() &&
//             last.getFullYear() === today.getFullYear();

//         if (sameDay) {
//             console.log(`⏭️ Already sent today: ${client.clientName}`);
//             return;
//         }
//     }

//     // Duplicate period check
//     const startOfDay = new Date(startDate); startOfDay.setHours(0, 0, 0, 0);
//     const endOfDay = new Date(startDate); endOfDay.setHours(23, 59, 59, 999);

//     const existing = await Report.findOne({
//         clientId: client._id,
//         startDate: { $gte: startOfDay, $lte: endOfDay }
//     });
//     if (existing) {
//         console.log(`⚠️ Report already exists: ${client.clientName}`);
//         return;
//     }

//     // Google Doc ID check
//     if (!client.googleDocId) {
//         console.log(`⚠️ No Google Doc ID for ${client.clientName}`);
//         await Report.create({
//             clientId: client._id,
//             startDate,
//             endDate,
//             reportType,
//             emailStatus: "failed",
//             emailError: "Google Doc ID missing",
//             status: "failed"
//         });
//         return;
//     }

//     // Save as pending
//     const report = await Report.create({
//         clientId: client._id,
//         startDate,
//         endDate,
//         reportType,
//         emailStatus: "pending",
//         status: "generated"
//     });

//     try {
//         // ✅ Sirf is week ka content extract karo
//         const html = await getLatestWeekHTML(client.googleDocId, startDate, endDate);
//         const filePath = await generatePDF(html, client.clientName);

//         await Report.findByIdAndUpdate(report._id, { pdfPath: filePath });

//         await sendReportEmail(client.email, filePath, client.clientName, startDate, endDate);

//         await Report.findByIdAndUpdate(report._id, {
//             emailStatus: "sent",
//             emailSentAt: new Date()
//         });

//         await Client.findByIdAndUpdate(client._id, {
//             lastReportSentAt: new Date()
//         });

//         console.log(`📧 Report sent to: ${client.email}`);

//     } catch (err) {
//         await Report.findByIdAndUpdate(report._id, {
//             emailStatus: "failed",
//             emailError: err.message
//         });
//         console.error(`❌ Email failed for ${client.clientName}:`, err.message);
//     }
// }

// // ─────────────────────────────────────────
// // CRON 1 — Har Saturday 9:00 AM IST
// // UTC: 3:30 AM = "30 3 * * 6"
// // ─────────────────────────────────────────
// cron.schedule("30 3 * * 6", async () => {
//     console.log("📅 Weekly cron running — Saturday 9AM IST");

//     try {
//         const clients = await Client.find({
//             status: "active",
//             reportFrequency: { $in: ["weekly", "both"] }
//         });

//         const { startDate, endDate } = getWeeklyReportPeriod();

//         for (const client of clients) {
//             await sendReportToClient(client, startDate, endDate, "weekly");
//         }

//     } catch (err) {
//         console.error("❌ Weekly cron error:", err.message);
//     }
// });

// // ─────────────────────────────────────────
// // CRON 2 — Har mahine 3 tarikh 9:00 AM IST
// // UTC: 3:30 AM = "30 3 3 * *"
// // ─────────────────────────────────────────
// cron.schedule("30 3 3 * *", async () => {
//     console.log("📅 Monthly cron running — 3rd of month 9AM IST");

//     try {
//         const clients = await Client.find({
//             status: "active",
//             reportFrequency: { $in: ["monthly", "both"] }
//         });

//         const { startDate, endDate } = getMonthlyReportPeriod();

//         for (const client of clients) {
//             await sendReportToClient(client, startDate, endDate, "monthly");
//         }

//     } catch (err) {
//         console.error("❌ Monthly cron error:", err.message);
//     }
// });
