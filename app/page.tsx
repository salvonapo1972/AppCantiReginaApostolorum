/* page.tsx */
import { createClient } from "contentful";
import { SongQueryResult } from "./types";
import Link from "next/link";

const space = process.env.SPACE_ID;
const accessToken = process.env.ACCESS_TOKEN;

if (!space || !accessToken) {
  throw new Error("Missing Contentful credentials");
}

const client = createClient({
  space,
  accessToken,
});
const getSongEntries = async ():Promise<SongQueryResult> => {
  const entries = await client.getEntries({ content_type: "song" });
  return entries as unknown as SongQueryResult;
};

export default async function Home() {
  const songEntries = await getSongEntries();
  console.log("Home -> blogEntries", songEntries);
  return (
    <main className="flex min-h-screen flex-col p-24 gap-y-8 bg-gradient-to-b from-blue-100 to-pink-100">
      {songEntries.items.map((singlePost) => {
        console.log("singlePost.fields",singlePost.fields);
        const { slug, title, date } = singlePost.fields;

        return (
          <div key={slug}>
            <Link href={`/songs/${slug}`}>
              <h2 className="font-extrabold text-xl group-hover:text-blue-500 transition-colors">{title}</h2>
              
            </Link>
          </div>
        );
      })}
    </main>
  );
}
