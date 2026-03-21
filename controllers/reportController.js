const path = require("path");
const fs = require("fs");
const Report = require("../models/Report");
const Client = require("../models/Client");
const mongoose = require("mongoose");
const { rewriteWithAI } = require("../services/aiService");
const { sendApprovedReport } = require("../cron/reportScheduler");
const { fetchGoogleDocContent } = require("../services/googleDocsService");

exports.createReport = async (req, res) => {
    try {
        const {
            clientId,
            startDate,
            endDate,
            reportType
        } = req.body;

        if (!clientId) return res.status(400).json({ message: "clientId required hai" });
        if (!mongoose.Types.ObjectId.isValid(clientId))
            return res.status(400).json({ message: "clientId valid nahi hai" });
        if (!startDate || !endDate)
            return res.status(400).json({ message: "startDate aur endDate required hain" });

        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ message: "Client nahi mila" });

        // ✅ CHANGED: use googleDocId
        if (!client.googleDocId) {
            return res.status(400).json({ message: "Client ke paas Google Doc ID nahi hai" });
        }

        const report = await Report.create({
            clientId,
            startDate,
            endDate,
            reportType: reportType || "weekly",
            googleDocId: client.googleDocId,  // ✅ CHANGED
            emailStatus: "pending",
            approvalStatus: "pending_review"
        });

        console.log(`✅ Report created: ${report._id}`);

        // ✅ ASYNC: Fetch Google Doc content in background
        fetchGoogleDocContent(client.googleDocId, startDate, endDate)  // ✅ CHANGED
            .then(htmlContent => {
                if (htmlContent) {
                    return Report.findByIdAndUpdate(report._id, {
                        rawDocContent: htmlContent
                    });
                }
            })
            .catch(err => {
                console.error(`⚠️ Report ${report._id} - Google Doc fetch failed:`, err.message);
            });

        res.status(201).json(report);
    } catch (error) {
        console.error("Report create error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ✅ GET - Preview report content
exports.getReportPreview = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        let report = await Report.findById(id).populate("clientId");
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        // ✅ If content not cached, fetch now
        if (!report.rawDocContent && report.googleDocId) {  // ✅ CHANGED
            console.log(`📄 Fetching content for report ${id}...`);
            const htmlContent = await fetchGoogleDocContent(
                report.googleDocId,  // ✅ CHANGED
                report.startDate,
                report.endDate
            );

            if (htmlContent) {
                report = await Report.findByIdAndUpdate(
                    id,
                    { rawDocContent: htmlContent },
                    { new: true }
                ).populate("clientId");
                console.log(`✅ Content fetched and cached`);
            }
        }

        res.json({
            _id: report._id,
            clientName: report.clientId?.clientName,
            startDate: report.startDate,
            endDate: report.endDate,
            reportType: report.reportType,
            approvalStatus: report.approvalStatus,
            rawDocContent: report.rawDocContent || "<p style='color: orange;'>⚠️ Document content load nahi ho saki.</p>",
            aiRewrittenContent: report.aiRewrittenContent,
            ceoPrompt: report.ceoPrompt,
            emailStatus: report.emailStatus
        });
    } catch (error) {
        console.error("getReportPreview error:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET reports by client
exports.getReportsByClient = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Client ID valid nahi hai" });

        const reports = await Report.find({ clientId: id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE report
exports.deleteReport = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        const report = await Report.findByIdAndDelete(id);
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        res.json({ message: "Report delete ho gaya", id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET stats
exports.getStats = async (req, res) => {
    try {
        const [sent, failed, pending, total] = await Promise.all([
            Report.countDocuments({ emailStatus: "sent" }),
            Report.countDocuments({ emailStatus: "failed" }),
            Report.countDocuments({ emailStatus: "pending" }),
            Report.countDocuments()
        ]);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const daily = await Report.aggregate([
            { $match: { reportDate: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
                        status: "$emailStatus"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        const pendingReview = await Report.countDocuments({ approvalStatus: "pending_review" });
        const awaitingApproval = await Report.countDocuments({ approvalStatus: "awaiting_approval" });

        res.json({ sent, failed, pending, total, daily, pendingReview, awaitingApproval });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DOWNLOAD PDF
exports.downloadReport = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        const report = await Report.findById(id).populate("clientId");
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        if (!report.pdfPath || !fs.existsSync(report.pdfPath))
            return res.status(404).json({ message: "PDF file available nahi hai" });

        const clientName = report.clientId?.clientName || "client";
        const filename = `SEO-Report-${clientName}-${new Date(report.startDate).toLocaleDateString("en-IN").replace(/\//g, "-")}.pdf`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/pdf");
        fs.createReadStream(report.pdfPath).pipe(res);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ GET - Preview report content
exports.getReportPreview = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        let report = await Report.findById(id).populate("clientId");
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        // ✅ If content not cached, fetch now
        if (!report.rawDocContent && report.googleDocsUrl) {
            console.log(`📄 Fetching content for report ${id}...`);
            const htmlContent = await fetchGoogleDocContent(
                report.googleDocsUrl,
                report.startDate,
                report.endDate
            );

            if (htmlContent) {
                report = await Report.findByIdAndUpdate(
                    id,
                    { rawDocContent: htmlContent },
                    { new: true }
                ).populate("clientId");
                console.log(`✅ Content fetched and cached`);
            }
        }

        res.json({
            _id: report._id,
            clientName: report.clientId?.clientName,
            startDate: report.startDate,
            endDate: report.endDate,
            reportType: report.reportType,
            approvalStatus: report.approvalStatus,
            rawDocContent: report.rawDocContent || "<p style='color: orange;'>⚠️ Document content load nahi ho saki. Agar problem hai toh report ko dobara create karo.</p>",
            aiRewrittenContent: report.aiRewrittenContent,
            ceoPrompt: report.ceoPrompt,
            emailStatus: report.emailStatus
        });
    } catch (error) {
        console.error("getReportPreview error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ✅ POST - AI se rewrite karo
exports.rewriteWithAI = async (req, res) => {
    try {
        const { id } = req.params;
        const { prompt } = req.body;

        if (!prompt)
            return res.status(400).json({ message: "Prompt required hai" });
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        const report = await Report.findById(id);
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        if (!report.rawDocContent)
            return res.status(400).json({ message: "Report ka original content nahi mila" });

        // Status update — rewriting
        await Report.findByIdAndUpdate(id, {
            approvalStatus: "ai_rewriting",
            ceoPrompt: prompt
        });

        // Groq se rewrite
        const rewrittenContent = await rewriteWithAI(report.rawDocContent, prompt);

        // Save rewritten content
        await Report.findByIdAndUpdate(id, {
            aiRewrittenContent: rewrittenContent,
            approvalStatus: "awaiting_approval"
        });

        res.json({
            message: "AI rewrite complete",
            aiRewrittenContent: rewrittenContent
        });

    } catch (error) {
        console.error("AI rewrite error:", error);
        await Report.findByIdAndUpdate(req.params.id, {
            approvalStatus: "pending_review"
        });
        res.status(500).json({ message: error.message });
    }
};

// ✅ POST - CEO approve kare
exports.approveReport = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        const report = await Report.findById(id).populate("clientId");
        if (!report) return res.status(404).json({ message: "Report nahi mila" });

        if (report.emailStatus === "sent")
            return res.status(400).json({ message: "Report pehle se send ho chuka hai" });

        // Email send karo
        await sendApprovedReport(id);

        res.json({ message: "✅ Report approved aur email send ho gaya!" });

    } catch (error) {
        console.error("Approve error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ✅ POST - CEO reject kare
exports.rejectReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Report ID valid nahi hai" });

        await Report.findByIdAndUpdate(id, {
            approvalStatus: "pending_review",
            rejectedAt: new Date(),
            rejectionReason: reason || "",
            aiRewrittenContent: ""
        });

        res.json({ message: "Report rejected — CEO dobara try kar sakta hai" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// const path = require("path");
// const fs = require("fs");
// const Report = require("../models/Report");
// const mongoose = require("mongoose");
// const { rewriteWithAI } = require("../services/aiService");
// const { sendApprovedReport } = require("../cron/reportScheduler");

// // POST - create report manually
// exports.createReport = async (req, res) => {
//     try {
//         const { clientId, startDate, endDate, traffic, keywords, backlinks, aiSummary, reportType } = req.body;

//         if (!clientId)
//             return res.status(400).json({ message: "clientId required hai" });
//         if (!mongoose.Types.ObjectId.isValid(clientId))
//             return res.status(400).json({ message: "clientId valid nahi hai" });
//         if (!startDate || !endDate)
//             return res.status(400).json({ message: "startDate aur endDate required hain" });

//         const report = await Report.create({
//             clientId,
//             startDate,
//             endDate,
//             reportType: reportType || "weekly",
//             traffic: traffic || 0,
//             keywords: keywords || 0,
//             backlinks: backlinks || 0,
//             aiSummary: aiSummary || "",
//             emailStatus: "pending",
//             approvalStatus: "pending_review"
//         });

//         res.status(201).json(report);
//     } catch (error) {
//         console.error("Report create error:", error);
//         res.status(500).json({ message: error.message });
//     }
// };

// // GET all reports (with optional filters)
// exports.getReports = async (req, res) => {
//     try {
//         const { from, to, status, clientId, approvalStatus } = req.query;
//         const filter = {};

//         if (from || to) {
//             filter.reportDate = {};
//             if (from) filter.reportDate.$gte = new Date(from);
//             if (to) filter.reportDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
//         }
//         if (status) filter.emailStatus = status;
//         if (approvalStatus) filter.approvalStatus = approvalStatus;
//         if (clientId && mongoose.Types.ObjectId.isValid(clientId)) filter.clientId = clientId;

//         const reports = await Report.find(filter)
//             .populate("clientId")
//             .sort({ reportDate: -1 });

//         res.json(reports);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // GET reports by client
// exports.getReportsByClient = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Client ID valid nahi hai" });

//         const reports = await Report.find({ clientId: id }).sort({ reportDate: -1 });
//         res.json(reports);
//     } catch (error) {
//         res.status(500).json({ message: "Server error" });
//     }
// };

// // DELETE report
// exports.deleteReport = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         const report = await Report.findByIdAndDelete(id);
//         if (!report) return res.status(404).json({ message: "Report nahi mila" });

//         res.json({ message: "Report delete ho gaya", id });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // GET stats
// exports.getStats = async (req, res) => {
//     try {
//         const [sent, failed, pending, total] = await Promise.all([
//             Report.countDocuments({ emailStatus: "sent" }),
//             Report.countDocuments({ emailStatus: "failed" }),
//             Report.countDocuments({ emailStatus: "pending" }),
//             Report.countDocuments()
//         ]);

//         const sevenDaysAgo = new Date();
//         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
//         sevenDaysAgo.setHours(0, 0, 0, 0);

//         const daily = await Report.aggregate([
//             { $match: { reportDate: { $gte: sevenDaysAgo } } },
//             {
//                 $group: {
//                     _id: {
//                         date: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
//                         status: "$emailStatus"
//                     },
//                     count: { $sum: 1 }
//                 }
//             },
//             { $sort: { "_id.date": 1 } }
//         ]);

//         // Approval stats
//         const pendingReview = await Report.countDocuments({ approvalStatus: "pending_review" });
//         const awaitingApproval = await Report.countDocuments({ approvalStatus: "awaiting_approval" });

//         res.json({ sent, failed, pending, total, daily, pendingReview, awaitingApproval });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // DOWNLOAD PDF
// exports.downloadReport = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         const report = await Report.findById(id).populate("clientId");
//         if (!report) return res.status(404).json({ message: "Report nahi mila" });

//         if (!report.pdfPath || !fs.existsSync(report.pdfPath))
//             return res.status(404).json({ message: "PDF file available nahi hai" });

//         const clientName = report.clientId?.clientName || "client";
//         const filename = `SEO-Report-${clientName}-${new Date(report.startDate).toLocaleDateString("en-IN").replace(/\//g, "-")}.pdf`;

//         res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
//         res.setHeader("Content-Type", "application/pdf");
//         fs.createReadStream(report.pdfPath).pipe(res);

//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // ✅ GET - Preview report content (raw doc content)
// exports.getReportPreview = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         const report = await Report.findById(id).populate("clientId");
//         if (!report) return res.status(404).json({ message: "Report nahi mila" });

//         res.json({
//             _id: report._id,
//             clientName: report.clientId?.clientName,
//             startDate: report.startDate,
//             endDate: report.endDate,
//             reportType: report.reportType,
//             approvalStatus: report.approvalStatus,
//             rawDocContent: report.rawDocContent,
//             aiRewrittenContent: report.aiRewrittenContent,
//             ceoPrompt: report.ceoPrompt,
//             emailStatus: report.emailStatus
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // ✅ POST - AI se rewrite karo
// exports.rewriteWithAI = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { prompt } = req.body;

//         if (!prompt)
//             return res.status(400).json({ message: "Prompt required hai" });
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         const report = await Report.findById(id);
//         if (!report) return res.status(404).json({ message: "Report nahi mila" });

//         if (!report.rawDocContent)
//             return res.status(400).json({ message: "Report ka original content nahi mila" });

//         // Status update — rewriting
//         await Report.findByIdAndUpdate(id, {
//             approvalStatus: "ai_rewriting",
//             ceoPrompt: prompt
//         });

//         // Groq se rewrite
//         const rewrittenContent = await rewriteWithAI(report.rawDocContent, prompt);

//         // Save rewritten content
//         await Report.findByIdAndUpdate(id, {
//             aiRewrittenContent: rewrittenContent,
//             approvalStatus: "awaiting_approval"
//         });

//         res.json({
//             message: "AI rewrite complete",
//             aiRewrittenContent: rewrittenContent
//         });

//     } catch (error) {
//         console.error("AI rewrite error:", error);
//         // Reset status on error
//         await Report.findByIdAndUpdate(req.params.id, {
//             approvalStatus: "pending_review"
//         });
//         res.status(500).json({ message: error.message });
//     }
// };

// // ✅ POST - CEO approve kare — email send ho
// exports.approveReport = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         const report = await Report.findById(id).populate("clientId");
//         if (!report) return res.status(404).json({ message: "Report nahi mila" });

//         if (report.emailStatus === "sent")
//             return res.status(400).json({ message: "Report pehle se send ho chuka hai" });

//         // Email send karo
//         await sendApprovedReport(id);

//         res.json({ message: "✅ Report approved aur email send ho gaya!" });

//     } catch (error) {
//         console.error("Approve error:", error);
//         res.status(500).json({ message: error.message });
//     }
// };

// // ✅ POST - CEO reject kare
// exports.rejectReport = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { reason } = req.body;

//         if (!mongoose.Types.ObjectId.isValid(id))
//             return res.status(400).json({ message: "Report ID valid nahi hai" });

//         await Report.findByIdAndUpdate(id, {
//             approvalStatus: "pending_review",
//             rejectedAt: new Date(),
//             rejectionReason: reason || "",
//             aiRewrittenContent: ""  // Reset so CEO can try again
//         });

//         res.json({ message: "Report rejected — CEO dobara try kar sakta hai" });

//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };
