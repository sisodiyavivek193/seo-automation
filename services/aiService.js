const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function rewriteWithAI(originalContent, ceoPrompt) {
    console.log("🤖 Groq AI rewriting content...");

    const systemPrompt = `You are an expert SEO report writer. 
Your job is to rewrite SEO performance reports based on the CEO's instructions.
Keep the data and facts intact, only change the tone, style, and presentation as instructed.
Return clean HTML that can be directly used in a PDF report.
Do NOT add markdown code blocks. Return only pure HTML.`;

    const userMessage = `
CEO's Instructions: ${ceoPrompt}

Original Report Content (HTML):
${originalContent}

Please rewrite this report content following the CEO's instructions.
Return the rewritten content as clean HTML.`;

    const completion = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 4000
    });

    const rewritten = completion.choices[0]?.message?.content || originalContent;
    console.log("✅ AI rewrite complete");
    return rewritten;
}

module.exports = { rewriteWithAI };
