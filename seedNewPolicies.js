require('dotenv').config();
const mongoose = require('mongoose');
const Policy = require('./models/Policy');
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

const newPolicies = [
    {
        "title": "State Youth Recruitment in Police and Armed Forces",
        "category": "Public Safety",
        "status": "Published",
        "description": "This policy aims to provide structured employment opportunities to youth in police, navy, and other armed forces. It addresses unemployment while strengthening internal security mechanisms. The initiative promotes disciplined and service-oriented career paths. Special recruitment drives are conducted across rural and urban districts. Transparent selection procedures are enforced through merit-based exams. Physical and psychological fitness programs are integrated. The policy includes reservation norms for socially disadvantaged groups. Advanced training academies are set up for skill development. It promotes gender inclusion by encouraging women applicants. The scheme supports technical and cyber security roles. Candidates receive modern equipment and professional training. It reduces crime rates by improving police manpower. The policy enhances youth participation in nation-building. It generates long-term stable government employment. Family welfare benefits are provided to recruits. Career progression pathways are clearly defined. The initiative also supports national defense preparedness. It improves trust between citizens and law enforcement. This policy contributes to overall social stability.",
        "documentUrl": "https://statepolicerecruitment.gov.in",
        "effectiveDate": new Date("2022-04-01"),
        "tags": ["youth", "employment", "police", "defense"]
    },
    {
        "title": "Rural and Urban Road Infrastructure Development Policy",
        "category": "Infrastructure",
        "status": "Published",
        "description": "This policy focuses on building high-quality road networks in rural and urban regions. It ensures transparent tendering and contract awarding mechanisms. Priority is given to village-to-town connectivity. It supports economic growth by improving logistics. The policy reduces travel time and fuel consumption. Road safety standards are strictly enforced. Smart monitoring systems track project progress. Local contractors are encouraged to participate. Employment generation is boosted through infrastructure works. Public-private partnerships are promoted. Drainage and flood-resilient designs are incorporated. It improves access to healthcare and education. Digital GIS-based planning is adopted. Maintenance contracts ensure long-term road durability. Environmental clearances are streamlined. The policy enhances disaster response connectivity. It strengthens rural market linkages. Overall mobility and trade efficiency improve.",
        "documentUrl": "https://roadsinfra.gov.in",
        "effectiveDate": new Date("2020-06-15"),
        "tags": ["roads", "contracts", "infrastructure", "transport"]
    },
    {
        "title": "Old Age and Social Security Pension Scheme",
        "category": "Economy",
        "status": "Published",
        "description": "This scheme provides financial support to elderly citizens. It ensures a steady monthly income for basic needs. Widows and disabled individuals are also covered. It promotes dignity and independence in old age. Payments are transferred directly to bank accounts. Leakages are minimized through Aadhaar-based systems. It reduces poverty among vulnerable populations. The policy supports healthcare access for seniors. Special grievance redressal mechanisms are established. Village secretariats assist in enrollment. The scheme improves rural social security. Inflation-linked revisions are periodically introduced. It supports social inclusion and equity. Beneficiary data is digitized. It prevents elderly neglect and abandonment. It enhances family stability. The scheme is regularly audited. It aligns with national social protection goals.",
        "documentUrl": "https://socialsecurity.gov.in",
        "effectiveDate": new Date("2015-01-01"),
        "tags": ["pension", "elderly", "welfare", "social security"]
    },
    {
        "title": "Amma Vadi Scheme",
        "category": "Education",
        "status": "Published",
        "description": "Amma Vadi encourages mothers to send children to school. It provides financial support linked to school attendance. It targets economically weaker households. Girl child education is strongly promoted. Funds are credited directly to mothers' accounts. Dropout rates have significantly reduced. School infrastructure usage has improved. Parental accountability in education is strengthened. Special monitoring ensures transparency. The scheme supports both government and aided schools. It reduces child labor. The policy increases literacy rates. Village education committees oversee implementation. It enhances women's role in decision-making. The initiative boosts intergenerational mobility. Education access improves in rural areas. It aligns with Right to Education goals. It builds a skilled future workforce.",
        "documentUrl": "https://ammavadi.ap.gov.in",
        "effectiveDate": new Date("2019-06-10"),
        "tags": ["education", "mothers", "students", "welfare"]
    },
    {
        "title": "Free LPG Gas Cylinder Scheme",
        "category": "Environment",
        "status": "Published",
        "description": "This scheme provides free LPG cylinders to eligible families. It reduces household expenditure on cooking fuel. Women benefit directly from cost savings. It promotes clean energy usage. Indoor air pollution is significantly reduced. Health risks from traditional fuels decrease. Carbon emissions are lowered. The policy supports environmental sustainability. It improves quality of life for rural women. Digital beneficiary identification prevents misuse. Delivery systems are streamlined. It complements national energy goals. The scheme empowers low-income families. Cooking efficiency improves. Women's daily workload reduces. The initiative supports climate commitments. It increases LPG adoption. Fuel access becomes equitable.",
        "documentUrl": "https://freegas.gov.in",
        "effectiveDate": new Date("2021-03-01"),
        "tags": ["lpg", "energy", "women", "welfare"]
    },
    {
        "title": "Free Bus Travel Scheme for Women",
        "category": "Transportation",
        "status": "Published",
        "description": "This scheme allows women to travel free in state buses. It improves women's mobility. It reduces daily travel expenses. Employment participation of women increases. Girl students benefit greatly. Public transport usage rises. Private vehicle dependency reduces. Urban congestion decreases. Women safety awareness increases. Economic inclusion is strengthened. It promotes gender equality. Transport access becomes inclusive. Women entrepreneurs benefit. Household savings increase. It supports green transport. The policy encourages education access. Women workforce expands. Cities become more inclusive.",
        "documentUrl": "https://womenschemes.gov.in",
        "effectiveDate": new Date("2021-08-15"),
        "tags": ["women", "transport", "safety", "welfare"]
    }
];

const seedNewPolicies = async () => {
    try {
        await connectDB();

        // Find an admin user to assign as creator
        const admin = await User.findOne({ role: 'admin' });
        
        if (!admin) {
            console.log('❌ No admin user found. Please create an admin user first.');
            process.exit(1);
        }

        console.log(`✅ Found admin user: ${admin.name}`);

        // Add createdBy field to each policy
        const policiesWithCreator = newPolicies.map(policy => ({
            ...policy,
            createdBy: admin._id,
            isActive: true
        }));

        // Insert policies
        const result = await Policy.insertMany(policiesWithCreator);
        
        console.log(`\n✅ Successfully added ${result.length} new policies:`);
        result.forEach((policy, index) => {
            console.log(`   ${index + 1}. ${policy.title} (${policy.category})`);
        });

        console.log('\n🎉 Policy seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding policies:', error);
        process.exit(1);
    }
};

seedNewPolicies();
