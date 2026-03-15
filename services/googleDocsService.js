const axios = require("axios");

async function getGoogleDocHTML(docId) {

    try {

        const url = `https://docs.google.com/document/d/${docId}/export?format=html`;

        const response = await axios.get(url);

        return response.data;

    } catch (error) {

        console.error("Google Doc fetch error:", error.message);
        throw error;

    }

}

module.exports = getGoogleDocHTML;


// const { google } = require("googleapis");
// const path = require("path");

// // absolute path to JSON file
// const keyFilePath = path.resolve(__dirname, "../google-service-account.json");
// console.log("File exists:", require("fs").existsSync(keyFilePath)); // add this line

// const auth = new google.auth.GoogleAuth({
//     keyFile: keyFilePath,
//     scopes: ["https://www.googleapis.com/auth/documents.readonly"]
// });

// const docs = google.docs({
//     version: "v1",
//     auth
// });

// async function getGoogleDoc(docId) {
//     try {

//         const res = await docs.documents.get({
//             documentId: docId
//         });

//         return res.data;

//     } catch (error) {

//         console.error("Google Doc fetch error:", error.message);
//         throw error;

//     }
// }

// module.exports = getGoogleDoc;