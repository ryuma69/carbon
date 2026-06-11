import { CarbonCalculatorService } from './services/carbon.service.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

async function runTests() {
  console.log('Running automated verification on carbon calculation service...\n');

  const calculator = new CarbonCalculatorService();

  // Test Case 1: Transport mileage emissions
  const transportEmissions = calculator.calculateEmissions({
    category: 'Transport',
    value: 100,
    unit: 'miles'
  });
  assert(transportEmissions === 35, 'Transport: 100 miles = 35kg CO2e');

  // Test Case 2: Transit mileage emissions
  const transitEmissions = calculator.calculateEmissions({
    category: 'Transport',
    value: 100,
    unit: 'transit_miles'
  });
  assert(transitEmissions === 9, 'Transport: 100 transit miles = 9kg CO2e');

  // Test Case 3: Diet Vegan emissions
  const veganEmissions = calculator.calculateEmissions({
    category: 'Diet',
    value: 7,
    unit: 'vegan'
  });
  assert(veganEmissions === 17.5, 'Diet: 7 days vegan = 17.5kg CO2e');

  // Test Case 4: Diet Heavy Meat emissions
  const meatEmissions = calculator.calculateEmissions({
    category: 'Diet',
    value: 7,
    unit: 'heavy_meat'
  });
  assert(meatEmissions === 50.4, 'Diet: 7 days heavy meat = 50.4kg CO2e');

  // Test Case 5: Utilities electricity emissions
  const electricityEmissions = calculator.calculateEmissions({
    category: 'Utilities',
    value: 300,
    unit: 'kWh'
  });
  assert(electricityEmissions === 111, 'Utilities: 300 kWh = 111kg CO2e');

  // Test Case 6: Utilities gas emissions
  const gasEmissions = calculator.calculateEmissions({
    category: 'Utilities',
    value: 10,
    unit: 'therms'
  });
  assert(gasEmissions === 53, 'Utilities: 10 therms = 53kg CO2e');

  // Test Case 7: Grid forecast checks
  const forecast = await calculator.getGridForecast('94043');
  assert(forecast.length === 24, 'Grid Forecast: should return 24 hours of data');
  
  const peakHour = forecast.find(f => f.hour === 18);
  const solarHour = forecast.find(f => f.hour === 12);
  assert(
    (peakHour?.emissionsIntensityFactor || 0) > (solarHour?.emissionsIntensityFactor || 0),
    'Grid Forecast: peak intensity at 18:00 must exceed solar intensity at 12:00'
  );

  console.log('\n🎉 ALL AUTOMATED CARBON LOGIC TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
