import { createClient } from "contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

import { SongItem } from "@/app/types";

const client = createClient({
  space: process.env.SPACE_ID!,
  accessToken: process.env.ACCESS_TOKEN!,
});

export async function generateStaticParams() {
  const queryOptions = {
    content_type: "song",
    select: "fields.slug",
  };

  const songs = await client.getEntries(queryOptions);

  return songs.items.map((song) => ({
    slug: song.fields.slug,
  }));
}

const fetchSong = async (slug: string): Promise<SongItem> => {
  const queryOptions = {
    content_type: "song",
    "fields.slug[match]": slug,
  };

  const queryResult = await client.getEntries(queryOptions);

  return queryResult.items[0] as unknown as SongItem;
};

type SongPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SongPage({ params }: SongPageProps) {
  const { slug } = await params;

  const options = {
    renderText: (text: string) =>
      text
        .split("\n")
        .flatMap((line, i) => (i > 0 ? [<br key={i} />, line] : [line])),
  };

  const song = await fetchSong(slug);
  //console.log("songs.fields", song.fields);
  const { title, date, testoCanzone, urlVideo } = song.fields;

  return (
    <main className="bckelenco text-white min-h-screen p-24 flex justify-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid grid-cols-2 gap-2">
        <div className="[&>p]:mb-8 [&>h1]:font-extrabold [&>h1]:text-2xl">
          {documentToReactComponents(testoCanzone, options)}
        </div>
        <div>
          <iframe
            className="w-full aspect-video mt-3"
            src={urlVideo}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </main>
  );
}
