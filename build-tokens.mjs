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

        let scssContent = '// Generated Theme Variables\n\n';

        // Add theme variables
        ['light', 'dark'].forEach(theme => {
            const tokens = theme === 'light' ? lightTokens : darkTokens;
            
            scssContent += `$${theme}-theme: (\n`;
            Object.entries(tokens.Tokens).forEach(([category, values]) => {
                Object.entries(values).forEach(([key, value]) => {
                    if (value?.value) {
                        let resolvedValue;
                        // Keep references as is for Button components
                        if (category === 'Button') {
                            // Format the reference properly for SCSS
                            if (value.value.includes('{Primitives.')) {
                                const primitivePath = value.value.match(/\{Primitives\.([^}]+)\}/)[1];
                                resolvedValue = `map.get($primitives, "${primitivePath}")`;
                            } else if (value.value.includes('{Tokens.')) {
                                const tokenPath = value.value.match(/\{Tokens\.([^}]+)\}/)[1];
                                resolvedValue = `map.get($${theme}-theme, "${tokenPath}")`;
                            } else {
                                resolvedValue = value.value;
                            }
                        } else if (typeof value.value === 'string' && value.value.includes('{')) {
                            // Resolve references for other categories
                            if (value.value.includes('{Primitives.')) {
                                const primitivePath = value.value.match(/\{Primitives\.([^}]+)\}/)[1].split('.');
                                resolvedValue = primitives.Primitives[primitivePath[0]][primitivePath[1]].value;
                            } else if (value.value.includes('{Tokens.')) {
                                const tokenPath = value.value.match(/\{Tokens\.([^}]+)\}/)[1].split('.');
                                let current = tokens.Tokens;
                                for (const part of tokenPath) {
                                    current = current[part];
                                }
                                resolvedValue = current.value;
                            }
                        } else {
                            resolvedValue = value.value;
                        }
                        scssContent += `  "${category}-${key}": ${resolvedValue},\n`;
                    } else {
                        scssContent += `  "${category}-${key}": transparent,\n`;
                    }
                });
            });
            scssContent += ');\n\n';
        });

        // Add @use statement at the top
        scssContent = '@use "sass:map";\n\n' + scssContent;

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
        const typographyGroups = ['Body', 'Button', 'Heading', 'Nav'];
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
