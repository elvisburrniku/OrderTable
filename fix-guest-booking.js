// This is a temporary script to identify and fix the duplicate function declarations
// in guest-booking-responsive.tsx

const fs = require('fs');

const filePath = './client/src/pages/guest-booking-responsive.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Find and log all function declarations to identify duplicates
const functionRegex = /const\s+(getSpecialPeriodHours|isDateBlockedBySpecialPeriods|isDateDisabledInOpeningHours|isWithinCutOffTime)\s*=/g;
let match;
const functions = [];

while ((match = functionRegex.exec(content)) !== null) {
  functions.push({
    name: match[1],
    index: match.index,
    line: content.substring(0, match.index).split('\n').length
  });
}

console.log('Found function declarations:');
functions.forEach(fn => {
  console.log(`${fn.name} at line ${fn.line}`);
});

// Count duplicates
const counts = {};
functions.forEach(fn => {
  counts[fn.name] = (counts[fn.name] || 0) + 1;
});

console.log('\nDuplicate counts:');
Object.entries(counts).forEach(([name, count]) => {
  if (count > 1) {
    console.log(`${name}: ${count} declarations (DUPLICATE!)`);
  }
});