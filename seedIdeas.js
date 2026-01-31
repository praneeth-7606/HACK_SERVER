require('dotenv').config();
const mongoose = require('mongoose');
const Idea = require('./models/Idea');
const User = require('./models/User');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const sampleIdeas = [
    {
        "title": "AI-Powered Citizen Grievance Redressal Platform",
        "description": "A centralized AI-driven platform where citizens can submit grievances through text, voice, or images. The system automatically classifies complaints, routes them to the correct department, predicts resolution timelines, and tracks officer accountability. It reduces delays, eliminates manual sorting, and increases transparency in public service delivery.",
        "category": "Technology & Innovation",
        "subCategory": "e-Governance",
        "targetArea": "Hyderabad, Telangana",
        "expectedImpact": "State",
        "estimatedBudget": {
            "amount": 25000000,
            "currency": "INR",
            "description": "Budget will be utilized for AI model development, cloud infrastructure, mobile app and web portal development, cybersecurity, training government staff, and system maintenance."
        },
        "timeline": {
            "proposed": "8 months",
            "description": "Development and deployment timeline including testing and training phases"
        },
        "benefits": [
            "Faster grievance resolution",
            "Increased transparency",
            "Improved citizen satisfaction",
            "Reduced corruption"
        ],
        "challenges": [
            "Data privacy compliance",
            "Integration with legacy systems",
            "Training government officials"
        ],
        "resources": [
            "AI engineers",
            "Cloud infrastructure",
            "Government IT access",
            "Cybersecurity tools"
        ],
        "tags": ["ai", "governance", "transparency", "citizen-services"],
        "visibility": "Public",
        "status": "Submitted"
    },
    {
        "title": "Smart Waste Management Using IoT and Analytics",
        "description": "A city-wide smart waste management system using IoT sensors on bins to track fill levels and optimize collection routes. The system reduces operational costs, prevents overflow, and enables real-time monitoring by municipal authorities.",
        "category": "Urban Planning",
        "subCategory": "Smart Cities",
        "targetArea": "Chennai, Tamil Nadu",
        "expectedImpact": "District",
        "estimatedBudget": {
            "amount": 18000000,
            "currency": "INR",
            "description": "Funds will cover IoT sensors, data analytics platform, fleet tracking systems, mobile dashboards, and training for sanitation workers."
        },
        "timeline": {
            "proposed": "6 months",
            "description": "Pilot implementation followed by city-wide rollout"
        },
        "benefits": [
            "Cleaner cities",
            "Reduced waste collection costs",
            "Improved public health",
            "Optimized municipal operations"
        ],
        "challenges": [
            "Sensor maintenance",
            "Network reliability",
            "Initial adoption by workers"
        ],
        "resources": [
            "IoT devices",
            "Data engineers",
            "Municipal cooperation",
            "Fleet management software"
        ],
        "tags": ["iot", "waste-management", "smart-city", "sustainability"],
        "visibility": "Public",
        "status": "Submitted"
    },
    {
        "title": "Digital Skill Passport for Youth Employment",
        "description": "A blockchain-based digital skill passport that stores verified skills, certifications, and training records of youth, enabling employers and government agencies to instantly verify candidate capabilities and match them with job opportunities.",
        "category": "Employment & Skills",
        "subCategory": "Skill Development",
        "targetArea": "Andhra Pradesh",
        "expectedImpact": "State",
        "estimatedBudget": {
            "amount": 22000000,
            "currency": "INR",
            "description": "Budget allocation includes blockchain system development, integration with training institutes, web portal creation, and awareness programs."
        },
        "timeline": {
            "proposed": "7 months",
            "description": "System development, testing, and state-wide deployment"
        },
        "benefits": [
            "Improved job matching",
            "Fraud-free certification",
            "Increased youth employability",
            "Faster recruitment processes"
        ],
        "challenges": [
            "Inter-department coordination",
            "Data standardization",
            "User adoption"
        ],
        "resources": [
            "Blockchain developers",
            "Training institute partnerships",
            "Government databases",
            "Cloud services"
        ],
        "tags": ["blockchain", "employment", "youth", "skills"],
        "visibility": "Public",
        "status": "Submitted"
    },
    {
        "title": "Smart Water Leakage Detection and Control System",
        "description": "An AI and sensor-based water pipeline monitoring system that detects leakages in real-time, reduces water loss, and optimizes water distribution across urban and rural areas.",
        "category": "Infrastructure Development",
        "subCategory": "Water Management",
        "targetArea": "Telangana State",
        "expectedImpact": "State",
        "estimatedBudget": {
            "amount": 30000000,
            "currency": "INR",
            "description": "Funding will be used for sensor deployment, AI analytics platform, command center setup, field devices, and maintenance training."
        },
        "timeline": {
            "proposed": "10 months",
            "description": "Phased deployment across districts with pilot testing"
        },
        "benefits": [
            "Reduced water wastage",
            "Improved water supply reliability",
            "Lower maintenance costs",
            "Better planning and forecasting"
        ],
        "challenges": [
            "High initial deployment cost",
            "Sensor durability",
            "Terrain-related installation issues"
        ],
        "resources": [
            "IoT sensors",
            "AI engineers",
            "Water department integration",
            "Field technicians"
        ],
        "tags": ["water", "ai", "infrastructure", "sustainability"],
        "visibility": "Public",
        "status": "Submitted"
    },
    {
        "title": "AI-Based Crop Advisory and Market Price Prediction System",
        "description": "A mobile-based AI system that provides farmers with crop advisory, pest alerts, weather forecasts, and real-time market price predictions to improve farm productivity and income.",
        "category": "Agriculture & Farming",
        "subCategory": "AgriTech",
        "targetArea": "Rural Andhra Pradesh",
        "expectedImpact": "State",
        "estimatedBudget": {
            "amount": 20000000,
            "currency": "INR",
            "description": "Budget will be spent on AI model development, satellite data integration, mobile app development, and farmer training programs."
        },
        "timeline": {
            "proposed": "6 months",
            "description": "Development, testing, and farmer onboarding"
        },
        "benefits": [
            "Higher crop yields",
            "Reduced losses due to pests",
            "Better price realization",
            "Increased farmer income"
        ],
        "challenges": [
            "Digital literacy among farmers",
            "Data accuracy",
            "Language localization"
        ],
        "resources": [
            "Agriculture experts",
            "AI developers",
            "Satellite data access",
            "Mobile app developers"
        ],
        "tags": ["agriculture", "ai", "farmers", "price-prediction"],
        "visibility": "Public",
        "status": "Submitted"
    }
];

const seedIdeas = async () => {
    try {
        await connectDB();

        // Find 2 citizen users
        const citizens = await User.find({ role: 'citizen' }).limit(2);
        
        if (citizens.length < 2) {
            console.log('❌ Need at least 2 citizen users. Please create citizen accounts first.');
            process.exit(1);
        }

        console.log(`✅ Found ${citizens.length} citizen users:`);
        citizens.forEach((citizen, index) => {
            console.log(`   ${index + 1}. ${citizen.name} (${citizen.email})`);
        });

        // Assign ideas to citizens alternately
        const ideasWithSubmitters = sampleIdeas.map((idea, index) => ({
            ...idea,
            submittedBy: citizens[index % 2]._id, // Alternate between 2 citizens
            isActive: true,
            priority: 'Medium'
        }));

        // Insert ideas
        const result = await Idea.insertMany(ideasWithSubmitters);
        
        console.log(`\n✅ Successfully added ${result.length} ideas:`);
        result.forEach((idea, index) => {
            const submitter = citizens[index % 2];
            console.log(`   ${index + 1}. ${idea.title}`);
            console.log(`      Submitted by: ${submitter.name}`);
            console.log(`      Category: ${idea.category}`);
            console.log(`      Budget: ₹${idea.estimatedBudget.amount.toLocaleString()}`);
            console.log('');
        });

        console.log('🎉 Idea seeding completed successfully!');
        
        // Show distribution
        console.log('\n📊 Distribution:');
        console.log(`   ${citizens[0].name}: ${Math.ceil(sampleIdeas.length / 2)} ideas`);
        console.log(`   ${citizens[1].name}: ${Math.floor(sampleIdeas.length / 2)} ideas`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding ideas:', error);
        process.exit(1);
    }
};

seedIdeas();
