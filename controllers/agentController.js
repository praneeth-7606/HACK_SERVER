const { runBudgetPlannerAgent } = require('../agents/budgetPlannerAgent');
const BudgetAllocation = require('../models/BudgetAllocation');
const Idea = require('../models/Idea');
const Notification = require('../models/Notification');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Run Budget Planner Agent
 * @route   POST /api/agents/budget-planner/analyze
 * @access  Private/Admin
 */
const analyzeBudget = async (req, res) => {
    try {
        const { totalBudget, fiscalYear } = req.body;

        if (!totalBudget || totalBudget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid total budget is required'
            });
        }

        // Run the AI agent
        const result = await runBudgetPlannerAgent(totalBudget);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Save as draft budget allocation
        const budgetAllocation = await BudgetAllocation.create({
            totalBudget: result.data.totalBudget,
            allocatedBudget: result.data.allocatedBudget,
            contingencyReserve: result.data.contingencyReserve,
            allocations: result.data.allocations.map(a => ({
                idea: a.ideaId,
                allocatedBudget: a.allocatedBudget,
                priorityScore: a.priorityScore,
                priority: a.priority,
                justification: a.justification,
                estimatedTimeline: a.estimatedTimeline,
                expectedROI: a.expectedROI
            })),
            summary: result.data.summary,
            recommendations: result.data.recommendations,
            status: 'Draft',
            createdBy: req.user._id,
            fiscalYear: fiscalYear || new Date().getFullYear().toString()
        });

        // Populate idea details
        await budgetAllocation.populate('allocations.idea', 'title category submittedBy');

        res.status(200).json({
            success: true,
            message: 'Budget analysis completed successfully',
            data: budgetAllocation
        });

    } catch (error) {
        console.error('Budget analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze budget',
            error: error.message
        });
    }
};

/**
 * @desc    Update budget allocation (admin edits)
 * @route   PUT /api/agents/budget-planner/:id
 * @access  Private/Admin
 */
const updateBudgetAllocation = async (req, res) => {
    try {
        const budgetAllocation = await BudgetAllocation.findById(req.params.id);

        if (!budgetAllocation) {
            return res.status(404).json({
                success: false,
                message: 'Budget allocation not found'
            });
        }

        if (budgetAllocation.status === 'Approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit approved budget allocation'
            });
        }

        // Update fields
        const { allocations, summary, recommendations } = req.body;

        if (allocations) {
            budgetAllocation.allocations = allocations;
            // Recalculate totals
            const newTotal = allocations.reduce((sum, a) => sum + a.allocatedBudget, 0);
            budgetAllocation.allocatedBudget = newTotal;
            budgetAllocation.contingencyReserve = budgetAllocation.totalBudget - newTotal;
        }

        if (summary) budgetAllocation.summary = summary;
        if (recommendations) budgetAllocation.recommendations = recommendations;

        await budgetAllocation.save();
        await budgetAllocation.populate('allocations.idea', 'title category submittedBy');

        res.status(200).json({
            success: true,
            message: 'Budget allocation updated successfully',
            data: budgetAllocation
        });

    } catch (error) {
        console.error('Update budget allocation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget allocation'
        });
    }
};

/**
 * @desc    Approve budget allocation
 * @route   POST /api/agents/budget-planner/:id/approve
 * @access  Private/Admin
 */
const approveBudgetAllocation = async (req, res) => {
    try {
        const budgetAllocation = await BudgetAllocation.findById(req.params.id)
            .populate('allocations.idea');

        if (!budgetAllocation) {
            return res.status(404).json({
                success: false,
                message: 'Budget allocation not found'
            });
        }

        if (budgetAllocation.status === 'Approved') {
            return res.status(400).json({
                success: false,
                message: 'Budget allocation already approved'
            });
        }

        // Update budget allocation status
        budgetAllocation.status = 'Approved';
        budgetAllocation.approvedBy = req.user._id;
        budgetAllocation.approvedAt = new Date();
        await budgetAllocation.save();

        // Update each idea with budget allocation and change status to "Funded"
        const notifications = [];

        for (const allocation of budgetAllocation.allocations) {
            const idea = await Idea.findById(allocation.idea._id);
            
            if (idea) {
                // Update idea with budget allocation
                idea.budgetAllocation = {
                    allocatedBudget: allocation.allocatedBudget,
                    allocationPlan: budgetAllocation._id,
                    allocatedAt: new Date(),
                    allocatedBy: req.user._id,
                    priorityScore: allocation.priorityScore,
                    justification: allocation.justification
                };
                idea.status = 'Funded';
                await idea.save();

                // Create notification for idea submitter
                notifications.push({
                    recipient: idea.submittedBy,
                    sender: req.user._id,
                    type: 'Achievement',
                    idea: idea._id,
                    message: `🎉 Your idea "${idea.title}" has been allocated ₹${(allocation.allocatedBudget / 100000).toFixed(2)} Lakh in budget!`
                });
            }
        }

        // Send notifications to all idea submitters
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // Notify all citizens about budget allocation
        const citizens = await User.find({ role: 'citizen', isActive: true }).select('_id');
        if (citizens.length > 0) {
            const citizenNotifications = citizens.map(citizen => ({
                recipient: citizen._id,
                sender: req.user._id,
                type: 'AdminAlert',
                message: `Government has approved budget allocation for ${budgetAllocation.allocations.length} innovative ideas! Check the Innovation Hub.`
            }));
            await Notification.insertMany(citizenNotifications);
        }

        res.status(200).json({
            success: true,
            message: 'Budget allocation approved successfully. All citizens have been notified.',
            data: budgetAllocation
        });

    } catch (error) {
        console.error('Approve budget allocation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve budget allocation'
        });
    }
};

/**
 * @desc    Get all budget allocations
 * @route   GET /api/agents/budget-planner
 * @access  Private/Admin
 */
const getAllBudgetAllocations = async (req, res) => {
    try {
        const allocations = await BudgetAllocation.find()
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('allocations.idea', 'title category status')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: allocations
        });

    } catch (error) {
        console.error('Get budget allocations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget allocations'
        });
    }
};

/**
 * @desc    Generate PDF report
 * @route   GET /api/agents/budget-planner/:id/pdf
 * @access  Private/Admin
 */
const generatePDFReport = async (req, res) => {
    try {
        const budgetAllocation = await BudgetAllocation.findById(req.params.id)
            .populate('allocations.idea', 'title category submittedBy')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');

        if (!budgetAllocation) {
            return res.status(404).json({
                success: false,
                message: 'Budget allocation not found'
            });
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `Budget_Allocation_${budgetAllocation.fiscalYear}_${Date.now()}.pdf`;

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe PDF directly to response
        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Budget Allocation Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Fiscal Year: ${budgetAllocation.fiscalYear}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary Section
        doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').text(budgetAllocation.summary);
        doc.moveDown();

        // Budget Overview
        doc.fontSize(14).font('Helvetica-Bold').text('Budget Overview');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Budget: ₹${(budgetAllocation.totalBudget / 10000000).toFixed(2)} Crore`);
        doc.text(`Allocated Budget: ₹${(budgetAllocation.allocatedBudget / 10000000).toFixed(2)} Crore`);
        doc.text(`Contingency Reserve: ₹${(budgetAllocation.contingencyReserve / 10000000).toFixed(2)} Crore`);
        doc.text(`Status: ${budgetAllocation.status}`);
        doc.moveDown();

        // Recommendations
        if (budgetAllocation.recommendations && budgetAllocation.recommendations.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Key Recommendations');
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            budgetAllocation.recommendations.forEach((rec, index) => {
                doc.text(`${index + 1}. ${rec}`);
            });
            doc.moveDown();
        }

        // Allocations Table
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Budget Allocations by Priority');
        doc.moveDown();

        budgetAllocation.allocations.forEach((allocation, index) => {
            const ideaTitle = allocation.idea?.title || 'Unknown Idea';
            const ideaCategory = allocation.idea?.category || 'N/A';
            
            doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${ideaTitle}`);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Category: ${ideaCategory}`);
            doc.text(`Priority: ${allocation.priority} (Score: ${allocation.priorityScore}/100)`);
            doc.text(`Allocated Budget: ₹${(allocation.allocatedBudget / 100000).toFixed(2)} Lakh`);
            doc.text(`Timeline: ${allocation.estimatedTimeline || 'TBD'}`);
            doc.text(`Expected ROI: ${allocation.expectedROI || 'N/A'}`);
            doc.fontSize(9).text(`Justification: ${allocation.justification}`);
            doc.moveDown();

            if ((index + 1) % 4 === 0 && index < budgetAllocation.allocations.length - 1) {
                doc.addPage();
            }
        });

        // Footer
        const footerText = `Created by: ${budgetAllocation.createdBy?.name || 'Unknown'} | ${budgetAllocation.status === 'Approved' ? `Approved by: ${budgetAllocation.approvedBy?.name || 'Unknown'}` : 'Status: Draft'}`;
        doc.fontSize(9).font('Helvetica').text(
            footerText,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Generate PDF error:', error);
        
        // If headers not sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate PDF report',
                error: error.message
            });
        }
    }
};

module.exports = {
    analyzeBudget,
    updateBudgetAllocation,
    approveBudgetAllocation,
    getAllBudgetAllocations,
    generatePDFReport
};
