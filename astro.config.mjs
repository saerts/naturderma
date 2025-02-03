import { defineConfig } from 'astro/config';
import { z } from 'zod';
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
    content: {
        collections: {
            about: {
                type: 'content',
                schema: z.object({
                    title: z.string(),
                    description: z.string(),
                }),
            },
        },
    },
    integrations: [icon()],
    legacy: {
        collections: true
    }
});
