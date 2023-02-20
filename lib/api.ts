import path from 'path';
import { ExampleApiClient, ExampleAsset, ExampleDocument } from '../example-content-source/example-api-client';

const apiClient = new ExampleApiClient({
    projectId: 'example',
    databaseFilePath: path.join(process.cwd(), 'example-content-source/example-database.json')
});

export function getApiClient() {
    return apiClient;
}

export async function getAssetById(assetId?: string): Promise<ExampleAsset | null> {
    if (!assetId) {
        return null;
    }
    const assets = await apiClient.getAssets();
    return assets.find((asset) => asset.id === assetId) ?? null;
}

export async function getDocumentById(documentId?: string): Promise<ExampleDocument | null> {
    if (!documentId) {
        return null;
    }
    const documents = await apiClient.getDocuments();
    return documents.find((document) => document.id === documentId) ?? null;
}
