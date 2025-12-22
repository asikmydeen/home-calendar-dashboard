const RGL = require('react-grid-layout');
console.log('RGL.default keys:', RGL.default ? Object.keys(RGL.default) : 'no default');
console.log('RGL.WidthProvider:', RGL.WidthProvider);

try {
    const Legacy = require('react-grid-layout/dist/legacy');
    console.log('Legacy keys:', Object.keys(Legacy));
    console.log('Legacy.WidthProvider:', Legacy.WidthProvider);
} catch (e) {
    console.log('Legacy import failed:', e.message);
}
