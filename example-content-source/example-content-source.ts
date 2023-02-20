import type {
    ContentSourceInterface,
    InitOptions,
    Logger,
    Model,
    ModelMap,
    Locale,
    Document,
    Asset,
    ContentChangeEvent,
    UpdateOperation,
    UpdateOperationField,
    ValidationError
} from '@stackbit/types';

import { ExampleApiClient } from './example-api-client';
import {
    convertExampleModelsToStackbitModels,
    convertExampleDocumentsToStackbitDocuments,
    convertExampleAssetToStackbitAssets,
    convertUpdateOperationFieldsToExampleDocumentFields,
    convertUpdateOperationsToExampleDocumentFields
} from './example-source-utils';

/**
 * Define user-specific context properties like user-specific OAuth accessToken.
 * To use UserContext, an OAuth integration between the underlying
 * content source and Stackbit is required.
 * Please reach out to the Stackbit team for more info.
 */
export interface UserContext {}

/**
 * Define a custom document context stored in the document's context property
 * and cached with the rest of the document data.
 */
export interface DocumentContext {}

/**
 * Define a custom asset context stored in the asset's `context` property
 * and cached with the rest of the asset data.
 */
export interface AssetContext {}

/**
 * Define the constructor options of your content source module.
 * Use it to define things like the project identifier in the underlying content
 * source, service-level access keys, and other data needed to read/write data
 * from/to the underlying content source.
 */
export type ContentSourceOptions = {
    projectId: string;
    databaseFilePath?: string;
    siteLocalhost?: string;
};

export class ExampleContentSource implements ContentSourceInterface<UserContext, DocumentContext, AssetContext> {
    private readonly projectId: string;
    private readonly databaseFilePath?: string;
    private readonly manageUrl: string;
    private readonly siteLocalhost: string;
    private logger!: Logger;
    private userLogger!: Logger;
    private localDev!: boolean;
    private apiClient!: ExampleApiClient;
    private observerId?: string;

    constructor({ projectId, databaseFilePath, siteLocalhost }: ContentSourceOptions) {
        if (!projectId) {
            throw new Error('ExampleContentSource requires projectId');
        }
        this.projectId = projectId;
        this.databaseFilePath = databaseFilePath;
        this.manageUrl = `https://example.com/project/${this.projectId}`;
        this.siteLocalhost = siteLocalhost ?? 'http://localhost:3000';
    }

    /**
     * The `getContentSourceType()` method should return the type of the content
     * source. The content source type must be unique among other content
     * sources used by the same project.
     */
    getContentSourceType(): string {
        return 'example';
    }

    /**
     * The `getProjectId()` method should return the unique identifier of the
     * content source instance. In other words, the returned value must be
     * unique among other instances of the same content source type.
     */
    getProjectId(): string {
        return this.projectId;
    }

    /**
     * The `getProjectEnvironment()` method should return a string representing
     * additional segmentation of a particular content source instance. This
     * might be useful when a content source supports projects with multiple
     * environments.
     */
    getProjectEnvironment(): string {
        return 'production';
    }

    /**
     * The `getProjectManageUrl()` method should return the URL address of the
     * underlying content source's web application. Stackbit uses this URL to
     * show links to the content source web application.
     */
    getProjectManageUrl(): string {
        return this.manageUrl;
    }

    /**
     * The `init()` method should initialize the content source instance. This
     * is a good place to create and initialize API clients, fetch and cache
     * meta-data that does not frequently change, such as locales, users,
     * plugins, etc.
     *
     * This method also receives a single `option` parameter with the following
     * properties:
     *
     * @param options
     * @param {Logger} options.logger
     *   A logger object used to log messages to the terminal console. Messages
     *   logged with this logger will be shown in the console when running
     *   `stackbit dev`. Use the `--log-level` argument to configure the log
     *   levels printed by `stackbit dev`. Example: `stackbit dev --log-level debug`.
     * @param {Logger} options.userLogger
     *   A logger object used to log messages to the "log" panel in the Stackbit
     *   client application.
     * @param {boolean} options.localDev
     *   A boolean flag indicating if the content source is running in local
     *   development mode using the `stackbit dev` command (true), or if it is
     *   running in Stackbit cloud project (false).
     * @param {string} [options.webhookUrl]
     *   A string representing a Stackbit webhook URL that the content source
     *   module can use to create webhooks between the content source and Stackbit.
     *   Webhooks need to be set once. Use predefined webhook names to check if
     *   the webhook was already created. This parameter is empty when `localDev`
     *   is `true`.
     */
    async init({ logger, userLogger, localDev, webhookUrl }: InitOptions): Promise<void> {
        this.apiClient = new ExampleApiClient({
            databaseFilePath: this.databaseFilePath
        });
        this.localDev = localDev;

        // Create new loggers with custom labels.
        // The label will be prepended to the log message.
        this.logger = logger.createLogger({ label: 'example-content-source' });
        this.userLogger = userLogger.createLogger({ label: 'example-content-source' });

        this.logger.debug(`initialized ExampleContentSource`);

        // Setup webhooks between the underlying content source and Stackbit.
        // Use webhook names to find an existing webhook.
        // The webhookUrl is provided in Stackbit Cloud only (localDev === false).
        // To debug webhooks, run `stackbit dev` with `--csi-webhook-url=...`
        // parameter. Use services such as Ngrok to tunnel webhooks from content
        // source to your local machine.
        if (webhookUrl) {
            this.logger.debug(`checking if stackbit webhook exists`);
            let webhook = await this.apiClient.getWebhook({ name: 'stackbit-content-source' });
            if (!webhook) {
                this.logger.debug(`no webhook 'stackbit-content-source' was found, creating a new webhook`);
                const newWebhook = await this.apiClient.createWebhook({ name: 'stackbit-content-source' });
                if (newWebhook) {
                    webhook = newWebhook;
                }
            }
            if (webhook) {
                this.logger.debug('got a stackbit-content-source webhook');
            }
        }
    }

    /**
     * The `reset()` method should reset the internal state and clean up any
     * instance variables, and cached meta-data fetched in the `init` method and
     * re-fetch it again.
     */
    async reset(): Promise<void> {
        return;
    }

    /**
     * Stackbit calls the `onFilesChange()` method when it detects changes in
     * the project files. This method is optional and should be used when the
     * content source stores its schema or content in files within the project
     * repository. Therefore, if your content source relies on files within
     * the project repository, you don't need to set up any file-watching
     * processes. Stackbit does it for you.
     *
     * When this method is called, the content source module should
     * check if the changed files represent a document or a model and
     * return a matching result.
     *
     * @param options
     * @param {string[]} options.updatedFiles
     *   A list of updated files. The file paths are relative to the project root folder.
     */
    async onFilesChange?({ updatedFiles }: { updatedFiles: string[] }): Promise<{
        schemaChanged?: boolean | undefined;
        contentChangeEvent?: ContentChangeEvent<DocumentContext, AssetContext> | undefined;
    }> {
        return {};
    }

    /**
     * Stackbit calls the `onWebhook()` method when the underlying content
     * source calls a previously configured webhook.
     *
     * The content source module can set up webhooks between the underlying
     * content source and Stackbit using the `options.webhookUrl` passed to the
     * `init` method. When the underlying content source calls the webhook, Stackbit
     * passes the webhook request to this method with its data and request
     * headers. Webhooks can be used to trigger the `onContentChange`, and the
     * `onSchemaChange` callbacks passed to the `startWatchingContentUpdates`
     * method.
     *
     * This method is not called in local development (when localDev is true).
     * To debug webhooks locally, you need to create a public URL that
     * forwards external webhooks to stackbit dev's internal port: `localhost:8090`.
     * You can use a tool like 'ngrok' and run `ngrok http 8090` to create a
     * public URL that forwards webhooks to stackbit dev. Ngrok will print the
     * public URL it created (e.g., https://xyz.ngrok.io).
     * Use this URL when running stackbit dev:
     * `stackbit dev --log-level=debug --csi-webhook-url=https://xyz.ngrok.io/_stackbit/onWebhook`
     *
     * @param data
     * @param {any} data.data
     * @param {Record<string, string>} data.headers
     */
    async onWebhook(data: { data: any; headers: Record<string, string> }): Promise<void> {
        return;
    }

    /**
     * Stackbit calls the startWatchingContentUpdates() after it has fetched all
     * models and content and is ready to receive content or schema updates.
     *
     * This method should start watching for content and schema changes using
     * any available synchronization technique, for example, polling the
     * underlying API, setting up server-to-server listeners, and webhooks.
     *
     * When the content source module identifies a content or schema update,
     * it should call the `onContentChange` or the `onSchemaChange` callbacks.
     *
     * The content source module should remain stateless. It should not store
     * models, documents, or assets. If you need to access models, documents, or
     * assets previously returned from `getModels`, `getDocuments`, or `getAssets`
     * methods, use `getModelMap`, `getDocument`, or `getAsset` functions
     * provided to this and other methods.
     */
    async startWatchingContentUpdates(options: {
        getModelMap: () => ModelMap;
        getDocument: ({ documentId }: { documentId: string }) => Document<DocumentContext> | undefined;
        getAsset: ({ assetId }: { assetId: string }) => Asset<AssetContext> | undefined;
        onContentChange: (contentChangeEvent: ContentChangeEvent<DocumentContext, AssetContext>) => Promise<void>;
        onSchemaChange: () => void;
    }): Promise<void> {
        if (this.observerId) {
            await this.stopWatchingContentUpdates();
        }
        this.observerId = await this.apiClient.startObservingContentChanges({
            callback: ({ events }) => {
                const contentChange: ContentChangeEvent<DocumentContext, AssetContext> = {
                    documents: [],
                    assets: [],
                    deletedDocumentIds: [],
                    deletedAssetIds: []
                };
                for (const event of events) {
                    if (event.name === 'document-created' || event.name === 'document-updated') {
                        const modelMap = options.getModelMap();
                        const createdDocument = convertExampleDocumentsToStackbitDocuments([event.document], modelMap, this.manageUrl)[0];
                        contentChange.documents.push(createdDocument);
                    } else if (event.name === 'document-deleted') {
                        contentChange.deletedDocumentIds.push(event.documentId);
                    } else if (event.name === 'asset-created') {
                        const createdAsset = convertExampleAssetToStackbitAssets([event.asset], this.manageUrl, this.siteLocalhost)[0];
                        contentChange.assets.push(createdAsset);
                    }
                }
                return contentChange;
            }
        });
    }

    /**
     * Stackbit calls the `stopWatchingContentUpdates()` method to stop
     * receiving content and schema change updates.
     *
     * This method should stop watching for content and schema updates and stop
     * calling the `onContentChange` or the `onSchemaChange` callbacks until the
     * `startWatchingContentUpdates()` method is called again.
     */
    async stopWatchingContentUpdates(): Promise<void> {
        if (this.observerId) {
            await this.apiClient.stopObservingContentChanges({
                observerId: this.observerId
            });
        }
    }

    /**
     * The `getModels()` method should fetch the content models from the content
     * source and convert them to an array of Stackbit Models.
     */
    async getModels(): Promise<Model[]> {
        this.logger.debug('getModels');
        const models = await this.apiClient.getModels();
        this.logger.debug(`got ${models.length} models`);
        return convertExampleModelsToStackbitModels(models);
    }

    /**
     * The `getLocales()` method should fetch the available locales from the
     * content source and convert them to an array of Stackbit Locales.
     */
    async getLocales(): Promise<Locale[]> {
        return [];
    }

    /**
     * The `getDocuments()` method should fetch all the documents from the
     * content source and convert them to Stackbit Documents. You can use
     * `DocumentContext` to extend Stackbit Documents with additional data that
     * your content source needs. Stackbit will cache the documents with their
     * DocumentContext data and pass it back to methods that need to access
     * the documents.
     *
     * @param {Object} options
     * @param {ModelMap} options.modelMap
     *   A map of models by their names as returned by `getModels()` method.
     */
    async getDocuments(options: { modelMap: ModelMap }): Promise<Document<DocumentContext>[]> {
        this.logger.debug('getDocuments');
        const documents = await this.apiClient.getDocuments();
        this.logger.debug(`got ${documents.length} documents`);
        return convertExampleDocumentsToStackbitDocuments(documents, options.modelMap, this.manageUrl);
    }

    /**
     * The `getAssets()` method should fetch all the assets from the content
     * source and convert them to Stackbit Assets. You can use `AssetContext` to
     * extend Stackbit Assets with additional data that your content source
     * needs. Stackbit will cache the assets with their AssetContext data and
     * pass it back to methods that need to access the assets.
     */
    async getAssets(): Promise<Asset<AssetContext>[]> {
        this.logger.debug('getAssets');
        const assets = await this.apiClient.getAssets();
        this.logger.debug(`got ${assets.length} assets`);
        return convertExampleAssetToStackbitAssets(assets, this.manageUrl, this.siteLocalhost);
    }

    /**
     * The `hasAccess()` method should check if the current user has read/write
     * access to the content source. Stackbit will pass the `userContext` for
     * content sources having OAuth flow integration with Stackbit.
     * Please contact Stackbit support if you want to integrate your underlying
     * content source's OAuth flow with Stackbit.
     */
    async hasAccess(options: { userContext?: UserContext }): Promise<{
        hasConnection: boolean;
        hasPermissions: boolean;
    }> {
        if (this.localDev) {
            return { hasConnection: true, hasPermissions: true };
        }
        // Use userContext.accessToken to check if user has write access to this content source
        /*
        if (!options?.userContext?.accessToken) {
            return { hasConnection: false, hasPermissions: false };
        }
        const hasAccess = this.apiClient.hasAccess({
            accessToken: options?.userContext?.accessToken;
        })
        return {
            hasConnection: true,
            hasPermissions: hasAccess
        };
         */
        return { hasConnection: true, hasPermissions: true };
    }

    /**
     * The `createDocument()` method should create a document in the underlying
     * content source and return the created document as a Stackbit Document.
     *
     * @param {Object} options
     * @param {Record<string, UpdateOperationField>} options.updateOperationFields
     *   A map of update operation fields by field names.
     * @param {Model} options.model
     *   A model representing the document to be created.
     * @param {ModelMap} options.modelMap
     *   A map of models by their names as returned by `getModels()` method.
     * @param {string} options.locale
     *   A locale id for the document to be created.
     * @param {UserContext} options.userContext
     *   User properties provided by OAuth flow between Stackbit and the
     *   underlying content source.
     */
    async createDocument(options: {
        updateOperationFields: Record<string, UpdateOperationField>;
        model: Model;
        modelMap: ModelMap;
        locale?: string;
        userContext?: UserContext;
    }): Promise<Document<DocumentContext>> {
        this.logger.debug('createDocument');
        const fields = convertUpdateOperationFieldsToExampleDocumentFields(options.updateOperationFields);
        const document = await this.apiClient.createDocument({ type: options.model.name, fields });
        this.logger.debug(`created document, id: ${document.id}`);
        return convertExampleDocumentsToStackbitDocuments([document], options.modelMap, this.manageUrl)[0];
    }

    /**
     * The `updateDocument()` method should update a document in the underlying
     * content source and return the updated document as a Stackbit Document.
     *
     * @param {Object} options
     * @param {Document} options.document
     *   A document to be updated.
     * @param {UpdateOperation[]} options.operations
     *   An array of update operations.
     * @param {ModelMap} options.modelMap
     *   A map of models by their names as returned by `getModels()` method.
     * @param {UserContext} options.userContext
     *   User properties provided by OAuth flow between Stackbit and the
     *   underlying content source.
     */
    async updateDocument(options: {
        document: Document<DocumentContext>;
        operations: UpdateOperation[];
        modelMap: ModelMap;
        userContext?: UserContext;
    }): Promise<Document<DocumentContext>> {
        this.logger.debug('updateDocument');
        const fields = convertUpdateOperationsToExampleDocumentFields(options.operations);
        const document = await this.apiClient.updateDocument({
            documentId: options.document.id,
            fields: fields
        });
        this.logger.debug(`update document, id: ${document.id}`);
        return convertExampleDocumentsToStackbitDocuments([document], options.modelMap, this.manageUrl)[0];
    }

    /**
     * The `deleteDocument()` method should delete a document from the underlying
     * content source.
     *
     * @param {Object} options
     * @param {Document} options.document
     *   A document to be deleted.
     * @param {UserContext} options.userContext
     *   User properties provided by OAuth flow between Stackbit and the
     *   underlying content source.
     */
    async deleteDocument(options: { document: Document<DocumentContext>; userContext?: UserContext }): Promise<void> {
        return await this.apiClient.deleteDocument({
            documentId: options.document.id
        });
    }

    /**
     * The `uploadAsset()` method should upload an asset to the underlying
     * content source and return the upload asset as a Stackbit Asset.
     */
    async uploadAsset(options: {
        url?: string | undefined;
        base64?: string | undefined;
        fileName: string;
        mimeType: string;
        locale?: string | undefined;
        userContext?: UserContext;
    }): Promise<Asset<AssetContext>> {
        this.logger.debug('uploadAsset');

        if (!options.url) {
            throw new Error('uploading assets from base64 is not supported');
        }

        const asset = await this.apiClient.uploadAsset({
            url: options.url,
            title: options.fileName,
            width: 100,
            height: 100
        });
        return convertExampleAssetToStackbitAssets([asset], this.manageUrl, this.siteLocalhost)[0];
    }

    /**
     * The `validateDocuments()` method should validate documents according to
     * the underlying content source validation rules and return
     * DocumentValidationErrors if the documents do not pass validation.
     */
    async validateDocuments(options: {
        documents: Document<DocumentContext>[];
        assets: Asset<AssetContext>[];
        locale?: string | undefined;
        userContext?: UserContext;
    }): Promise<{ errors: ValidationError[] }> {
        return { errors: [] };
    }

    /**
     * The `publishDocuments()` method should publish documents in the
     * underlying content source.
     */
    async publishDocuments(options: { documents: Document<DocumentContext>[]; assets: Asset<AssetContext>[]; userContext?: UserContext }): Promise<void> {
        await this.apiClient.publishDocuments({
            documentIds: options.documents.map((document) => document.id)
        });
    }
}
