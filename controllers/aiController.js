const { GoogleGenerativeAI } = require('@google/generative-ai');
const Policy = require('../models/Policy');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * @desc    Summarize a policy using Google Gemini
 * @route   POST /api/ai/summarize/:policyId
 * @access  Public
 */
const summarizePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.policyId);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        // If summary already exists, return it
        if (policy.summary) {
            return res.status(200).json({
                success: true,
                data: { summary: policy.summary },
                cached: true
            });
        }

        // Generate summary using Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a helpful AI assistant that explains government policies in simple, easy-to-understand language.

Policy Title: ${policy.title}
Category: ${policy.category}
Full Description: ${policy.description}

Please provide a concise, easy-to-understand summary of this policy in 2-3 paragraphs. Use simple language that an average citizen can understand. Explain:
1. What this policy is about
2. Who it affects
3. What changes or actions it introduces
4. Why it matters to citizens

Keep it friendly and accessible.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        // Save summary to policy
        policy.summary = summary;
        await policy.save();

        res.status(200).json({
            success: true,
            data: { summary },
            cached: false
        });
    } catch (error) {
        console.error('Summarize policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate summary'
        });
    }
};

/**
 * @desc    Chat with AI about a specific policy (RAG-based)
 * @route   POST /api/ai/chat/:policyId
 * @access  Public
 */
const chatWithPolicy = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question || question.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Question is required'
            });
        }

        const policy = await Policy.findById(req.params.policyId);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        // Generate response using Gemini with policy context
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a knowledgeable assistant helping citizens understand government policies. Answer questions clearly and accurately based on the policy information provided.

POLICY CONTEXT:
Title: ${policy.title}
Category: ${policy.category}
Description: ${policy.description}
${policy.summary ? `Summary: ${policy.summary}` : ''}
${policy.effectiveDate ? `Effective Date: ${new Date(policy.effectiveDate).toLocaleDateString()}` : ''}

CITIZEN QUESTION: ${question}

Please provide a helpful, accurate answer based ONLY on the policy information above. If the question cannot be answered from this policy, politely say so and suggest contacting the relevant government office. Keep your answer concise and easy to understand.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                policyTitle: policy.title
            }
        });
    } catch (error) {
        console.error('Chat with policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get response from AI'
        });
    }
};

/**
 * @desc    Get suggested questions for a policy
 * @route   GET /api/ai/suggestions/:policyId
 * @access  Public
 */
const getSuggestedQuestions = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.policyId);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Based on this government policy, generate 5 common questions that citizens might ask:

Policy Title: ${policy.title}
Category: ${policy.category}
Description: ${policy.description}

Provide ONLY the questions, one per line, without numbering. Make them practical and relevant to citizens' concerns.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const questionsText = response.text();

        // Split into array and clean up
        const questions = questionsText
            .split('\n')
            .filter(q => q.trim().length > 0)
            .map(q => q.replace(/^\d+\.\s*/, '').trim())
            .slice(0, 5);

        res.status(200).json({
            success: true,
            data: { questions }
        });
    } catch (error) {
        console.error('Get suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate suggestions'
        });
    }
};

module.exports = {
    summarizePolicy,
    chatWithPolicy,
    getSuggestedQuestions
};
