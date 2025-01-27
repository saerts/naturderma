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

async function generateVariables() {
    try {
        // Read core token files
        const typography = await readJsonFile('src/assets/tokens/Core/Typography.json');
        const radius = await readJsonFile('src/assets/tokens/Core/Radius.json');
        const size = await readJsonFile('src/assets/tokens/Core/Size.json');

        let content = '// Generated Variables\n\n';
        content += '@use \'sass:map\';\n\n';

        // Add typography variables
        content += generateTypographyVariables(typography);

        // Add spacing/size variables
        if (size) {
            content += '// Spacing\n';
            content += '$spacing: (\n';
            Object.entries(size.spacing || {}).forEach(([key, value]) => {
                content += `  "${key}": ${value.value}px,\n`;
            });
            content += ');\n\n';

            content += '// Sizes\n';
            content += '$sizes: (\n';
            Object.entries(size.size || {}).forEach(([key, value]) => {
                content += `  "${key}": ${value.value}px,\n`;
            });
            content += ');\n\n';
        }

        // Add radius variables
        if (radius) {
            content += '// Border Radius\n';
            content += '$radius: (\n';
            Object.entries(radius).forEach(([key, value]) => {
                // Remove the 'radius-' prefix from the key
                const cleanKey = key.replace('radius-', '');
                content += `  "${cleanKey}": ${value.value}px,\n`;
            });
            content += ');\n\n';
        }

        // Write to file
        await fs.mkdir('src/styles/_partials', { recursive: true });
        await fs.writeFile('src/styles/_partials/_variables.scss', content);
        
        console.log('Successfully generated variables!');
    } catch (error) {
        console.error('Error generating variables:', error);
        process.exit(1);
    }
}

function generateTypographyVariables(typography) {
    let content = '// Typography\n\n';
    
    if (!typography) {
        console.warn('Warning: Typography object is undefined');
        return '// Typography tokens not found\n\n';
    }
    
    try {
        // Line Heights
        if (typography.lineHeights) {
            content += '// Line Heights\n';
            content += '$line-height: (\n';
            Object.entries(typography.lineHeights).forEach(([key, value]) => {
                content += `  "${key}": ${value.value},\n`;
            });
            content += ');\n\n';
        }

        // Font Weights
        if (typography.fontWeights) {
            content += '// Font Weights\n';
            content += '$font-weight: (\n';
            Object.entries(typography.fontWeights).forEach(([key, value]) => {
                content += `  "${key}": ${value.value},\n`;
            });
            content += ');\n\n';
        }

        // Font Sizes
        if (typography.fontSize) {
            content += '// Font Sizes\n';
            content += '$font-size: (\n';
            Object.entries(typography.fontSize).forEach(([key, value]) => {
                content += `  "${key}": ${value.value}px,\n`;
            });
            content += ');\n\n';
        }

        // Typography Styles
        const typographyGroups = ['Body', 'Button', 'Heading'];
        content += '// Typography Styles\n';
        
        typographyGroups.forEach(group => {
            if (typography[group]) {
                content += `$${group.toLowerCase()}: (\n`;
                Object.entries(typography[group]).forEach(([key, value]) => {
                    content += `  "${key}": (\n`;
                    Object.entries(value.value).forEach(([prop, val]) => {
                        let cleanValue = val;
                        if (typeof val === 'string') {
                            if (val.includes('{')) {
                                const ref = val.match(/\{([^}]+)\}/)[1];
                                if (ref === 'system-ui') {
                                    cleanValue = '"system-ui"';
                                } else {
                                    const [category, weight] = ref.split('.');
                                    // Fix category names
                                    const categoryMap = {
                                        'fontSize': 'font-size',
                                        'fontWeights': 'font-weight',
                                        'lineHeights': 'line-height'
                                    };
                                    const categoryFixed = categoryMap[category] || category.toLowerCase();
                                    cleanValue = `map.get($${categoryFixed}, "${weight}")`;
                                }
                            } else {
                                cleanValue = `"${val}"`;
                            }
                        }
                        content += `    "${prop}": ${cleanValue},\n`;
                    });
                    content += '  ),\n';
                });
                content += ');\n\n';
            }
        });

    } catch (error) {
        console.error('Error processing typography:', error);
        return '// Error processing typography tokens\n\n';
    }
    
    return content;
}

generateScssVariables();
generateVariables(); 
