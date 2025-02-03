import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.string(),
        heroImage: z.object({
            src: z.string(),
            width: z.number(),
            height: z.number()
        }).optional(),
    })
});

const cookies = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
    })
});

export const collections = {
    'blog': blog,
    'cookies': cookies,
}; 