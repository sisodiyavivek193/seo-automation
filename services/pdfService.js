const puppeteer = require("puppeteer");

async function generatePDF(html, clientName) {

    const browser = await puppeteer.launch({
        headless: "new"
    });

    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "networkidle0"
    });

    // safe file name
    const safeName = clientName.replace(/\s+/g, "-").toLowerCase();
    const filePath = `${safeName}-report.pdf`;

    await page.pdf({
        path: filePath,
        format: "A4",
        printBackground: true
    });

    await browser.close();

    return filePath;
}

module.exports = { generatePDF };


// const puppeteer = require("puppeteer");

// async function generatePDF(html, clientName) {

//     const browser = await puppeteer.launch({ headless: "new" });

//     const page = await browser.newPage();

//     await page.setContent(html);

//     const filePath = `${clientName}-report.pdf`;

//     await page.pdf({
//         path: filePath,
//         format: "A4"
//     });

//     await browser.close();

//     return filePath;
// }