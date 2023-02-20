import Head from 'next/head';
import Container from '../components/container';
import MoreStories from '../components/more-stories';
import HeroPost from '../components/hero-post';
import Intro from '../components/intro';
import Layout from '../components/layout';
import { CMS_NAME } from '../lib/constants';
import type { GetStaticProps } from 'next';
import type Post from '../interfaces/post';
import { getApiClient, getDocumentById, getAssetById } from '../lib/api';

type Props = {
    allPosts: Post[];
};

export default function Index({ allPosts }: Props) {
    const heroPost = allPosts[0];
    const morePosts = allPosts.slice(1);
    const title = `Next.js Blog Example with ${CMS_NAME}`;
    return (
        <>
            <Layout>
                <Head>
                    <title>{title}</title>
                </Head>
                <Container>
                    <Intro />
                    {heroPost && <HeroPost post={heroPost} />}
                    {morePosts.length > 0 && <MoreStories posts={morePosts} />}
                </Container>
            </Layout>
        </>
    );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
    const apiClient = getApiClient();
    const postDocs = await apiClient.getDocuments({ type: 'post' });
    const allPosts: Post[] = [];
    for (const postDoc of postDocs) {
        const authorDocument = await getDocumentById(postDoc.fields.author);
        allPosts.push({
            id: postDoc.id,
            title: postDoc.fields.title,
            date: postDoc.fields.date,
            slug: postDoc.fields.slug,
            author: authorDocument
                ? {
                      id: authorDocument.id,
                      name: authorDocument.fields.name,
                      picture: await getAssetById(authorDocument.fields.picture)
                  }
                : null,
            coverImage: await getAssetById(postDoc.fields.coverImage),
            excerpt: postDoc.fields.excerpt
        });
    }

    return {
        props: { allPosts }
    };
};
