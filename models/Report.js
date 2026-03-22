const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({

    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },

    // ✅ Store Google Doc ID for reference
    googleDocId: { type: String, default: "" },

    // ✅ Report period
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    reportDate: { type: Date, default: Date.now },

    // ✅ Report type
    reportType: {
        type: String,
        enum: ["weekly", "monthly"],
        default: "weekly"
    },

    // ✅ Email tracking
    emailStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: "" },

    // ✅ PDF path
    pdfPath: { type: String, default: "" },

    // ✅ Content — Original from Google Doc
    rawDocContent: { type: String, default: "" },

    // ✅ CEO approval workflow
    approvalStatus: {
        type: String,
        enum: ["pending_review", "ai_rewriting", "awaiting_approval", "approved", "rejected"],
        default: "pending_review"
    },

    // ✅ CEO instructions for AI
    ceoPrompt: { type: String, default: "" },

    // ✅ AI rewritten content
    aiRewrittenContent: { type: String, default: "" },

    // ✅ Approval tracking
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },

    // ✅ Status
    status: {
        type: String,
        enum: ["generated", "failed"],
        default: "generated"
    }

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
