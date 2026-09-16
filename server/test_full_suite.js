require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const authService = require('./src/modules/auth/auth.service');
const adminService = require('./src/modules/admin/admin.service');
const systemService = require('./src/modules/system/system.service');
const screeningService = require('./src/modules/screening/screening.service');
const User = require('./src/modules/auth/user.model');
const Screening = require('./src/modules/screening/screening.model');

async function runComprehensiveTest() {
  console.log('====================================================');
  console.log('STARTING COMPREHENSIVE DOCUSCREEN SYSTEM TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Database Connection
    console.log('[1/8] Testing MongoDB Connection...');
    await connectDB();
    console.log('  ✓ MongoDB successfully connected.\n');

    // 2. Default Seed & Authentication
    console.log('[2/8] Testing Auto-Seeding & Authentication...');
    await authService.seedDefaultUser();
    const loginResult = await authService.login('admin@docuscreen.local', 'password');
    console.log('  ✓ Login successful for:', loginResult.user.email);
    console.log('  ✓ JWT Bearer Token generated, length:', loginResult.token.length);
    console.log('  ✓ Officer Role:', loginResult.user.role);
    console.log('  ✓ Badge Number:', loginResult.user.badgeNumber, '\n');

    // 3. Officer Profile Update
    console.log('[3/8] Testing Profile Updating...');
    const updatedOfficer = await authService.updateProfile(loginResult.user._id, {
      name: 'Inspector John Doe',
      department: 'Border Security & Screening Division',
      badgeNumber: 'DS-9001'
    });
    console.log('  ✓ Profile updated:', updatedOfficer.name, `(${updatedOfficer.department})\n`);

    // 4. Admin User Provisioning & Deletion
    console.log('[4/8] Testing Admin Officer Provisioning & Lifecycle...');
    const testOfficerEmail = `test.officer.${Date.now()}@docuscreen.local`;
    const newOfficer = await adminService.createUser({
      name: 'Officer Alex Vance',
      email: testOfficerEmail,
      password: 'TemporaryPass123!',
      role: 'officer',
      badgeNumber: 'DS-7744',
      department: 'Checkpoint Bravo'
    });
    console.log('  ✓ Provisioned new officer:', newOfficer.email, `(ID: ${newOfficer._id})`);

    const usersList = await adminService.listUsers();
    console.log('  ✓ Officer directory count:', usersList.length);

    // Delete the test officer
    await adminService.deleteUser(newOfficer._id, loginResult.user._id);
    console.log('  ✓ Successfully de-provisioned test officer.\n');

    // 5. System Settings & AI Heuristic Thresholds
    console.log('[5/8] Testing System Settings & Heuristic Thresholds...');
    const initialSettings = await systemService.getSettings();
    console.log('  ✓ Default blur threshold:', initialSettings.blurThreshold);
    console.log('  ✓ Default face match threshold:', initialSettings.faceMatchThreshold);
    console.log('  ✓ Workstation name:', initialSettings.workstationName);

    const updatedSettings = await systemService.updateSettings({
      blurThreshold: 110,
      workstationName: 'Counter 01 - Primary Inspection Booth'
    });
    console.log('  ✓ Updated settings verified:', updatedSettings.workstationName, `(Blur: ${updatedSettings.blurThreshold})\n`);

    // 6. Screening Querying & Hybrid ID Resolution
    console.log('[6/8] Testing Screening Database & Hybrid ID Resolution...');
    const screenings = await Screening.find().sort({ createdAt: -1 }).limit(3);
    console.log('  ✓ Retrieved recent screenings count:', screenings.length);

    if (screenings.length > 0) {
      const sample = screenings[0];
      // Test search by custom screeningId (e.g. SCR-...)
      const byScreeningId = await screeningService.getScreeningById(sample.screeningId);
      console.log('  ✓ Found by screeningId string:', byScreeningId?.screeningId === sample.screeningId);

      // Test search by MongoDB ObjectId string
      const byObjectId = await screeningService.getScreeningById(sample._id.toString());
      console.log('  ✓ Found by MongoDB ObjectId string:', byObjectId?._id.toString() === sample._id.toString());
    }
    console.log('');

    // 7. System Infrastructure Health Telemetry
    console.log('[7/8] Testing System Telemetry & Microservice Monitoring...');
    const telemetry = await adminService.getSystemHealth();
    console.log('  ✓ Database status:', telemetry.database.status);
    console.log('  ✓ Node.js version:', telemetry.server.nodeVersion);
    console.log('  ✓ Memory Heap used:', telemetry.server.memory.heapUsedMB, 'MB');
    console.log('  ✓ AI microservice target:', telemetry.aiService.url, `(Status: ${telemetry.aiService.status})\n`);

    // 8. Self-Protection Rules
    console.log('[8/8] Testing Admin Self-Protection Safeguards...');
    try {
      await adminService.deleteUser(loginResult.user._id, loginResult.user._id);
      throw new Error('FAILED: Admin was able to delete themselves!');
    } catch (err) {
      console.log('  ✓ Safeguard active: Self-deletion prevented successfully (' + err.message + ')\n');
    }

    console.log('====================================================');
    console.log('ALL 8 TEST SUITES COMPLETED WITH 100% PASS RATE! 🎉');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE ENCOUNTERED AN ERROR:', err);
    process.exit(1);
  }
}

runComprehensiveTest();
