const reportSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },

    // ✅ NEW: Store Google Docs URL
    googleDocsUrl: { type: String, default: "" },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    reportDate: { type: Date, default: Date.now },

    reportType: {
        type: String,
        enum: ["weekly", "monthly"],
        default: "weekly"
    },

    emailStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: "" },

    // ✅ Cached content (fetched from Google Docs automatically)
    rawDocContent: { type: String, default: "" },

    ceoPrompt: { type: String, default: "" },
    aiRewrittenContent: { type: String, default: "" },

    approvalStatus: {
        type: String,
        enum: ["pending_review", "ai_rewriting", "awaiting_approval", "approved", "rejected"],
        default: "pending_review"
    },

    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" }

}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);


// const mongoose = require("mongoose");

// const reportSchema = new mongoose.Schema({

//     clientId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Client",
//         required: true
//     },

//     startDate: { type: Date, required: true },
//     endDate: { type: Date, required: true },

//     traffic: { type: Number, default: 0 },
//     keywords: { type: Number, default: 0 },
//     backlinks: { type: Number, default: 0 },
//     aiSummary: { type: String, default: "" },

//     reportDate: { type: Date, default: Date.now },

//     // ✅ NEW: report type
//     reportType: {
//         type: String,
//         enum: ["weekly", "monthly"],
//         default: "weekly"
//     },

//     // ✅ NEW: email tracking
//     emailStatus: {
//         type: String,
//         enum: ["pending", "sent", "failed"],
//         default: "pending"
//     },
//     emailSentAt: { type: Date, default: null },
//     emailError: { type: String, default: "" },

//     // ✅ NEW: PDF file path for download
//     pdfPath: { type: String, default: "" },

//     status: { type: String, default: "generated" }

// }, { timestamps: true });

// module.exports = mongoose.model("Report", reportSchema);
