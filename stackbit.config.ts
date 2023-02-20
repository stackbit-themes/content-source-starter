import path from 'path';
import { defineStackbitConfig, getLocalizedFieldForLocale, DocumentStringLikeField, SiteMapEntry } from '@stackbit/types';
import { ExampleContentSource } from './example-content-source/example-content-source';

export default defineStackbitConfig({
    stackbitVersion: '0.6.0',
    ssgName: 'nextjs',
    nodeVersion: '16',
    contentSources: [
        new ExampleContentSource({
            projectId: 'example',
            databaseFilePath: path.join(process.cwd(), 'example-content-source/example-database.json')
        })
    ],
    modelExtensions: [{
        type: 'page',
        name: 'post'
    }],
    siteMap: ({ documents }) => {
        return [
            {
                urlPath: '/',
                stableId: 'home',
                label: 'Home',
                isHomePage: true
            },
            ...documents
                .filter((document) => {
                    return document.modelName === 'post';
                })
                .map((document): SiteMapEntry | null => {
                    const slug = document.fields.slug as DocumentStringLikeField;
                    const localizedSlug = getLocalizedFieldForLocale(slug);
                    if (!localizedSlug) {
                        return null;
                    }
                    const title = document.fields.title as DocumentStringLikeField;
                    const localizedTitle = getLocalizedFieldForLocale(title);
                    return {
                        stableId: document.id,
                        label: localizedTitle ? localizedTitle.value : localizedSlug.value,
                        urlPath: `/posts/${localizedSlug.value}`,
                        document: {
                            srcType: document.srcType,
                            srcProjectId: document.srcProjectId,
                            modelName: document.modelName,
                            id: document.id
                        }
                    };
                })
                .filter((document): document is SiteMapEntry => !!document)
        ];
    }
});
