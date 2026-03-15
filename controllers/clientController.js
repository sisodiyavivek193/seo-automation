const Client = require("../models/Client");

// GET all clients
exports.getClients = async (req, res) => {
    try {
        const clients = await Client.find().sort({ createdAt: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET single client
exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: "Client nahi mila" });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST create client
exports.createClient = async (req, res) => {
    try {
        const { clientName, email, website, reportFrequency, googleDocId, status } = req.body;

        if (!clientName || !email) {
            return res.status(400).json({ message: "clientName aur email required hain" });
        }

        const exists = await Client.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Is email se client already exist karta hai" });
        }

        const client = await Client.create({ clientName, email, website, reportFrequency, googleDocId, status });
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT update client
exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: "Client nahi mila" });

        const updated = await Client.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE client
exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: "Client nahi mila" });

        await Client.findByIdAndDelete(req.params.id);
        res.json({ message: "Client successfully delete ho gaya", id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};





// const Client = require("../models/Client");

// exports.getClients = async (req, res) => {

//     try {

//         const clients = await Client.find();

//         res.json(clients);

//     } catch (error) {

//         res.status(500).json({ message: error.message });

//     }

// };


// exports.createClient = async (req, res) => {

//     try {

//         const client = new Client(req.body);

//         await client.save();

//         res.json(client);

//     } catch (error) {

//         res.status(500).json({ message: error.message });

//     }

// };