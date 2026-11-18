import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePropertyMatch,
  filterProperties,
  findLocalityBySlug,
  formatBudgetRange,
  formatINR,
  rankPropertiesForRequirement,
  slugifyLocality,
} from './index';
import type { Property, Requirement } from '@/types';

const sampleRequirement: Requirement = {
  id: 'req-test',
  seekerId: 'seeker-1',
  seekerName: 'Test Seeker',
  seekerPhone: '+91 98450 00000',
  seekerEmail: 'test@housed.in',
  intent: 'rent',
  localities: ['Koramangala'],
  budgetMin: 20000,
  budgetMax: 30000,
  propertyType: 'Flat',
  bedrooms: 2,
  furnishing: 'Semi-furnished',
  moveInDate: 'Immediate',
  amenities: ['Covered Parking', 'Power Backup'],
  notes: '',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const exactMatchProperty: Property = {
  id: 'prop-exact',
  brokerId: 'broker-1',
  brokerName: 'Vikram Mehta',
  brokerPhone: '+91 98801 44556',
  brokerVerified: true,
  title: '2 BHK in Koramangala 4th Block',
  intent: 'rent',
  locality: 'Koramangala',
  city: 'Bengaluru',
  address: 'Koramangala 4th Block',
  price: 27000,
  brokerageFee: '1 Month Rent',
  propertyType: 'Flat',
  bedrooms: 2,
  bathrooms: 2,
  areaSqFt: 1120,
  floorInfo: '2nd of 4 floors',
  furnishing: 'Semi-furnished',
  availableFrom: 'Immediate',
  amenities: ['Covered Parking', 'Power Backup'],
  description: 'Bright corner flat.',
  images: ['/images/properties/prop_modern_apartment_living_1794935542267.jpg'],
  availability: 'available',
  mapX: 46,
  mapY: 56,
  createdAt: new Date().toISOString(),
};

test('formatINR and formatBudgetRange format Indian Rupee values accurately', () => {
  assert.equal(formatINR(27000, 'rent'), '₹27,000');
  assert.equal(formatINR(14500000, 'buy'), '₹1.45 Cr');
  assert.equal(formatINR(7500000, 'buy'), '₹75 L');
  assert.equal(formatBudgetRange(20000, 30000, 'rent'), '₹20,000 – ₹30,000/mo');
});

test('computePropertyMatch scores exact match high and penalizes mismatches', () => {
  const exact = computePropertyMatch(sampleRequirement, exactMatchProperty);
  assert.ok(exact.score >= 95, `Expected >= 95, got ${exact.score}`);
  assert.equal(exact.label, 'Strong Match');

  const nearbyProp: Property = {
    ...exactMatchProperty,
    id: 'prop-nearby',
    locality: 'HSR Layout',
    price: 34500, // 15% over max budget
    furnishing: 'Furnished',
  };
  const nearby = computePropertyMatch(sampleRequirement, nearbyProp);
  assert.ok(nearby.score < exact.score);
  assert.ok(nearby.score >= 55);

  const wrongIntent = computePropertyMatch(sampleRequirement, {
    ...exactMatchProperty,
    intent: 'buy',
    price: 12000000,
  });
  assert.ok(wrongIntent.score < 30, `Expected low score for wrong intent, got ${wrongIntent.score}`);
});

test('rankPropertiesForRequirement filters unavailable listings and sorts descending', () => {
  const ranked = rankPropertiesForRequirement(sampleRequirement, [
    { ...exactMatchProperty, id: 'prop-rented', availability: 'rented' },
    { ...exactMatchProperty, id: 'prop-far', locality: 'Whitefield', price: 42000 },
    exactMatchProperty,
  ]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.property.id, 'prop-exact');
});

test('filterProperties applies multi-criteria filters accurately', () => {
  const results = filterProperties(
    [
      exactMatchProperty,
      { ...exactMatchProperty, id: 'prop-3bhk', bedrooms: 3, price: 45000 },
    ],
    {
      locality: 'Koramangala',
      intent: 'rent',
      propertyType: 'Flat',
      bedrooms: 2,
      budgetMax: 30000,
      furnishing: 'Semi-furnished',
      query: 'corner',
    }
  );
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, 'prop-exact');
});

test('slugifyLocality and findLocalityBySlug resolve canonical localities cleanly', () => {
  assert.equal(slugifyLocality('HSR Layout'), 'hsr-layout');
  assert.equal(findLocalityBySlug('hsr-layout'), 'HSR Layout');
  assert.equal(findLocalityBySlug('koramangala'), 'Koramangala');
  assert.equal(findLocalityBySlug('nonexistent-area'), null);
});
