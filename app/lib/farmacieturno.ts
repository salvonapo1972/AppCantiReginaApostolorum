import { load } from "cheerio";
import { NextResponse } from "next/server";

export async function getFarmacieTurno(date: string) {
  

  const url =
    `https://www.ordinefarmacistiroma.it/cittadino/turni-delle-farmacie.html?d=${date}`;

    console.log("url",url)

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Impossibile leggere il sito" },
      { status: 500 }
    );
  }

  const html = await response.text();
  const $ = load(html);

  const farmacie: any[] = [];

  // Adatta il selettore alla struttura reale della pagina
  $(".mobile_table_with_label table tbody tr ").each((_, row) => {
    const td = $(row).find("td");

    farmacie.push({
      nome: $(td[0]).text().trim(),
      indirizzo: "<a href='https://www.google.com/maps/search/?api=1&query="+$(td[1]).text().trim()+"+235%2C+ROMA+%28RM%29'>"+ $(td[1]).text().trim()+"</a>",
      telefono: $(td[2]).text().trim(),
      orario: $(td[3]).text().trim(),
      municipio: $(td[4]).text().trim(),
    });
  });

  return NextResponse.json({
    data: date,
    totale: farmacie.length,
    farmacie,
  }).json();
}