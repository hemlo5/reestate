import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteDbAdapter } from './sqlite-adapter';
import { MemoryDbAdapter } from './memory-adapter';
import { AppError } from './errors';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

test('SqliteDbAdapter enforces seeding, auth, privacy masking, proposal lifecycle, and RBAC', async () => {
  const db = new SqliteDbAdapter(':memory:');

  // 1. Seed verification
  const demoUsers = await db.listDemoUsers();
  assert.ok(demoUsers.length >= 4, 'Expected seeded demo seeker + brokers');

  const seededPage = await db.listProperties({ limit: 3 });
  assert.equal(seededPage.items.length, 3);
  assert.ok(seededPage.nextCursor, 'Expected cursor when more properties exist');

  const page2 = await db.listProperties({ limit: 3, cursor: seededPage.nextCursor });
  assert.ok(page2.items.length > 0);
  assert.notEqual(page2.items[0]?.id, seededPage.items[0]?.id);

  // 2. Auth: seeded password works, duplicate email rejected
  const ananyaStored = await db.getUserByEmail('ananya@housed.in');
  assert.ok(ananyaStored);
  assert.equal(await verifyPassword('housed123', ananyaStored.passwordHash), true);

  const newSeeker = await db.createUser({
    name: 'Priya Menon',
    email: 'priya@example.com',
    phone: '+91 98450 99887',
    role: 'seeker',
    city: 'Bengaluru',
    authMethod: 'password',
    passwordHash: await hashPassword('secret123'),
  });
  assert.equal(newSeeker.role, 'seeker');

  await assert.rejects(
    () =>
      db.createUser({
        name: 'Priya Duplicate',
        email: 'priya@example.com',
        phone: '+91 98450 99887',
        role: 'seeker',
        city: 'Bengaluru',
        authMethod: 'password',
        passwordHash: 'hash',
      }),
    (err: unknown) => err instanceof AppError && err.status === 409
  );

  // 3. Seeker posts requirement -> broker sees lead with MASKED contact initially
  const req = await db.createRequirement(newSeeker, {
    intent: 'rent',
    localities: ['Indiranagar'],
    budgetMin: 25000,
    budgetMax: 40000,
    propertyType: 'Flat',
    bedrooms: 2,
    furnishing: 'Semi-furnished',
    moveInDate: 'Next Month',
    amenities: ['Covered Parking'],
    notes: 'Quiet street preferred',
  });
  assert.equal(req.seekerId, newSeeker.id);

  const broker = await db.getUserById('broker-1');
  assert.ok(broker);

  const leads = await db.getLeadsForBroker({
    brokerId: broker.id,
    locality: 'Indiranagar',
    limit: 20,
  });
  const priyaLead = leads.items.find((l) => l.requirement.id === req.id);
  assert.ok(priyaLead, 'Broker should see newly posted active requirement');
  assert.ok(!priyaLead.requirement.seekerPhone, 'Seeker phone must be masked before consent');
  assert.ok(!priyaLead.requirement.seekerEmail, 'Seeker email must be masked before consent');

  // 4. Broker creates property & submits proposal; duplicate pitch blocked with 409
  const prop = await db.createProperty(broker, {
    title: 'Sunny 2 BHK in Indiranagar HAL 2nd Stage',
    intent: 'rent',
    locality: 'Indiranagar',
    city: 'Bengaluru',
    address: '12th Main, Indiranagar',
    price: 36000,
    brokerageFee: '1 Month Rent',
    propertyType: 'Flat',
    bedrooms: 2,
    bathrooms: 2,
    areaSqFt: 1180,
    floorInfo: '3rd of 4 floors',
    furnishing: 'Semi-furnished',
    availableFrom: 'Immediate',
    amenities: ['Covered Parking'],
    description: 'Walkable to Indiranagar metro.',
    images: ['/images/properties/prop_modern_apartment_living_1794935542267.jpg'],
    availability: 'available',
    mapX: 64,
    mapY: 38,
  });

  // Non-owner cannot edit/delete property
  const otherBroker = await db.getUserById('broker-2');
  assert.ok(otherBroker);
  await assert.rejects(
    () => db.updateProperty(prop.id, otherBroker.id, { price: 1000 }),
    (err: unknown) => err instanceof AppError && err.status === 403
  );

  const proposal = await db.createProposal(broker, {
    requirementId: req.id,
    propertyId: prop.id,
    proposedPrice: 36000,
    brokerageCharge: '1 Month Rent',
    message: 'Great 2 BHK right near 12th Main.',
    whyMatches: 'Exact Indiranagar location and within ₹40,000 budget.',
    availabilityConfirmed: true,
  });
  assert.equal(proposal.status, 'pending');

  await assert.rejects(
    () =>
      db.createProposal(broker, {
        requirementId: req.id,
        propertyId: prop.id,
        proposedPrice: 35000,
        brokerageCharge: '1 Month Rent',
        message: 'Duplicate pitch attempt',
        availabilityConfirmed: true,
      }),
    (err: unknown) => err instanceof AppError && err.status === 409
  );

  // 5. Seeker accepts proposal -> contact unlocked for broker
  const accepted = await db.updateProposal(proposal.id, newSeeker, {
    status: 'accepted',
    contactShared: true,
  });
  assert.ok(accepted);
  assert.equal(accepted.contactShared, true);

  const leadsAfterConsent = await db.getLeadsForBroker({
    brokerId: broker.id,
    locality: 'Indiranagar',
    limit: 20,
  });
  const unlockedLead = leadsAfterConsent.items.find((l) => l.requirement.id === req.id);
  assert.equal(unlockedLead?.requirement.seekerPhone, newSeeker.phone);

  // 6. Visit booking & confirmation updates proposal statusDetail
  const visit = await db.createVisit(newSeeker, {
    propertyId: prop.id,
    proposalId: proposal.id,
    date: '2026-12-01',
    timeSlot: '11:00 AM',
  });
  const confirmedVisit = await db.updateVisitStatus(visit.id, broker, 'confirmed');
  assert.equal(confirmedVisit?.status, 'confirmed');

  const updatedProp = await db.getProposalById(proposal.id);
  assert.equal(updatedProp?.statusDetail, 'Visit Scheduled');

  // 7. Broker marks deal Closed -> increments closedDealsCount
  const initialDeals = broker.brokerProfile?.closedDealsCount ?? 0;
  await db.updateProposal(proposal.id, broker, { statusDetail: 'Closed' });
  const brokerAfter = await db.getUserById(broker.id);
  assert.equal(brokerAfter?.brokerProfile?.closedDealsCount, initialDeals + 1);

  // 8. Saved toggle, messaging, and review validation
  const savedAfterToggle = await db.toggleSavedProperty(newSeeker.id, prop.id);
  assert.ok(savedAfterToggle.includes(prop.id));

  await db.createMessage(newSeeker, {
    propertyId: prop.id,
    proposalId: proposal.id,
    recipientId: broker.id,
    body: 'See you Saturday morning!',
  });
  const msgs = await db.listMessagesForProperty(prop.id, newSeeker.id);
  assert.equal(msgs.length, 1);

  await assert.rejects(
    () =>
      db.createReview(broker, {
        brokerId: broker.id,
        rating: 5,
        comment: 'Self review must fail',
      }),
    (err: unknown) => err instanceof AppError && (err.status === 400 || err.status === 403)
  );

  const review = await db.createReview(newSeeker, {
    brokerId: broker.id,
    rating: 5,
    comment: 'Super transparent pricing and smooth visit.',
    locality: 'Indiranagar',
  });
  assert.equal(review.rating, 5);
});

test('MemoryDbAdapter provides seeded demo data, privacy masking, and CRUD fallback', async () => {
  const db = new MemoryDbAdapter();
  const demos = await db.listDemoUsers();
  assert.ok(demos.length >= 4);

  const props = await db.listProperties({ limit: 10 });
  assert.ok(props.items.length >= 4);

  const seeker = await db.createUser({
    name: 'Aarav Test',
    email: 'aarav.mem@example.com',
    phone: '+91 99000 11223',
    role: 'seeker',
    city: 'Bengaluru',
    authMethod: 'password',
    passwordHash: await hashPassword('secret123'),
  });

  const req = await db.createRequirement(seeker, {
    intent: 'rent',
    localities: ['Koramangala'],
    budgetMin: 20000,
    budgetMax: 35000,
    propertyType: 'Flat',
    bedrooms: 2,
    furnishing: 'Semi-furnished',
    moveInDate: 'Immediate',
    amenities: [],
    notes: '',
  });

  const leads = await db.getLeadsForBroker({ brokerId: 'broker-1' });
  const match = leads.items.find((l) => l.requirement.id === req.id);
  assert.ok(match);
  assert.equal(match?.requirement.seekerPhone, 'Locked until contact shared');
});
