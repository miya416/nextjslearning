import { Client } from "@notionhq/client";
import { GetStaticProps, NextPage } from "next";
import styles from '../styles/Home.module.css';
import dayjs from 'dayjs';
import prism from 'prismjs';
import { useEffect } from "react";
import Link from "next/link";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { Layout } from "@/lib/component/Layout";
import { PostComponent } from "@/lib/component/Post";
/* process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
console.log(process.env['NOTION_DATABASE_ID']);
console.log('process.env.NOTION_DATABASE_ID');
 */
const notion = new Client({
  auth: process.env.NOTION_TOKEN
});
export type Content =
  | {
    type:
    | 'paragraph'
    | 'quote'
    | 'heading_2'
    | 'heading_3';
    text: string | null;
  } | {
    type: 'code';
    text: string | null;
    language: string | null;
  }
export type Post = {
  id: string;
  title: string | null;
  slug: string | null;
  createdTs: string | null;
  lastEditedTs: string | null;
  contents: Content[];
}
type StaticProps = {
  posts: Post[] | null;
}
export const getPosts = async (slug?: string) => {
  let database: QueryDatabaseResponse | undefined = undefined;
  if (slug) {
    database = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID || '',
      filter: {
        and: [
          {
            property: 'Slug',
            rich_text: {
              equals: slug
            }
          }
        ]
      }
    });

  } else {
    database = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID || '',
      filter: {
        and: [
          {
            property: 'Published',
            checkbox: {
              equals: true
            }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });
  }

  const posts: Post[] = [];
  const blockResponses = await Promise.all(
    database.results.map((page) => {
      return notion.blocks.children.list({
        block_id: page.id
      });
    })
  );

  database.results.forEach((page, index) => {
    if (!('properties' in page)) {
      posts.push({

        id: page.id,
        title: null,
        slug: null,
        createdTs: null,
        lastEditedTs: null,
        contents: []

      })
      return;
    };
    let title: string | null = null;
    if (page.properties['Name'].type === 'title') {
      title = page.properties['Name'].title[0]?.plain_text ?? null;
    }
    let slug: string | null = null;
    if (page.properties['Slug'].type === 'rich_text') {
      slug = page.properties['Slug'].rich_text[0]?.plain_text ?? null;
    }
    const blocks = blockResponses[index];

    const contents: Content[] = [];
    blocks.results.forEach((block) => {
      if (!('type' in block)) {
        return;
      }
      switch (block.type) {
        case 'paragraph':
          contents.push({
            type: 'paragraph',
            text:
              block.paragraph.rich_text[0]?.plain_text ?? null
          });
          break;
        case 'heading_2':
          contents.push({
            type: 'heading_2',
            text:
              block.heading_2.rich_text[0]?.plain_text ?? null
          });
          break;
        case 'heading_3':
          contents.push({
            type: 'heading_3',
            text:
              block.heading_3.rich_text[0]?.plain_text ?? null
          });
          break;
        case 'quote':
          contents.push({
            type: 'quote',
            text:
              block.quote.rich_text[0]?.plain_text ?? null
          });
          break;
        case 'code':
          contents.push({
            type: 'code',
            text:
              block.code.rich_text[0]?.plain_text ?? null,
            language: block.code.language
          });
      }
    });
    posts.push({
      id: page.id,
      title,
      slug,
      createdTs: page.created_time,
      lastEditedTs: page.last_edited_time,
      contents
    });
  });

  return posts;
}
export const getPostContents = async (post: Post) => {
  const blockResponse = await notion.blocks.children.list({
    block_id: post.id
  });
  const contents: Content[] = [];
  blockResponse.results.forEach((block) => {
    if (!('type' in block)) {
      return;
    }
    switch (block.type) {
      case 'paragraph':
        contents.push({
          type: 'paragraph',
          text:
            block.paragraph.rich_text[0]?.plain_text ?? null
        });
        break;
      case 'heading_2':
        contents.push({
          type: 'heading_2',
          text:
            block.heading_2.rich_text[0]?.plain_text ?? null
        });
        break;
      case 'heading_3':
        contents.push({
          type: 'heading_3',
          text:
            block.heading_3.rich_text[0]?.plain_text ?? null
        });
        break;
      case 'quote':
        contents.push({
          type: 'quote',
          text:
            block.quote.rich_text[0]?.plain_text ?? null
        });
        break;
      case 'code':
        contents.push({
          type: 'code',
          text:
            block.code.rich_text[0]?.plain_text ?? null,
          language: block.code.language
        });
    }
  });
  return contents;
}
export const getStaticProps: GetStaticProps<StaticProps> = async () => {
  const posts = await getPosts();
  const contentsList = await Promise.all(
    posts.map((post)=>{
      return getPostContents(post);
    })
  );
  posts.forEach((post,index)=>{
    post.contents=contentsList[index];
  });
  return {
    props:{posts}
  }

};

const Home: NextPage<StaticProps> = ({ posts }) => {
  useEffect(() => {
    prism.highlightAll();
  }, []);
  //console.log(post);
  if (!posts) return null;
  return (
    <Layout>
      {posts.map((post)=>(        <PostComponent post={post} key={post.id}/>))}
    </Layout>
  );

};

export default Home;
