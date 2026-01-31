const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

/**
 * Extract text content from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} - Extracted text content
 */
const extractPDFText = async (filePath) => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
};

/**
 * Delete file from uploads directory
 * @param {string} filePath - Path to file to delete
 */
const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('File deletion error:', error);
    }
};

module.exports = {
    extractPDFText,
    deleteFile
};
