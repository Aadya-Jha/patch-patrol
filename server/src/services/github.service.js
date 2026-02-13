import axios from "axios";

export async function getFile(owner, repo, path) {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
      }
    }
  );

  return Buffer.from(res.data.content, "base64").toString();
}