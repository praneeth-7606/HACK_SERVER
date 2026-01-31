require('dotenv').config();
const mongoose = require('mongoose');
const Idea = require('./models/Idea');
const User = require('./models/User'); // Need to register User model

const checkIdeas = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const count = await Idea.countDocuments();
        console.log(`\n📊 Total ideas in database: ${count}`);
        
        if (count > 0) {
            const ideas = await Idea.find()
                .populate('submittedBy', 'name email')
                .select('title category status submittedBy createdAt');
            
            console.log('\n💡 Ideas found:');
            ideas.forEach((idea, index) => {
                console.log(`\n${index + 1}. ${idea.title}`);
                console.log(`   Category: ${idea.category}`);
                console.log(`   Status: ${idea.status}`);
                console.log(`   Submitted by: ${idea.submittedBy?.name || 'Unknown'}`);
                console.log(`   Created: ${idea.createdAt}`);
            });
        } else {
            console.log('\n❌ No ideas found in database!');
            console.log('Run: npm run seed:ideas');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkIdeas();
