/* page.tsx */
import { createClient } from "contentful";
import { SongQueryResult } from "../types";
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
    <main className="flex bckelenco min-h-screen flex-col  gap-y-8 bg-gradient-to-b from-blue-100 to-pink-100">
        <div className="grid-cols-1 sm:grid md:grid-cols-3 max-w-7xl mx-auto px-3">
      {songEntries.items.map((singlePost) => {
        console.log("singlePost.fields",singlePost.fields);
        const { slug, title, date } = singlePost.fields;

        return (
          <div key={slug}>
            <div className="max-w-sm rounded overflow-hidden shadow-lg p-2 text-white">
              <img className="w-full" src="canti.png" alt="Sunset in the mountains"/>
              <div className="px-6 py-4">
                <div className="font-bold text-xl mb-2">

                  <Link href={`/songs/${slug}`}>
             
                      <h2 className="font-extrabold text-xl group-hover:text-blue-500 transition-colors">{title}</h2>
              
                  </Link>
                </div>
                <p className="text-gray-700 text-base">
                  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Voluptatibus quia, nulla! Maiores et perferendis eaque, exercitationem praesentium nihil.
                </p>
              </div>
              <div className="px-6 pt-4 pb-2">
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#photography</span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#travel</span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#winter</span>
              </div>
            </div>
            
          </div>
        );
      })}
       </div>
    </main>
  );
}
