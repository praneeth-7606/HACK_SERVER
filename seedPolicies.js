require('dotenv').config();
const mongoose = require('mongoose');
const Policy = require('./models/Policy');
const User = require('./models/User');
const connectDB = require('./config/db');

const policies = [
    {
        title: "YSR Rythu Bharosa Scheme",
        category: "Infrastructure",
        status: "Published",
        description: "YSR Rythu Bharosa is a flagship welfare scheme of Andhra Pradesh aimed at providing financial assistance to farmers for crop investment support. The policy ensures direct benefit transfer to eligible farmers to enhance agricultural productivity and reduce dependency on loans.",
        documentUrl: "https://ysrrythubharosa.ap.gov.in",
        effectiveDate: new Date("2019-10-15"),
        tags: ["agriculture", "farmers", "welfare", "subsidies"]
    },
    {
        title: "Amaravati Capital Development Policy",
        category: "Infrastructure",
        status: "Draft",
        description: "This policy outlines the phased development of Amaravati as the capital city of Andhra Pradesh, focusing on sustainable urban planning, smart infrastructure, and integrated transport systems to support long-term economic growth.",
        documentUrl: "https://crda.ap.gov.in",
        effectiveDate: new Date("2025-01-01"),
        tags: ["infrastructure", "urban development", "smart city"]
    },
    {
        title: "Telangana Rythu Bandhu Scheme",
        category: "Infrastructure",
        status: "Published",
        description: "Rythu Bandhu is an investment support scheme for farmers in Telangana, providing per-acre financial assistance each crop season to help farmers meet agricultural input costs and improve farm sustainability.",
        documentUrl: "https://rythubandhu.telangana.gov.in",
        effectiveDate: new Date("2018-05-10"),
        tags: ["agriculture", "farmers", "income support"]
    },
    {
        title: "Telangana Mission Bhagiratha",
        category: "Infrastructure",
        status: "Published",
        description: "Mission Bhagiratha aims to provide safe and sustainable drinking water to every household in Telangana through an extensive pipeline and water treatment infrastructure network.",
        documentUrl: "https://missionbhagiratha.telangana.gov.in",
        effectiveDate: new Date("2016-08-01"),
        tags: ["water supply", "infrastructure", "public health"]
    },
    {
        title: "Tamil Nadu Chief Minister's Comprehensive Health Insurance Scheme",
        category: "Health",
        status: "Published",
        description: "This scheme provides free medical and surgical treatment coverage to economically weaker sections of Tamil Nadu, improving access to quality healthcare services across government and empanelled private hospitals.",
        documentUrl: "https://cmchistn.in",
        effectiveDate: new Date("2012-06-23"),
        tags: ["healthcare", "insurance", "welfare"]
    },
    {
        title: "Tamil Nadu Electric Vehicle Policy",
        category: "Transportation",
        status: "Published",
        description: "The Tamil Nadu EV Policy promotes the adoption of electric vehicles through incentives, charging infrastructure development, and investment facilitation to position the state as a leading EV manufacturing hub.",
        documentUrl: "https://www.tn.gov.in/evpolicy",
        effectiveDate: new Date("2019-09-01"),
        tags: ["electric vehicles", "sustainability", "transport"]
    },
    {
        title: "Telangana IT & Electronics Policy",
        category: "Technology",
        status: "Published",
        description: "This policy aims to strengthen Telangana's position as a global IT hub by promoting innovation, startups, electronics manufacturing, and digital infrastructure development.",
        documentUrl: "https://it.telangana.gov.in",
        effectiveDate: new Date("2016-04-15"),
        tags: ["IT", "startups", "electronics", "digital"]
    },
    {
        title: "Andhra Pradesh Industrial Development Policy",
        category: "Economy",
        status: "Published",
        description: "This policy facilitates industrial growth in Andhra Pradesh by offering fiscal incentives, infrastructure support, and ease-of-doing-business reforms to attract domestic and foreign investment.",
        documentUrl: "https://industries.ap.gov.in",
        effectiveDate: new Date("2020-07-01"),
        tags: ["industry", "manufacturing", "investment"]
    }
];

const seedPolicies = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to MongoDB');

        // Find an admin user to assign as creator
        let adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log('No admin user found. Creating a default admin...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            adminUser = await User.create({
                name: 'System Admin',
                email: 'admin@civicconnect.com',
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });
            console.log('Default admin created');
        }

        // Clear existing policies (optional - comment out if you want to keep existing ones)
        // await Policy.deleteMany({});
        // console.log('Cleared existing policies');

        // Add createdBy field to each policy
        const policiesWithCreator = policies.map(policy => ({
            ...policy,
            createdBy: adminUser._id
        }));

        // Insert policies
        const insertedPolicies = await Policy.insertMany(policiesWithCreator);
        
        console.log(`\n✅ Successfully seeded ${insertedPolicies.length} policies!\n`);
        
        insertedPolicies.forEach((policy, index) => {
            console.log(`${index + 1}. ${policy.title} (${policy.status})`);
        });

        console.log('\n🎉 Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding policies:', error);
        process.exit(1);
    }
};

// Run the seed function
seedPolicies();
