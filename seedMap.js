const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Concern = require('./models/Concern');
const User = require('./models/User');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/civicconnect');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const seedConcerns = async () => {
    await connectDB();

    try {
        // Find a user to assign concerns to
        const user = await User.findOne({ role: 'citizen' });
        if (!user) {
            console.log('No citizen user found. Please register one first.');
            process.exit(1);
        }

        // Hyderabad Center: 17.3850, 78.4867
        const HYD_LAT = 17.3850;
        const HYD_LNG = 78.4867;

        const categories = [
            'Infrastructure', 'Sanitation', 'Public Safety', 'Health',
            'Environment', 'Transportation', 'Utlities'
        ];

        const statuses = ['Pending', 'In Progress', 'Resolved'];

        const concerns = [];

        console.log('Deleting existing concerns...');
        await Concern.deleteMany({});

        console.log('Creating 30 demo concerns around Hyderabad...');

        for (let i = 0; i < 30; i++) {
            // Random offset within ~5-10km
            // 0.1 deg is approx 11km
            const latOffset = (Math.random() - 0.5) * 0.15;
            const lngOffset = (Math.random() - 0.5) * 0.15;

            concerns.push({
                title: `Demo Concern #${i + 1}`,
                description: `This is a simulated concern for testing map functionality. It is located near Hyderabad.`,
                category: categories[Math.floor(Math.random() * categories.length)],
                location: `Simulated Location ${i + 1}`,
                coordinates: {
                    lat: HYD_LAT + latOffset,
                    lng: HYD_LNG + lngOffset
                },
                status: statuses[Math.floor(Math.random() * statuses.length)],
                createdBy: user._id
            });
        }

        await Concern.insertMany(concerns);
        console.log('✅ Standard seeding complete: 30 concerns added.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedConcerns();
