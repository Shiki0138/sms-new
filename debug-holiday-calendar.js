#!/usr/bin/env node

// Debug script for holiday calendar synchronization
// This script tests the holiday generation logic in isolation

import { format } from 'date-fns';

// Mock holiday settings (Monday=1, Tuesday=2)
const mockHolidaySettings = [
  {
    id: '1',
    holidayType: 'weekly',
    dayOfWeek: 1, // Monday
    description: '毎週月曜日',
    isActive: true
  },
  {
    id: '2', 
    holidayType: 'weekly',
    dayOfWeek: 2, // Tuesday
    description: '毎週火曜日',
    isActive: true
  }
];

// Replicate the getHolidayDates logic
function getHolidayDates(holidaySettings) {
  const holidays = [];
  const today = new Date();
  
  console.log('=== Holiday Generation Debug ===');
  console.log('Today:', format(today, 'yyyy-MM-dd (E)'));
  console.log('Holiday Settings:', holidaySettings);
  console.log('');

  holidaySettings.forEach(setting => {
    if (!setting.isActive) return;
    
    if (setting.holidayType === 'weekly') {
      console.log(`\nProcessing weekly holiday: ${setting.description} (dayOfWeek: ${setting.dayOfWeek})`);
      
      // Generate holidays from 1 month ago to 3 months in future
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      
      console.log(`Date range: ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`);
      
      const current = new Date(start);
      let count = 0;
      
      while (current <= end) {
        if (current.getDay() === setting.dayOfWeek) {
          holidays.push(new Date(current));
          count++;
          console.log(`  Added: ${format(current, 'yyyy-MM-dd (E)')}`);
        }
        current.setDate(current.getDate() + 1);
      }
      
      console.log(`  Total ${count} holidays added for ${setting.description}`);
    }
  });
  
  return holidays;
}

// Test holiday checking for specific dates
function testHolidayChecking(holidays) {
  console.log('\n=== Holiday Checking Test ===');
  
  // Test dates for current week
  const testDates = [];
  const today = new Date();
  
  // Add this week's dates
  for (let i = -3; i <= 3; i++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + i);
    testDates.push(testDate);
  }
  
  console.log('\nTesting holiday detection for this week:');
  testDates.forEach(date => {
    const dayOfWeek = date.getDay();
    const dateString = format(date, 'yyyy-MM-dd (E)');
    
    const isHoliday = holidays.some(holiday => {
      const holidayDateOnly = new Date(holiday.getFullYear(), holiday.getMonth(), holiday.getDate());
      const checkDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return holidayDateOnly.getTime() === checkDateOnly.getTime();
    });
    
    const expectedHoliday = dayOfWeek === 1 || dayOfWeek === 2; // Monday or Tuesday
    const status = isHoliday === expectedHoliday ? '✅' : '❌';
    
    console.log(`  ${dateString}: ${isHoliday ? 'Holiday' : 'Not holiday'} ${status}`);
  });
}

// Main execution
console.log('Holiday Calendar Synchronization Debug\n');

const holidays = getHolidayDates(mockHolidaySettings);

console.log(`\n=== Summary ===`);
console.log(`Total holidays generated: ${holidays.length}`);
console.log(`First holiday: ${format(holidays[0], 'yyyy-MM-dd (E)')}`);
console.log(`Last holiday: ${format(holidays[holidays.length - 1], 'yyyy-MM-dd (E)')}`);

testHolidayChecking(holidays);

// Check for July 29 (Monday) and July 30 (Tuesday) specifically
console.log('\n=== Specific Date Check (2024-07-29, 2024-07-30) ===');
const jul29 = new Date(2024, 6, 29); // July 29, 2024 (Monday)
const jul30 = new Date(2024, 6, 30); // July 30, 2024 (Tuesday)

[jul29, jul30].forEach(date => {
  const isHoliday = holidays.some(holiday => {
    const holidayDateOnly = new Date(holiday.getFullYear(), holiday.getMonth(), holiday.getDate());
    const checkDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return holidayDateOnly.getTime() === checkDateOnly.getTime();
  });
  
  console.log(`${format(date, 'yyyy-MM-dd (E)')}: ${isHoliday ? '✅ Holiday' : '❌ Not holiday'}`);
});