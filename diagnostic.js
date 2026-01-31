const path = require('path');
const fs = require('fs');

console.log('--- DIAGNOSTIC START ---');
try {
    const notificationRoutesPath = path.join(__dirname, 'routes', 'notificationRoutes.js');
    const notificationControllerPath = path.join(__dirname, 'controllers', 'notificationController.js');

    console.log('Checking files existence...');
    console.log(`Routes exists: ${fs.existsSync(notificationRoutesPath)}`);
    console.log(`Controller exists: ${fs.existsSync(notificationControllerPath)}`);

    console.log('\nLoading Controller...');
    const controller = require('./controllers/notificationController');
    console.log('Controller exported keys:', Object.keys(controller));

    console.log('\nLoading Routes...');
    const router = require('./routes/notificationRoutes');
    console.log('Router loaded successfully');

    // Check if router has the expected route
    const routes = router.stack
        .filter(r => r.route)
        .map(r => ({
            path: r.route.path,
            methods: Object.keys(r.route.methods)
        }));
    console.log('Registered sub-routes:', routes);

} catch (err) {
    console.error('\n--- DIAGNOSTIC ERROR ---');
    console.error(err);
}
console.log('\n--- DIAGNOSTIC END ---');
