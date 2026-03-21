const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({

    clientName: {
        type: String,
        required: true
    },

    website: String,
    // ✅ NEW: Store Google Docs URL
    googleDocsUrl: { type: String, default: "" },
    email: {
        type: String,
        required: true
    },

    reportFrequency: {
        type: String,
        enum: ["weekly", "monthly", "both"],
        default: "weekly"
    },
    googleDocId: String,
    status: {
        type: String,
        default: "active"
    },
    lastReportSentAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);