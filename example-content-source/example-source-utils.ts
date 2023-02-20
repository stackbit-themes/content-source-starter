import type { Model, Field, Document, DocumentField, Asset, UpdateOperation, UpdateOperationField } from '@stackbit/types';
import type { ExampleModel, ExampleDocument, ExampleAsset } from './example-api-client';
import type { DocumentContext, AssetContext } from './example-content-source';

export function convertExampleModelsToStackbitModels(models: ExampleModel[]): Model[] {
    return models.map((model): Model => {
        return {
            type: 'data',
            name: model.name,
            fields: model.fields.map((field): Field => {
                switch (field.type) {
                    case 'string':
                    case 'text':
                    case 'markdown':
                    case 'date':
                    case 'image':
                        return {
                            type: field.type,
                            name: field.name
                        };
                    case 'reference':
                        return {
                            type: 'reference',
                            name: field.name,
                            models: field.allowedTypes
                        };
                    default:
                        const _exhaustiveCheck: never = field;
                        return _exhaustiveCheck;
                }
            })
        };
    });
}

export function convertExampleDocumentsToStackbitDocuments(
    documents: ExampleDocument[],
    modelMap: Record<string, Model>,
    manageUrl: string
): Document<DocumentContext>[] {
    return documents.map((document): Document<DocumentContext> => {
        const model = modelMap[document.type];
        return {
            type: 'document',
            id: document.id,
            modelName: document.type,
            status: document.status === 'draft' ? 'added' : document.status === 'published' ? 'published' : 'modified',
            manageUrl: manageUrl + '/document/' + document.id,
            context: {},
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            fields: Object.entries(document.fields).reduce((fields: Record<string, DocumentField>, [fieldName, fieldValue]) => {
                const modelField = model.fields?.find((field) => field.name === fieldName);
                if (!modelField) {
                    return fields;
                }
                switch (modelField.type) {
                    case 'string':
                    case 'url':
                    case 'slug':
                    case 'text':
                    case 'markdown':
                    case 'html':
                    case 'boolean':
                    case 'date':
                    case 'datetime':
                    case 'color':
                    case 'number':
                    case 'enum':
                    case 'file':
                    case 'json':
                    case 'style':
                    case 'richText':
                        fields[fieldName] = {
                            type: modelField.type,
                            value: fieldValue
                        };
                        break;
                    case 'image':
                        fields[fieldName] = {
                            type: 'reference',
                            refType: 'asset',
                            refId: fieldValue
                        };
                        break;
                    case 'reference':
                        fields[fieldName] = {
                            type: 'reference',
                            refType: 'document',
                            refId: fieldValue
                        };
                        break;
                    case 'object':
                    case 'model':
                    case 'cross-reference':
                    case 'list':
                        throw new Error(`field of type ${modelField.type} not implemented`);
                    default:
                        const _exhaustiveCheck: never = modelField;
                        return _exhaustiveCheck;
                }
                return fields;
            }, {})
        };
    });
}

export function convertExampleAssetToStackbitAssets(assets: ExampleAsset[], manageUrl: string, siteLocalhost: string): Asset<AssetContext>[] {
    return assets.map((asset): Asset<AssetContext> => {
        return {
            type: 'asset',
            id: asset.id,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            status: 'published',
            manageUrl: manageUrl + '/assets/' + asset.id,
            context: {},
            fields: {
                title: {
                    type: 'string',
                    value: asset.title
                },
                file: {
                    type: 'assetFile',
                    url: siteLocalhost + asset.url,
                    dimensions: {
                        width: asset.width,
                        height: asset.height
                    }
                }
            }
        };
    });
}

export function convertUpdateOperationFieldsToExampleDocumentFields(updateOperationFields: Record<string, UpdateOperationField>): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const [fieldName, updateOperationField] of Object.entries(updateOperationFields)) {
        fields[fieldName] = convertUpdateOperationFieldToExampleDocumentField(updateOperationField);
    }
    return fields;
}

export function convertUpdateOperationsToExampleDocumentFields(updateOperations: UpdateOperation[]): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const operation of updateOperations) {
        if (operation.opType === 'set') {
            const { field, fieldPath } = operation;
            fields[fieldPath[0]] = convertUpdateOperationFieldToExampleDocumentField(field);
        } else if (operation.opType === 'unset') {
            const { fieldPath, modelField } = operation;
            switch (modelField.type) {
                case 'string':
                case 'url':
                case 'slug':
                case 'text':
                case 'markdown':
                case 'html':
                case 'boolean':
                case 'date':
                case 'datetime':
                case 'color':
                case 'number':
                case 'enum':
                case 'file':
                case 'json':
                case 'style':
                case 'richText':
                case 'image':
                case 'reference':
                    fields[fieldPath[0]] = undefined;
                    break;
                case 'object':
                case 'model':
                case 'cross-reference':
                case 'list':
                    throw new Error(`updating field of type ${modelField.type} not implemented`);
                default:
                    const _exhaustiveCheck: never = modelField;
                    return _exhaustiveCheck;
            }
        } else {
            throw new Error(`'${operation.opType}' operation not implemented`);
        }
    }
    return fields;
}

function convertUpdateOperationFieldToExampleDocumentField(updateOperationField: UpdateOperationField) {
    switch (updateOperationField.type) {
        case 'string':
        case 'url':
        case 'slug':
        case 'text':
        case 'markdown':
        case 'html':
        case 'boolean':
        case 'date':
        case 'datetime':
        case 'color':
        case 'number':
        case 'enum':
        case 'file':
        case 'json':
        case 'style':
        case 'richText':
            return updateOperationField.value;
        case 'reference':
            return updateOperationField.refId;
        case 'image':
        case 'object':
        case 'model':
        case 'cross-reference':
        case 'list':
            throw new Error(`updating field of type ${updateOperationField.type} not implemented`);
        default:
            const _exhaustiveCheck: never = updateOperationField;
            return _exhaustiveCheck;
    }
}
