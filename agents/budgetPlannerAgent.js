const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const Idea = require('../models/Idea');

// Initialize Gemini with LangChain
const initModel = () => {
    return new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        apiKey: process.env.GOOGLE_GEMINI_API_KEY,
        temperature: 0.3, // Lower for more consistent budget analysis
        maxOutputTokens: 4096
    });
};

/**
 * Optimize idea data to reduce token usage by ~75%
 */
const optimizeIdeaForAnalysis = (idea) => {
    return {
        id: idea._id.toString(),
        title: idea.title,
        // Truncate description to 300 chars
        description: idea.description.substring(0, 300) + (idea.description.length > 300 ? '...' : ''),
        category: idea.category,
        subCategory: idea.subCategory,
        // Only essential impact info
        impact: idea.expectedImpact?.substring(0, 200),
        timeline: idea.timeline,
        // Top 3 benefits only
        benefits: idea.benefits?.slice(0, 3).join('; '),
        targetArea: idea.targetArea
    };
};

/**
 * Analyze ideas in batches to stay within token limits
 */
const analyzeBatch = async (batch, totalBudget, batchNumber) => {
    const model = initModel();
    
    const prompt = `You are an expert government budget analyst. Analyze these civic innovation ideas and allocate budget intelligently.

TOTAL AVAILABLE BUDGET: ₹${(totalBudget / 10000000).toFixed(2)} Crore
BATCH: ${batchNumber}

IDEAS:
${JSON.stringify(batch, null, 2)}

ANALYSIS CRITERIA:
1. Citizen Impact (40%): How many citizens benefit? Problem severity?
2. Feasibility (30%): Technical complexity, resource availability
3. Timeline (20%): Urgency and implementation speed
4. Innovation (10%): Uniqueness and scalability

TASK:
- Calculate REALISTIC budget for each idea (analyze actual requirements, NOT user estimates)
- Assign priority score (0-100)
- Provide brief justification (max 100 words)

OUTPUT ONLY VALID JSON:
{
  "allocations": [
    {
      "ideaId": "id",
      "allocatedBudget": number_in_rupees,
      "priorityScore": number_0_to_100,
      "priority": "High|Medium|Low",
      "justification": "brief_reason",
      "estimatedTimeline": "X months",
      "expectedROI": "High|Medium|Low"
    }
  ]
}`;

    const response = await model.invoke(prompt);
    const content = response.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
};

/**
 * Check if budget is sufficient for approved ideas
 */
const checkBudgetSufficiency = async (totalBudget, optimizedIdeas) => {
    const model = initModel();
    
    const prompt = `You are a government budget analyst. Quickly assess if the provided budget is sufficient for these approved civic innovation ideas.

TOTAL AVAILABLE BUDGET: ₹${(totalBudget / 10000000).toFixed(2)} Crore

NUMBER OF IDEAS: ${optimizedIdeas.length}

SAMPLE IDEAS (first 5):
${JSON.stringify(optimizedIdeas.slice(0, 5), null, 2)}

TASK:
Analyze if the budget is sufficient. Consider:
- Number of ideas (${optimizedIdeas.length})
- Typical costs for such projects
- Minimum viable implementation

OUTPUT ONLY VALID JSON:
{
  "isSufficient": true_or_false,
  "estimatedMinimumBudget": number_in_rupees,
  "message": "brief_explanation"
}`;

    const response = await model.invoke(prompt);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        // Default to allowing if AI fails
        return {
            isSufficient: true,
            estimatedMinimumBudget: totalBudget,
            message: 'Unable to assess budget sufficiency'
        };
    }

    return JSON.parse(jsonMatch[0]);
};

/**
 * Main Budget Planner Agent
 */
const runBudgetPlannerAgent = async (totalBudget) => {
    try {
        // 1. Fetch all approved ideas
        const approvedIdeas = await Idea.find({ 
            status: 'Approved', 
            isActive: true 
        }).select('title description category subCategory expectedImpact timeline benefits targetArea submittedBy');

        if (approvedIdeas.length === 0) {
            return {
                success: false,
                message: 'No approved ideas found for budget allocation'
            };
        }

        // 2. Optimize ideas to reduce tokens
        const optimizedIdeas = approvedIdeas.map(optimizeIdeaForAnalysis);

        // 3. Check if budget is sufficient
        const sufficiencyCheck = await checkBudgetSufficiency(totalBudget, optimizedIdeas);
        
        if (!sufficiencyCheck.isSufficient) {
            return {
                success: false,
                insufficientBudget: true,
                message: `⚠️ Insufficient Budget: ${sufficiencyCheck.message}`,
                data: {
                    providedBudget: totalBudget,
                    estimatedMinimumBudget: sufficiencyCheck.estimatedMinimumBudget,
                    shortfall: sufficiencyCheck.estimatedMinimumBudget - totalBudget,
                    ideasCount: approvedIdeas.length,
                    recommendation: `Please increase the budget to at least ₹${(sufficiencyCheck.estimatedMinimumBudget / 10000000).toFixed(2)} Crore to implement these ${approvedIdeas.length} approved ideas effectively.`
                }
            };
        }

        // 4. Process in batches (8 ideas per batch for optimal token usage)
        const batchSize = 8;
        const allAllocations = [];

        for (let i = 0; i < optimizedIdeas.length; i += batchSize) {
            const batch = optimizedIdeas.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            
            const result = await analyzeBatch(batch, totalBudget, batchNumber);
            allAllocations.push(...result.allocations);
        }

        // 5. Sort by priority score (highest first)
        allAllocations.sort((a, b) => b.priorityScore - a.priorityScore);

        // 6. Adjust allocations to fit within budget (90% allocation, 10% reserve)
        const maxAllocation = totalBudget * 0.9;
        let currentTotal = allAllocations.reduce((sum, a) => sum + a.allocatedBudget, 0);

        // If over budget, proportionally reduce allocations
        if (currentTotal > maxAllocation) {
            const scaleFactor = maxAllocation / currentTotal;
            allAllocations.forEach(allocation => {
                allocation.allocatedBudget = Math.round(allocation.allocatedBudget * scaleFactor);
            });
            currentTotal = maxAllocation;
        }

        // 7. Generate summary and recommendations
        const summary = await generateSummary(allAllocations, totalBudget, currentTotal);

        return {
            success: true,
            data: {
                totalBudget,
                allocatedBudget: currentTotal,
                contingencyReserve: totalBudget - currentTotal,
                allocations: allAllocations,
                summary: summary.summary,
                recommendations: summary.recommendations,
                analyzedCount: approvedIdeas.length,
                timestamp: new Date()
            }
        };

    } catch (error) {
        console.error('Budget Planner Agent Error:', error);
        throw error;
    }
};

/**
 * Generate executive summary
 */
const generateSummary = async (allocations, totalBudget, allocatedBudget) => {
    const model = initModel();
    
    const highPriority = allocations.filter(a => a.priority === 'High').length;
    const mediumPriority = allocations.filter(a => a.priority === 'Medium').length;
    const lowPriority = allocations.filter(a => a.priority === 'Low').length;

    const prompt = `Generate a brief executive summary for this budget allocation plan.

TOTAL BUDGET: ₹${(totalBudget / 10000000).toFixed(2)} Crore
ALLOCATED: ₹${(allocatedBudget / 10000000).toFixed(2)} Crore
IDEAS ANALYZED: ${allocations.length}
HIGH PRIORITY: ${highPriority}
MEDIUM PRIORITY: ${mediumPriority}
LOW PRIORITY: ${lowPriority}

TOP 3 ALLOCATIONS:
${allocations.slice(0, 3).map(a => 
    `${a.ideaId}: ₹${(a.allocatedBudget / 100000).toFixed(2)} Lakh - ${a.priority}`
).join('\n')}

Provide:
1. A 2-3 sentence summary
2. 3 key recommendations (one line each)

OUTPUT ONLY VALID JSON:
{
  "summary": "brief_summary",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    const response = await model.invoke(prompt);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        return {
            summary: `Analyzed ${allocations.length} approved ideas with total allocation of ₹${(allocatedBudget / 10000000).toFixed(2)} Crore.`,
            recommendations: [
                'Prioritize high-impact projects first',
                'Monitor implementation progress closely',
                'Reserve contingency funds for unexpected costs'
            ]
        };
    }

    return JSON.parse(jsonMatch[0]);
};

module.exports = {
    runBudgetPlannerAgent
};
