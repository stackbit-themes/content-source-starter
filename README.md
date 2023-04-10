# A statically generated blog example using Next.js, TypeScript, and Stackbit

This starter is based on the [Next.js blog starter](https://github.com/vercel/next.js/tree/canary/examples/blog-starter). It replaces the content storage from Markdown files to a single JSON file to simulate a headless CMS. This demo also contains the Stackbit configuration file [stackbit.config.ts](https://docs.stackbit.com/reference/config) and an [example content source implementation](example-content-source/example-content-source.ts) that enables previewing a site powered by a headless CMS inside Stackbit and editing the content stored in the headless CMS using a visual editing experience.

## Example Content Source

The blog posts and authors are stored in the [example-database.json](example-content-source/example-database.json) as an array of documents with `type` and `id` fields. This `example-database.json` file also contains models defining the fields and field types of the documents. For example, the relationship between authors and posts is made by the `reference` field that maps the field's value to the referenced document `id`. This relationship is one-to-many, allowing the same author to be referenced from many posts.

The [`stackbit.config.ts`](./stackbit.config.ts) file allows Stackbit to edit and publish the content stored in the [example-database.json](example-content-source/example-database.json) file. The `stackbit.config.ts` file imports and instantiate the `ExampleContentSource` from the [example-content-source.ts](example-content-source/example-content-source.ts) file. The `ExampleContentSource` provides a programmatic interface for Stackbit to edit and publish content stored in the `example-database.json` file. To learn more about Stackbit and how to configure it, please visit [Stackbit documentation](https://docs.stackbit.com/).

**Note**: The `ExampleContentSource` is provided as an example only. It doesn't have an actual document publishing mechanism. If you wish to integrate Stackbit with your headless CMS, you must delegate content publishing workflows to your CMS. 

## Running Locally

1. Clone this repo and install dependencies (e.g., `npm install`).
2. Install stackbit CLI by running `npm install -g @stackbit/cli`.
3. Run `npm run dev` to start the Next.js dev server. Your blog should be up and running on [http://localhost:3000](http://localhost:3000)
4. Open a separate terminal window and run `stackbit dev`. Then click on the link printed in the console (you will need to sign in with Stackbit):
    
    ```
    info: ⚡ Open https://app.stackbit.com/local/... in your browser
    ```

5. Now you can edit the content via Stackbit. The [`ExampleContentSource`](example-content-source/example-content-source.ts) will update the content in the [example-database.json](example-content-source/example-database.json) and move it between the right states as you edit and publish your content.

## Running in Stackbit

After you have run your blog post locally and ensured that everything works as expected, you can import your project into Stackbit. This will allow you to work on your project remotely, share the preview of your blog before publishing it, and let your teammates collaborate with you on your blog.

1. Publish the cloned repo to your personal GitHub repository.
2. Navigate to https://app.stackbit.com/import, select "Use my repository", and click "Next".
3. Connect GitHub if needed, find and select your repository, and click "Next".
4. In the "Configure" step, choose the project name, add any required environment variables and click "Create Project".

Note: this is an example project showing how to implement a custom content source. The content in this example is stored in a JSON file and is not preserved when the Stackbit remote project restarts.

# Notes

`blog-starter` uses [Tailwind CSS](https://tailwindcss.com) [(v3.0)](https://tailwindcss.com/blog/tailwindcss-v3).
