const path = require("path");
const fs = require("fs");
const Report = require("../models/Report");
const mongoose = require("mongoose");

// POST - create report manually
exports.createReport = async (req, res) => {
    try {
        const { clientId, startDate, endDate, traffic, keywords, backlinks, aiSummary, reportType } = req.body;

        if (!clientId)
            return res.status(400).json({ message: "clientId required hai" });
        if (!mongoose.Types.ObjectId.isValid(clientId))
            return res.status(400).json({ message: "clientId valid nahi hai" });
        if (!startDate || !endDate)
            return res.status(400).json({ message: "startDate aur endDate required hain" });

        const report = await Report.create({
            clientId,
            startDate,
            endDate,
            reportType: reportType || "weekly",
            traffic: traffic || 0,
            keywords: keywords || 0,
            backlinks: backlinks || 0,
            aiSummary: aiSummary || "",
            emailStatus: "pending"
        });

        res.status(201).json(report);
    } catch (error) {
        console.error("Report create error:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET all reports (with optional date filter)
exports.getReports = async (req, res) => {
    try {
        const { from, to, status, clientId } = req.query;
        const filter = {};

        if (from || to) {
            filter.reportDate = {};
            if (from) filter.reportDate.$gte = new Date(from);
            if (to) filter.reportDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
        }
        if (status) filter.emailStatus = status;
        if (clientId && mongoose.Types.ObjectId.isValid(clientId)) filter.clientId = clientId;

        const reports = await Report.find(filter)
            .populate("clientId")
            .sort({ reportDate: -1 });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET reports by client
exports.getReportsByClient = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Client ID valid nahi hai" });

        const reports = await Report.find({ clientId: id }).sort({ reportDate: -1 });
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

// GET stats - sent/failed/pending counts
exports.getStats = async (req, res) => {
    try {
        const [sent, failed, pending, total] = await Promise.all([
            Report.countDocuments({ emailStatus: "sent" }),
            Report.countDocuments({ emailStatus: "failed" }),
            Report.countDocuments({ emailStatus: "pending" }),
            Report.countDocuments()
        ]);

        // Last 7 days daily breakdown
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

        res.json({ sent, failed, pending, total, daily });
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
