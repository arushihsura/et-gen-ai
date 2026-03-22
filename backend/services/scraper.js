const axios = require("axios");
const cheerio = require("cheerio");

exports.getETHeadlines = async () => {
  const url = "https://economictimes.indiatimes.com/markets";

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(data);
  const articles = [];
  const seen = new Set();

$("a").each((i, el) => {
  const title = $(el).text().trim();
  const link = $(el).attr("href");

  if (
    title.length > 40 &&
    link?.includes("articleshow") &&
    !link.toLowerCase().includes("etprime")
  ) {

    let fullUrl = link.startsWith("http")
      ? link
      : "https://economictimes.indiatimes.com" + link;

    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      articles.push({
        title,
        url: fullUrl
      });
    }
  }
});
  return articles.slice(0, 10);
};

exports.getArticleContent = async (url, options = {}) => {
  const mode = options.mode === "detailed" ? "detailed" : "brief";
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(data);
  const articleSelectors = [
    "div.artText p",
    "div.article_wrap p",
    "div.articleBlock p",
    "section.artText p",
    "article p"
  ];

  let rawParagraphs = [];

  for (const selector of articleSelectors) {
    $(selector).each((i, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) {
        rawParagraphs.push(text);
      }
    });

    if (rawParagraphs.length >= 3) {
      break;
    }
  }

  if (rawParagraphs.length === 0) {
    $("p").each((i, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) {
        rawParagraphs.push(text);
      }
    });
  }

  const junkRegex = /ETPrime|Gift this Story|Offer Exclusively|Flat 40% Off|Quick Links|Top Searched Companies|Log In\/Connect|Docubay|Stock Talk Live|ePaper|Trial offer|Unlock All ETPrime|Will be displayed|Subscribe to ETPrime|Login using your ET Prime credentials/i;
  const stopRegex = /Gift ETPrime|Read more news on|Subscribe to ETPrime|Quick Links/i;
  const seenParagraphs = new Set();
  const cleanedParagraphs = [];

  for (const paragraph of rawParagraphs) {
    if (!paragraph || paragraph.length < 40) {
      continue;
    }

    if (stopRegex.test(paragraph)) {
      break;
    }

    if (junkRegex.test(paragraph)) {
      continue;
    }

    if (seenParagraphs.has(paragraph)) {
      continue;
    }

    seenParagraphs.add(paragraph);
    cleanedParagraphs.push(paragraph);
  }

  const selectedParagraphs = [];
  let totalLength = 0;
  const preferredMinLength = mode === "detailed" ? 600 : 300;
  const hardMinLength = 200;
  const minParagraphs = mode === "detailed" ? 5 : 3;
  const maxParagraphs = mode === "detailed" ? 10 : 6;
  const maxLength = mode === "detailed" ? 2500 : 1200;

  for (const paragraph of cleanedParagraphs) {
    selectedParagraphs.push(paragraph);
    totalLength += paragraph.length;

    if (selectedParagraphs.length >= minParagraphs && totalLength >= preferredMinLength) {
      break;
    }

    if (selectedParagraphs.length >= maxParagraphs || totalLength >= maxLength) {
      break;
    }
  }

  const content = selectedParagraphs.join(" ").trim();

  if (content.length >= preferredMinLength) {
    return content;
  }

  // In detailed mode, return medium-length clean text rather than null.
  if (mode === "detailed" && content.length >= 300) {
    return content;
  }

  if (content.length < hardMinLength) {
    return null;
  }

  return content;
};
