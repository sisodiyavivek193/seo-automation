const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({

    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    traffic: { type: Number, default: 0 },
    keywords: { type: Number, default: 0 },
    backlinks: { type: Number, default: 0 },
    aiSummary: { type: String, default: "" },

    reportDate: { type: Date, default: Date.now },

    // ✅ NEW: report type
    reportType: {
        type: String,
        enum: ["weekly", "monthly"],
        default: "weekly"
    },

    // ✅ NEW: email tracking
    emailStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: "" },

    // ✅ NEW: PDF file path for download
    pdfPath: { type: String, default: "" },

    status: { type: String, default: "generated" }

}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
