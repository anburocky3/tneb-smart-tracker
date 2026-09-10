// get the bookmarklet code from the snippet.txt file
import fs from "fs";
import path from "path";

const snippetPath = path.join(process.cwd(), "scripts", "snippet.txt");
export const tnebBookmarkCode = fs.readFileSync(snippetPath, "utf-8");
