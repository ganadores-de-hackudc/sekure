const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const darkSvgPath = path.join(publicDir, 'favicon.svg');
const lightSvgPath = path.join(publicDir, 'favicon-light.svg');

const darkSvg = fs.readFileSync(darkSvgPath, 'utf8');
const lightSvg = fs.readFileSync(lightSvgPath, 'utf8');

// Extract the base64 part
const extractBase64 = (svgStr) => {
    const match = svgStr.match(/base64,([^"]+)"/);
    return match ? match[1] : null;
};

const darkBase64 = extractBase64(darkSvg);
const lightBase64 = extractBase64(lightSvg);

const combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" height="500" viewBox="0 0 500 500">
  <style>
    .light-theme { display: block; }
    .dark-theme { display: none; }
    @media (prefers-color-scheme: dark) {
      .light-theme { display: none; }
      .dark-theme { display: block; }
    }
  </style>
  <image class="light-theme" x="155" y="22" width="190" height="456" href="data:image/png;base64,${lightBase64}" />
  <image class="dark-theme" x="155" y="22" width="190" height="456" href="data:image/png;base64,${darkBase64}" />
</svg>`;

fs.writeFileSync(darkSvgPath, combinedSvg, 'utf8');
console.log('Combined favicon created successfully.');
