const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({

    clientName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    website: { type: String, default: "" },

    // ✅ Google Docs ID
    googleDocId: { type: String, default: "" },

    // ✅ Report frequency
    reportFrequency: {
        type: String,
        enum: ["weekly", "monthly", "both"],
        default: "weekly"
    },

    // ✅ Status
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },

    // ✅ Last report sent tracking
    lastReportSentAt: {
        type: Date,
        default: null
    },

    createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);