import fs from 'fs/promises';
import path from 'path';

async function readJsonFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
}

async function generateScssVariables() {
    try {
        // Read token files
        const primitives = await readJsonFile('src/assets/tokens/Color-primitives.json');
        const darkTokens = await readJsonFile('src/assets/tokens/Colors/Dark/Tokens.json');
        const lightTokens = await readJsonFile('src/assets/tokens/Colors/Light/Tokens.json');

        // Process references in tokens
        function resolveReference(value, sourceTokens) {
            if (typeof value !== 'string' || !value.includes('{')) return value;
            
            return value.replace(/\{([^}]+)\}/g, (match, path) => {
                const parts = path.split('.');
                let current = sourceTokens;
                
                for (const part of parts) {
                    if (!current[part]) {
                        console.warn(`Warning: Could not resolve reference "${path}"`);
                        return match;
                    }
                    current = current[part];
                }
                
                return current.value || match;
            });
        }

        // Generate SCSS maps
        let scssContent = '// Generated Theme Variables\n\n';

        // Add primitive colors
        scssContent += '$primitives: (\n';
        Object.entries(primitives.Primitives).forEach(([colorName, shades]) => {
            scssContent += `  "${colorName}": (\n`;
            Object.entries(shades).forEach(([shade, value]) => {
                scssContent += `    "${shade}": ${value.value},\n`;
            });
            scssContent += '  ),\n';
        });
        scssContent += ');\n\n';

        // Add theme variables
        ['light', 'dark'].forEach(theme => {
            const tokens = theme === 'light' ? lightTokens : darkTokens;
            const prefix = theme === 'dark' ? '--dark-' : '--';
            
            scssContent += `$${theme}-theme: (\n`;
            Object.entries(tokens.Tokens).forEach(([category, values]) => {
                Object.entries(values).forEach(([key, value]) => {
                    const resolvedValue = resolveReference(value.value, primitives);
                    scssContent += `  "${category}-${key}": ${resolvedValue},\n`;
                });
            });
            scssContent += ');\n\n';
        });

        // Add theme mixins
        scssContent += `@mixin generate-theme-vars($theme-name) {
  $theme: if($theme-name == "light", $light-theme, $dark-theme);
  @each $key, $value in $theme {
    --#{$key}: #{$value};
  }
}\n`;

        // Write to file
        await fs.mkdir('src/styles/_partials', { recursive: true });
        await fs.writeFile('src/styles/_partials/_themes.scss', scssContent);
        
        console.log('Successfully generated theme variables!');
    } catch (error) {
        console.error('Error generating variables:', error);
        process.exit(1);
    }
}

generateScssVariables(); 